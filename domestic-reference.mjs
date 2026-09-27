import {DIRECTIONS,DIRECTION_STATS,BUILDINGS,ACTIONS} from './domestic-designs.mjs';
import {detailLink} from './ui-detail-table.mjs';
const labels={politics:'政治',leadership:'统率',force:'武力',intellect:'智力',charm:'魅力'};
export function domesticReference(direction=null){
 const entries=Object.entries(DIRECTIONS).filter(([id])=>!direction||id===direction);
 return detailLink('内政说明',entries.map(([id,name])=>({name,rows:[['委任','',labels[DIRECTION_STATS[id]]+'与适用特性影响办理效果；负责人自动办理本方向事务。'],...Object.values(ACTIONS).filter(a=>a.direction===id).map(a=>[a.name,'','基础费用 '+a.cost+' 金 · 基础时间 '+a.days+' 天']),['任职','', '在城武将可兼任内政与部队主将；出征结束本城任职，围城期间内政暂停。'],['协作','', '同城同方向每旬至多协作一次，机会受相性与关系影响；保留军费不用于内政。']]})),direction?'方向说明':'内政说明');
}
export function buildingReference(c,key){
 const b=BUILDINGS[key];return detailLink('设施说明',[{name:b.name,rows:[[b.name,'',b.description],['等级','',String(c[key])],['建设','','基础费用 '+b.cost+' 金 · 基础时间 '+b.days+' 天']]},{name:'设施一览',rows:Object.values(BUILDINGS).map(x=>[x.name,'',x.description])}],b.name+' Lv.'+c[key]);
}
