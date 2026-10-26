import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {HISTORICAL_RELATIONSHIPS} from './data/design/historical-cooperation.mjs';

// Historical source bonds and the current, mutable relationship are separate.
export const RELATIONSHIP_TIERS=Object.freeze(Object.fromEntries(Object.entries({
 disliked:{label:'厌恶',base:20,min:0,max:20},
 distant:{label:'疏远',base:30,min:21,max:39},
 ordinary:{label:'普通',base:50,min:40,max:59},
 friendly:{label:'友好',base:65,min:60,max:69},
 liked:{label:'亲爱',base:70,min:70,max:79},
 parent:{label:'父母子女',base:75,min:75,max:90},
 spouse:{label:'夫妻',base:80,min:80,max:95},
 sworn:{label:'义兄弟',base:80,min:80,max:100}
}).map(([key,value])=>[key,Object.freeze(value)])));
export const RELATIONSHIP_BASES=Object.freeze(Object.fromEntries(Object.entries(RELATIONSHIP_TIERS).map(([key,tier])=>[key,tier.base])));
export const relationshipKey=(a,b)=>typeof a==='string'&&typeof b==='string'?(a<b?a+'|'+b:b+'|'+a):[a,b].sort().join('|');
const person=id=>Object.hasOwn(OFFICER_BY_ID,id)?OFFICER_BY_ID[id]:null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function sourceRelationships(a,b){
 const x=person(a)?.relations||{},y=person(b)?.relations||{};
 const includes=field=>x[field]?.includes(b)||y[field]?.includes(a);
 const types=[];
 if(includes('swornSiblingIds'))types.push('sworn');
 if(includes('spouseIds'))types.push('spouse');
 if([x.fatherId,x.motherId].includes(b)||[y.fatherId,y.motherId].includes(a))types.push('parent');
 if(includes('likedIds'))types.push('liked');
 if(includes('dislikedIds'))types.unshift('disliked');
 if(!types.length){const historical=HISTORICAL_RELATIONSHIPS.find(p=>p.ids.includes(a)&&p.ids.includes(b)&&a!==b&&person(a)&&person(b));if(historical)types.push(historical.type);}
 return types.length?types:['ordinary'];
}
let sourceRecords;
function sourceRecord(a,b,key=relationshipKey(a,b)){
 if(!sourceRecords){
  // Catalogue relations never change during a game. Only saved score/type maps
  // are mutable. Index the sparse nonordinary pairs once, rather than scanning
  // historical records for every candidate comparison.
  const pairs=new Set();
  for(const [id,p]of Object.entries(OFFICER_BY_ID)){
   const r=p.relations||{};
   for(const other of [...(r.swornSiblingIds||[]),...(r.spouseIds||[]),r.fatherId,r.motherId,...(r.likedIds||[]),...(r.dislikedIds||[])])if(other)pairs.add(relationshipKey(id,other));
  }
  for(const p of HISTORICAL_RELATIONSHIPS)for(const x of p.ids)for(const y of p.ids)if(x!==y)pairs.add(relationshipKey(x,y));
  sourceRecords=new Map();for(const pair of pairs){const types=sourceRelationships(...pair.split('|'));sourceRecords.set(pair,{types,type:types[0],label:types.map(t=>RELATIONSHIP_TIERS[t].label).join('、')});}
 }
 return sourceRecords.get(key)||ordinarySource;
}
const ordinarySource={types:['ordinary'],type:'ordinary',label:RELATIONSHIP_TIERS.ordinary.label};
export function relationshipScore(a,b,scores={},types={}){
 const key=relationshipKey(a,b);if(Object.hasOwn(scores,key))return scores[key];
 const type=Object.hasOwn(types,key)?types[key]:sourceRecord(a,b,key).type;return RELATIONSHIP_TIERS[type].base;
}
export function relationshipInfo(a,b,scores={},types={}) {
 const key=relationshipKey(a,b),source=sourceRecord(a,b,key),sourceTypes=[...source.types],sourceType=source.type;
 const type=Object.hasOwn(types,key)?types[key]:sourceType,tier=RELATIONSHIP_TIERS[type];
 const configured=Object.hasOwn(scores,key),score=configured?scores[key]:tier.base;
 return {...tier,key,type,sourceType,sourceTypes,sourceLabel:source.label,score,chance:score,configured};
}
const isMap=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function pairIds(key){
 const ids=key.split('|');
 return ids.length===2&&ids[0]!==ids[1]&&ids.every(id=>person(id))&&key===relationshipKey(...ids)?ids:null;
}
export function validRelationshipTypes(types){
 return isMap(types)&&Object.entries(types).every(([key,type])=>{
  const ids=pairIds(key);
  return ids&&Object.hasOwn(RELATIONSHIP_TIERS,type)&&(type!=='parent'||sourceRelationships(...ids).includes('parent'));
 });
}
export function validRelationshipScores(scores,types={}) {
 return isMap(scores)&&validRelationshipTypes(types)&&Object.entries(scores).every(([key,score])=>{
  const ids=pairIds(key);if(!ids)return false;
  const {min,max}=relationshipInfo(...ids,{},types);
  return Number.isSafeInteger(score)&&score>=min&&score<=max;
 });
}
function editError(state,a,b){
 if(state.battle&&!state.battle.result&&(state.battle.deploymentLocked||state.battle.tick>0))return '交战已经开始，关系锁定；战后可调整。';
 if(a===b||!person(a)||!person(b))return '请选择两名不同的武将。';
 return null;
}
function savePair(state,a,b,type,score){
 const source=relationshipInfo(a,b),key=source.key,tier=RELATIONSHIP_TIERS[type];
 state.relationshipScores||={};state.relationshipTypes||={};
 if(type===source.sourceType)delete state.relationshipTypes[key];else state.relationshipTypes[key]=type;
 if(score===tier.base)delete state.relationshipScores[key];else state.relationshipScores[key]=score;
 if(state.battle&&!state.battle.result){
  state.battle.relationshipScores=structuredClone(state.relationshipScores);
  state.battle.relationshipTypes=structuredClone(state.relationshipTypes);
 }
}
export function setRelationshipScore(state,a,b,score) {
 const error=editError(state,a,b);if(error)return error;
 const info=relationshipInfo(a,b,state.relationshipScores,state.relationshipTypes);
 if(!Number.isSafeInteger(score)||score<info.min||score>info.max)return info.label+'关系值须为 '+info.min+'～'+info.max+' 的整数。';
 savePair(state,a,b,info.type,score);return null;
}
// Explicit relationship events (e.g. marriage, sworn oath, rupture or reconciliation).
// Blood kinship can be restored from the source record, but cannot be invented here.
export function setRelationshipType(state,a,b,type,score){
 const error=editError(state,a,b);if(error)return error;
 const info=relationshipInfo(a,b,state.relationshipScores,state.relationshipTypes);
 if(!Object.hasOwn(RELATIONSHIP_TIERS,type)||type==='parent'&&!info.sourceTypes.includes('parent'))return '关系类型无效。';
 const tier=RELATIONSHIP_TIERS[type];
 score??=clamp(info.score,tier.min,tier.max);
 if(!Number.isSafeInteger(score)||score<tier.min||score>tier.max)return tier.label+'关系值须为 '+tier.min+'～'+tier.max+' 的整数。';
 savePair(state,a,b,type,score);return null;
}
// Event hook: ordinary social ties cross tiers; special bonds need explicit events.
// Falling below a special bond's floor breaks its current bonus, not its source record.
export function changeRelationshipScore(state,a,b,delta){
 const error=editError(state,a,b);if(error)return error;
 if(!Number.isSafeInteger(delta))return '关系变化须为整数。';
 const info=relationshipInfo(a,b,state.relationshipScores,state.relationshipTypes);
 const special=['sworn','spouse','parent'].includes(info.type);
 const score=clamp(info.score+delta,0,special?info.max:RELATIONSHIP_TIERS.liked.max);
 const type=special&&score>=info.min?info.type:['disliked','distant','ordinary','friendly','liked'].find(t=>score<=RELATIONSHIP_TIERS[t].max);
 savePair(state,a,b,type,score);return null;
}
