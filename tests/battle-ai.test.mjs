import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {configureBattleTerrain,stepBattle,lockDeployment,issueCommand,commandIntellect,battleStratagems,STRATAGEMS,validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {canOccupy,unitTerrain} from '../battlefield.mjs';
import {unitTactics,validLoadout,setStatus,hasStatus} from '../tactics.mjs';

test('enemy plans legal three-slot loadouts and forward/rear deployment without touching player troops or RNG',()=>{
  const b=createScenario('field').battle,own=structuredClone(b.sides[0]),seed=b.seed;
  planEnemyArmy(b);
  assert.deepEqual(b.sides[0],own);assert.equal(b.seed,seed);
  const enemy=b.sides[1].units;
  assert.ok(enemy.every(u=>validLoadout(u,u.tactics)));
  assert.ok(enemy.some(u=>unitTactics(u).some(s=>['screen','relay','bandage','regrowth'].includes(s.id))));
  const front=enemy.filter(u=>u.type==='spear'),rear=enemy.filter(u=>['archer','crossbow'].includes(u.type));
  assert.ok(Math.max(...front.map(u=>u.x))<Math.min(...rear.map(u=>u.x)));
  assert.ok(enemy.filter(u=>u.type==='cavalry').every(u=>u.y<=1||u.y>=6));
  const snapshot=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,snapshot);
  lockDeployment(b);const locked=structuredClone(b);planEnemyArmy(b);assert.deepEqual(b,locked);
});

test('enemy re-plans with terrain, keeps ships afloat and equips forest fire for archers',()=>{
  for(const terrain of ['land','forest','hill','marsh','river']){
    const state=createScenario('field'),b=state.battle;configureBattleTerrain(b,terrain);
    const units=b.sides[1].units.filter(u=>u.status==='active');
    assert.ok(units.every(u=>u.x>=9&&canOccupy(b,u,u.x,u.y)));
    assert.equal(new Set(units.map(u=>u.x+','+u.y)).size,units.length);
    if(terrain==='forest')assert.ok(unitTactics(units.find(u=>u.type==='archer')).some(s=>s.effect==='wildfire'||s.effect==='fire'));
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
  assert.match(issueCommand(b,'firestorm',null,1),/未掌握/);
  // Appointed enemy officers define the repertoire; no unlearned skill is granted.
  b.sides[1].commanders=[{id:'tian',role:'advisor'},{id:'yu',role:'leader'}];
  assert.equal(issueCommand(b,'firestorm',null,1),null);
  assert.ok(b.sides[0].units.filter(u=>u.status==='active').every(u=>hasStatus(b,u,'scorch')));
  assert.ok(b.sides[1].units.every(u=>!hasStatus(b,u,'scorch')));
  const ally=b.sides[1].units[0];ally.hp-=1000;ally.battleDamage+=1000;
  b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'heal',null,1),null);assert.equal(ally.healed,ally.initial*.08);
  setStatus(b,ally,'stun',3);setStatus(b,ally,'burn',6,{amount:20,sourceId:b.sides[0].units[0].id});
  b.enemyCommand.commandProgress=12000;assert.equal(issueCommand(b,'cleanse',null,1),null);
  assert.equal(hasStatus(b,ally,'stun'),false);assert.equal(hasStatus(b,ally,'burn'),false);assert.equal(b.commandProgress,731);
});

test('AI prioritizes cleanse for control and DOT, holds useless commands, and does not refresh active buffs',()=>{
  const b=createScenario('field').battle;lockDeployment(b);
  const ally=b.sides[1].units[0];setStatus(b,ally,'stun',3);setStatus(b,ally,'burn',6,{amount:20,sourceId:b.sides[0].units[0].id});
  assert.equal(chooseEnemyCommand(b,['cleanse','assault','inspire'],STRATAGEMS),'cleanse');
  ally.statuses={};
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
