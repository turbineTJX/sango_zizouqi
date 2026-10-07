import assert from 'node:assert/strict';
import {learnedTacticIds,initializeTacticLearning,advanceTacticLearning} from '../../tactic-learning.mjs';
import {configureTactics} from '../../tactics.mjs';

// Mechanics fixtures may prioritize only tactics in the actual fixed kit.
export function learnFixtureTactics(u,priority){
 initializeTacticLearning(u);
 const ids=learnedTacticIds(u);
 if(!priority[0]||!ids.includes(priority[0]))return '当前固定配置不包含该战法';
 const order=[...new Set([...priority.filter(id=>ids.includes(id)),...ids])];
 assert.equal(configureTactics(u,order),null);return null;
}

// Only use for mechanic fixtures which deliberately change identities, troop
// types or levels. Resume tests still validate actual fixed configurations.
export function syncFixtureLearning(state){
 for(const army of state.armies)for(const source of army.units){
  const live=state.battle?.sides.flatMap(s=>s.units).find(u=>u.id===source.id);
  if(live){
   advanceTacticLearning(live);
   source.level=live.level;source.merit=live.merit;source.type=live.type;source.tacticLearning=structuredClone(live.tacticLearning);source.equipment=structuredClone(live.equipment);source.tactics=learnedTacticIds({...source,formType:null});
  }else advanceTacticLearning(source);
 }
 return state;
}
