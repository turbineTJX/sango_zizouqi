import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMOUS_OFFICERS,famousPassiveId} from '../famous-officers.mjs';
import {makeOfficer,stepBattle,lockDeployment,validateSave,settleBattle,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS,availableTactics,unitTactics,tacticTarget,famousTargets,readyTactic,hasStatus,shieldAmount,setStatus} from '../tactics.mjs';
import {hasPassive,passiveDamageMultiplier,passiveAttributes,passiveList,moved} from '../passives.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {officerDetailMarkup} from '../officer-roster.mjs';

function fixture(id){
 const state=createScenario('officer-lab',713,20,[id]),b=state.battle,u=b.sides[0].units[0],d=b.sides[1].units[0];
 b.sides[0].units=[u];b.sides[1].units=[d];
 Object.assign(u,{x:4,y:3,level:10,hp:2400,intent:100,cooldown:999,statuses:{},skillReady:{}});
 Object.assign(d,{x:5,y:3,hp:3000,maxHp:3000,intent:100,cooldown:999,statuses:{}});
 const ally={...structuredClone(u),id:'support-fixture',x:3,y:3,hp:900,intent:0,battleDamage:2100,healed:0};
 b.sides[0].units.push(ally);
 for(const a of [u,d,ally])a.skillReady=Object.fromEntries(unitTactics(a).map(s=>[s.id,999]));
 const s=TACTICS_BOOK[SPECIAL_TACTICS[id]];u.skillReady[s.id]=0;
 lockDeployment(b);return {state,b,u,d,ally,s};
}

test('41 owners have five growth nodes, their exclusive loadout and visible descriptions; others cannot equip them',()=>{
 assert.equal(Object.keys(FAMOUS_OFFICERS).length,41);
 assert.equal(Object.keys(SPECIAL_TACTICS).length,41);
 for(const id of Object.keys(FAMOUS_OFFICERS)){
  const u=makeOfficer(id,3000,0,10),special=SPECIAL_TACTICS[id];
  assert.equal(unitTactics(u)[0].id,special);
  assert.ok(unitTactics(u).length>=1&&unitTactics(u).length<=4);
  assert.ok(availableTactics({...u,type:'archer'}).some(s=>s.id===special));
  assert.ok(!availableTactics({id:'ordinary',type:u.type}).some(s=>s.id===special));
  assert.ok(officerDetailMarkup(id).includes(TACTICS_BOOK[special].name));
 }
});

test('every exclusive tactic resolves through the real engine and enters only its own cooldown',()=>{
 for(const id of Object.keys(FAMOUS_OFFICERS)){
  const {b,u,d,ally,s}=fixture(id);
  if(s.effect==='terror')d.x=6;
  if(s.effect==='protect')Object.assign(ally,{x:5,y:4});
  const before=d.hp;
  stepBattle(b);
  assert.equal(u.tacticCasts[s.id],1,id+' should cast');
  assert.equal(u.skillReady[s.id],b.tick+s.cooldown,id+' cooldown');
  assert.ok(b.effects.some(e=>e.from===id&&e.skillId===s.id)||b.effects.some(e=>e.from===id&&e.label===s.name),id+' visible event');
  if(s.mode==='attack')assert.ok(d.hp<before,id+' damage');
  if(s.mode==='support'&&s.shield)assert.ok(shieldAmount(b,ally)>0,id+' support');
  stepBattle(b);assert.equal(u.tacticCasts[s.id],1,id+' cannot repeat');
 }
});

test('area AI selects the larger cluster and includes the anchor despite enemy array order',()=>{
 const {b,u,d,s}=fixture('person-603');
 Object.assign(d,{x:5,y:0});
 const a={...structuredClone(d),id:'cluster-a',x:6,y:3},c={...structuredClone(d),id:'cluster-c',x:6,y:4};
 b.sides[1].units.push(a,c);
 const target=tacticTarget(b,u,s,3);assert.notEqual(target.id,d.id);
 const selected=famousTargets(b,u,s,target);assert.equal(selected[0],target);assert.equal(selected.length,2);
 assert.ok(selected.every(t=>t.id!==d.id));
 stepBattle(b);assert.equal(d.hp,3000);assert.ok(a.hp<3000&&c.hp<3000);
});

test('multi-hit and multi-target exclusive attacks do not charge the caster',()=>{
 for(const id of ['person-390','person-603']){
  const {b,u,d,s}=fixture(id);u.level=1;u.intent=s.threshold;
  b.sides[1].units.push({...structuredClone(d),id:'second-target',x:5,y:4});
  stepBattle(b);assert.equal(u.intent,Math.min(100,s.threshold));
 }
});

