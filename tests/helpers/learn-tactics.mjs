import assert from 'node:assert/strict';
import {createTacticLearning,learnedTacticIds,initializeTacticLearning,tacticLearningLimits} from '../../tactic-learning.mjs';
import {TACTICS_BOOK,availableTactics,configureTactics,SPECIAL_TACTICS} from '../../tactics.mjs';

// Mechanics fixtures request a priority, not an obsolete free three-slot kit.
// Find a real acquisition seed for the first skill under test; never grant it
// or change the officer's level. Other learned skills remain equipped.
export function learnFixtureTactics(u,priority){
 const skill=priority[0],allowed=availableTactics(u).map(s=>s.id);
 if(!skill||!allowed.includes(skill))return '战法不可学';
 const limits=tacticLearningLimits(u);
 assert.ok(TACTICS_BOOK[skill].special||TACTICS_BOOK[skill].threshold<=35||limits.high,`${u.id}/${u.type}: B/C aptitude cannot learn ${skill}`);
 let low=0,high=0;
 const wanted=[...new Set(priority)].filter(id=>{
  if(!allowed.includes(id))return false;
  if(TACTICS_BOOK[id].special)return true;
  return TACTICS_BOOK[id].threshold<=35?++low<=Math.min((u.level??1),limits.low):++high<=limits.high;
 });
 for(let seed=0;seed<20000;seed++){
  const learning=createTacticLearning(u,seed),ids=learnedTacticIds({...u,tacticLearning:learning});
  if((u.level??1)<5&&learning.special&&!priority.includes(SPECIAL_TACTICS[u.id]))continue;
  if(!wanted.every(id=>ids.includes(id)))continue;
  u.tacticLearning=learning;
  const order=[...new Set([...priority.filter(id=>ids.includes(id)),...ids])];
  assert.equal(configureTactics(u,order),null);return null;
 }
 throw new Error(`No learned fixture for ${u.id}/${u.level}/${u.type}/${skill}`);
}

// Only use for mechanic fixtures which deliberately change identities, troop
// types or levels. Resume tests still validate real learning histories.
export function syncFixtureLearning(state){
 for(const army of state.armies)for(const source of army.units){
  const live=state.battle?.sides.flatMap(s=>s.units).find(u=>u.id===source.id);
  if(live){
   if(live.tacticLearning?.level!==live.level)initializeTacticLearning(live,live.tacticLearning?.seed??state.seed);
   source.level=live.level;source.experience=live.experience;source.type=live.type;source.tacticLearning=structuredClone(live.tacticLearning);source.tactics=[...live.tactics];
  }else if(source.tacticLearning?.level!==source.level)initializeTacticLearning(source,source.tacticLearning?.seed??state.seed);
 }
 return state;
}
