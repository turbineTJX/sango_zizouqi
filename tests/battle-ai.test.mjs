import {chooseStratagemPoint,stratagemAreaContains} from '../stratagem-area.mjs';
import {STRATAGEMS as AREA_DESIGNS} from '../stratagems.mjs';
import {appointBattleTestCommander} from './helpers/commanders.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from './helpers/scenarios.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {configureBattleTerrain,stepBattle,lockDeployment,issueCommand,commandIntellect,battleStratagems,STRATAGEMS,validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {canOccupy,unitTerrain} from '../battlefield.mjs';
import {unitTactics,validLoadout,setStatus,hasStatus} from '../tactics.mjs';

test('command triggers ignore range and read only the requested side cooldowns',()=>{
  const b=createScenario('field').battle;
  const archer=b.sides[0].units[0],target=b.sides[1].units[0];
  for(const side of b.sides)for(const u of side.units)if(u!==archer&&u!==target){u.hp=0;u.status='defeated';}
  Object.assign(archer,{type:'archer',x:3,y:3});Object.assign(target,{x:10,y:3});
  // Army commands have no proximity or weapon range requirement.
  b.sides[0].rangeUntil=16;
  assert.equal(chooseEnemyCommand(b,['firestorm'],STRATAGEMS,0),'firestorm');
  b.commandReady.firestorm=8;
  assert.equal(chooseEnemyCommand(b,['firestorm'],STRATAGEMS,0),null);
  b.commandReady.firestorm=0;b.enemyCommand.commandReady.firestorm=8;
  assert.equal(chooseEnemyCommand(b,['firestorm'],STRATAGEMS,0),'firestorm','enemy cooldown must not block player orders');
  b.sides[0].rangeUntil=0;b.sides[1].rangeUntil=16;
  assert.equal(chooseEnemyCommand(b,['firestorm'],STRATAGEMS,0),'firestorm','neither side range bonus changes army command eligibility');
});

test('AI continues useful siege orders after defenders fall, without targeting the gate with unit debuffs',()=>{
  const b=createScenario('siege',2700000).battle;lockDeployment(b);
  while(b.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b);
  assert.equal(b.result,null);
  const gate=b.siege.gate;
  for(const u of b.sides[1].units){u.hp=0;u.status='defeated';}
  // Reachable late-siege state with a living gate and a naturally earned order.
  Object.assign(b.sides[0].units.find(u=>u.status==='active'),{x:gate.x-1,y:gate.y});
  assert.equal(chooseEnemyCommand(b,['firestorm','demoralize','disrupt','fortify'],STRATAGEMS,0),null);
  assert.equal(chooseEnemyCommand(b,['assault'],STRATAGEMS,0),'assault');
  assert.equal(issueCommand(b,'assault'),null);assert.equal(b.commandProgress,0);
  assert.ok(b.sides[0].assaultUntil>b.tick);
  assert.equal(chooseEnemyCommand(b,['assault'],STRATAGEMS,0),null);
  gate.hp=0;
  assert.equal(chooseEnemyCommand(b,['haste','inspire'],STRATAGEMS,0),null);
});

for(const id of ['tactical-control-lv','tactical-control-zhang'])test(`${id}: single-target commands spend naturally earned gauge and resume deterministically`,()=>{
  const state=createScenario(id,2700000),b=state.battle;
  // Isolate command recovery from battle lethality; still earn the gauge through real steps.
  for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=30;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));}

  lockDeployment(b);
  assert.equal(chooseEnemyCommand(b,['firestorm','demoralize','blockade'],STRATAGEMS,0),'firestorm','army commands do not wait for contact');
  while(b.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b);
  assert.equal(b.result,null);assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
  assert.equal(chooseEnemyCommand(b,['firestorm'],STRATAGEMS,0),'firestorm');
  assert.equal(chooseEnemyCommand(b,['demoralize'],STRATAGEMS,0),'demoralize');
  assert.equal(chooseEnemyCommand(b,['blockade'],STRATAGEMS,0),null);
  const reduced=structuredClone(b),enemy=reduced.sides[1].units[0],intent=enemy.intent;
  assert.equal(issueCommand(reduced,'demoralize',chooseStratagemPoint(reduced,AREA_DESIGNS['demoralize'],0)),null);
  assert.equal(enemy.intent,Math.max(0,intent-Math.round(reduced.lastCommand.source.strength)));assert.equal(reduced.commandProgress,0);
  assert.equal(chooseEnemyCommand(reduced,['demoralize'],STRATAGEMS,0),null,'cooldown blocks repeated orders');
  const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
  assert.equal(issueCommand(b,key,chooseStratagemPoint(b,AREA_DESIGNS[key],0)),null);assert.equal(b.commandProgress,0);
  assert.ok(battleStratagems(b).includes(key));assert.equal(b.lastCommand.key,key);
  assert.ok(issueCommand(b,key,chooseStratagemPoint(b,AREA_DESIGNS[key],0)),'resource and cooldown remain enforced');
  const resumed=validateSave(JSON.parse(JSON.stringify(state)));
  while(!b.result){
    if(b.commandProgress>=COMMAND_RESOURCE.capacity){
      const command=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
      if(command){assert.equal(issueCommand(b,command,chooseStratagemPoint(b,AREA_DESIGNS[command],0)),null);assert.equal(issueCommand(resumed.battle,command,chooseStratagemPoint(resumed.battle,AREA_DESIGNS[command],0)),null);}
    }
    stepBattle(b);stepBattle(resumed.battle);
  }
  assert.ok(b.commandSerial>0);assert.deepEqual(resumed.battle,b);
});