test('support AI avoids idle shields, prioritizes cleansing, and skips a useless high-priority slot',()=>{
 const {b,u,d,ally,s}=fixture('yu');
 u.hp=ally.hp=3000;d.x=12;
 assert.equal(tacticTarget(b,u,s,3),null);
 setStatus(b,ally,'seal',4);
 assert.equal(tacticTarget(b,u,s,3),ally);
 stepBattle(b);assert.ok(!hasStatus(b,ally,'seal'));assert.ok(hasStatus(b,ally,'resolve'));
 const q=fixture('person-636');q.u.hp=q.ally.hp=3000;q.ally.intent=100;q.d.x=8;
 q.u.type='crossbow';learnFixtureTactics(q.u,[q.s.id,'seal','pierce']);q.u.skillReady={};
 assert.equal(readyTactic(q.b,q.u,4).skill.id,'seal');
});

test('exclusive control respects resolve and discipline; deaths do not acquire new statuses',()=>{
 const x=fixture('person-433');setStatus(x.b,x.d,'resolve',5);
 stepBattle(x.b);assert.ok(!hasStatus(x.b,x.d,'stun'));assert.ok(x.d.hp<3000);
 const y=fixture('person-425');y.d.politics=100;stepBattle(y.b);
 assert.ok(hasStatus(y.b,y.d,'confuse'));assert.ok(y.d.statuses.confuse.until-y.b.tick<=4);
 const z=fixture('person-99');z.d.hp=1;stepBattle(z.b);
 assert.equal(z.d.hp,0);assert.ok(!z.d.statuses.armorBreak);
});

test('personal skills unlock troop panels at ten, remain independent of tactics, and respect conditions',()=>{
 const x=fixture('person-99');x.u.hp=3000;
 x.u.level=9;assert.ok(!hasPassive(x.u,famousPassiveId(x.u.id)));
 const before=unitAttributes(x.u,x.b),without=passiveDamageMultiplier(x.b,x.u,x.d,'force');
 x.u.level=10;const after=unitAttributes(x.u,x.b);
 assert.ok(after.attack>before.attack);assert.ok(after.attackInterval<before.attackInterval);
 assert.equal(after.martialPower,before.martialPower);assert.equal(passiveDamageMultiplier(x.b,x.u,x.d,'force'),without);
 x.u.tactics=['gallop','rush','valor'];assert.equal(unitAttributes(x.u,x.b).attack,after.attack);
 x.u.type='spear';assert.equal(passiveList(x.u,x.b).at(-1).state,'兵种不符');
 const h=fixture('person-186');h.b.tick=3;assert.match(passiveAttributes(h.b,h.u).attack[0].label,/老当益壮/);
 const from={x:h.u.x,y:h.u.y};h.u.x--;moved(h.b,h.u,from);assert.doesNotMatch(passiveAttributes(h.b,h.u).attack[0].label,/老当益壮/);
 const a=fixture('person-396');assert.match(passiveAttributes(a.b,a.u).defense[0].label,/龙胆/);
 a.u.hp=1000;assert.match(passiveAttributes(a.b,a.u).defense[0].label,/龙胆/);
 const c=fixture('person-636');c.u.hp=c.u.maxHp*.5;assert.doesNotMatch(passiveAttributes(c.b,c.u).defense?.[0]?.label||'',/昭烈/);
 c.u.hp--;assert.match(passiveAttributes(c.b,c.u).defense[0].label,/昭烈/);
});

test('all personal troop skills have distinct panel identities and no hidden tactic damage multiplier',()=>{
 const identities=new Set();
 for(const [id,design] of Object.entries(FAMOUS_OFFICERS).filter(([,p])=>p.ultimate)){
  const p=design.ultimate,x=fixture(id);
  x.u.hp=p.trigger==='wounded'?x.u.maxHp*.49:x.u.maxHp;
  if(p.trigger==='steady')x.b.tick=3;
  if(p.trigger==='late')x.b.tick=40;
  if(p.trigger==='alone')x.ally.x=0;
  const identity=JSON.stringify([p.troops,p.stats,p.trigger]);
  assert.ok(!identities.has(identity),id+' duplicates another personal skill');identities.add(identity);
  const low=unitAttributes({...x.u,level:9},x.b),high=unitAttributes(x.u,x.b);
  assert.equal(passiveList(x.u,x.b).at(-1).state,'已生效',id);
  for(const key of Object.keys(p.stats))assert.ok(high[key]>low[key],id+' '+key);
  for(const kind of ['force','intellect'])assert.equal(passiveDamageMultiplier(x.b,x.u,x.d,kind),passiveDamageMultiplier(x.b,{...x.u,level:9},x.d,kind),id);
  if(p.troops){
   x.u.type='siege';const wrong=unitAttributes(x.u,x.b),wrongLow=unitAttributes({...x.u,level:9},x.b);
   assert.deepEqual(wrong,wrongLow,id+' troop restriction');
  }
 }
 assert.equal(identities.size,26);
});

