import {OFFICER_SOURCE} from './data/officers.mjs';
import {FAMOUS_OFFICERS} from './famous-officers.mjs';
export {PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from './data/officer-traits.mjs';
// Keep existing save IDs. Source IDs, not names, identify homonymous officers.
export const LEGACY_SOURCE_IDS={cao:344,dun:86,liao:440,chu:145,jia:64,yu:260,yuanxia:79,jin:7,shao:19,yan:124,wen:546,he:412,ju:354,tian:476,gao:192};
export const PROFILE_FIELDS=['personality','righteousness','compatibility','sex','birthYear','deathYear'];
export const RELATION_LIST_FIELDS=['spouseIds','swornSiblingIds','likedIds','dislikedIds'];
export const emptyRelations=()=>({fatherId:null,motherId:null,spouseIds:[],swornSiblingIds:[],likedIds:[],dislikedIds:[]});
const legacyBySource=Object.fromEntries(Object.entries(LEGACY_SOURCE_IDS).map(([id,source])=>[source,id]));
const legacyTypes={cao:'spear',dun:'spear',liao:'cavalry',chu:'spear',jia:'crossbow',yu:'crossbow',yuanxia:'archer',jin:'spear',shao:'spear',yan:'cavalry',wen:'cavalry',he:'spear',ju:'crossbow',tian:'archer',gao:'spear'};
const sourceKey=(kind,id)=>kind==='custom'?'custom-'+id:legacyBySource[id]||'person-'+id;
function normalizedRelations(kind,s){
 const one=id=>Number.isSafeInteger(id)&&id>0?sourceKey(kind,id):null;
 const list=values=>[...new Set((Array.isArray(values)?values:[]).map(one).filter(id=>id&&id!==sourceKey(kind,s.Id)))];
 // Brother is a shared group leader, including the leader's self-reference.
 const group=s.Brother>0?OFFICER_SOURCE.filter(r=>r.kind===kind&&r.source.Brother===s.Brother).map(r=>r.source.Id):[];
 return {fatherId:one(s.Father),motherId:one(s.Mother),spouseIds:list(s.SpouseList),
  swornSiblingIds:list([...group,...(s.Brother>0?[s.Brother]:[]),...(s.BrotherList||[]),...(s.swornBrotherList||[])]),
  likedIds:list(s.LikePersonList),dislikedIds:list(s.HatePersonList)};
}
function preferredType(source){
 const choices=[['spear',Math.max(source.spearLv||0,source.halberdLv||0)],['cavalry',source.rideLv||0],['archer',source.crossbowLv||0]];
 choices.sort((a,b)=>b[1]-a[1]);
 return choices[0][0];
}
export const OFFICER_CATALOG=OFFICER_SOURCE.map(({kind,source,biography})=>{
 const id=kind==='custom'?'custom-'+source.Id:legacyBySource[source.Id]||'person-'+source.Id;
 const type=FAMOUS_OFFICERS[id]?.type||legacyTypes[id]||preferredType(source);
 return {
  id,sourceId:source.Id,sourceKind:kind,name:source.Name,courtesy:source.nickName||'',
  aliases:[source.familyName+source.giveName,...(source.Id===412&&kind==='common'?['张郃']:[])],
  leadership:source.command,force:source.strength,intellect:source.intelligence,politics:source.politics,charm:source.glamour,
  personality:source.personality??null,righteousness:source.argumentation??null,compatibility:source.compatibility??null,
  sex:source.sex??null,birthYear:source.yearBorn??null,deathYear:source.yearDead??null,relations:normalizedRelations(kind,source),
  type,formation:['archer','crossbow'].includes(type)?'back':'front',skills:[],
  biography:biography.replace(/<[^>]*>/g,'').replace(/\\n/g,'\n'),source
 };
});
export const OFFICER_BY_ID=Object.fromEntries(OFFICER_CATALOG.map(u=>[u.id,u]));
// Each runtime unit owns its relation arrays; catalogue data never becomes mutable save state.
export function officerProfile(id){
 const source=Object.hasOwn(OFFICER_BY_ID,id)?OFFICER_BY_ID[id]:null;
 return {...Object.fromEntries(PROFILE_FIELDS.map(key=>[key,source?.[key]??null])),relations:source?structuredClone(source.relations):emptyRelations()};
}
export function searchOfficers({query='',sort='source',kind='all'}={}){
 const term=String(query).trim().toLocaleLowerCase();
 const found=OFFICER_CATALOG.filter(u=>(kind==='all'||u.sourceKind===kind)&&(!term||[u.name,u.courtesy,u.id,String(u.sourceId),...u.aliases].some(value=>value.toLocaleLowerCase().includes(term))));
 if(['leadership','force','intellect','politics','charm'].includes(sort))found.sort((a,b)=>b[sort]-a[sort]||a.sourceId-b.sourceId||a.id.localeCompare(b.id));
 return found;
}
