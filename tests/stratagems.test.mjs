import {remedy} from '../battle-status-rules.mjs';
import {selectStratagemSource} from '../stratagems.mjs';
import {appointTestCommanders} from './helpers/commanders.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,issueCommand,validateSave,settleBattle,armyCommanders,armyStratagems,battleStratagems,commandIntellect,COMMAND_RESOURCE,attackRange,battleWounded,activeUnits} from '../engine.mjs';
import {unitTactics,tacticTarget,TACTICS_BOOK} from '../tactics.mjs';
const full=COMMAND_RESOURCE.capacity;
function scene(leader='cao',advisor='jia') {const s=newGame();appointTestCommanders(s,leader,advisor);orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);return s;}
function still(b) {for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.statuses.phalanx={until:999};}}
function wound(u,amount) {u.hp-=amount;u.battleDamage+=amount;}
test('single gauge starts empty, scales with active intellect, caps without storing charges',()=>{
 const s=scene(),b=s.battle;still(b);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'assault'));
 const intellect=commandIntellect(b);stepBattle(b);assert.equal(b.commandProgress,intellect);
 const a=activeUnits(b,0).find(u=>!b.sides[0].commanders.some(c=>c.id===u.id));a.status='withdrawn';const before=b.commandProgress;stepBattle(b);
 assert.equal(b.commandProgress-before,commandIntellect(b));
 while(b.commandProgress<full)stepBattle(b);for(let i=0;i<10;i++)stepBattle(b);assert.equal(b.commandProgress,full);
 assert.equal(issueCommand(b,'assault'),null);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'inspire'));
 stepBattle(b);assert.equal(b.commandProgress,commandIntellect(b));
});
test('only leader/advisor union unlocks tactics, duplicates collapse, deputy adds nothing',()=>{
 const s=scene(),a=s.armies[0],b=s.battle;
 assert.deepEqual(battleStratagems(b),armyStratagems(a));assert.ok(!battleStratagems(b).includes('heal'));
 b.commandProgress=full;assert.match(issueCommand(b,'heal'),/未掌握/);assert.equal(b.commandProgress,full);
 a.leader='yu';a.advisor='yu';assert.deepEqual(armyStratagems(a),['heal','cleanse']);
 assert.equal(armyCommanders(a).length,2);
 const changed=scene('jin','yu');assert.ok(battleStratagems(changed.battle).includes('regenerate'));assert.ok(battleStratagems(changed.battle).includes('heal'));assert.ok(!battleStratagems(changed.battle).includes('assault'));
});
test('gauge, commanders, injury ledger and effects resume deterministically; previous save versions are rejected',()=>{
 const s=scene('person-246','jia');for(let i=0;i<34;i++)stepBattle(s.battle);s.battle.commandProgress=full;assert.equal(issueCommand(s.battle,'zhou-redcliffs'),null);
 const copy=validateSave(structuredClone(s));for(let i=0;i<12;i++){stepBattle(s.battle);stepBattle(copy.battle);}assert.deepEqual(copy.battle,s.battle);
 const old=scene();old.version=1;old.battle.points=5;delete old.battle.commandProgress;delete old.battle.deploymentLocked;
 for(const u of old.battle.sides.flatMap(s=>s.units)){delete u.battleDamage;delete u.healed;}
 assert.throws(()=>validateSave(old));
 const broken=structuredClone(s);broken.battle.commandProgress=full+1;assert.throws(()=>validateSave(broken));
});
test('first aid consumes only recoverable casualties and cannot heal dead or reserve units',()=>{
 const s=scene('cao','yu'),b=s.battle;b.commandProgress=full;
 assert.ok(issueCommand(b,'heal'));assert.equal(b.commandProgress,full);
 const u=b.sides[0].units[0];wound(u,1000);const reserve=b.sides[0].units.find(u=>u.status==='reserve');wound(reserve,500);
 const dead=b.sides[0].units[1];wound(dead,dead.hp);dead.status='defeated';assert.equal(battleWounded(u),350);
 const restored=Math.floor(u.maxHp*selectStratagemSource(b.sides[0].commanders,'heal').strength);assert.equal(issueCommand(b,'heal'),null);assert.equal(u.hp,2000+restored);assert.equal(battleWounded(u),350-restored);assert.equal(u.healed,restored);assert.equal(reserve.hp,2500);assert.equal(dead.hp,0);
 b.tick=8;b.commandProgress=full;assert.equal(issueCommand(b,'heal'),null);assert.equal(u.hp,2350);assert.equal(battleWounded(u),0);
 b.result={winner:0,reason:'击溃'};const report=settleBattle(s);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.wounded+side.killed);
 assert.equal(s.armies[0].units[0].troops,2350);assert.equal(s.armies[0].units[0].wounded,0);assert.equal(report.stats[0].killed,650+1950+325);
});
test('recovery heals over time, stops at expiration and never replenishes an exhausted wounded pool',()=>{
 const s=scene('jin','yu'),b=s.battle;still(b);const u=b.sides[0].units[0];wound(u,2000);
 const perStep=Math.floor(u.maxHp*selectStratagemSource(b.sides[0].commanders,'regenerate').strength);b.commandProgress=full;assert.equal(issueCommand(b,'regenerate'),null);for(let i=0;i<12;i++){
   stepBattle(b);
   const recovery=b.effects.find(e=>e.to===u.id&&e.label==='救治伤兵');
   assert.equal(recovery.from,selectStratagemSource(b.sides[0].commanders,'regenerate').id);
   assert.equal(recovery.healing,perStep);assert.equal(recovery.ongoing,true,'recovery must not replay a cast for every unit on every step');
 }
 assert.equal(u.hp,1000+12*perStep);assert.equal(u.healed,12*perStep);assert.ok(b.sides[0].units.find(v=>v.id===selectStratagemSource(b.sides[0].commanders,'regenerate').id).contribution.healing>=12*perStep);stepBattle(b);assert.equal(u.hp,1000+12*perStep);
 const copy=validateSave(structuredClone(s));assert.equal(copy.battle.sides[0].units[0].healed,12*perStep);
});
test('range changes real attacks and weapon tactic legality; intelligence ranges and melee stay fixed',()=>{
 function setup(){const s=scene('person-46','cao'),b=s.battle;still(b);const a=b.sides[0].units.find(u=>u.id==='jia'),d=b.sides[1].units[0];b.sides[0].units=b.sides[0].units.filter(u=>u===a||b.sides[0].commanders.some(c=>c.id===u.id));for(const u of b.sides[0].units)if(u!==a){u.status="reserve";u.x=-1;u.y=-1;}b.sides[1].units=[d];a.x=1;a.y=3;d.x=7;d.y=3;a.cooldown=0;return {b,a,d};}
 const x=setup();assert.equal(attackRange(x.b,x.a),4);assert.equal(tacticTarget(x.b,x.a,TACTICS_BOOK.repeat,attackRange(x.b,x.a)),null);
 x.b.commandProgress=full;assert.equal(issueCommand(x.b,'range'),null);assert.equal(attackRange(x.b,x.a),6);
 assert.equal(tacticTarget(x.b,x.a,TACTICS_BOOK.repeat,attackRange(x.b,x.a)),x.d);assert.equal(tacticTarget(x.b,x.a,TACTICS_BOOK.seal,attackRange(x.b,x.a)),null);
 const hp=x.d.hp;stepBattle(x.b);assert.ok(x.d.hp<hp);x.b.tick=x.b.sides[0].rangeUntil;assert.equal(attackRange(x.b,x.a),4);
 const y=setup();stepBattle(y.b);assert.equal(y.d.hp,y.d.initial);
});
test('firestorm ticks exactly twelve times, gives no intent, respects shield, casualties and cleanse',()=>{
 const s=scene('person-246','jia'),b=s.battle;still(b);b.commandProgress=full;assert.equal(issueCommand(b,'zhou-redcliffs'),null);
 const u=b.sides[1].units[0],expectedLoss=u.statuses.burn.amount*12-30,reserve=b.sides[1].units.find(u=>u.status==='reserve');assert.ok(!reserve.statuses.burn);
 u.statuses.shield={until:999,amount:30,layers:[{until:999,amount:30,source:"test",label:"护盾"}]};for(let i=0;i<12;i++)stepBattle(b);
 assert.equal(u.hp,u.initial-expectedLoss);assert.equal(u.battleDamage,expectedLoss);assert.equal(u.intent,0);const hp=u.hp;stepBattle(b);assert.equal(u.hp,hp);
 const c=scene('cao','yu'),cb=c.battle,own=cb.sides[0].units[0];own.statuses.burn={until:99,amount:18,sourceId:cb.sides[1].units[0].id};cb.commandProgress=full;
 assert.equal(issueCommand(cb,'cleanse'),null);assert.ok(own.statuses.burn);remedy(cb,own,'quench');assert.equal(own.statuses.burn,undefined);
});