test('exclusive support stays local and capped while army healing reaches distant active units',()=>{
 for(const id of ['cao','yu','jin','shao','ju','person-636','person-368','person-668']){
  const {b,u,ally,d,s}=fixture(id);
  // Every support has a real need; no artificial pending-cast state.
  setStatus(b,ally,'seal',5);ally.intent=0;
  const far={...structuredClone(ally),id:'far-ally',x:0,y:0},reserve={...structuredClone(ally),id:'reserve-ally',status:'reserve',arrivalTick:999};
  b.sides[0].units.push(far,reserve);
  const targets=famousTargets(b,u,s);
  assert.ok(targets.length>0&&targets.length<=s.targets,id);
  assert.ok(!targets.includes(far)&&!targets.includes(reserve),id);
  const previous=structuredClone(far);stepBattle(b);assert.equal(u.tacticCasts[s.id],1,id);
  assert.equal(far.hp,previous.hp);assert.equal(far.intent,previous.intent);assert.equal(shieldAmount(b,far),0);
  if(s.heal){assert.ok(ally.hp>900);assert.ok(ally.healed<=735);assert.equal(shieldAmount(b,ally),0);}
  assert.ok(!b.effects.some(e=>e.from===u.id&&e.target===d.id&&e.healing),id);
  b.sides[0].commanders=[{id:'yu',role:'advisor'}];b.commandProgress=COMMAND_RESOURCE.capacity;
  const nearHp=ally.hp,farHp=far.hp,reserveHp=reserve.hp;
  assert.equal(issueCommand(b,'heal'),null);
  assert.ok(ally.hp>nearHp&&far.hp>farHp,id+' army heal ignores distance');assert.equal(reserve.hp,reserveHp);
 }
});

test('Liu Bei skips empty healing and never revives, overheals, or converts deaths into wounded',()=>{
 const {b,u,ally,s}=fixture('person-636');
 u.battleDamage=0;ally.battleDamage=0;
 assert.equal(tacticTarget(b,u,s,3),null,'low HP alone does not create recoverable wounded');
 ally.battleDamage=100;const before=ally.hp;stepBattle(b);
 assert.equal(ally.hp,before+35);assert.equal(ally.healed,35);
 assert.equal(tacticTarget(b,u,s,3),null,'exhausted wounded pool');
 ally.battleDamage=2100;ally.hp=0;ally.status='defeated';
 assert.equal(tacticTarget(b,u,s,3),null);
});

test('burn stacks retain the strongest snapshot, refresh duration, and cap at three',()=>{
 const {b,d}=fixture('person-246');
 setStatus(b,d,'burn',3,{amount:40,sourceId:'strong'});assert.equal(d.statuses.burn.stacks,1);
 setStatus(b,d,'burn',8,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.amount,80);assert.equal(d.statuses.burn.sourceId,'strong');assert.equal(d.statuses.burn.until,b.tick+9);
 setStatus(b,d,'burn',5,{amount:45,sourceId:'stronger'});assert.equal(d.statuses.burn.sourceId,'stronger');assert.equal(d.statuses.burn.amount,135);setStatus(b,d,'burn',6,{amount:10,sourceId:'weak'});assert.equal(d.statuses.burn.amount,135);
 b.tick=d.statuses.burn.until;setStatus(b,d,'burn',3,{amount:15,sourceId:'weak'});assert.equal(d.statuses.burn.sourceId,'weak');
});

test('self-cost bypasses shields, preserves one survivor and updates the casualty ledger without extra intent',()=>{
 for(const id of ['person-164','person-494']){
  const {b,u,s}=fixture(id);u.level=1;u.intent=s.threshold;
  u.initial=u.hp;u.battleDamage=0;u.healed=0;
  setStatus(b,u,'shield',9,{amount:500,source:'self-test'});
  const before=u.hp;stepBattle(b);
  assert.equal(before-u.hp,Math.floor(before*s.selfCost));assert.equal(u.battleDamage,before-u.hp);
  assert.equal(shieldAmount(b,u),500);assert.equal(u.intent,s.threshold);
  const low=fixture(id);low.u.hp=1;low.u.initial=1;low.u.battleDamage=0;low.u.healed=0;
  stepBattle(low.b);assert.equal(low.u.hp,1);assert.equal(low.u.battleDamage,0);
 }
});

test('new exclusive effects resume deterministically and settle with conserved troops for all 41 officers',()=>{
 const ids=Object.keys(FAMOUS_OFFICERS);
 for(let i=0;i<ids.length;i+=6){
  const state=createScenario('officer-lab',81+i,20,ids.slice(i,i+6));
  lockDeployment(state.battle);for(let n=0;n<50&&!state.battle.result;n++)stepBattle(state.battle);
  const saved=validateSave(structuredClone(state));
  while(!state.battle.result){stepBattle(state.battle);stepBattle(saved.battle);}
  assert.deepEqual(saved.battle,state.battle);
  const report=settleBattle(state);validateSave(state);
  for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);
 }
});
