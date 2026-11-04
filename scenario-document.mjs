import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS,nationalScenario,nationalWorld,nationalRoster,nationalPersonnel,scenarioOfficerEligible} from './national-scenarios.mjs';
import {OFFICER_BY_ID,currentOfficerLibrary,officerLibraryCatalog} from './officer-catalog.mjs';
import {validateOfficerLibrary,emptyOfficerLibrary} from './officer-library-data.mjs';
import {CITY_DESIGNS} from './data/design/cities.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {CITY_TECHNOLOGY_PROFILES} from './data/design/city-technologies.mjs';
import {DOMESTIC_DIRECTIONS} from './data/design/domestic-actions.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {MERIT_RULES} from './data/design/progression.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {isMainCity} from './city-classification.mjs';
import {validScenarioDate,scenarioDateNumber,scenarioDateDay,scenarioStartDay} from './scenario-date.mjs';

export const newScenarioId=()=> 'scenario:'+crypto.randomUUID();
export const newScenarioForceId=()=> 'user-force-'+crypto.randomUUID();
export const SCENARIO_TECHS=Object.fromEntries(TECHNOLOGIES.records.map(t=>[t.id,{name:t.name,...t.parameters}]));
export const SCENARIO_BUILDINGS=BUILDING_DESIGNS;
export const SCENARIO_DUTIES=DOMESTIC_DIRECTIONS;
export const SCENARIO_STATES={serving:'在仕',free:'在野',captive:'被俘',dead:'死亡',excluded:'不登场'};
const towns=CITY_DESIGNS.filter(c=>c.kind==='city'),fail=(ok,message)=>{if(!ok)throw Error(message);};
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\x00-\x1f]/.test(v);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const scenarioPeople=d=>officerLibraryCatalog(d.officerLibrary||emptyOfficerLibrary());
export const scenarioForce=(d,id)=>d.forces.find(f=>f.id===id);
export function scenarioColor(value){
 if(/^#[0-9a-f]{6}$/i.test(value))return value;
 const m=String(value).match(/^hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)$/);if(!m)return '#667743';
 const h=Number(m[1])/30,s=Number(m[2])/100,l=Number(m[3])/100,a=s*Math.min(l,1-l),part=n=>{const k=(n+h)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};return '#'+part(0)+part(8)+part(4);
}
export function scenarioLocalBuildingLimit(c,key){
 const p=ECONOMY_RULES.development,b=BUILDING_DESIGNS[key];
 const limit=p.economicBuildings.includes(key)?p.localLevels[p.richCities.includes(c.id)?'rich':towns.find(t=>t.id===c.id)?.citySize==='small'?'small':'large']:p.localLevels.infrastructure;
 return b.maximumLevel?Math.min(b.maximumLevel,limit):limit;
}
export function scenarioTechnologyAllowed(cityId,id){
 const p=CITY_TECHNOLOGY_PROFILES[cityId],t=SCENARIO_TECHS[id];
 return !!p&&!!t&&(!t.affinity||p.affinities.includes(t.affinity))&&(!t.troopId||p.troops.includes(t.troopId));
}
export function createScenarioDocument(sourceId=NATIONAL_SCENARIOS[0].id){
 const spec=nationalScenario(sourceId);fail(spec&&!spec.auditOnly,'请选择内置或自建剧本');
 if(spec.customDocument){const d=structuredClone(spec.customDocument);d.id=newScenarioId();d.name=d.name.slice(0,44)+' 副本';return d;}
 const world=nationalWorld(sourceId),roster=nationalRoster(sourceId,world.cities),assigned=[];
 if(spec.rosterDistribution==='reference')assigned.push(...roster);
 else for(const faction of spec.factions){
  const pool=roster.filter(o=>o.faction===faction).sort((a,b)=>Number(OFFICER_BY_ID[b.id].sourceId===NATIONAL_FACTIONS[faction].leaderSourceId)-Number(OFFICER_BY_ID[a.id].sourceId===NATIONAL_FACTIONS[faction].leaderSourceId));
  const cities=world.cities.filter(c=>c.owner===faction).sort((a,b)=>Number(b.id===spec.capital)-Number(a.id===spec.capital)||a.sourceId-b.sourceId);
  for(const c of cities)for(let i=0;i<6&&pool.length;i++){let at=pool.findIndex(o=>o.cityId===c.id);if(at<0)at=0;assigned.push({...pool.splice(at,1)[0],cityId:c.id});}
  assigned.push(...pool);
 }
 const kind=assigned.every(o=>scenarioOfficerEligible(spec,OFFICER_BY_ID[o.id]))?spec.kind:'fictional';
 const forces=spec.factions.map(id=>{const f=NATIONAL_FACTIONS[id],leaderId=Object.values(OFFICER_BY_ID).find(u=>u.sourceId===f.leaderSourceId)?.id;return {id,name:f.name,color:scenarioColor(f.color),leaderId,capitalId:assigned.find(o=>o.id===leaderId)?.cityId||world.cities.find(c=>c.owner===id)?.id};});
 return {format:'sango-scenario',version:2,id:newScenarioId(),sourceScenario:sourceId,name:spec.name+' 副本',description:'',year:spec.year,month:1,day:1,kind,level:3,officerLibrary:currentOfficerLibrary(),factions:[...spec.factions],forces,cities:world.cities.map(c=>({id:c.id,owner:c.owner})),officers:nationalPersonnel(sourceId,world.cities),diplomacy:[]};
}
export function scenarioDocumentErrors(d){
 const errors=[],people=new Map(scenarioPeople(d).map(u=>[u.id,u])),cities=new Map(d.cities.map(c=>[c.id,c]));
 if(!text(d.name,50))errors.push('请填写剧本名称（最多50字）');
 if(!validScenarioDate(d))errors.push('起始日期须为1～9999年、1～12月、1～30日');
 if(!integer(d.level,1,10))errors.push('初始等级须为1～10');
 for(const c of d.cities){
  for(const key of ['gold','grain','manpower'])if(c[key]!==undefined&&!integer(c[key],0,10000000))errors.push('城市资源须为0～10000000的整数');
  if(c.order!==undefined&&!integer(c.order,0,100))errors.push('治安须为0～100');
  for(const [key,n]of Object.entries(c.buildings||{}))if(!integer(n,0,scenarioLocalBuildingLimit(c,key)))errors.push(towns.find(t=>t.id===c.id).name+'的'+BUILDING_DESIGNS[key].name+'等级超出本城上限');
  for(const id of c.techs||[])if(!scenarioTechnologyAllowed(c.id,id)||!SCENARIO_TECHS[id].prerequisites.every(p=>c.techs.includes(p)))errors.push(towns.find(t=>t.id===c.id).name+'的科技资质或前置不满足');
  if(c.wallIntegrity!==undefined&&!integer(c.wallIntegrity,0,100))errors.push('城防完好率须为0～100');
 }
 for(const f of d.forces){
  const leader=d.officers.find(o=>o.id===f.leaderId&&o.faction===f.id&&o.state==='serving');
  if(!text(f.name,20)||!/^#[0-9a-f]{6}$/i.test(f.color))errors.push('势力名称或旗色无效');
  if(!d.cities.some(c=>c.owner===f.id&&isMainCity(towns.find(t=>t.id===c.id))))errors.push(f.name+'没有主城，开局势力必须至少占有一座主城');
  if(!leader||leader.cityId!==f.capitalId||scenarioDateDay(d,leader.debutDate)>scenarioStartDay(d))errors.push('请将'+f.name+'君主安排在本城并于开局前登场');
  if(cities.get(f.capitalId)?.owner!==f.id)errors.push(f.name+'的本城归属不符');
 }
 const governors=new Set();
 for(const o of d.officers){
  const u=people.get(o.id),name=u.name,level=o.level??d.level;
  if(o.state==='serving'&&cities.get(o.cityId)?.owner!==o.faction)errors.push(name+'的驻城不属于本势力');
  if(o.state==='captive'&&(!o.captor||o.captor===o.faction||cities.get(o.cityId)?.owner!==o.captor))errors.push(name+'的关押城或俘获势力无效');
  const available=o.debutDate?{...d,year:Math.max(d.year,o.debutDate.year)}:d;
  if(!['dead','excluded'].includes(o.state)&&!scenarioOfficerEligible(available,u))errors.push(name+'不符合登场年代');
  if(!integer(level,1,10))errors.push(name+'的等级须为1～10');
  const meritMax=level<10?MERIT_RULES.costs[level-1]-1:100000000;
  if(o.merit!==undefined&&!integer(o.merit,0,meritMax))errors.push(name+'的功绩余量超出本级范围');
  if(o.loyalty!==undefined&&!integer(o.loyalty,0,100))errors.push(name+'的忠诚须为0～100');
  if((o.troops!==undefined&&!integer(o.troops,0,100000))||(o.wounded!==undefined&&!integer(o.wounded,0,100000))||(o.troops||0)+(o.wounded||0)>troopCapacity({...u,level}))errors.push(name+'的现役及伤兵超过带兵上限');
  if(o.state!=='serving'&&((o.troops||0)>0||(o.wounded||0)>0))errors.push(name+'未在仕，不能带有兵员');
  for(const date of [o.debutDate,o.freeDate])if(date&&!validScenarioDate(date))errors.push(name+'的日期无效');
  if(o.debutDate&&o.freeDate&&scenarioDateNumber(o.freeDate)<scenarioDateNumber(o.debutDate))errors.push(name+'的在野日期不能早于登场日期');
  if(o.freeDate&&o.state!=='free')errors.push(name+'只有在野身份可设置在野日期');
  if(o.state==='serving'&&o.role==='governor'){if(governors.has(o.cityId))errors.push('同一城只能指定一名太守');governors.add(o.cityId);}
  if(o.role&&o.state!=='serving')errors.push(name+'未在仕，不能预设任职');
 }
 if(new Set(d.forces.map(f=>f.leaderId)).size!==d.forces.length)errors.push('同一武将不能担任两个势力的君主');
 for(const r of d.diplomacy)if(!integer(r.relation,0,100)||!integer(r.days,1,36000))errors.push('外交关系须为0～100，期限须为1～36000天');
 if(!d.factions.length)errors.push('请至少保留一个势力');
 return [...new Set(errors)];
}
export function validateScenarioDocument(input,{playable=true}={}){
 fail(input?.format==='sango-scenario'&&input.version===2,'剧本版本不兼容，请使用第2版剧本');
 const {id,sourceScenario,name,description='',year,month,day,kind,level,factions,forces,cities,officers,diplomacy=[],officerLibrary=emptyOfficerLibrary()}=input;
 fail(typeof id==='string'&&/^scenario:[a-zA-Z0-9-]{1,80}$/.test(id),'剧本编号无效');
 fail(NATIONAL_SCENARIOS.some(s=>s.id===sourceScenario),'来源剧本无效');
 fail(typeof name==='string'&&name.length<=50&&!/[<>\x00-\x1f]/.test(name)&&typeof description==='string'&&description.length<=500&&!/[<>\x00-\x08]/.test(description),'名称限50字，说明限500字');
 fail([year,month,day,level].every(Number.isFinite)&&['historical','fictional'].includes(kind),'年代或人物范围无效');
 const library=validateOfficerLibrary(officerLibrary),people=new Map(officerLibraryCatalog(library).map(u=>[u.id,u]));
 fail(Array.isArray(factions)&&factions.length<=64&&new Set(factions).size===factions.length&&factions.every(f=>typeof f==='string'&&f!=='neutral'&&/^[a-z][a-z0-9-]{0,90}$/.test(f)),'势力列表无效');
 fail(Array.isArray(forces)&&forces.length===factions.length&&new Set(forces.map(f=>f?.id)).size===forces.length,'势力定义不完整或重复');
 for(const f of forces)fail(f&&factions.includes(f.id)&&typeof f.name==='string'&&f.name.length<=20&&!/[<>\x00-\x1f]/.test(f.name)&&typeof f.color==='string'&&people.has(f.leaderId)&&towns.some(c=>c.id===f.capitalId),'势力君主或本城无效');
 fail(Array.isArray(cities)&&cities.length===towns.length&&new Set(cities.map(c=>c?.id)).size===towns.length,'城市数量或编号无效');
 for(const c of cities){
  fail(c&&towns.some(t=>t.id===c.id)&&(c.owner==='neutral'||factions.includes(c.owner)),'城市或归属无效');
  for(const key of ['gold','grain','manpower','order','wallIntegrity'])fail(c[key]===undefined||Number.isFinite(c[key]),'城市数值无效');
  fail(!c.buildings||typeof c.buildings==='object'&&!Array.isArray(c.buildings)&&Object.entries(c.buildings).every(([k,n])=>Object.hasOwn(BUILDING_DESIGNS,k)&&Number.isFinite(n)),'城市设施无效');
  fail(!c.techs||Array.isArray(c.techs)&&new Set(c.techs).size===c.techs.length&&c.techs.every(id=>Object.hasOwn(SCENARIO_TECHS,id)),'城市科技无效');
 }
 fail(Array.isArray(officers)&&officers.length<=people.size&&new Set(officers.map(o=>o?.id)).size===officers.length,'武将重复或人数无效');
 for(const o of officers){
  fail(o&&people.has(o.id)&&SCENARIO_STATES[o.state]&&towns.some(c=>c.id===o.cityId),'武将、身份或驻地无效');
  fail(['serving','captive'].includes(o.state)?factions.includes(o.faction):o.faction===null||o.faction===undefined,'武将所属势力无效');
  fail(!o.captor||factions.includes(o.captor),'俘获势力无效');
  fail(!o.role||o.role==='governor'||Object.hasOwn(DOMESTIC_DIRECTIONS,o.role),'开局任职无效');
  for(const k of ['level','merit','loyalty','troops','wounded'])fail(o[k]===undefined||Number.isFinite(o[k]),'武将初始数值无效');
  fail(!o.type||['spear','halberd','cavalry','archer'].includes(o.type),'初始兵种无效');
  for(const v of [o.debutDate,o.freeDate])fail(!v||typeof v==='object'&&[v.year,v.month,v.day].every(Number.isFinite),'人物日期无效');
 }
 fail(Array.isArray(diplomacy)&&diplomacy.length<=2016,'外交配置无效');
 const pairs=new Set();for(const r of diplomacy){const key=[r.a,r.b].sort().join(':');fail(factions.includes(r.a)&&factions.includes(r.b)&&r.a!==r.b&&!pairs.has(key)&&['war','peace','nonaggression','alliance'].includes(r.state)&&[r.relation,r.days].every(Number.isFinite),'外交对象、状态或重复关系无效');pairs.add(key);}
 const d={format:'sango-scenario',version:2,id,sourceScenario,name:name.trim(),description,year,month,day,kind,level,officerLibrary:library,factions:[...factions],forces:forces.map(({id,name,color,leaderId,capitalId})=>({id,name,color,leaderId,capitalId})),cities:cities.map(c=>({id:c.id,owner:c.owner,...Object.fromEntries(['gold','grain','manpower','order','wallIntegrity','buildings','techs'].filter(k=>c[k]!==undefined).map(k=>[k,structuredClone(c[k])]))})),officers:officers.map(o=>Object.fromEntries(['id','state','faction','cityId','level','merit','loyalty','troops','wounded','type','role','debutDate','freeDate','captor'].filter(k=>o[k]!==undefined).map(k=>[k,structuredClone(o[k])]))),diplomacy:diplomacy.map(({a,b,state,relation,days})=>({a,b,state,relation,days}))};
 if(playable){const errors=scenarioDocumentErrors(d);fail(!errors.length,errors.slice(0,6).join('；'));}
 return d;
}
export function scenarioRuntimeId(document){
 const raw=JSON.stringify(validateScenarioDocument(document));let a=2166136261,b=5381;
 for(let i=0;i<raw.length;i++){a=Math.imul(a^raw.charCodeAt(i),16777619);b=Math.imul(b,33)^raw.charCodeAt(i);}
 return 'custom-play:'+document.id.slice(9)+':'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16);
}
