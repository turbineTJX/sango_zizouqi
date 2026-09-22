import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {initializeTacticLearning} from '../tactic-learning.mjs';
import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {createScenario} from '../scenarios.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {relationshipKey} from '../relationships.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,makeOfficer,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,settleBattle,validateSave,issueCommand,COMMAND_RESOURCE,lowerIntent} from '../engine.mjs';
import {PASSIVES,SKILL_ROUTES,COMMON_ROUTES,passiveList,hasPassive,initialPassiveState,moved,passiveDamageTaken,supportMultiplier,recordBasicAttack,passiveDamageMultiplier} from '../passives.mjs';
import {gainMerit,meritNeeded,battleMerit} from '../progression.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {unitTactics,configureTactics,setStatus,TACTICS_BOOK} from '../tactics.mjs';
const near=(a,c,epsilon=1e-8)=>assert.ok(Math.abs(a-c)<epsilon,`${a} ≠ ${c}`);
function campaign(level=1){
  const state=newGame(99);for(const army of state.armies)for(const u of army.units){u.level=level;initializeTacticLearning(u,state.seed);}
  orderArmy(state,'a1','guandu');advanceTurn(state);startBattle(state);lockDeployment(state.battle);return state;
}
function duel(id='cao',level=1){
  const state=campaign(level),b=state.battle;
  const a=b.sides.flatMap(s=>s.units).find(u=>u.id===id),d=b.sides[1-a.side].units.find(u=>u.id!=='cao')||b.sides[1-a.side].units[0];
  b.sides[a.side].units=[a];b.sides[d.side].units=[d];a.status='active';d.status='active';
  Object.assign(a,{type:'crossbow',x:4,y:3,intent:0,cooldown:0});initializeTacticLearning(a,a.tacticLearning.seed);
  Object.assign(d,{x:7,y:3,intent:0,cooldown:999});d.level=1;state.armies.flatMap(s=>s.units).find(u=>u.id===d.id).level=1;
  d.statuses.phalanx={until:999};
  for(const u of [a,d])u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
  return {state,b,a,d};
}
function cast(x,id,target=x.d){
  const {a,b}=x;primeTactic(a,id);stepBattle(b);
  return b.effects.filter(e=>e.from===a.id&&e.damage).reduce((n,e)=>n+e.damage,0);
}
function extra(b,id,side,x,y,level=1){
  const u={...makeOfficer(id),level,side,status:'active',hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,x,y,intent:0,cooldown:999,cast:null,statuses:{phalanx:{until:999}},skillReady:{},tacticCasts:{},passiveState:initialPassiveState()};
  u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));b.sides[side].units.push(u);return u;
}
test('fixed identity traits are available at every level and never equipped',()=>{
for(const id of Object.keys(SKILL_ROUTES)){const u=makeOfficer(id),base=passiveList(u);assert.equal(new Set(base.map(p=>p.id)).size,base.length);for(let level=1;level<=10;level++)assert.deepEqual(passiveList({...u,level}),base);assert.ok(base.every(p=>p.unlocked&&p.level===1));}
});

test('fixed martial and movement traits modify only intended attributes',()=>{
const u=makeOfficer('yan'),plain={...u,id:'person-533'},a=unitAttributes(u),b=unitAttributes(plain);near(a.martialPower,b.martialPower*1.25);near(a.move,b.move*1.2);near(a.attack,b.attack);assert.deepEqual(a,unitAttributes({...u,level:10}));
});

