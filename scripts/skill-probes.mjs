// Targeted skill-design checks; no game files or saves are changed.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createScenario} from '../scenarios.mjs';
import {makeOfficer,lockDeployment,stepBattle,lowerIntent,unitAttributes} from '../engine.mjs';
import {PASSIVES,SKILL_ROUTES,passiveList,passiveDamageMultiplier,initialPassiveState} from '../passives.mjs';
import {TACTICS_BOOK,recommendedTacticIds,unitTactics,readyTactic} from '../tactics.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const result={};
result.defaultSynergies=Object.keys(SKILL_ROUTES).map(id=>{
  const u={...makeOfficer(id),level:10},tactics=recommendedTacticIds(u);
  return {id,name:u.name,type:u.type,tactics:tactics.map(id=>TACTICS_BOOK[id].name),
    mismatches:passiveList(u).filter(p=>p.state==='兵种不符').map(p=>p.name),
    supportPassivesWithoutSupport:SKILL_ROUTES[id].filter(p=>['shield','aid','rescue'].includes(p)&&!tactics.some(t=>['screen','cleanse','protect',...(p==='shield'?[]:['rally','relay'])].includes(t))).map(p=>PASSIVES[p].name),
    intentSuppressionWithoutTactic:SKILL_ROUTES[id].includes('suppress')&&!tactics.some(t=>['undermine','harass'].includes(t))};
});

// The low-threshold enemy loadout no longer suppresses Foresight's eligibility.
{
  const jia={...makeOfficer('jia'),level:10,side:0},enemy={...makeOfficer('yan'),level:10,side:1,intent:100};
  enemy.tactics=recommendedTacticIds(enemy);
  const threshold=Math.min(...unitTactics(enemy).map(s=>s.threshold));
  const removed=lowerIntent(enemy,45,jia);
  const multiplier=passiveDamageMultiplier(null,jia,enemy,'intellect',threshold);
  assert.equal(removed,54);assert.equal(enemy.intent,46);assert.equal(multiplier,1.3);
  result.foresight={target:'颜良（推荐战法）',threshold,removed,remaining:enemy.intent,multiplier,
    explanation:'满战意受到十胜奇谋 + 挫锐后降至46，可触发料敌；普通攻击回升至58时仍可触发，60及以上失效。'};
}

function mini(id='liao'){
  const b=createScenario('field',123).battle;
  const u=b.sides[0].units.find(u=>u.id===id),enemy=b.sides[1].units[0];
  b.sides[0].units=[u];b.sides[1].units=[enemy];
  for(const v of [u,enemy])Object.assign(v,{hp:3000,maxHp:3000,initial:3000,intent:0,cooldown:0,statuses:{},skillReady:{},tacticCasts:{},level:1});
  lockDeployment(b);return {b,u,enemy};
}
// Zero-threshold gallop can activate before any attack or hit generates intent.
{
  const {b,u,enemy}=mini();u.tactics=['gallop','rush','press'];
  Object.assign(u,{x:3,y:4});Object.assign(enemy,{x:10,y:4});
  let contact=null;
  for(let i=0;i<18&&!b.result;i++){
    stepBattle(b);if(u.intent>0)contact??={tick:b.tick,intent:u.intent,action:u.action};
  }
  result.gallop={firstIntent:contact,casts:u.tacticCasts.gallop||0};
  assert.ok(result.gallop.casts>0);
  const test=mini();test.u.tactics=['gallop','rush','press'];Object.assign(test.u,{x:3,y:4});Object.assign(test.enemy,{x:10,y:4});
  assert.equal(readyTactic(test.b,test.u,1)?.skill.id,'gallop');stepBattle(test.b);assert.equal(test.u.tacticCasts.gallop,1);
  result.gallop.explanation='门槛0可在接敌前首步发动，冷却和施放占用一步的规则保留。';
}

// Reserve-only exclusives do work when entering after deployment, not in the starting line.
{
  const b=createScenario('field',44).battle,base=b.sides[0].units[0];
  const u={...structuredClone(base),...makeOfficer('he'),side:0,level:10,hp:3000,maxHp:3000,initial:3000,
    status:'reserve',x:-1,y:-1,passiveState:initialPassiveState(),intent:0};
  b.sides[0].units=[u];lockDeployment(b);stepBattle(b);
  assert.equal(u.passiveState.reserveEntered,true);assert.equal(u.passiveState.entryUntil,16);
  const boosted=unitAttributes(u,b).attack,without=unitAttributes({...u,level:9},b).attack;
  assert.ok(boosted>without);
  result.adapt={entryTick:1,expiresAt:u.passiveState.entryUntil,intent:u.intent,attackWithUltimate:boosted,attackWithoutUltimate:without};
}

// New fire DOT snapshots scale with surviving troops.
function fireProbe(hp){
  const {b,u,enemy}=mini();u.type='archer';u.tactics=['fire','scatter','harry'];
  Object.assign(u,{x:4,y:3,hp,intent:40,cooldown:999});Object.assign(enemy,{x:7,y:3,cooldown:999});
  enemy.skillReady=Object.fromEntries(unitTactics(enemy).map(s=>[s.id,999]));
  stepBattle(b);return {hp,direct:b.effects.find(e=>e.from===u.id&&e.damage>0)?.damage||0,burnPerTick:enemy.statuses.burn?.amount||0};
}
result.fire=[fireProbe(3000),fireProbe(30)];
assert.equal(result.fire[0].burnPerTick,24);assert.equal(result.fire[1].burnPerTick,2);
assert.ok(result.fire[0].direct>result.fire[1].direct*5);
const out=new URL(`../docs/skill-audit-v${RULES_VERSION}/`,import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('probes.json',out),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
