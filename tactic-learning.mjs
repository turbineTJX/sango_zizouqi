import {combatType,allowedFormTypes,troopTypes} from './troop-equipment.mjs';
import {advanceBonds} from './bonds.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {TACTICS_BOOK,TROOP_TACTICS,INTELLECT_TACTICS,SPECIAL_TACTICS} from './tactics.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';

// Current fixed configuration. Level and random seed never grant tactics.
export const LEARNING_RULES=Object.freeze({lowLimit:[1,1,1,2],highLimit:[0,0,1,1]});
export const LEARNING_TROOPS=troopTypes();
export function troopAptitude(u,type=u.type){
 const family=TROOP_DESIGNS[type]?.category==='equipment'?TROOP_DESIGNS[u.type]?.family:TROOP_DESIGNS[type]?.family||type;
 return OFFICER_BY_ID[u.id]?.aptitudes[family]??u.aptitudes?.[family]??0;
}
export function smallTacticCategory(u){
 const source=OFFICER_BY_ID[u.id]||{};
 const stat=k=>u[k]??source[k]??0;
 if(stat('intellect')!==stat('force'))return stat('intellect')>stat('force')?'intellect':'force';
 if(stat('politics')!==stat('leadership'))return stat('politics')>stat('leadership')?'intellect':'force';
 return stat('charm')>=50?'intellect':'force';
}
export function tacticPools(type){
 const ids=[...(TROOP_TACTICS[type]||[]),...(INTELLECT_TACTICS[type]||[])];
 return {low:ids.filter(id=>TACTICS_BOOK[id].learningTier==='low'),high:ids.filter(id=>TACTICS_BOOK[id].learningTier==='high')};
}
export function tacticLearningLimits(u,type=u.type){
 const apt=troopAptitude(u,type);
 return {low:LEARNING_RULES.lowLimit[apt],high:LEARNING_RULES.highLimit[apt]};
}
export function createTacticLearning(u){
 const category=smallTacticCategory(u);
 return {byTroop:Object.fromEntries(LEARNING_TROOPS.map(type=>{
  const p=tacticPools(type),limits=tacticLearningLimits(u,type);
  return [type,{low:limits.low===2?p.low:p.low.filter(id=>TACTICS_BOOK[id].category===category),high:limits.high?p.high:[]}];
 })),special:!!SPECIAL_TACTICS[u.id]};
}
export function learnedTacticIds(u){
 const record=u.tacticLearning,type=combatType(u),p=tacticPools(type),limits=tacticLearningLimits(u,type);
 const pool=TROOP_DESIGNS[type]?.category==='equipment'?{low:limits.low===2?p.low:p.low.filter(id=>TACTICS_BOOK[id].category===smallTacticCategory(u)),high:limits.high?p.high:[]}:record?.byTroop[type];
 if(!pool)return [];
 return [...(record.special&&SPECIAL_TACTICS[u.id]?[SPECIAL_TACTICS[u.id]]:[]),...pool.low,...pool.high];
}
export function initializeTacticLearning(u,seed=0){
 advanceBonds(u,seed);
 u.tacticLearning=createTacticLearning(u);u.tactics=learnedTacticIds(u);return u;
}
export function advanceTacticLearning(u){
 const order=u.tactics||[];
 u.tacticLearning=createTacticLearning(u);
 const ids=learnedTacticIds(u);
 u.tactics=[...order.filter(id=>ids.includes(id)),...ids.filter(id=>!order.includes(id))];
 return [];
}
export function validTacticLearning(u){
 return JSON.stringify(u.tacticLearning)===JSON.stringify(createTacticLearning(u));
}

export function allLearnedTacticIds(u){return [...new Set(allowedFormTypes(u).flatMap(type=>learnedTacticIds({...u,formType:type===u.type?null:type})))];}