test('expanded troop training modifies the real panel and is removed immediately after troop changes',()=>{
 for(const [type,id,keys] of [['halberd','halberdDrill',['defense','attackSpeed']],['siege','siegeDrill',['attack','siege']],['ship','shipDrill',['defense','move']]]){
  const u={...makeOfficer('cao'),id:'training-test',skillRouteType:type,type,level:5};
  const before=unitAttributes({...u,id:'person-533'}),after=unitAttributes(u);
  for(const key of keys)assert.ok(after[key]>before[key],type+' '+key);
  assert.equal(passiveList(u).find(p=>p.id===id).state,'已生效');
  u.type='spear';assert.deepEqual(unitAttributes(u),unitAttributes({...u,level:4}));
  assert.equal(passiveList(u).find(p=>p.id===id).state,'兵种不符');
 }
});
test('army command aura affects nearby other active allies, does not stack and vanishes on departure',()=>{
  const {b,a}=duel('dun',1),baseline=unitAttributes(a,b);
  const cao=extra(b,'cao',a.side,3,3,10);
  near(unitAttributes(a,b).attack,baseline.attack*1.1);near(unitAttributes(a,b).defense,baseline.defense*1.1);
  extra(b,'cao',a.side,4,4,10);near(unitAttributes(a,b).attack,baseline.attack*1.1);
  b.sides[a.side].units.pop();cao.status='reserve';near(unitAttributes(a,b).attack,baseline.attack);
  cao.status='active';cao.x=0;near(unitAttributes(a,b).attack,baseline.attack);
});
test('spear formation, stationary defense and movement resets respect exact conditions',()=>{
  const {b,a}=duel('jin',8);a.type='spear';const basic=unitAttributes(a,b).defense;
  extra(b,'dun',a.side,3,3);near(unitAttributes(a,b).defense/basic,1.15);
  b.tick=3;near(unitAttributes(a,b).defense/basic,1.3);
  const from={x:a.x,y:a.y};a.x=5;moved(b,a,from);near(unitAttributes(a,b).defense,basic);
  b.tick=6;near(unitAttributes(a,b).defense/basic,1.15);
});
test('desperate uses strict 40% boundary and defiant scales continuously, caps and falls after healing',()=>{
  const {b,a}=duel('dun',10);
  // Isolate personal HP-boundary bonuses from persistent army appointment bonuses.
  b.sides[a.side].commanders=[];a.hp=a.maxHp*.5;let s=unitAttributes(a,b);
  const baseline=unitAttributes({...a,id:'person-533'},b);near(s.attack,baseline.attack*1.25);near(s.martialPower,baseline.martialPower*1.25);
  a.hp=a.maxHp*.4;const exact=unitAttributes(a,b);a.hp--;const below=unitAttributes(a,b);near(below.defense/exact.defense,1.15);near(below.discipline/exact.discipline,1.15);
  a.hp=a.maxHp*.8;s=unitAttributes(a,b);const healedBase=unitAttributes({...a,id:'person-533'},b);near(s.attack,healedBase.attack*1.1);near(s.martialPower,healedBase.martialPower*1.1);
});
test('bow and swift deactivate immediately on adjacency, cavalry specialization survives troop changes',()=>{
  const {b,a,d}=duel('yuanxia',10);a.type='archer';let s=unitAttributes(a,b);
  near(s.attack/unitAttributes({...a,id:'person-533'},b).attack,1.15);near(s.move,1.3);near(s.attackInterval,2.5/1.2);
  d.x=5;s=unitAttributes(a,b);near(s.attack/unitAttributes({...a,id:'person-533'},b).attack,1);near(s.move,1);near(s.attackInterval,2.5);
  a.type='cavalry';assert.equal(passiveList(a,b).find(s=>s.id==='bow').state,'兵种不符');
  const rider={...makeOfficer('liao'),level:5};near(unitAttributes(rider).move,2.4);rider.type='spear';near(unitAttributes(rider).move,1);assert.equal(hasPassive(rider,'rider'),true);
});
test('guard and shelter reduce only eligible damage; fortress and adapt also protect against damage over time',()=>{
  const {b,a}=duel('dun',1),chu=extra(b,'chu',a.side,3,3,10);
  near(passiveDamageTaken(b,a,'basic'),.85);near(passiveDamageTaken(b,a,'force'),.85);near(passiveDamageTaken(b,a,'intellect'),1);near(passiveDamageTaken(b,a,'dot'),1);
  near(passiveDamageTaken(b,chu,'basic'),.9*.92);chu.status='withdrawn';near(passiveDamageTaken(b,a,'basic'),1);
  const jin={...a,id:'jin',level:10};near(passiveDamageTaken(b,jin,'dot'),.88);
  const he={...a,id:'he',level:10,passiveState:{...initialPassiveState(),entryUntil:15,reserveEntered:true}};near(passiveDamageTaken(b,he,'dot'),.85);b.tick=15;near(passiveDamageTaken(b,he,'dot'),1);
});
test('isolated and joint evaluate neighbors on the correct side',()=>{
const x=duel('liao');near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1.25);extra(x.b,'chu',x.a.side,6,3);near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1.25);extra(x.b,'yan',x.d.side,8,3);near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1);x.a.id='he';near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1.15);near(passiveDamageMultiplier(x.b,x.a,x.d,'intellect',false),1);stepBattle(x.b);assert.ok(x.b.effects.some(e=>e.from===x.a.id&&e.damage>0));
});

