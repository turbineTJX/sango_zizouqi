import {isDeepStrictEqual} from 'node:util';

// Person.FormLib only seeds the ID/art; Scenario.LoadBaseContent then populates
// the authored personSet. Copy character facts, never the scenario's live state.
export const SCENARIO_PROFILE_FIELDS=['Name','familyName','giveName','nickName','sex','personality','argumentation','compatibility','yearBorn','yearDead',
 'command','strength','intelligence','politics','glamour','spearLv','halberdLv','crossbowLv','rideLv','machineLv','waterLv',
 'Father','Mother','SpouseList','Brother','LikePersonList','HatePersonList'];
const abilities=new Set(['command','strength','intelligence','politics','glamour','spearLv','halberdLv','crossbowLv','rideLv','machineLv','waterLv']);

export function buildProfileOverrides(library,personSet){
 const overrides={},changes=[];
 for(const [id,source] of Object.entries(library)){
  const person=personSet[id];
  if(!person||person.Id!==source.Id)throw new Error(`剧本缺少同编号武将：${id} ${source.Name}`);
  const patch={};
  for(const field of SCENARIO_PROFILE_FIELDS){
   if(!Object.hasOwn(person,field))continue;
   // C# PersonAttributeValue/PersonAbilityValue store the base value first.
   const value=abilities.has(field)&&Array.isArray(person[field])?person[field][0]:person[field];
   if(field==='personality'&&(!Number.isInteger(value)||value<1||value>4))throw new Error(`${id} 性格编号无效`);
   if(field==='argumentation'&&(!Number.isInteger(value)||value<1||value>5))throw new Error(`${id} 义理编号无效`);
   if(field==='sex'&&![-1,0,1].includes(value))throw new Error(`${id} 性别编号无效`);
   if(abilities.has(field)&&(!Number.isInteger(value)||value<0||value>(field.endsWith('Lv')?3:100)))throw new Error(`${id} 能力字段无效：${field}`);
   const original=['nickName','familyName','giveName'].includes(field)?source[field]??'':source[field];
   if(!isDeepStrictEqual(value,original)){
    patch[field]=value;
    changes.push({sourceId:source.Id,name:source.Name,field,library:source[field]??null,scenario:value});
   }
  }
  if(Object.keys(patch).length)overrides[id]=patch;
 }
 return {overrides,changes};
}
