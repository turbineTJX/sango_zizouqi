import {TECHNOLOGY_AFFINITIES,TECHNOLOGY_BRANCHES} from './data/design/technologies.mjs';
export function validateTechnologyDesigns(tables,check){
 const rows=tables.technologies.records,ids=new Set(rows.map(r=>r.id)),byId=Object.fromEntries(rows.map(r=>[r.id,r.parameters]));
 check(rows.length===20&&ids.size===20,'technologies','科技树须有20个独立节点');
 const keys=['branch','tier','requiredProgress','cost','days','prerequisites','buildings','anyBuildings','order','affinity','troopId','waterRequired','unlocks','income','militaryDiscount','constructionDiscount','visionRadius','description'];
 const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
 for(const r of rows){
  const p=r.parameters,path='technologies.'+r.id;
  check(p&&Object.keys(p).every(k=>keys.includes(k))&&Object.keys(p).length===keys.length,path,'科技字段无效或未接入');
  check(TECHNOLOGY_BRANCHES[p.branch]&&[1,2].includes(p.tier)&&int(p.requiredProgress,1,100)&&int(p.cost,1,10000)&&int(p.days,1,30),path,'科技分支、层级、费用或工期无效');
  check(Array.isArray(p.prerequisites)&&new Set(p.prerequisites).size===p.prerequisites.length&&p.prerequisites.every(id=>ids.has(id)&&byId[id].tier<p.tier)&&(p.tier===1?p.prerequisites.length===0:p.prerequisites.length>0),path,'前置科技须引用更低层节点');
  check(p.buildings&&Object.entries(p.buildings).every(([key,n])=>tables.buildings[key]&&int(n,1,5))&&Array.isArray(p.anyBuildings)&&new Set(p.anyBuildings).size===p.anyBuildings.length&&p.anyBuildings.every(key=>tables.buildings[key]),path,'前置设施无效');
  check(p.branch!=='military'||!Object.hasOwn(p.buildings,'barracks')&&!p.anyBuildings.includes('barracks'),path,'军务科技不能以兵营等级解锁');
  check(int(p.order,0,100)&&(p.affinity===null||TECHNOLOGY_AFFINITIES[p.affinity])&&(p.troopId===null||tables.troops[p.troopId]?.category==='troop')&&typeof p.waterRequired==='boolean',path,'城市或兵种条件无效');
  check(Array.isArray(p.unlocks)&&p.unlocks.every(id=>tables.troops[id]?.technology===r.id)&&(p.troopId===null||p.unlocks.includes(p.troopId)),path,'解锁引用与兵种设计不符');
  check(p.income&&Object.entries(p.income).every(([key,n])=>['gold','grain','manpower'].includes(key)&&Number.isFinite(n)&&n>0&&n<=.25),path,'收入科技参数无效');
  check([p.militaryDiscount,p.constructionDiscount].every(n=>Number.isFinite(n)&&n>=0&&n<=.5)&&int(p.visionRadius,0,50)&&typeof p.description==='string',path,'科技效果无效');
 }
 const cities=new Map([...tables.cities.filter(c=>c.kind==='city'),...tables.demoCities].map(c=>[c.id,c]));
 for(const id of cities.keys())check(!!tables.cityTechnologies[id],'cityTechnologies.'+id,'城市缺少固定科技资质');
 for(const [id,p]of Object.entries(tables.cityTechnologies)){
  const path='cityTechnologies.'+id;
  check(cities.has(id)&&Array.isArray(p.affinities)&&p.affinities.length>=1&&p.affinities.length<=2&&new Set(p.affinities).size===p.affinities.length&&p.affinities.every(a=>TECHNOLOGY_AFFINITIES[a]),path,'地方资质无效');
  check(Array.isArray(p.troops)&&p.troops.length>=1&&p.troops.length<=2&&new Set(p.troops).size===p.troops.length&&p.troops.every(t=>byId[t]?.troopId===t),path,'特色兵种资质无效');
 }
 for(const [id,t]of Object.entries(tables.troops))if(t.technology)check(byId[t.technology]?.unlocks.includes(id),'troops.'+id,'科技未解锁此兵种或装备');
}
