import {equipmentTypes} from '../troop-equipment.mjs';
import {createDecoy} from '../battle-status-rules.mjs';
import {currentBattle,equipmentEntry,tacticHolder} from './helpers/current-battle.mjs';
import {tacticPools,LEARNING_TROOPS} from '../tactic-learning.mjs';
import {remedy,decoyTargets} from '../battle-status-rules.mjs';
import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {stepBattle,syncCombatForm,lockDeployment,deployUnit,resetDeployment,validateSave,unitAttributes,issueCommand} from '../engine.mjs';
import {canOccupy,terrainAt} from '../battlefield.mjs';
import {interceptorsAt} from '../engagement.mjs';
import {TACTICS_BOOK,unitTactics,roleTacticIds,setStatus,hasStatus,routeTo,tacticTarget,expandedSupportTargets} from '../tactics.mjs';
import {EXPANDED_FORCE,EXPANDED_INTELLECT} from '../expanded-tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {relationshipKey} from '../relationships.mjs';

function scene(type='halberd'){const skill={halberd:'cleave',crossbow:'repeat',siege:'bombard',ram:'ram',ship:'broadside'}[type],x=currentBattle(skill,type,{requireS:true});x.u.y=type==='ship'?3:2;x.ally.y=x.u.y;x.target.y=x.u.y;x.target.x=6;x.rear.x=13;x.rear.y=7;return{state:x.state,b:x.b,u:x.u,a:x.ally,d:x.target};}

const wound=u=>Object.assign(u,{hp:u.maxHp-1000,battleDamage:1000,healed:0});

test('cleave charges each victim once without charging the caster',()=>{
 const x=scene();x.a.x=2;x.d.x=5;
 const more=[[4,1],[3,2]].map(([xPos,y],i)=>({...structuredClone(x.d),id:'enemy-'+i,x:xPos,y}));x.b.sides[1].units.push(...more);
 primeTactic(x.u,'cleave');stepBattle(x.b);
 assert.equal(x.b.effects.filter(e=>e.from===x.u.id&&e.damage>0).length,3);assert.equal(x.u.intent,TACTICS_BOOK.cleave.threshold-TACTICS_BOOK.cleave.intentCost);
 assert.ok([x.d,...more].every(u=>u.intent===2));assert.equal(x.b.sides[1].units[1].intent,0);
});

test('expanded catalogue cannot grant removed actions outside current fixed pools',()=>{const fixed=new Set([...LEARNING_TROOPS,...equipmentTypes('siege'),...equipmentTypes('ship')].flatMap(type=>{const p=tacticPools(type);return [...p.low,...p.high];}));for(const id of ['bandage','regrowth','camp','riposte','nexus','purify'])assert.ok(!fixed.has(id));for(const id of ['cleave','curse','bombard','ram','broadside','anchor'])assert.ok(fixed.has(id));});

test('挫志普攻施加丧志，不叠层，镇静解除',()=>{
 const x=scene();x.a.x=3;x.d.x=5;primeTactic(x.u,'curse');stepBattle(x.b);x.u.cooldown=0;stepBattle(x.b);assert.ok(hasStatus(x.b,x.d,'despair'));
 x.u.cooldown=999;x.d.intent=30;stepBattle(x.b);assert.equal(x.d.intent,25);assert.equal(x.d.statuses.despair.stacks,undefined);
 remedy(x.b,x.d,'calm');assert.equal(hasStatus(x.b,x.d,'despair'),false);
});

test('plague treatment only removes its authored status, preserving other ailments',()=>{const x=scene();setStatus(x.b,x.a,'plague',20,{sourceId:x.d.id,amount:0});setStatus(x.b,x.a,'burn',20,{sourceId:x.d.id,amount:10});remedy(x.b,x.a,'aid');assert.equal(hasStatus(x.b,x.a,'plague'),false);assert.equal(hasStatus(x.b,x.a,'burn'),true);});

test('疑兵有独立耐久且不抵挡本体持续伤害、不增加部队',()=>{
 const x=scene('crossbow');x.a.x=5;wound(x.a);createDecoy(x.b,x.a);assert.ok(x.a.statuses.decoy.hp>0);
 const before=x.a.hp,phantom=x.a.statuses.decoy.hp;setStatus(x.b,x.a,'plague',8,{amount:20,sourceId:x.d.id});stepBattle(x.b);
 assert.equal(before-x.a.hp,20);assert.equal(x.a.statuses.decoy.hp,phantom);assert.equal(x.b.sides[0].units.length,2);assert.equal(decoyTargets(x.b,0).length,1);
});

test('no fixed ordinary loadout silently grants the retired riposte action',()=>{for(const type of LEARNING_TROOPS){const p=tacticPools(type);assert.ok(![...p.low,...p.high].includes('riposte'));}});