test('foresight enhances actual intellect damage at its strict intent boundary',()=>{
function hit(intent){const x=duel('jia');x.d.intent=intent;x.d.x=6;return cast(x,'ambush');}near(hit(0)/hit(60),1.3,.03);near(hit(59)/hit(60),1.3,.03);assert.equal(hit(60),hit(100));const x=duel('jia');assert.equal(passiveDamageMultiplier(x.b,x.a,x.d,'force',false),1);
});

test('crossbow streak counts basic attacks, resets on target or troop changes, and persists through tactics',()=>{
  const x=duel('cao',1);Object.assign(x.a,{id:'custom',level:10,skillRouteType:'crossbow'});
  for(let i=1;i<=3;i++){x.a.cooldown=0;stepBattle(x.b);assert.equal(x.a.passiveState.shots,i);}
  near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1.18);
  cast(x,'ambush');assert.equal(x.a.passiveState.shots,3);
  const d2={...x.d,id:'second'};recordBasicAttack(x.a,d2);assert.equal(x.a.passiveState.shots,1);
  x.a.type='spear';recordBasicAttack(x.a,d2);assert.equal(x.a.passiveState.shots,1);
  assert.equal(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1);
});
test('fractional attack intervals produce more actual attacks instead of rounding away attack speed',()=>{
  function count(enabled){const x=duel('yuanxia',1);if(!enabled)x.a.id='person-533';x.a.type='archer';configureTactics(x.a,['fire','scatter','suppress']);x.a.skillReady={fire:999,scatter:999,suppress:999};x.a.force=1;x.a.leadership=1;x.d.hp=x.d.maxHp=100000;let n=0;for(let i=0;i<40;i++){stepBattle(x.b);n+=x.b.effects.filter(e=>e.from===x.a.id&&!e.skill&&e.damage).length;}return n;}
  assert.equal(count(false),16);assert.ok(count(true)>=19);
  for(const type of ['archer','crossbow']){const u={...makeOfficer('cao'),id:'common',skillRouteType:type,type,level:10};near(unitAttributes(u).attackInterval,(type==='archer'?2.5:4)/1.2);}
});
test('multi-hit tactics do not charge the caster and grant surviving-hit intent once',()=>{
  const x=duel('cao',3);x.d.id='dun';x.d.level=3;cast(x,'repeat');assert.equal(x.a.intent,TACTICS_BOOK.repeat.threshold-TACTICS_BOOK.repeat.intentCost);assert.equal(x.d.intent,7);
  x.a.intent=99;x.a.cooldown=0;stepBattle(x.b);assert.equal(x.a.intent,100);
  const y=duel('liao',3);y.d.statuses.shield={until:99,amount:1000,layers:[{source:'test',label:'测试',amount:1000,until:99}]};stepBattle(y.b);assert.equal(y.d.intent,0);
});
test('suppress and calm modify intent loss without changing cooldowns',()=>{
  const source={...makeOfficer('jia'),level:5},target={...makeOfficer('yu'),level:8,intent:100,skillReady:{thrust:99}};
  assert.equal(lowerIntent(target,45,source),43);assert.equal(target.intent,57);assert.equal(target.skillReady.thrust,99);
  lowerIntent(target,1000,source);assert.equal(target.intent,0);
  target.intent=100;lowerIntent(target,45);assert.equal(target.intent,64);
});
test('support passives add, exclude self support bonuses, and enforce rescue strict half-health condition',()=>{
  const yu={...makeOfficer('yu'),level:10,side:0,hp:3000,maxHp:3000},patient={side:0,hp:1499,maxHp:3000};
  near(supportMultiplier(yu,patient,'shield'),1.55);near(supportMultiplier(yu,patient,'intent'),1.35);
  patient.hp=1500;near(supportMultiplier(yu,patient,'shield'),1.2);near(supportMultiplier(yu,yu,'shield'),1.2);
  const ju={...yu,id:'ju'};near(supportMultiplier(ju,patient,'shield'),1.45);near(supportMultiplier(ju,patient,'cooldown'),1.25);near(supportMultiplier(ju,ju,'cooldown'),1);
});
test('rescue increases actual shield, rally and relay effects, and leaves army stratagems unchanged',()=>{
  function shield(wounded){const x=duel('yu',1),patient=extra(x.b,'dun',x.a.side,4,4);patient.hp=wounded?1000:1600;patient.battleDamage=3000-patient.hp;cast(x,'screen',patient);return patient.statuses.shield.amount;}
  near(shield(true)/shield(false),1.55/1.2,.01);
  const x=duel('yu',10),patient=extra(x.b,'dun',x.a.side,4,4);patient.hp=1000;patient.battleDamage=2000;
  x.a.type='archer';configureTactics(x.a,['rally','fire','scatter']);x.a.skillReady={rally:999,fire:999,scatter:999};const power=unitAttributes(x.a,x.b).strategyPower;
  cast(x,'rally',patient);assert.equal(patient.intent,Math.round((24+Math.round(power*.02))*1.35));
  while(x.b.tick<x.a.tacticRecoveryUntil-1)stepBattle(x.b);
  x.a.type='cavalry';configureTactics(x.a,['relay','rush','valor']);x.a.skillReady={relay:999,rush:999,valor:999};patient.skillReady={thrust:99};cast(x,'relay',patient);assert.equal(patient.skillReady.thrust,99-Math.round(2*1.35));
  appointBattleTestCommander(x.b,'shao','leader');x.b.commandProgress=COMMAND_RESOURCE.capacity;const before=patient.intent;assert.equal(issueCommand(x.b,'inspire'),null);assert.equal(patient.intent,before+Math.round(x.b.lastCommand.source.strength));
});
test('cooperation raises a real combo to 30%, keeps the window and duration bonus, and saves correctly',()=>{
  const s=createScenario('officer-lab',321,0,['cao','person-290']),b=s.battle,u=b.sides[0].units.find(u=>u.id==='person-290'),first=b.sides[0].units.find(u=>u.id==='cao'),d=b.sides[1].units[0];
  s.relationshipTypes[relationshipKey(first.id,u.id)]='sworn';b.relationshipTypes=structuredClone(s.relationshipTypes);
  s.relationshipScores[relationshipKey(first.id,u.id)]=100;b.relationshipScores=structuredClone(s.relationshipScores);
  b.sides[0].units=[first,u];b.sides[1].units=[d];Object.assign(first,{x:3,y:3,type:'crossbow'});Object.assign(u,{x:4,y:3,type:'crossbow'});Object.assign(d,{x:6,y:3});
  for(const v of [first,u,d]){v.cooldown=999;v.statuses.phalanx={until:999};configureTactics(v,v.type==='crossbow'?['repeat','seal','screen']:['thrust','phalanx','strike']);v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
  primeTactic(first,'repeat');stepBattle(b);const anchored=b.comboWindows[0].tick;
  primeTactic(u,'repeat');stepBattle(b);assert.equal(b.effects.find(e=>e.combo).combo.bonus,30);assert.equal(b.comboWindows[0].tick,anchored);assert.deepEqual(validateSave(structuredClone(syncFixtureLearning(s))).battle,b);
});
test('reserve entry grants preparedness and adaptation once, expires at 15 steps, and is not triggered by deployment',()=>{
  const s=campaign(10),b=s.battle,he=b.sides[1].units.find(u=>u.id==='he');
  assert.equal(he.passiveState.entryUntil,0);assert.equal(he.intent,0);
  he.status='reserve';he.x=-1;he.y=-1;b.tick=5;
  for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.statuses.phalanx={until:999};}
  stepBattle(b);assert.equal(he.intent,25);assert.equal(he.passiveState.entryUntil,21);assert.equal(he.passiveState.reserveEntered,true);
  const active=unitAttributes(he,b).attack;b.tick=21;assert.ok(unitAttributes(he,b).attack<active);
  he.status='reserve';stepBattle(b);assert.equal(he.intent,25);assert.equal(he.passiveState.entryUntil,21);
});
test('fortress reduces real burning and army firestorm damage before shields without creating intent',()=>{
  function burn(level){const x=duel('jin',level);x.a.cooldown=999;setStatus(x.b,x.a,'burn',2,{sourceId:x.d.id,amount:100});stepBattle(x.b);return {lost:3000-x.a.hp,intent:x.a.intent};}
  assert.deepEqual(burn(10),{lost:88,intent:0});assert.equal(burn(1).lost,88);
});
test('merit advances learned tactics and capacity without unlocking or rerolling traits',()=>{
const u=makeOfficer('liao'),before=passiveList(u);let r=gainMerit(u,100);assert.equal(u.level,2);assert.deepEqual(passiveList(u),before);r=gainMerit(u,350);assert.equal(u.level,3);assert.equal(u.merit,50);r=gainMerit(u,20000);assert.equal(u.level,10);assert.equal(u.merit,0);assert.deepEqual(passiveList(u),before);assert.ok(r.unlocked.every(name=>!before.some(p=>p.name===name)));assert.equal(gainMerit(u,100).gained,0);assert.equal(meritNeeded(10),0);
});

