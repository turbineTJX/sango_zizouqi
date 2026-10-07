import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {OFFICER_SOURCE} from '../data/officers.mjs';
import {OFFICER_CATALOG,OFFICER_BY_ID,PERSONALITY_NAMES,RIGHTEOUSNESS_NAMES} from '../officer-catalog.mjs';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_MASTER_RECORDS} from './officer-master-data.mjs';
import {SCENARIO_PROFILE_FIELDS,buildProfileOverrides} from './officer-source-lib.mjs';
import {OFFICER_PROFILE_OVERRIDES} from '../data/officer-profile-overrides.mjs';

const project=process.argv[2];
if(!project)throw new Error('用法：node scripts/audit-officer-source.mjs <来源项目目录> [源 Excel 核对结果.json]');
const manifest=JSON.parse(readFileSync(new URL('../data/officers-source.json',import.meta.url),'utf8'));
const failures=[],warnings=[],checks=[],inputs={};
function check(scope,actual,expected){
 checks.push(scope);
 if(!isDeepStrictEqual(actual,expected))failures.push({scope,actual,expected});
}
for(const [key,entry] of Object.entries(manifest.sources)){
 const bytes=readFileSync(resolve(project,entry.path));
 check(`文件校验 ${key}`,createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 inputs[key]=JSON.parse(bytes.toString('utf8'));
}
check('备用武将库与正式武将库',JSON.parse(readFileSync(resolve(project,'Build/Content/Data/PersonLibrary.json'),'utf8')),inputs.common);
for(const [kind,library] of [['common',inputs.common.PersonLibrary],['custom',inputs.custom.PersonLibrary]]){
 const imported=OFFICER_SOURCE.filter(row=>row.kind===kind);
 check(`${kind} 人数`,imported.length,Object.keys(library).length);
 check(`${kind} 编号集合`,imported.map(row=>String(row.source.Id)).sort(),Object.keys(library).sort());
 for(const row of imported){
  const source=library[row.source.Id];
  check(`${kind}:${row.source.Id} 全部源字段`,row.source,source);
  check(`${kind}:${row.source.Id} 生平`,row.biography,kind==='common'?(inputs.biographies[source.description]?.cn||''):'');
 }
}
const labels=(table)=>Object.fromEntries(Object.values(table).map(row=>[row.Id,row.Name]));
const {overrides,changes}=buildProfileOverrides(inputs.common.PersonLibrary,inputs.scenario.personSet);
check('剧本人物覆盖文件',OFFICER_PROFILE_OVERRIDES,overrides);
check('性格名称表',PERSONALITY_NAMES,labels(inputs.personalities.Personalities));
check('义理名称表',RIGHTEOUSNESS_NAMES,labels(inputs.righteousness.Argumentations));
check('游戏编号唯一',new Set(OFFICER_CATALOG.map(row=>row.id)).size,OFFICER_SOURCE.length);
const formal={name:'Name',courtesy:'nickName',leadership:'command',force:'strength',intellect:'intelligence',politics:'politics',charm:'glamour',
 personality:'personality',righteousness:'argumentation',compatibility:'compatibility',sex:'sex',birthYear:'yearBorn',deathYear:'yearDead'};
const trait=(names,value)=>value==null?'未载':value===0?'未设置':names[value]||`未知编号 ${value}`;
const masterById=new Map(OFFICER_MASTER_RECORDS.map(row=>[row.id,row]));
const ranges={sex:[-1,1],personality:[0,4],argumentation:[0,5],compatibility:[0,149],command:[0,100],strength:[0,100],intelligence:[0,100],politics:[0,100],glamour:[0,100],
 spearLv:[0,3],halberdLv:[0,3],crossbowLv:[0,3],rideLv:[0,3],machineLv:[0,3],waterLv:[0,3]};
for(const officer of OFFICER_CATALOG){
 const source={...inputs[officer.sourceKind].PersonLibrary[officer.sourceId]},unit=makeOfficer(officer.id),master=masterById.get(officer.id);
 if(officer.sourceKind==='common'){
  const scenario=inputs.scenario.personSet[officer.sourceId];
  for(const field of SCENARIO_PROFILE_FIELDS)if(Object.hasOwn(scenario,field)){
   if(['nickName','familyName','giveName'].includes(field)&&!Object.hasOwn(source,field)&&scenario[field]==='')continue;
   source[field]=(['command','strength','intelligence','politics','glamour','spearLv','halberdLv','crossbowLv','rideLv','machineLv','waterLv'].includes(field)&&Array.isArray(scenario[field]))?scenario[field][0]:scenario[field];
  }
 }
 check(`${officer.id} 有效人物源字段`,officer.profileSource,source);
 for(const [key,sourceKey] of Object.entries(formal)){
  const expected=key==='sex'&&source.sex===-1?null:source[sourceKey]??(key==='courtesy'?'':null);
  check(`${officer.id} 名录 ${key}`,officer[key],expected);
  // Charm is retained in the catalogue; the combat unit has no charm field.
  if(key!=='charm')check(`${officer.id} 运行字段 ${key}`,unit[key],expected);
 }
 for(const [key,expected] of Object.entries({name:source.Name,courtesy:source.nickName||'未载',leadership:source.command,force:source.strength,intellect:source.intelligence,politics:source.politics,charm:source.glamour,
  personality:trait(PERSONALITY_NAMES,source.personality),righteousness:trait(RIGHTEOUSNESS_NAMES,source.argumentation),compatibility:source.compatibility??null,
  personalityCode:source.personality??null,righteousnessCode:source.argumentation??null,
  sex:source.sex===0?'男':source.sex===1?'女':'未载',birth:source.yearBorn??null,death:source.yearDead??null}))check(`${officer.id} 总表 ${key}`,master?.[key],expected);
 for(const [key,[min,max]] of Object.entries(ranges))if(source[key]!=null&&(!Number.isInteger(source[key])||source[key]<min||source[key]>max))warnings.push({id:officer.id,name:officer.name,field:key,value:source[key],issue:`不在核对范围 ${min}..${max}`});
 for(const key of ['personality','argumentation'])if(source[key]==null||source[key]===0)warnings.push({id:officer.id,name:officer.name,field:key,value:source[key]??null,issue:'未设置'});
 if(source.yearDead>0&&source.yearBorn>source.yearDead)warnings.push({id:officer.id,name:officer.name,issue:'出生年晚于死亡年',birth:source.yearBorn,death:source.yearDead});
 if(source.yearAvailable>0&&source.yearDead>0&&source.yearAvailable>source.yearDead)warnings.push({id:officer.id,name:officer.name,issue:'登场年晚于死亡年',available:source.yearAvailable,death:source.yearDead});
 for(const [field,value] of Object.entries(officer.relations))for(const id of Array.isArray(value)?value:value?[value]:[]){
  if(!OFFICER_BY_ID[id])warnings.push({id:officer.id,name:officer.name,field,value:id,issue:'关系目标未收录'});
  if(id===officer.id)warnings.push({id:officer.id,name:officer.name,field,issue:'关系指向自己'});
 }
 if(officer.relations.likedIds.some(id=>officer.relations.dislikedIds.includes(id)))warnings.push({id:officer.id,name:officer.name,issue:'同一目标同时亲爱和厌恶'});
}
const workbook=process.argv[3]?JSON.parse(readFileSync(resolve(process.argv[3]),'utf8')):null;
if(workbook)for(const table of workbook.tables){
 check(`Excel ${table.sheet} 差异`,table.differences,[]);
 check(`Excel ${table.sheet} 缺失行`,table.missingWorkbookIds,[]);
 check(`Excel ${table.sheet} 当前文件校验`,createHash('sha256').update(readFileSync(table.path)).digest('hex'),table.sha256);
 check(`Excel ${table.sheet} 导出文件校验`,createHash('sha256').update(readFileSync(table.sourceJsonPath)).digest('hex'),table.sourceJsonSha256);
}
const samples=[99,433,636,661,290,246,344,396].map(id=>{
 const source={...inputs.common.PersonLibrary[id],...overrides[id]};
 return {sourceId:id,name:source.Name,personality:source.personality,personalityName:PERSONALITY_NAMES[source.personality],righteousness:source.argumentation,righteousnessName:RIGHTEOUSNESS_NAMES[source.argumentation]};
});
const excludedReferences=OFFICER_CATALOG.flatMap(officer=>['Father','Mother','SpouseList','Brother','LikePersonList','HatePersonList'].flatMap(field=>{
 const value=officer.profileSource[field],ids=Array.isArray(value)?value:value?[value]:[];
 return ids.filter(id=>!OFFICER_CATALOG.some(other=>other.sourceKind===officer.sourceKind&&other.sourceId===id)).map(id=>({sourceId:officer.sourceId,name:officer.name,field,target:id}));
}));
const result={sourceProject:resolve(project),counts:manifest.counts,checkCount:checks.length,failures,warnings,samples,changes,excludedReferences,workbook};
const output=new URL('../outputs/officer-source-audit.json',import.meta.url);
mkdirSync(new URL('../outputs/',import.meta.url),{recursive:true});
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({counts:result.counts,checks:checks.length,failureCount:failures.length,failures:failures.slice(0,12),warnings,changeCounts:manifest.profileOverrideCounts,excludedReferences:excludedReferences.length,samples},null,2));
if(failures.length)process.exitCode=1;