test('enemy preserves fixed tactics and bonds while arranging legal deployment without changing player troops or RNG',()=>{
  const b=createScenario('field').battle,own=structuredClone(b.sides[0]),seed=b.seed,abilities=b.sides[1].units.map(u=>({id:u.id,tactics:structuredClone(u.tactics),bonds:structuredClone(u.bondGrowth)}));
  planEnemyArmy(b);
  assert.deepEqual(b.sides[0],own);assert.equal(b.seed,seed);
  const enemy=b.sides[1].units;
  assert.ok(enemy.every(u=>validLoadout(u,u.tactics)));
  assert.deepEqual(enemy.map(u=>({id:u.id,tactics:u.tactics,bonds:u.bondGrowth})),abilities);
  const front=enemy.filter(u=>u.type==='spear'),rear=enemy.filter(u=>['archer','crossbow'].includes(u.type));
  assert.ok(Math.max(...front.map(u=>u.x))<Math.min(...rear.map(u=>u.x)));
  assert.ok(enemy.filter(u=>u.type==='cavalry').every(u=>u.y<=1||u.y>=6));
  const snapshot=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,snapshot);
  lockDeployment(b);const locked=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,locked);
});

test('enemy re-plans with terrain, keeps ships afloat and preserves learned archer tactics',()=>{
  for(const terrain of ['land','forest','hill','marsh','river']){
    const state=createScenario('field'),b=state.battle;configureBattleTerrain(b,terrain);
    const units=b.sides[1].units.filter(u=>u.status==='active');
    assert.ok(units.every(u=>u.x>=9&&canOccupy(b,u,u.x,u.y)));
    assert.equal(new Set(units.map(u=>u.x+','+u.y)).size,units.length);
    if(terrain==='forest')assert.deepEqual(units.find(u=>u.type==='archer').tactics,learnedTacticIds(units.find(u=>u.type==='archer')));
    if(terrain==='hill')assert.ok(units.some(u=>['archer','crossbow'].includes(u.type)&&unitTerrain(b,u)==='hill'));
    validateSave(structuredClone(state));
  }
  const state=createScenario('river');planEnemyArmy(state.battle);
  assert.ok(state.battle.sides[1].units.filter(u=>u.type==='ship').every(u=>canOccupy(state.battle,u,u.x,u.y)));
});

test('enemy earns its own gauge and automatically casts only learned commands after enough active intellect',()=>{
  const b=createScenario('field').battle,known=battleStratagems(b,1);lockDeployment(b);
  assert.equal(b.enemyCommand.commandProgress,0);assert.ok(issueCommand(b,'assault',null,1));
  const first=commandIntellect(b,1);stepBattle(b);assert.equal(b.enemyCommand.commandProgress,first);
  let earned=first;
  while(!b.enemyCommand.commandSerial&&!b.result){earned+=commandIntellect(b,1);stepBattle(b);if(earned<COMMAND_RESOURCE.capacity)assert.equal(b.enemyCommand.commandSerial,0);}
  assert.ok(b.enemyCommand.commandSerial>0);assert.ok(known.includes(b.enemyCommand.lastCommand.key));
  assert.equal(b.enemyCommand.commandProgress,0);assert.ok(b.commandProgress>0);
  assert.ok(b.logs.some(l=>l.text.startsWith('敌军军略 ·')));
  assert.ok(b.sides[1].units.some(u=>u.skillCasts>0));
});

