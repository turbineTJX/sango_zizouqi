import {combatType,allowedFormTypes,troopTypes} from './troop-equipment.mjs';
import {advanceBonds} from './bonds.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {TACTICS_BOOK,SPECIAL_TACTICS} from './tactics.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {TROOP_TACTIC_REPERTOIRES} from './data/design/assignments.mjs';
import {TACTIC_SELECTION_RULES as SELECTION,TACTIC_ROLE_GROUPS,TACTIC_STAT_PREFERENCES,tacticPrimaryCategory} from './data/design/tactic-selection.mjs';

// Current fixed configuration. Level and random seed never grant tactics.
export const LEARNING_RULES=Object.freeze({lowLimit:[1,1,1,2],highLimit:[0,0,1,1]});
export const LEARNING_TROOPS=troopTypes();
export function troopAptitude(u,type=u.type){
 const family=TROOP_DESIGNS[type]?.category==='equipment'?TROOP_DESIGNS[u.type]?.family:TROOP_DESIGNS[type]?.family||type;
 return OFFICER_BY_ID[u.id]?.aptitudes[family]??u.aptitudes?.[family]??0;
}
export function smallTacticCategory(u){
 const o=OFFICER_BY_ID[u.id]||u;
 return tacticPrimaryCategory(o);
}
export function tacticPools(type){
 const p=TROOP_TACTIC_REPERTOIRES[type],ids=p?[...p.small,...p.large]:[];
 return {low:ids.filter(id=>TACTICS_BOOK[id].learningTier==='low'),high:ids.filter(id=>TACTICS_BOOK[id].learningTier==='high')};
}
const repertoireSource=u=>OFFICER_BY_ID[u.id]||u;
export function tacticStyle(u){
 const o=repertoireSource(u),n=k=>o[k]??0;
 if(smallTacticCategory(o)==='politics')return 'support';
 if(smallTacticCategory(o)==='force')return n('leadership')>n('force')||[1,2].includes(o.personality)?'guard':'assault';
 return n('politics')>n('intellect')||n('charm')>n('intellect')?'support':'control';
}
export function tacticAffinity(u,id){
 const o=repertoireSource(u),s=TACTICS_BOOK[id],style=tacticStyle(o),n=k=>o[k]??0;
 const role=TACTIC_ROLE_GROUPS[style].includes(id)?SELECTION.roleBonus:0;
 const preference=Object.entries(TACTIC_STAT_PREFERENCES[id]||{}).reduce((score,[key,weight])=>score+n(key)*weight,0);
 return n(s.category==='force'?'force':s.category==='politics'?'politics':'intellect')+role+preference;
}
export function selectedTactics(u,type=u.type){
 const p=TROOP_TACTIC_REPERTOIRES[type],limits=tacticLearningLimits(u,type);
 const choose=(ids,count)=>ids.map((id,index)=>({id,index,score:tacticAffinity(u,id)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,count).map(v=>v.id);
 // The primary channel follows this officer across forms. The second choice
 // may use either other channel, sharing the same second stock across forms.
 const primary=smallTacticCategory(u);
 const low=limits.low===2?[...choose(p.small.filter(id=>TACTICS_BOOK[id].category===primary),1),...choose(p.small.filter(id=>TACTICS_BOOK[id].category!==primary),1)]:choose(p.small,limits.low);
 return {low,high:choose(p.large,limits.high)};
}
export function tacticLearningLimits(u,type=u.type){
 const apt=troopAptitude(u,type);
 return {low:LEARNING_RULES.lowLimit[apt],high:LEARNING_RULES.highLimit[apt]};
}
export function createTacticLearning(u){
 return {byTroop:Object.fromEntries(LEARNING_TROOPS.map(type=>[type,selectedTactics(u,type)])),special:!!SPECIAL_TACTICS[u.id]};
}
export function learnedTacticIds(u){
 if(!u.tacticLearning)return [];
 const record=u.tacticLearning,type=combatType(u);
 const pool=TROOP_DESIGNS[type]?.category==='equipment'?selectedTactics(u,type):record?.byTroop[type];
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
