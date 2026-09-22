import {ROAD_NETWORK_DESIGN} from './data/design/road-network.mjs';
import {STATUS_DEFINITIONS,REMEDIES} from './data/design/battle-statuses.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {MERIT_RULES} from './data/design/progression.mjs';
import {validateStrategyDesigns} from './design-strategy-validation.mjs';
import {BUILDING_DESIGNS} from './data/design/buildings.mjs';
import {DOMESTIC_ACTION_DESIGNS,DOMESTIC_DIRECTIONS,DOMESTIC_DIRECTION_STATS} from './data/design/domestic-actions.mjs';
import {NATIONAL_ROAD_DESIGNS,DEMO_ROAD_DESIGNS} from './data/design/roads.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {NATIONAL_MAP as MAP_SOURCE} from './data/national-map.mjs';
import {TRAIT_DESIGNS} from './data/design/traits.mjs';
import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {OFFICER_DESIGNS} from './data/design/officers.mjs';
import {CITY_DESIGNS,DEMO_CITY_DESIGNS} from './data/design/cities.mjs';
import {OFFICER_ASSIGNMENTS,TROOP_TACTIC_POOLS,INTELLECT_TACTIC_POOLS} from './data/design/assignments.mjs';
import {DESIGN_FIELDS,DESIGN_EFFECTS,ENGINE_TRAIT_IDS} from './data/design/schema.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
export const DESIGN_TABLES={roadNetwork:ROAD_NETWORK_DESIGN,economy:ECONOMY_RULES,progression:MERIT_RULES,technologies:TECHNOLOGIES,buildings:BUILDING_DESIGNS,domesticActions:DOMESTIC_ACTION_DESIGNS,directions:DOMESTIC_DIRECTIONS,directionStats:DOMESTIC_DIRECTION_STATS,roads:NATIONAL_ROAD_DESIGNS,demoRoads:DEMO_ROAD_DESIGNS,movement:MOVEMENT_RULES,traits:TRAIT_DESIGNS,tactics:TACTIC_DESIGNS,stratagems:STRATAGEM_DESIGNS,troops:TROOP_DESIGNS,officers:OFFICER_DESIGNS,cities:CITY_DESIGNS,demoCities:DEMO_CITY_DESIGNS,assignments:OFFICER_ASSIGNMENTS,troopPools:TROOP_TACTIC_POOLS,intellectPools:INTELLECT_TACTIC_POOLS};
export function validateDesignTables(tables=DESIGN_TABLES){
 const errors=[],check=(ok,path,msg)=>{if(!ok)errors.push(path+'：'+msg);},exists=(table,id)=>Object.hasOwn(table,id),numeric=(n,min=0,max=Infinity)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
 const p=tables.progression;check(p&&p.costs?.length===9&&p.costs.every((n,i)=>Number.isSafeInteger(n)&&n>0&&(!i||n>p.costs[i-1]))&&numeric(p.battleDivisor,1),'progression','升级成本须逐级递增且兑换除数有效');
 check(new Set(Object.values(STATUS_DEFINITIONS).map(s=>s.name)).size===Object.keys(STATUS_DEFINITIONS).length,'statuses','状态名称不能重复');
 const ids=(list,table,path)=>{check(Array.isArray(list),path,'必须是ID数组');if(!Array.isArray(list))return;check(new Set(list).size===list.length,path,'重复ID');for(const id of list)check(exists(table,id),path,'未知引用 '+id);};
 for(const [name,rows] of Object.entries(tables)){
  if(!DESIGN_FIELDS[name]&&name!=='demoCities')continue;
  for(const [key,r] of Object.entries(rows)){
   const path=name+'.'+(r?.id||key);check(r&&typeof r==='object'&&!Array.isArray(r),path,'必须为记录');if(!r||typeof r!=='object')continue;
   check(typeof r.name==='string'&&r.name.length>0,path+'.name','名称不能为空');
   const nameLengths={traits:[2],tactics:[2,4],stratagems:[4]}[name];
   if(nameLengths)check(typeof r.name==='string'&&/^\p{Script=Han}+$/u.test(r.name)&&nameLengths.includes([...r.name].length),path+'.name',({traits:'特性名称须为两个汉字',tactics:'战法名称须为两个或四个汉字',stratagems:'军略名称须为四个汉字'})[name]);
   for(const field of Object.keys(r))check((DESIGN_FIELDS[name==='demoCities'?'cities':name]).includes(field),path,'未接入字段 '+field);
  }
 }
 const techIds=new Set();for(const r of tables.technologies.records){const p=r.parameters;check(!techIds.has(r.id)&&r.id===p.troopId&&exists(tables.troops,p.troopId),'technologies.'+r.id,'科技或兵种引用无效');techIds.add(r.id);check(numeric(p.requiredProgress,1)&&p.requiresTrial===true&&typeof p.waterRequired==='boolean','technologies.'+r.id,'科技参数无效');}
 for(const [id,t] of Object.entries(tables.troops)){
  check(exists(tables.troops,t.family),'troops.'+id+'.family','适性兵科不存在');
  check(numeric(t.goldPerThousand,1),'troops.'+id+'.goldPerThousand','编制费用须为正数');
  for(const key of ['attack','defense','discipline','range','siegeFactor'])check(numeric(t[key]),'troops.'+id+'.'+key,'须为非负数');
  for(const key of ['move','interval'])check(numeric(t[key],Number.EPSILON),'troops.'+id+'.'+key,'须大于0');
  check(t.beats===null||exists(tables.troops,t.beats),'troops.'+id+'.beats','克制兵种不存在');
 }
 for(const [id,t] of Object.entries(tables.tactics)){
  if(t.effect==='status')check(Object.hasOwn(STATUS_DEFINITIONS,t.statusKey)&&numeric(t.steps,1),'tactics.'+id,'状态处理器或持续无效');
  if(t.effect==='remedy')check(Object.hasOwn(REMEDIES,t.remedy),'tactics.'+id,'解除动作无效');
  if(t.stasisDays!==undefined)check(['mirage','mist'].includes(t.effect)&&Number.isInteger(t.stasisDays)&&t.stasisDays>0&&numeric(t.stasisHealth,0,1)&&Number.isInteger(t.stasisLockDays)&&t.stasisLockDays>t.stasisDays,'tactics.'+id+'.stasis','避战参数无效');
  check(t.id===id,'tactics.'+id,'记录ID与键不一致');check(DESIGN_EFFECTS.tactics.includes(t.effect),'tactics.'+id+'.effect','引擎尚未支持此效果');
  check(['low','high','special'].includes(t.learningTier),'tactics.'+id+'.learningTier','无效学习类别');check(['force','intellect','politics'].includes(t.category),'tactics.'+id+'.category','无效能力类别');
  for(const key of ['cooldown','threshold','intentCost','maxUses'])check(numeric(t[key]),'tactics.'+id+'.'+key,'须为非负数');
  check(Number.isInteger(t.maxUses)&&t.maxUses>=0,'tactics.'+id+'.maxUses','须为非负整数');
  check(t.passive?t.maxUses===0:t.maxUses>0,'tactics.'+id+'.maxUses','主动战法须有限次，常驻光环须为0');
 }
 for(const [id,s] of Object.entries(tables.stratagems)){
  check(DESIGN_EFFECTS.stratagems.includes(s.effect||id),'stratagems.'+id+'.effect','引擎尚未支持此效果');check(numeric(s.duration),'stratagems.'+id+'.duration','持续时间无效');
  check(['ordinary','exclusive'].includes(s.pool),'stratagems.'+id+'.pool','军略池无效');if(s.pool==='exclusive')check(exists(tables.officers,s.owner),'stratagems.'+id+'.owner','专属持有者不存在');
 }
 for(const [id,t] of Object.entries(tables.traits)){
  if(t.aura){check(id==='formationSupport'&&Object.keys(t.aura).every(k=>['interval','range','healFraction','intent','basePower','politicsScale'].includes(k)),'traits.'+id+'.aura','未实现的光环参数');for(const key of ['interval','range','healFraction','intent','basePower','politicsScale'])check(numeric(t.aura[key],key==='interval'?1:0),'traits.'+id+'.aura.'+key,'光环参数无效');}
  if(t.politicsStats)check(Object.entries(t.politicsStats).every(([key,v])=>['defense','discipline'].includes(key)&&numeric(v)),'traits.'+id+'.politicsStats','政治特性参数无效');
  check(ENGINE_TRAIT_IDS.includes(id)||t.domain==='command','traits.'+id,'新特技须先接入效果处理器');
 }
 for(const [id,t] of Object.entries(tables.traits))if(t.domain==='command'){
  check(['leader','advisor'].includes(t.role),'traits.'+id+'.role','无效任职');check(t.scope==='army','traits.'+id+'.scope','任职特技必须作用于军团');
  check(t.stats&&Object.keys(t.stats).length>0,'traits.'+id+'.stats','缺少效果');for(const [key,n] of Object.entries(t.stats||{}))check(['attack','defense','discipline','move','range','siege','attackSpeed','martialPower','strategyPower','supportPower'].includes(key)&&numeric(n),'traits.'+id+'.stats.'+key,'无效或负面加成');
 }
 for(const [id,u] of Object.entries(tables.officers)){
  check(u.id===id,'officers.'+id,'记录ID与键不一致');for(const key of ['leadership','force','intellect','politics','charm'])check(numeric(u[key],0,100),'officers.'+id+'.'+key,'须为0～100');
  check(exists(tables.troops,u.type),'officers.'+id+'.type','兵种不存在');for(const type of Object.keys(tables.troops))check(Number.isInteger(u.aptitudes?.[type])&&numeric(u.aptitudes[type],0,3),'officers.'+id+'.aptitudes.'+type,'适性须为0～3');
  const r=u.relations||{};for(const key of ['fatherId','motherId'])if(r[key])check(exists(tables.officers,r[key]),'officers.'+id+'.relations.'+key,'人物不存在');for(const key of ['spouseIds','swornSiblingIds','likedIds','dislikedIds'])ids(r[key],tables.officers,'officers.'+id+'.relations.'+key);
  check(exists(tables.assignments,id),'assignments.'+id,'缺少武将能力分配');
 }
 for(const [id,a] of Object.entries(tables.assignments)){
  check(exists(tables.officers,id),'assignments.'+id,'武将不存在');ids(a.traits,tables.traits,'assignments.'+id+'.traits');ids(a.stratagems,tables.stratagems,'assignments.'+id+'.stratagems');
  if(a.specialTactic)check(tables.tactics[a.specialTactic]?.special,'assignments.'+id+'.specialTactic','须引用专属战法');
  const u=tables.officers[id];if(u){check(a.stratagems.length<=(u.intellect<70?0:id==='person-290'?3:2),'assignments.'+id+'.stratagems','超过当前军略资格或名额');}
  for(const key of a.stratagems)if(tables.stratagems[key]?.pool==='exclusive')check(tables.stratagems[key].owner===id,'assignments.'+id+'.stratagems','专属军略归属不符');
 }
 for(const name of ['troopPools','intellectPools']){
  for(const type of Object.keys(tables.troops))ids(tables[name][type],tables.tactics,name+'.'+type);
  for(const type of Object.keys(tables[name]))check(exists(tables.troops,type),name+'.'+type,'兵种不存在');
 }
 for(const type of Object.keys(tables.troops)){
  const all=[...(tables.troopPools[type]||[]),...(tables.intellectPools[type]||[])];
  const small=all.filter(id=>tables.tactics[id]?.learningTier==='low'),big=all.filter(id=>tables.tactics[id]?.learningTier==='high');
  check(all.length===3&&new Set(all).size===3&&small.length===2&&big.length===1,'fixedTactics.'+type,'须固定两个小战法和一个大战法');
  check(small.filter(id=>tables.tactics[id]?.category==='force').length===1&&small.filter(id=>tables.tactics[id]?.category==='intellect').length===1,'fixedTactics.'+type,'小战法须武技、谋略各一项');
 }
 for(const name of ['cities','demoCities']){
  check(new Set(tables[name].map(c=>c.id)).size===tables[name].length,name,'重复据点ID');
  for(const c of tables[name]){check(typeof c.id==='string'&&c.id.length>0,name,'缺少据点ID');for(const key of ['x','y'])check(numeric(c[key]),name+'.'+c.id+'.'+key,'坐标无效');}
 }
 const cityIds=new Set(tables.cities.map(c=>c.id));
 for(const [port,parent] of Object.entries(MAP_SOURCE.portParents))check(cityIds.has(port)&&cityIds.has(parent),'cities.portParents','港口归属引用无效 '+port);
 errors.push(...validateStrategyDesigns(tables));
 return errors;
}
export function assertDesignTables(tables=DESIGN_TABLES){const errors=validateDesignTables(tables);if(errors.length)throw new Error('设计表校验失败：\n'+errors.join('\n'));return tables;}
