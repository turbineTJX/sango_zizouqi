import {sortRows} from './list-sort.mjs';
import {OFFICER_SOURCE} from './data/officers.mjs';
import {OFFICER_PROFILE_OVERRIDES} from './data/officer-profile-overrides.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
export {PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from './data/officer-traits.mjs';
// Keep existing save IDs. Source IDs, not names, identify homonymous officers.
export const LEGACY_SOURCE_IDS={cao:344,dun:86,liao:440,chu:145,jia:64,yu:260,yuanxia:79,jin:7,shao:19,yan:124,wen:546,he:412,ju:354,tian:476,gao:192};
export const PROFILE_FIELDS=['personality','righteousness','compatibility','sex','birthYear','deathYear'];
export const RELATION_LIST_FIELDS=['spouseIds','swornSiblingIds','likedIds','dislikedIds'];
export const emptyRelations=()=>({fatherId:null,motherId:null,spouseIds:[],swornSiblingIds:[],likedIds:[],dislikedIds:[]});
const legacyBySource=Object.fromEntries(Object.entries(LEGACY_SOURCE_IDS).map(([id,source])=>[source,id]));
const sourceKey=(kind,id)=>kind==='custom'?'custom-'+id:legacyBySource[id]||'person-'+id;
const profileRows=OFFICER_SOURCE.map(row=>({...row,profileSource:row.kind==='common'?{...row.source,...OFFICER_PROFILE_OVERRIDES[row.source.Id]}:row.source}));
import {OFFICER_DESIGNS} from './data/design/officers.mjs';
const sourceRowsById=Object.fromEntries(profileRows.map(row=>[sourceKey(row.kind,row.source.Id),row]));
export const OFFICER_CATALOG=Object.values(OFFICER_DESIGNS).map(u=>({...structuredClone(u),source:sourceRowsById[u.id]?.source,profileSource:sourceRowsById[u.id]?.profileSource}));
export const OFFICER_BY_ID=Object.fromEntries(OFFICER_CATALOG.map(u=>[u.id,u]));
// Each runtime unit owns its relation arrays; catalogue data never becomes mutable save state.
export function officerProfile(id){
 const source=Object.hasOwn(OFFICER_BY_ID,id)?OFFICER_BY_ID[id]:null;
 return {...Object.fromEntries(PROFILE_FIELDS.map(key=>[key,source?.[key]??null])),relations:source?structuredClone(source.relations):emptyRelations()};
}
export function searchOfficers({query='',sort='source',direction,kind='all'}={}){
 const term=String(query).trim().toLocaleLowerCase();
 const found=OFFICER_CATALOG.filter(u=>(kind==='all'||u.sourceKind===kind)&&(!term||[u.name,u.courtesy,u.id,String(u.sourceId),...u.aliases].some(value=>value.toLocaleLowerCase().includes(term))));
 if(['leadership','force','intellect','politics','charm'].includes(sort))found.sort((a,b)=>b[sort]-a[sort]||a.sourceId-b.sourceId||a.id.localeCompare(b.id));
 return sortRows(found,sort,direction||(sort==='source'?'asc':'desc'),(u,key)=>key==='source'?u.sourceId:u[key]);
}