test('settlement rewards actual participation on both sides once, excludes idle reserves and no-combat retreats',()=>{
  const x=duel('cao',1);stepBattle(x.b);x.b.result={winner:0,reason:'击溃'};const report=settleBattle(x.state);
  assert.ok(report.growth.find(g=>g.id==='cao').gained>0);assert.equal(report.growth.find(g=>g.id==='cao').gained,battleMerit(x.a,true).award);
  assert.equal(report.growth.find(g=>g.id===x.d.id).gained,battleMerit(x.d,false).award);assert.equal(x.state.armies[0].units.find(u=>u.id==='jin').merit,0);
  const snapshot=structuredClone(x.state);assert.equal(settleBattle(x.state),null);assert.deepEqual(x.state,snapshot);validateSave(x.state);
  const idle=campaign();idle.battle.result={winner:1,reason:'撤退'};assert.deepEqual(settleBattle(idle).growth,[]);
});
test('max-level full battles and fractional cooldown saves resume deterministically',()=>{
  for(const seed of [11,22,33]){
    const s=campaign(10);s.battle.seed=seed;let restored;
    for(let i=0;i<240&&!s.battle.result;i++){
      stepBattle(s.battle);
      if(i%17===0){restored=validateSave(structuredClone(syncFixtureLearning(s)));stepBattle(restored.battle);const control=structuredClone(s.battle);stepBattle(control);assert.deepEqual(restored.battle,control);}
    }
    assert.ok(s.battle.result);assert.ok(s.battle.sides.every(side=>side.units.filter(u=>u.status==='active').length<=6));
  }
});
test('invalid levels, merit, counters, durations and fractional cooldowns are rejected; missing required state is rejected',()=>{
  for(const mutate of [s=>s.armies[0].units[0].level=11,s=>s.armies[0].units[0].merit=100,s=>s.battle.sides[0].units[0].cooldown=-.1,s=>s.battle.sides[0].units[0].passiveState.lastMoveTick=999,s=>s.battle.sides[0].units[0].passiveState.shots=-1,s=>s.battle.sides[0].units[0].attackCarry=1,s=>s.battle.sides[0].units[0].level=2]){
    const s=campaign();mutate(s);assert.throws(()=>validateSave(s));
  }
  for(const field of ['level','merit','passiveState','attackCarry','participated']){const s=campaign();delete s.battle.sides[0].units[0][field];assert.throws(()=>validateSave(s));}
});