for(const status of ['defeated','withdrawn'])for(const side of [0,1])test('departed commander stops providing stratagems: '+status+' side '+side,()=>{
 const s=scene('cao','jia'),b=s.battle;if(side===1)b.sides.reverse();
 const own=b.sides[side],holder=own.units.find(u=>u.id==='cao');holder.status=status;if(status==='defeated')holder.hp=0;
 const resource=side?b.enemyCommand:b;resource.commandProgress=full;
 assert.ok(!battleStratagems(b,side).includes('assault'));
 assert.ok(issueCommand(b,'assault',null,side));assert.equal(resource.commandProgress,full);
 assert.ok(battleStratagems(b,side).length>0);
});
test('same-name stratagem uses remaining holder after stronger provider leaves',()=>{
 const b=scene('cao','person-87').battle;
 const stronger=selectStratagemSource(b.sides[0].commanders,'assault');
 b.sides[0].units.find(u=>u.id===stronger.id).status='withdrawn';
 const remaining=b.sides[0].commanders.filter(c=>c.id!==stronger.id),expected=selectStratagemSource(remaining,'assault');
 assert.ok(expected);assert.ok(battleStratagems(b).includes('assault'));
 b.commandProgress=full;assert.equal(issueCommand(b,'assault'),null);assert.equal(b.lastCommand.source.id,expected.id);assert.equal(b.lastCommand.source.power,expected.power);
});
test('real combat removes defeated providers from both command lists',()=>{
 const b=scene().battle;let observed=0;
 for(let i=0;i<240&&!b.result;i++){stepBattle(b);for(let side=0;side<2;side++){
 const own=b.sides[side],live=own.commanders.filter(c=>own.units.some(u=>u.id===c.id&&u.hp>0&&['active','reserve'].includes(u.status)));
 if(live.length<own.commanders.length){observed++;for(const key of battleStratagems(b,side))assert.ok(selectStratagemSource(live,key));}
 }}assert.ok(observed>0);
});
