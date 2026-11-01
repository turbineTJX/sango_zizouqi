import {OFFICER_DESIGNS} from './data/design/officers.mjs';

export const OFFICER_STATS=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
export const OFFICER_FAMILIES=[['spear','枪兵'],['halberd','戟兵'],['cavalry','骑兵'],['archer','弓兵']];
export const OFFICER_EDIT_FIELDS=['name','courtesy',...OFFICER_STATS.map(([k])=>k),'personality','righteousness','compatibility','sex','birthYear','deathYear','type','aptitudes','biography'];
export const emptyOfficerLibrary=()=>({format:'sango-officer-library',version:1,officers:[]});
export const customOfficerId=id=>typeof id==='string'&&/^custom-[a-f0-9]{32}$/.test(id);
const fail=message=>{throw Error(message);};
const integer=(value,min,max,label,nullable=false)=>{if(nullable&&value===null)return null;if(!Number.isSafeInteger(value)||value<min||value>max)fail(`${label}须为 ${min}～${max} 的整数`);return value;};
const text=(value,max,label,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(`${label}${required?'不能为空，且':''}最多 ${max} 字`);if(label!=='生平'&&/[<>"'&\r\n\t]/.test(value))fail(`${label}不能包含换行或 < > " ' &`);return value.trim();};
export function officerEdit(source){return {id:source.id,...Object.fromEntries(OFFICER_EDIT_FIELDS.map(k=>[k,structuredClone(source[k]??(k==='biography'?'':null))]))};}
export function newOfficerDocument(id){
 return {id,name:'新武将',courtesy:'',leadership:50,force:50,intellect:50,politics:50,charm:50,personality:2,righteousness:3,compatibility:75,sex:0,birthYear:170,deathYear:250,type:'spear',aptitudes:{spear:1,halberd:1,cavalry:1,archer:1},biography:''};
}
export function validateOfficerDocument(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(OFFICER_DESIGNS,value.id)&&!customOfficerId(value.id))fail('武将编号无效');
 if(Object.keys(value).some(k=>k!=='id'&&!OFFICER_EDIT_FIELDS.includes(k)))fail('武将含有不支持的字段');
 const d={id:value.id,name:text(value.name,20,'姓名',true),courtesy:text(value.courtesy,20,'字')};
 for(const [k,label]of OFFICER_STATS)d[k]=integer(value[k],0,100,label);
 for(const [k,max,label]of [['personality',4,'性格'],['righteousness',5,'义理'],['compatibility',149,'相性'],['sex',1,'性别'],['birthYear',999,'出生年'],['deathYear',999,'死亡年']])d[k]=integer(value[k],0,max,label,true);
 if(d.birthYear!==null&&d.deathYear!==null&&d.deathYear<=d.birthYear)fail('死亡年须晚于出生年');
 if(!OFFICER_FAMILIES.some(([k])=>k===value.type))fail('常用兵种无效');d.type=value.type;
 if(!value.aptitudes||Object.keys(value.aptitudes).length!==4)fail('请填写四项兵种适性');
 d.aptitudes=Object.fromEntries(OFFICER_FAMILIES.map(([k,label])=>[k,integer(value.aptitudes[k],0,3,label+'适性')]));
 text(value.biography,6000,'生平');d.biography=value.biography;return d;
}
export function validateOfficerLibrary(value){
 if(!value||value.format!=='sango-officer-library'||value.version!==1||!Array.isArray(value.officers)||value.officers.length>1088)fail('武将包格式或版本无效');
 const officers=value.officers.map(validateOfficerDocument);
 if(new Set(officers.map(o=>o.id)).size!==officers.length)fail('武将编号重复');
 if(officers.filter(o=>customOfficerId(o.id)).length>256)fail('自建武将最多 256 人');
 return {...emptyOfficerLibrary(),officers};
}
export function mergeOfficerLibrary(library,incoming){
 const current=validateOfficerLibrary(library),pack=validateOfficerLibrary(incoming),byId=new Map(current.officers.map(o=>[o.id,o]));
 for(const o of pack.officers)byId.set(o.id,o);
 return validateOfficerLibrary({...current,officers:[...byId.values()]});
}
