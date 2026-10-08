import {buildingUnitHp} from './building-durability.mjs';
import {DIRECTIONS,DIRECTION_STATS,BUILDINGS,ACTIONS} from './domestic-designs.mjs';
import {detailLink} from './ui-detail-table.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
const labels={politics:'政治',leadership:'统率',force:'武力',intellect:'智力',charm:'魅力'};
export function domesticReference(direction=null){
 const entries=Object.entries(DIRECTIONS).filter(([id])=>!direction||id===direction);
 return detailLink('内政说明',entries.map(([id,name])=>({name,rows:[['委任','',labels[DIRECTION_STATS[id]]+'与适用特性影响成事把握及成果；负责人自动拟定本方向事务。'],['提案','','需用钱粮之事先呈案，准奏后开办；暂缓不扣款。本势力可开启自动准奏。'],['成败','','办理可能未成或只获部分成果；施工受阻保留进度，研制未成保留原有进度，接续不重复收费。'],...Object.values(ACTIONS).filter(a=>a.direction===id).map(a=>[a.name,'',a.kind==='recruit'?'兵源不足时征集预备兵，费用 '+(ECONOMY_RULES.recruitment.reserveCost+(a.id==='urgent'?a.cost:0))+' 金；兵源充足时整补部队，支付 '+a.cost+' 金及实际装备费。办理 '+a.days+' 天。':a.kind==='research'?'按城市科技项目支付一次费用，基准10或20个工作日；逐日研制，智力、适用特性、工坊及协作影响成果，研究完成后生效。':a.kind==='heal'?'全体目标共用本次救治额度，恢复真实伤兵。基础费用 '+a.cost+' 金及200粮 · 基础时间 '+a.days+' 天':'基础费用 '+a.cost+' 金 · 基础时间 '+a.days+' 天']),['任职','', '在城武将可兼任内政与部队主将；出征结束本城任职，围城期间内政暂停。'],['协作','', '同城同方向每旬至多协作一次，机会受相性与关系影响；保留金不用于内政。']]})),direction?'方向说明':'内政说明');
}
export function buildingReference(c,key){
 const b=BUILDINGS[key],durability=Object.values(c.buildings[key]).reduce((sum,a)=>({hp:sum.hp+a.hp,maxHp:sum.maxHp+a.maxHp}),{hp:0,maxHp:0});return detailLink('设施说明',[{name:b.name,rows:[[b.name,'',b.description],['等级','',String(c[key])],['耐久','',durability.hp+' / '+(durability.maxHp||buildingUnitHp(key))],['建设','','基础费用 '+b.cost+' 金 · 基础时间 '+b.days+' 天；施工和修复按实际耐久推进，修复费用按缺失耐久折算。']]},{name:'设施一览',rows:Object.values(BUILDINGS).map(x=>[x.name,'',x.description])}],b.name+' Lv.'+c[key]);
}
