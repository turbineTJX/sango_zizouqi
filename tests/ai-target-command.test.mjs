import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,STRATAGEMS,battleWounded,issueCommand} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {routeTo} from '../tactics.mjs';

const unit=(id,type)=>({id,type,troops:3000,level:5});
const custom=enemyTeam=>createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[unit('cao','spear')],enemyTeam});

for(const defenderSide of [0,1])test(`守军 ${defenderSide} 不追界外近战，转向可达的攻城兵器并确定性续战`,t=>{
 const defense=[unit('person-46','spear')],attack=[unit('person-512','spear'),unit('person-439','siege')];
 const draft={seed:123,terrain:'land',battleKind:defenderSide===0?'defense':'siege',gateHp:60000,limit:480,ownTeam:defenderSide===0?defense:attack,enemyTeam:defenderSide===0?attack:defense};
 const state=createScenario('custom-battle',123,20,null,draft),b=state.battle,defender=b.sides[defenderSide].units[0],[near,far]=b.sides[1-defenderSide].units;
 const position=(u,x,y)=>Object.assign(u,defenderSide===1?{x,y}:{x:13-x,y:7-y});
 position(near,7,0);position(far,10,7);position(defender,9,0);
 // Keep the unreachable melee decoy stationary; a live ranged threat now
 // correctly permits a sortie rather than testing the fallback guard route.
 near.statuses.phalanx={until:999};
 validateSave(structuredClone(state));lockDeployment(b);
 assert.equal(routeTo(b,defender,near,112,{charging:false}),null);
 assert.ok(routeTo(b,defender,far,112,{charging:false})?.length);
 const resumed=validateSave(structuredClone(state)),start=[defender.x,defender.y];let hitSiege=false;
 for(let i=0;i<12&&!b.result;i++){
  stepBattle(b);stepBattle(resumed.battle);
  hitSiege ||= b.effects.some(e=>e.from===defender.id&&e.to===far.id&&e.damage>0);
 }
 assert.notDeepEqual([defender.x,defender.y],start,'不盯着不可达近目标原地停留');assert.ok(hitSiege,'实际攻击可达的兵器');
 while(!b.result){stepBattle(b);stepBattle(resumed.battle);}
 assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
});

test('疾行不评估接敌路线和当前移动能力，仅遵守冷却与已有效果',()=>{
 const state=custom([unit('liao','cavalry')]),b=state.battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),'haste');
 assert.match(issueCommand(b,'haste',null,1),/尚未蓄满/);
 b.enemyCommand.commandReady.haste=b.tick+8;assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);b.enemyCommand.commandReady.haste=0;
 b.sides[1].hasteUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),null);b.sides[1].hasteUntil=0;
 const u=b.sides[1].units[0];u.statuses.confuse={until:b.tick+3};assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),'haste');delete u.statuses.confuse;
 Object.assign(u,{x:4,y:3});Object.assign(b.sides[0].units[0],{x:3,y:3});assert.equal(chooseEnemyCommand(b,['haste'],STRATAGEMS),'haste');
});

test('单队休养以实际伤兵触发，救疗按固定顺序优先',()=>{
 const state=custom([unit('jin','spear')]),b=state.battle;lockDeployment(b);
 assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);
 while(!b.result&&!battleWounded(b.sides[1].units[0]))stepBattle(b);
 assert.ok(battleWounded(b.sides[1].units[0])>0);validateSave(structuredClone(state));
 assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),'regenerate');
 assert.equal(chooseEnemyCommand(b,['heal','regenerate'],STRATAGEMS),'heal');
 assert.match(issueCommand(b,'regenerate',null,1),/尚未蓄满/);
 b.sides[1].recoveryUntil=b.tick+5;assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);b.sides[1].recoveryUntil=0;
 b.enemyCommand.commandReady.regenerate=b.tick+8;assert.equal(chooseEnemyCommand(b,['regenerate'],STRATAGEMS),null);
});

test('单队自然蓄满后自动下达休养，实际救治且保持确定性续战',()=>{
 const state=createScenario('custom-battle',48,20,null,{seed:48,terrain:'land',ownTeam:[{...unit('person-443','halberd'),troops:6000}],enemyTeam:[{...unit('person-255','halberd'),troops:6000}]}),b=state.battle;
 // Hold isolates natural command accumulation from the separate withdrawal policy.
 for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;
 lockDeployment(b);let resumed,serial=0,cast=false,healing=0;
 while(!b.result){
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  if(b.enemyCommand.commandSerial!==serial){
   serial=b.enemyCommand.commandSerial;
   if(b.enemyCommand.lastCommand.key==='regenerate'){cast=true;assert.equal(b.enemyCommand.commandProgress,0);}
  }
  healing+=b.effects.filter(e=>e.from==='person-255'&&e.label==='救治伤兵'&&e.ongoing).reduce((n,e)=>n+(e.healing||0),0);
  if(b.tick===20)resumed=validateSave(structuredClone(state));
 }
 assert.ok(cast,'无需注入军略槽');assert.ok(healing>0,'不是只记录军略名称');
 assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
});