test('naval deployment, swap, movement and save validation obey water and bridge domains',()=>{
 const state=createScenario('river'),b=state.battle,ship=b.sides[0].units[0],land=b.sides[0].units.find(u=>!u.equipment.ship);
 assert.equal(b.terrain,'river');assert.equal(terrainAt(b,6,3),'bridge');assert.ok(canOccupy(b,ship,6,3));assert.ok(canOccupy(b,land,6,3));
 assert.equal(deployUnit(b,ship.id,2,1),null);assert.ok(deployUnit(b,land.id,2,3));assert.equal(deployUnit(b,ship.id,land.x,land.y),null);assert.equal(resetDeployment(b),null);
 lockDeployment(b);
 for(let i=0;i<50&&!b.result;i++){stepBattle(b);for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'))assert.ok(canOccupy(b,u,u.x,u.y),u.id);}
 const copy=validateSave(structuredClone(syncFixtureLearning(state)));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 const bad=createScenario('river'),invalid=bad.battle.sides[0].units.find(u=>!u.equipment.ship);invalid.x=0;invalid.y=3;assert.throws(()=>validateSave(bad),/位置/);
});

test('siege blind spot prevents normal shots and bombard; gate charge damages the real victory objective',()=>{
 const x=scene('siege');x.a.x=3;x.d.x=x.u.x-1;x.u.cooldown=0;primeTactic(x.u,'bombard');const hp=x.d.hp;stepBattle(x.b);
 assert.equal(x.d.hp,hp);assert.ok(!x.u.tacticCasts.bombard);assert.ok(x.u.disengage||x.u.moveProgress>0||x.u.x!==4||x.u.y!==2);
 const y=scene('ram');y.u.x=5;y.d.x=9;y.b.siege={attackerSide:0,gate:{id:'siege-gate',type:'gate',name:'城门',side:1,x:6,y:2,hp:100,maxHp:100}};
 primeTactic(y.u,'ram');stepBattle(y.b);assert.equal(y.b.siege.gate.hp,0);assert.equal(y.b.result.reason,'城门失守');
});

test('two real ram casts can link against the gate and increase the second hit',()=>{
 function run(score){
  const first=tacticHolder('ram','ram',[],true),second=tacticHolder('ram','ram',[first],true);
  const state=createScenario('custom-battle',97,0,null,{seed:97,terrain:'land',battleKind:'siege',gateHp:50000,ownTeam:[equipmentEntry(first,'ram'),equipmentEntry(second,'ram')],enemyTeam:[equipmentEntry('cao','spear')]}),b=state.battle;
  const [a,c]=b.sides[0].units;b.sides[1].units=[];lockDeployment(b);
  for(const [i,u]of [a,c].entries()){u.x=11;u.y=3+i;u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));syncCombatForm(b,u,b.siege.gate);}
  for(let n=0;n<4;n++)stepBattle(b);for(const u of [a,c])primeTactic(u,'ram');
  const key=relationshipKey(a.id,c.id);b.relationshipScores[key]=score;b.relationshipTypes[key]=score===100?'sworn':'disliked';
  lockDeployment(b);stepBattle(b);return {damage:b.effects.find(e=>e.from===c.id&&e.to==='siege-gate'&&e.damage>0).damage,combos:b.comboCounts[0]};
 }
 const linked=run(100),solo=run(0);assert.equal(linked.combos,1);assert.equal(solo.combos,0);assert.ok(Math.abs(linked.damage/solo.damage-1.25)<.01);
});

test('fresh mixed and river battles earn casts and preserve all new status data across saves',()=>{
 for(const id of ['eight-arms','river']){
  const state=createScenario(id),b=state.battle;for(let i=0;i<75&&!b.result;i++)stepBattle(b);
  assert.ok(b.sides.flatMap(s=>s.units).some(u=>Object.keys(u.tacticCasts).some(k=>TACTICS_BOOK[k]&&Object.values(EXPANDED_FORCE).flat().concat(Object.values(EXPANDED_INTELLECT).flat()).includes(k))));
  const copy=validateSave(structuredClone(syncFixtureLearning(state)));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 }
});

test('expanded ongoing statuses serialize exactly and invalid curse or phantom counts are rejected',()=>{
 const state=createScenario('eight-arms'),b=state.battle,u=b.sides[0].units[0],enemy=b.sides[1].units[0];lockDeployment(b);
 setStatus(b,u,'decoy',8);setStatus(b,u,'despair',10);
 setStatus(b,u,'regrowth',6,{amount:60,sourceId:b.sides[0].units[3].id});setStatus(b,u,'plague',10,{amount:20,sourceId:enemy.id});
 setStatus(b,u,'phase',6);setStatus(b,u,'phaseLock',18);setStatus(b,u,'riposte',8,{lastTick:0});
 const copy=validateSave(structuredClone(syncFixtureLearning(state)));for(let i=0;i<20;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);
 // Stun is a current legal status; curse is the removed identity under test.
 for(const [key,data]of [['curse',{until:b.tick+9}],['decoy',{until:b.tick+9,hp:-1,x:1,y:1}]]){const bad=structuredClone(state);bad.battle.sides[0].units[0].statuses[key]=data;assert.throws(()=>validateSave(bad),/状态|疑兵/);}
});
