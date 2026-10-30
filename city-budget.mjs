import {cityRecurringIncome,cityMaintenance} from './economy.mjs';
import {actionCandidates,cityMilitary,ACTIONS,pendingDomesticOrder} from './domestic.mjs';
import {citySupplyBudgets,forecastArmySupply,localFoodUse} from './city-logistics.mjs';
export {citySupplyBudgets} from './city-logistics.mjs';
import {plannedGrain,plannedOfficer} from './strategic-intent.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {appendActivityNode} from './activity-nodes.mjs';
import {playerFaction,isPlayerControlled} from './player-faction.mjs';
import {diplomaticAssetReserve} from './diplomacy-relations.mjs';
import {trainingCost} from './troop-training.mjs';
import {DIPLOMACY_RULES,DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';
import {withPlanningQueries} from './planning-queries.mjs';

const fmt=n=>Math.ceil(n).toLocaleString('zh-CN');
let budgetQueryScope=null;
export function withCityBudgetQueries(evaluate){
 if(budgetQueryScope)return evaluate();budgetQueryScope={cities:new WeakMap(),forecasts:new WeakMap(),nextForecast:0};
 try{return evaluate();}finally{budgetQueryScope=null;}
}
function cachedBudget(s,c,kind,key,evaluate){
 if(!budgetQueryScope)return evaluate();
 let cities=budgetQueryScope.cities.get(s);if(!cities){cities=new WeakMap();budgetQueryScope.cities.set(s,cities);}
 let values=cities.get(c);if(!values){values=new Map();cities.set(c,values);}
 const cacheKey=kind+key;if(!values.has(cacheKey))values.set(cacheKey,evaluate());
 // Summaries are flat records. Orders retain their original read-only source
 // references, just as the uncached filter does; containers remain detached.
 return Object.fromEntries(Object.entries(values.get(cacheKey)).map(([name,value])=>[name,Array.isArray(value)?[...value]:value&&typeof value==='object'?{...value}:value]));
}
// A read-only forecast. Paid work is excluded, and speculative work rewards
// or cargo still on the road are never treated as spendable city stocks.
// Estimate one executable round of work, rather than a separate construction
// project for every waiting officer. Proposals remain their exact commitments.
function nextWorkCost(s,c,assignments,workPolicy){
 const slots=new Set(),slot=pick=>{const d=ACTIONS[pick.key];return ['build','repair'].includes(d.kind)?'construction':d.kind==='research'?'research':['effect','discount','prepare'].includes(d.kind)?d.kind+':'+d.value:null;};
 let cost=0;
 for(const a of assignments.filter(a=>!a.action&&a.proposal)){cost+=a.proposal.expenses.gold;const key=slot(a.proposal.pick);if(key)slots.add(key);}
 let cash=Math.max(0,c.gold-cityGoldCommitment(s,c).total-cost);
 for(const a of assignments.filter(a=>!a.action&&!a.proposal&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId))){
  const pick=actionCandidates(s,a).find(p=>{const d=ACTIONS[p.key],key=slot(p);
   const essential=['cash','grain','heal','rescue'].includes(d.kind)||d.kind==='recruit'&&p.recruitMode==='reserve'||d.kind==='trade'&&d.value==='buy';
   return p.cost<=cash&&(!key||!slots.has(key))&&(workPolicy!=='essential'||essential);
  });
  if(!pick)continue;cost+=pick.cost;cash-=pick.cost;const key=slot(pick);if(key)slots.add(key);
 }
 return cost;
}
export function cityGoldCommitment(s,c,{includeWork=false,workPolicy='all'}={}){
 return cachedBudget(s,c,'gold',JSON.stringify([includeWork,workPolicy]),()=>readCityGoldCommitment(s,c,{includeWork,workPolicy}));
}
function readCityGoldCommitment(s,c,{includeWork,workPolicy}){
 const days=ECONOMY_RULES.budget.days,toHarvest=10-(s.campaign.day-1)%10;
 const assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id);
 const work=includeWork?nextWorkCost(s,c,assignments,workPolicy):0;
 const diplomacy=s.campaign.diplomacy,appointments=(diplomacy?.assignments||[]).filter(a=>a.faction===c.owner&&a.homeCity===c.id&&!a.projectId&&!a.dismissed);
 const farePerDay=[...c.units,...s.campaign.idle.filter(o=>o.location===c.id).map(o=>o.unit)].filter(u=>u.mission?.type==='diplomacy'&&u.mission.homeCity===c.id).length*DIPLOMACY_RULES.dailyFare;
 const contactFees=appointments.reduce((n,a)=>n+DIPLOMACY_DIRECTIONS[a.direction].fee,0),fees=contactFees+farePerDay*days;
 const obligations=(diplomacy?.contracts||[]).filter(p=>p.status==='signed'&&p.sites[c.owner]===c.id).flatMap(p=>p.clauses.filter(x=>x.kind==='gold'&&x.deferred&&x.from===c.owner&&x.status==='waiting'&&x.dueDay<s.campaign.day+days).map(x=>({due:x.dueDay,amount:Math.max(0,x.amount-x.delivered-(p.escrow.find(e=>e.clauseId===x.id)?.amount||0))})));
 const debt=obligations.reduce((n,x)=>n+x.amount,0),debtBefore=obligations.filter(x=>x.due<s.campaign.day+toHarvest).reduce((n,x)=>n+x.amount,0);
 const orders=s.campaign.domestic.orders.filter(q=>q.cityId===c.id);
 const training=orders.filter(q=>q.kind==='expedition').reduce((n,q)=>n+(q.troops?c.units.reduce((m,u)=>m+trainingCost(u,Math.max(0,(q.troops[u.id]||u.troops)-u.troops),c),0):0),0);
 const cargo=orders.filter(q=>q.kind==='transfer').reduce((n,q)=>n+(q.cargo?.gold||0),0);
 const goldBuffer=Math.max(c.budget.goldReserve,fees||debt?(diplomacy?.policies[c.owner]?.goldReserve||0):0);
 const goldReserved=goldBuffer+diplomaticAssetReserve(s,c.owner,'gold',c.id);
 const upkeep=cityMaintenance(s,c),maintenance=upkeep.gold;
 return {work,fees,training,cargo,debt,orders,contactFees,farePerDay,debtBefore,maintenance,payroll:{gold:upkeep.salary,arrears:upkeep.arrears,count:upkeep.officers.length},goldBuffer,goldReserved,total:Math.ceil(work+fees+training+cargo+debt+maintenance)+goldReserved};
}
export function cityBudget(s,c,{supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies}),includeWork=true,workPolicy='all'}={}){
 // Supply forecasts can be caller-provided counterfactuals. Their object
 // identities are part of the query key, rather than just the city's id.
 if(!budgetQueryScope)return readCityBudget(s,c,{supplies,supplyForecast,includeWork,workPolicy});
 const roots=budgetQueryScope.forecasts;
 let bySupplies=roots.get(supplies);if(!bySupplies){bySupplies=new WeakMap();roots.set(supplies,bySupplies);}
 let token=bySupplies.get(supplyForecast);if(token===undefined){token=++budgetQueryScope.nextForecast;bySupplies.set(supplyForecast,token);}
 return cachedBudget(s,c,'budget',JSON.stringify([includeWork,workPolicy,token]),()=>readCityBudget(s,c,{supplies,supplyForecast,includeWork,workPolicy}));
}
function readCityBudget(s,c,{supplies,supplyForecast,includeWork,workPolicy}){
 const days=ECONOMY_RULES.budget.days,toHarvest=10-(s.campaign.day-1)%10;
 const besieged=s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id);
 const income=besieged?{gold:0,grain:0,manpower:0}:cityRecurringIncome(s,c);
 const {work,fees,training,cargo,debt,orders,contactFees,farePerDay,debtBefore,maintenance,payroll,goldBuffer,goldReserved}=cityGoldCommitment(s,c,{includeWork,workPolicy});
 const localDaily=localFoodUse(c),supply=supplyForecast.cities[c.id].grain,supplyBefore=supplyForecast.cities[c.id].daily.slice(0,toHarvest).reduce((n,x)=>n+x,0);
 const grainOrders=orders.filter(q=>q.kind==='transfer'&&isPlayerControlled(s,q.faction)).reduce((n,q)=>n+(q.cargo?.grain||0),0);
 // Planned grain includes AI, diplomatic and non-player transport reservations.
 const grainReserved=plannedGrain(s,c.id)+grainOrders+c.budget.grainReserve;
 const costs={gold:Math.ceil(work+fees+training+cargo+debt+maintenance),grain:Math.ceil(localDaily*days+supply)};
 const reserve={gold:goldReserved,grain:grainReserved};
 const projected={gold:c.gold+income.gold-costs.gold-reserve.gold,grain:c.grain+income.grain-costs.grain-reserve.grain};
 // Upkeep is paid at the same settlement as recurring income, not before it.
 const beforeHarvest={gold:c.gold-Math.ceil(work+contactFees+farePerDay*toHarvest+training+cargo+debtBefore)-reserve.gold,grain:c.grain-Math.ceil(localDaily*toHarvest+supplyBefore)-reserve.grain};
 const shortages={gold:Math.ceil(Math.max(0,-projected.gold,-beforeHarvest.gold)),grain:Math.ceil(Math.max(0,-projected.grain,-beforeHarvest.grain))};
 // A savings target is not a bill. Keep it in planning budgets, but report only
 // uncovered use and commitments; promised cargo and assets remain reserved.
 const buffer={gold:goldBuffer,grain:c.budget.grainReserve};
 const fundingShortages=Object.fromEntries(['gold','grain'].map(k=>[k,Math.max(0,shortages[k]-buffer[k])]));
 const reserveGaps=Object.fromEntries(['gold','grain'].map(k=>[k,shortages[k]-fundingShortages[k]]));
 const fundingDaysSupply=costs.grain?Math.max(0,c.grain-reserve.grain+buffer.grain)/(costs.grain/days):null;
 return {days,toHarvest,stocks:{gold:c.gold,grain:c.grain},income,costs,reserve,projected,beforeHarvest,shortages,fundingShortages,reserveGaps,fundingDaysSupply,dailyGrain:costs.grain/days,daysSupply:costs.grain?Math.max(0,c.grain-reserve.grain)/(costs.grain/days):null,work,fees,training,cargo,debt,payroll};
}
export function setCityBudget(s,cityId,key,value,{faction=playerFaction(s),scheduled=false}={}){
 const c=s.cities.find(c=>c.id===cityId);
 if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning')||c?.owner!==faction||!['goldReserve','grainReserve'].includes(key)||!Number.isSafeInteger(value)||value<0||value>ECONOMY_RULES.budget.maxReserve)return '预算设置无效';
 c.budget[key]=value;return null;
}
export function updateCityBudgetAlerts(s){
 // Compare all budgets against one unchanged world, then publish warnings only
 // after the read scope closes. Notices never change stock or appointments.
 const budgets=withPlanningQueries(s,()=>{
  const supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies});
  return new Map(s.cities.filter(c=>c.owner===playerFaction(s)).map(c=>[c,cityBudget(s,c,{supplies,supplyForecast})]));
 });
 for(const c of s.cities){
  if(!budgets.has(c)){c.budget.warning='';continue;}
  const b=budgets.get(c),warning=['gold','grain'].filter(k=>b.fundingShortages[k]>0).map(k=>k==='grain'&&b.fundingDaysSupply!==null&&b.fundingDaysSupply<=ECONOMY_RULES.budget.criticalFoodDays?'grain-critical':k).join(',');
  if(!warning){c.budget.warning='';continue;}
  if(warning===c.budget.warning)continue;
  c.budget.warning=warning;c.budget.warningSequence++;
  const text=`${c.name}钱粮预算不足：${b.fundingShortages.gold?'金缺口约'+fmt(b.fundingShortages.gold)+'；':''}${b.fundingShortages.grain?'粮缺口约'+fmt(b.fundingShortages.grain)+'，现粮约可维持'+(b.fundingDaysSupply??0).toFixed(1)+'天；':''}请调整本城事务、兵力或安排运输。`;
  appendActivityNode(s,{sourceId:`city-budget:${c.id}:${c.budget.warningSequence}`,category:'domestic',phase:'budget-warning',faction:c.owner,cityId:c.id,text,result:{budget:b}});
 }
}
export function validateCityBudget(c,fail){
 const b=c.budget;fail(b&&['goldReserve','grainReserve','warningSequence'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0)&&b.goldReserve<=ECONOMY_RULES.budget.maxReserve&&b.grainReserve<=ECONOMY_RULES.budget.maxReserve&&['','gold','grain','gold,grain','grain-critical','gold,grain-critical'].includes(b.warning),'城市预算无效');
}
export function cityBudgetMarkup(s,c,{editable=false}={}){
 const b=cityBudget(s,c),short=b.shortages.gold||b.shortages.grain;
 const funding=b.fundingShortages.gold||b.fundingShortages.grain;
 const status=funding?`${b.fundingShortages.gold?'金不足约 '+fmt(b.fundingShortages.gold)+'；':''}${b.fundingShortages.grain?'粮不足约 '+fmt(b.fundingShortages.grain)+'；':''}`:'钱粮充足';
 const bufferStatus=[['gold','金'],['grain','粮']].filter(([k])=>b.reserveGaps[k]).map(([k,label])=>` · 预留${label}尚差 ${fmt(b.reserveGaps[k])}`).join('');
 const payrollStatus=`俸禄 ${b.payroll.count} 人 · ${fmt(b.payroll.gold)} 金／旬${b.payroll.arrears?' · 欠俸 '+fmt(b.payroll.arrears)+' 金':''}`;
 return `<section class="city-budget ${short?'budget-shortage':''}" data-city-budget="${c.id}"><h3>${c.name} · 钱粮预算（未来一旬）</h3><div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>资源</th><th>现存</th><th>预计收入</th><th>预计支出</th><th>预留</th><th>预计结余</th></tr></thead><tbody>${[['gold','金'],['grain','粮']].map(([k,label])=>`<tr><th>${label}</th><td data-label="现存">${fmt(b.stocks[k])}</td><td data-label="预计收入">${fmt(b.income[k])}</td><td data-label="预计支出">${fmt(b.costs[k])}</td><td data-label="预留">${fmt(b.reserve[k])}</td><td data-label="预计结余">${fmt(b.projected[k])}</td></tr>`).join('')}</tbody></table></div><p class="budget-status" role="status">${status}${bufferStatus}${b.fundingDaysSupply===null?'':` · 口粮约 ${b.fundingDaysSupply.toFixed(1)} 天`}</p><p class="budget-payroll">${payrollStatus}</p>${editable?`<div class="city-budget-settings">${[['goldReserve','保留金'],['grainReserve','保留粮']].map(([key,label])=>`<label class="strategy-field">${label}<input type="number" min="0" max="1000000" step="1" inputmode="numeric" data-city-budget-key="${key}" data-city-budget-id="${c.id}" value="${c.budget[key]}"></label>`).join('')}<button class="button secondary" data-action="city-budget-save" data-city="${c.id}">保存预算</button><button class="text-button" data-action="city-budget-reset" data-city="${c.id}">重置</button><span data-budget-draft-status="${c.id}" role="status"></span></div>`:''}</section>`;
}
export function citySoldierCounts(s,c){
 const troops=Math.floor(cityMilitary(s,c).troops),total=troops+c.manpower;
 return {troops,total};
}
export function citySoldierLabel(s,c,y=-25){
 if(c.manpower===null||c.intelligenceHidden)return '';
 const n=citySoldierCounts(s,c);
 return `<g class="map-city-soldiers" aria-label="士兵 ${fmt(n.troops)} / 总兵源 ${fmt(n.total)}"><rect x="-45" y="${y-10}" width="90" height="15" rx="3"/><text class="map-city-strength" y="${y}">${fmt(n.troops)} / ${fmt(n.total)}</text></g>`;
}
