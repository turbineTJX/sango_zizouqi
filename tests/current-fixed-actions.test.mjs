import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {tacticPools,LEARNING_TROOPS,validTacticLearning} from '../tactic-learning.mjs';
import {stepBattle} from '../engine.mjs';
import {TACTICS_BOOK,setStatus,unitTactics} from '../tactics.mjs';

// Every currently obtainable ordinary action uses a real holder and the same
// immediate action/target/intent/use/cooldown path as player and enemy troops.
for(const type of LEARNING_TROOPS)for(const id of [...tacticPools(type).low,...tacticPools(type).high]){
 for(const side of [0,1])test(`${type}/${id}: legal fixed actor resolves and resumes on side ${side}`,()=>{
  const x=currentBattle(id,type,{side}),skill=TACTICS_BOOK[id];
  x.ally.hp=600;x.ally.battleDamage=2400;setStatus(x.b,x.ally,'disrupted',20);x.target.intent=100;
  for(const v of [x.target,x.rear])setStatus(x.b,v,'root',20);
  if(['siege','tower','archer','crossbow','ship'].includes(type)){
   x.target.x=6;x.rear.x=7;
  }
  if(id==='gallop'){x.target.x=8;x.rear.x=9;}
  if(skill.effect==='rush'){x.target.x=7;x.rear.x=9;}
  readyCurrent(x,id);const before=x.u.intent;stepBattle(x.b);
  assert.equal(x.u.tacticCasts[id],1,id);
  assert.equal(x.u.intent,before-skill.intentCost);
  assert.equal(x.u.skillReady[id],x.b.tick+skill.cooldown);
  assert.ok(validTacticLearning(x.u));assert.ok(unitTactics(x.u).some(t=>t.id===id));
  assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.label===skill.name),id+' has an actual effect');
  resumeCurrent(x);
 });
}