test('enemy support and offensive commands affect correct sides, obey cooldowns and leave player gauge intact',()=>{
  const b=createScenario('field').battle;lockDeployment(b);b.commandProgress=731;
  b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'assault',null,1),null);
  assert.ok(b.sides[1].assaultUntil>b.tick);assert.equal(b.sides[0].assaultUntil,0);assert.equal(b.commandProgress,731);
  b.enemyCommand.commandProgress=12000;assert.match(issueCommand(b,'assault',null,1),/冷却/);assert.equal(b.enemyCommand.commandProgress,12000);
  assert.match(issueCommand(b,'firestorm',chooseStratagemPoint(b,AREA_DESIGNS['firestorm'],1),1),/未掌握/);
  // Appointed enemy officers define the repertoire; no unlearned skill is granted.
  b.sides[1].commanders=[];appointBattleTestCommander(b,'person-246','advisor',1);appointBattleTestCommander(b,'yu','leader',1);
  assert.equal(issueCommand(b,'zhou-redcliffs',chooseStratagemPoint(b,AREA_DESIGNS['zhou-redcliffs'],1),1),null);
  for(const u of b.sides[0].units.filter(u=>u.status==='active'))assert.equal(hasStatus(b,u,'burn'),stratagemAreaContains(AREA_DESIGNS['zhou-redcliffs'],b.enemyCommand.lastCommand.target,u));
  assert.ok(b.sides[1].units.every(u=>!hasStatus(b,u,'burn')));
  const ally=b.sides[1].units[0];ally.hp-=1000;ally.battleDamage+=1000;
  b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'heal',chooseStratagemPoint(b,AREA_DESIGNS['heal'],1),1),null);assert.equal(ally.healed,Math.floor(ally.maxHp*b.enemyCommand.lastCommand.source.strength));
  setStatus(b,ally,'confuse',3);setStatus(b,ally,'burn',6,{amount:20,sourceId:b.sides[0].units[0].id});
  b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',null,1),null);
  assert.equal(hasStatus(b,ally,'confuse'),false);assert.equal(hasStatus(b,ally,'burn'),true);assert.equal(b.commandProgress,731);
});

test('AI follows fixed command order, holds ineligible commands, and does not refresh active buffs',()=>{
  const b=createScenario('field').battle;lockDeployment(b);
  for(const ally of b.sides[1].units.filter(u=>u.status==='active')){setStatus(b,ally,'confuse',3);setStatus(b,ally,'burn',6,{amount:20,sourceId:b.sides[0].units[0].id});}
  assert.equal(chooseEnemyCommand(b,['cleanse','assault','inspire'],STRATAGEMS),'assault');
  b.sides[1].units.forEach(u=>u.statuses={});
  b.sides[1].units.forEach(u=>u.intent=100);
  assert.equal(chooseEnemyCommand(b,['cleanse','heal','cycle','blockade'],STRATAGEMS),null);
  b.sides[1].assaultUntil=99;
  assert.equal(chooseEnemyCommand(b,['assault'],STRATAGEMS),null);
  b.sides[1].retreat=true;assert.equal(chooseEnemyCommand(b,['inspire'],STRATAGEMS),null);
});

test('enemy decisions survive save/resume without replanning, and missing or malformed enemy state is rejected',()=>{
  const state=createScenario('terrain');
  for(let i=0;i<55;i++)stepBattle(state.battle);
  assert.ok(state.battle.enemyCommand.commandSerial>0);
  const copy=validateSave(JSON.parse(JSON.stringify(state)));
  while(!state.battle.result){stepBattle(state.battle);stepBattle(copy.battle);}
  assert.deepEqual(copy.battle,state.battle);validateSave(copy);
  for(const value of [undefined,{}, {commandProgress:12001,commandReady:{},commandSerial:0,lastCommand:null}]){
    const bad=structuredClone(copy);bad.battle.enemyCommand=value;assert.throws(()=>validateSave(bad),/军略/);
  }
  const old=createScenario('field');old.rulesVersion=18;assert.throws(()=>validateSave(old),/重新开始/);
});
