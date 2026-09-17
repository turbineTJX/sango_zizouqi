import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,makeOfficer,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,settleBattle,validateSave,issueCommand,COMMAND_RESOURCE,lowerIntent} from '../engine.mjs';
import {PASSIVES,SKILL_ROUTES,COMMON_ROUTES,SKILL_LEVELS,passiveList,hasPassive,initialPassiveState,moved,passiveDamageTaken,supportMultiplier,recordBasicAttack,passiveDamageMultiplier} from '../passives.mjs';
import {gainExperience,experienceNeeded} from '../progression.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {unitTactics,configureTactics,setStatus} from '../tactics.mjs';
const near=(a,c,epsilon=1e-8)=>assert.ok(Math.abs(a-c)<epsilon,`${a} ≠ ${c}`);
function campaign(level=1){
  const state=newGame(99);for(const army of state.armies)for(const u of army.units)u.level=level;
  orderArmy(state,'a1','guandu');advanceTurn(state);startBattle(state);lockDeployment(state.battle);return state;
}
function duel(id='cao',level=1){
  const state=campaign(level),b=state.battle;
  const a=b.sides.flatMap(s=>s.units).find(u=>u.id===id),d=b.sides[1-a.side].units.find(u=>u.id!=='cao')||b.sides[1-a.side].units[0];
  b.sides[a.side].units=[a];b.sides[d.side].units=[d];a.status='active';d.status='active';
  Object.assign(a,{type:'crossbow',x:4,y:3,intent:0,cooldown:0});configureTactics(a,['repeat','seal','screen']);
  Object.assign(d,{x:7,y:3,intent:0,cooldown:999});d.level=1;state.armies.flatMap(s=>s.units).find(u=>u.id===d.id).level=1;
  d.statuses.phalanx={until:999};
  for(const u of [a,d])u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));
  return {state,b,a,d};
}
function cast(x,id,target=x.d){
  const {a,b}=x;a.cast={skillId:id,targetId:target.id,remaining:1};stepBattle(b);
  return b.effects.filter(e=>e.from===a.id&&e.damage).reduce((n,e)=>n+e.damage,0);
}
function extra(b,id,side,x,y,level=1){
  const u={...makeOfficer(id),level,side,status:'active',hp:3000,maxHp:3000,initial:3000,battleDamage:0,healed:0,x,y,intent:0,cooldown:999,cast:null,statuses:{phalanx:{until:999}},skillReady:{},tacticCasts:{},passiveState:initialPassiveState()};
  u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));b.sides[side].units.push(u);return u;
}
test('all 34 passives and 15 fixed routes unlock exactly at 2,3,5,8,10; exclusive only at 10',()=>{
  assert.equal(Object.keys(PASSIVES).length,34);assert.equal(Object.keys(SKILL_ROUTES).length,15);
  for(const [id,route] of Object.entries(SKILL_ROUTES)){
    assert.equal(new Set(route).size,5);
    for(let level=1;level<=10;level++){
      const skills=passiveList({...makeOfficer(id),level});
      assert.equal(skills.filter(s=>s.unlocked).length,SKILL_LEVELS.filter(n=>n<=level).length);
      for(const s of skills)if(s.tier==='专属')assert.equal(s.level,10);
    }
    assert.ok(['专属','高级通用'].includes(PASSIVES[route[4]].tier));
  }
  assert.deepEqual(passiveList({...makeOfficer('he'),level:10}).map(s=>s.name),['强攻','勇武','合击','备战','巧变']);
  assert.equal(passiveList({...makeOfficer('jin'),level:10}).at(-1).name,'坚城');
});
test('base and advanced skills modify only their intended attributes, adding passive percentages',()=>{
  const plain=makeOfficer('yan'),low=unitAttributes(plain),high=unitAttributes({...plain,level:10});
  near(high.martialPower,low.martialPower*1.35);near(high.attack,low.attack);near(high.move,low.move*1.2);
  const tian=makeOfficer('tian');near(unitAttributes({...tian,level:10}).strategyPower,unitAttributes(tian).strategyPower*1.35);
  const shao=makeOfficer('shao'),s=unitAttributes({...shao,level:10}),base=unitAttributes(shao);
  near(s.attack,base.attack*1.23);near(s.defense,base.defense*1.15);near(s.discipline,base.discipline*1.12);
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
  extra(b,'dun',a.side,3,3);near(unitAttributes(a,b).defense/basic,1.25/1.1);
  b.tick=3;near(unitAttributes(a,b).defense/basic,1.4/1.1);
  const from={x:a.x,y:a.y};a.x=5;moved(b,a,from);near(unitAttributes(a,b).defense,basic);
  b.tick=6;near(unitAttributes(a,b).defense/basic,1.25/1.1);
});
test('desperate uses strict 40% boundary and defiant scales continuously, caps and falls after healing',()=>{
  const {b,a}=duel('dun',10);a.hp=a.maxHp*.5;let s=unitAttributes(a,b);
  const baseline=unitAttributes({...a,level:1},b);near(s.attack,baseline.attack*1.33);near(s.martialPower,baseline.martialPower*1.25);
  a.hp=a.maxHp*.4;const exact=unitAttributes(a,b);a.hp--;const below=unitAttributes(a,b);near(below.defense/exact.defense,1.15);near(below.discipline/exact.discipline,1.15);
  a.hp=a.maxHp*.8;s=unitAttributes(a,b);near(s.attack,baseline.attack*1.18);near(s.martialPower,baseline.martialPower*1.1);
});
test('bow and swift deactivate immediately on adjacency, cavalry specialization survives troop changes',()=>{
  const {b,a,d}=duel('yuanxia',10);a.type='archer';let s=unitAttributes(a,b);
  near(s.attack/unitAttributes({...a,level:1},b).attack,1.23);near(s.move,1.3);near(s.attackInterval,2/1.2);
  d.x=5;s=unitAttributes(a,b);near(s.attack/unitAttributes({...a,level:1},b).attack,1.08);near(s.move,1);near(s.attackInterval,2);
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
test('isolated and joint change actual basic damage and evaluate neighbors from the correct side',()=>{
  function shot(level,ally=false,enemy=false){const x=duel('liao',level);if(ally)extra(x.b,'chu',x.a.side,6,3);if(enemy)extra(x.b,'yan',x.d.side,8,3);stepBattle(x.b);return x.b.effects.find(e=>e.from===x.a.id&&e.damage).damage;}
  near(shot(10)/shot(9),1.25,.03);near(shot(10,true)/shot(9),1.4,.03);near(shot(10,false,true)/shot(9),1,.03);
  const x=duel('liao',10);assert.equal(passiveDamageMultiplier(x.b,x.a,x.d,'intellect',40),1);
});
test('foresight enhances actual intellect damage only below the equipped minimum intent threshold',()=>{
  function hit(level,intent){const x=duel('jia',level);x.d.intent=intent;return cast(x,'seal');}
  near(hit(10,0)/hit(9,0),1.3,.03);assert.equal(hit(10,160),hit(9,160));
  const x=duel('jia',10);assert.equal(passiveDamageMultiplier(x.b,x.a,x.d,'force',40),1);
});
test('crossbow streak counts basic attacks, resets on target or troop changes, and persists through tactics',()=>{
  const x=duel('cao',1);Object.assign(x.a,{id:'custom',level:10,skillRouteType:'crossbow'});
  for(let i=1;i<=3;i++){x.a.cooldown=0;stepBattle(x.b);assert.equal(x.a.passiveState.shots,i);}
  near(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1.18);
  cast(x,'repeat');assert.equal(x.a.passiveState.shots,3);
  const d2={...x.d,id:'second'};recordBasicAttack(x.a,d2);assert.equal(x.a.passiveState.shots,1);
  x.a.type='spear';recordBasicAttack(x.a,d2);assert.equal(x.a.passiveState.shots,1);
  assert.equal(passiveDamageMultiplier(x.b,x.a,x.d,'basic'),1);
});
test('fractional attack intervals produce more actual attacks instead of rounding away attack speed',()=>{
  function count(level){const x=duel('yuanxia',level);x.a.type='archer';configureTactics(x.a,['fire','scatter','suppress']);x.a.skillReady={fire:999,scatter:999,suppress:999};x.a.force=1;x.a.leadership=1;x.d.hp=x.d.maxHp=100000;let n=0;for(let i=0;i<40;i++){stepBattle(x.b);n+=x.b.effects.filter(e=>e.from===x.a.id&&!e.skill&&e.damage).length;}return n;}
  assert.equal(count(9),20);assert.ok(count(10)>=24);
  for(const type of ['archer','crossbow']){const u={...makeOfficer('cao'),id:'common',skillRouteType:type,type,level:10};near(unitAttributes(u).attackInterval,(type==='archer'?2:4)/1.2);}
});
test('attack and surviving-hit intent bonuses fire once for multi-hit attacks and respect caps',()=>{
  const x=duel('liao',3);x.d.id='dun';x.d.level=3;cast(x,'repeat');assert.equal(x.a.intent,14);assert.equal(x.d.intent,24);
  x.a.intent=159;x.a.cooldown=0;stepBattle(x.b);assert.equal(x.a.intent,160);
  const y=duel('liao',3);y.d.statuses.shield={until:99,amount:1000,layers:[{source:'test',label:'测试',amount:1000,until:99}]};stepBattle(y.b);assert.equal(y.d.intent,0);
});
test('suppress and calm modify intent loss without interrupting casting or changing cooldowns',()=>{
  const source={...makeOfficer('jia'),level:5},target={...makeOfficer('cao'),level:8,intent:100,cast:{remaining:2},skillReady:{thrust:99}};
  assert.equal(lowerIntent(target,45,source),43);assert.equal(target.intent,57);assert.deepEqual(target.cast,{remaining:2});assert.equal(target.skillReady.thrust,99);
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
  function shield(level){const x=duel('yu',level),patient=extra(x.b,'dun',x.a.side,4,4);patient.hp=1000;patient.battleDamage=2000;cast(x,'screen',patient);return patient.statuses.shield.amount;}
  near(shield(10)/shield(9),1.55/1.2,.01);
  const x=duel('yu',10),patient=extra(x.b,'dun',x.a.side,4,4);patient.hp=1000;patient.battleDamage=2000;
  x.a.type='archer';configureTactics(x.a,['rally','fire','scatter']);x.a.skillReady={rally:999,fire:999,scatter:999};const power=unitAttributes(x.a,x.b).strategyPower;
  cast(x,'rally',patient);assert.equal(patient.intent,Math.round((10+Math.round(power*.08))*1.35));
  x.a.type='cavalry';configureTactics(x.a,['relay','rush','valor']);x.a.skillReady={relay:999,rush:999,valor:999};patient.skillReady={thrust:99};cast(x,'relay',patient);assert.equal(patient.skillReady.thrust,99-Math.round((2+Math.round(power*.014))*1.35));
  x.b.commandProgress=COMMAND_RESOURCE.capacity;const before=patient.intent;assert.equal(issueCommand(x.b,'inspire'),null);assert.equal(patient.intent,before+35);
});
test('cooperation raises a real combo to 30%, keeps the window and duration bonus, and saves correctly',()=>{
  const s=campaign(10),b=s.battle,u=b.sides[0].units.find(u=>u.id==='jia'),first=b.sides[0].units.find(u=>u.id==='cao'),d=b.sides[1].units[0];
  b.sides[0].units=[first,u];b.sides[1].units=[d];Object.assign(first,{x:3,y:3,type:'crossbow'});Object.assign(u,{x:4,y:3,type:'crossbow'});Object.assign(d,{x:6,y:3});
  for(const v of [first,u,d]){v.cooldown=999;v.statuses.phalanx={until:999};configureTactics(v,v.type==='crossbow'?['repeat','seal','screen']:['thrust','phalanx','strike']);v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
  first.cast={skillId:'repeat',targetId:d.id,remaining:1};stepBattle(b);const anchored=b.comboWindows[0].tick;
  u.cast={skillId:'repeat',targetId:d.id,remaining:1};stepBattle(b);assert.equal(b.effects.find(e=>e.combo).combo.bonus,30);assert.equal(b.comboWindows[0].tick,anchored);assert.deepEqual(validateSave(structuredClone(s)).battle,b);
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
  assert.deepEqual(burn(10),{lost:88,intent:0});assert.equal(burn(9).lost,100);
});
test('experience carries across thresholds, unlocks all crossed nodes and stops at level 10',()=>{
  const u=makeOfficer('liao');let r=gainExperience(u,100);assert.equal(u.level,2);assert.deepEqual(r.unlocked,['勇武']);
  r=gainExperience(u,350);assert.equal(u.level,3);assert.equal(u.experience,150);assert.deepEqual(r.unlocked,['振奋']);
  r=gainExperience(u,10000);assert.equal(u.level,10);assert.equal(u.experience,0);assert.deepEqual(r.unlocked,['骑术','合击','摧锋']);assert.equal(gainExperience(u,100).gained,0);assert.equal(experienceNeeded(10),0);
});
test('settlement rewards actual participation on both sides once, excludes idle reserves and no-combat retreats',()=>{
  const x=duel('cao',1);stepBattle(x.b);x.b.result={winner:0,reason:'击溃'};const report=settleBattle(x.state);
  assert.equal(x.state.armies[0].units.find(u=>u.id==='cao').level,2);assert.equal(report.growth.find(g=>g.id==='cao').gained,150);
  assert.equal(report.growth.find(g=>g.id===x.d.id).gained,100);assert.equal(x.state.armies[0].units.find(u=>u.id==='jin').experience,0);
  const snapshot=structuredClone(x.state);assert.equal(settleBattle(x.state),null);assert.deepEqual(x.state,snapshot);validateSave(x.state);
  const idle=campaign();idle.battle.result={winner:1,reason:'撤退'};assert.deepEqual(settleBattle(idle).growth,[]);
});
test('max-level full battles and fractional cooldown saves resume deterministically',()=>{
  for(const seed of [11,22,33]){
    const s=campaign(10);s.battle.seed=seed;let restored;
    for(let i=0;i<240&&!s.battle.result;i++){
      stepBattle(s.battle);
      if(i%17===0){restored=validateSave(structuredClone(s));stepBattle(restored.battle);const control=structuredClone(s.battle);stepBattle(control);assert.deepEqual(restored.battle,control);}
    }
    assert.ok(s.battle.result);assert.ok(s.battle.sides.every(side=>side.units.filter(u=>u.status==='active').length<=6));
  }
});
test('invalid levels, experience, counters, durations and fractional cooldowns are rejected; old saves default to level one',()=>{
  for(const mutate of [s=>s.armies[0].units[0].level=11,s=>s.armies[0].units[0].experience=100,s=>s.battle.sides[0].units[0].cooldown=-.1,s=>s.battle.sides[0].units[0].passiveState.lastMoveTick=999,s=>s.battle.sides[0].units[0].passiveState.shots=-1,s=>s.battle.sides[0].units[0].attackCarry=1,s=>s.battle.sides[0].units[0].level=2]){
    const s=campaign();mutate(s);assert.throws(()=>validateSave(s));
  }
  const old=campaign();for(const u of [...old.armies.flatMap(a=>a.units),...old.battle.sides.flatMap(s=>s.units)]){delete u.level;delete u.experience;delete u.passiveState;delete u.attackCarry;delete u.participated;}
  const migrated=validateSave(old);assert.equal(migrated.armies[0].units[0].level,1);assert.equal(migrated.battle.sides[0].units[0].passiveState.reserveEntered,false);
});
