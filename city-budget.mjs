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

const fmt=n=>Math.ceil(n).toLocaleString('zh-CN');
// A read-only forecast. Paid work is excluded, and speculative work rewards
// or cargo still on the road are never treated as spendable city stocks.
// Estimate one executable round of work, rather than a separate construction
// project for every waiting officer. Proposals remain their exact commitments.
function nextWorkCost(s,c,assignments,workPolicy){
 const slots=new Set(),slot=pick=>{const d=ACTIONS[pick.key];return ['build','repair'].includes(d.kind)?'construction':d.kind==='research'?'research':['effect','discount','prepare'].includes(d.kind)?d.kind+':'+d.value:null;};
 let cost=0;
 for(const a of assignments.filter(a=>!a.action&&a.proposal)){cost+=a.proposal.expenses.gold;const key=slot(a.proposal.pick);if(key)slots.add(key);}
 for(const a of assignments.filter(a=>!a.action&&!a.proposal&&!pendingDomesticOrder(s,a.officerId)&&!plannedOfficer(s,a.officerId))){
  const pick=actionCandidates(s,a,{ignoreFunds:true}).find(p=>{const d=ACTIONS[p.key],key=slot(p);
   const essential=['cash','grain','heal','rescue'].includes(d.kind)||d.kind==='recruit'&&p.recruitMode==='reserve'||d.kind==='trade'&&d.value==='buy';
   return (!key||!slots.has(key))&&(workPolicy!=='essential'||essential);
  });
  if(!pick)continue;cost+=pick.cost;const key=slot(pick);if(key)slots.add(key);
 }
 return cost;
}
export function cityGoldCommitment(s,c,{includeWork=false,workPolicy='all'}={}){
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
 const goldReserved=Math.max(c.budget.goldReserve,fees||debt?(diplomacy?.policies[c.owner]?.goldReserve||0):0)+diplomaticAssetReserve(s,c.owner,'gold',c.id);
 const maintenance=cityMaintenance(s,c).gold;
 return {work,fees,training,cargo,debt,orders,contactFees,farePerDay,debtBefore,maintenance,goldReserved,total:Math.ceil(work+fees+training+cargo+debt+maintenance)+goldReserved};
}
export function cityBudget(s,c,{supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies}),includeWork=true,workPolicy='all'}={}){
 const days=ECONOMY_RULES.budget.days,toHarvest=10-(s.campaign.day-1)%10;
 const besieged=s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id);
 const income=besieged?{gold:0,grain:0,manpower:0}:cityRecurringIncome(s,c);
 const {work,fees,training,cargo,debt,orders,contactFees,farePerDay,debtBefore,maintenance,goldReserved}=cityGoldCommitment(s,c,{includeWork,workPolicy});
 const localDaily=localFoodUse(c),supply=supplyForecast.cities[c.id].grain,supplyBefore=supplyForecast.cities[c.id].daily.slice(0,toHarvest).reduce((n,x)=>n+x,0);
 const grainOrders=orders.filter(q=>q.kind==='transfer'&&isPlayerControlled(s,q.faction)).reduce((n,q)=>n+(q.cargo?.grain||0),0);
 // Planned grain includes AI, diplomatic and non-player transport reservations.
 const grainReserved=plannedGrain(s,c.id)+grainOrders+c.budget.grainReserve;
 const costs={gold:Math.ceil(work+fees+training+cargo+debt+maintenance),grain:Math.ceil(localDaily*days+supply)};
 const reserve={gold:goldReserved,grain:grainReserved};
 const projected={gold:c.gold+income.gold-costs.gold-reserve.gold,grain:c.grain+income.grain-costs.grain-reserve.grain};
 const beforeHarvest={gold:c.gold-Math.ceil(work+contactFees+farePerDay*toHarvest+training+cargo+debtBefore+maintenance)-reserve.gold,grain:c.grain-Math.ceil(localDaily*toHarvest+supplyBefore)-reserve.grain};
 const shortages={gold:Math.ceil(Math.max(0,-projected.gold,-beforeHarvest.gold)),grain:Math.ceil(Math.max(0,-projected.grain,-beforeHarvest.grain))};
 return {days,toHarvest,stocks:{gold:c.gold,grain:c.grain},income,costs,reserve,projected,beforeHarvest,shortages,dailyGrain:costs.grain/days,daysSupply:costs.grain?Math.max(0,c.grain-reserve.grain)/(costs.grain/days):null,work,fees,training,cargo,debt};
}
export function setCityBudget(s,cityId,key,value,{faction=playerFaction(s),scheduled=false}={}){
 const c=s.cities.find(c=>c.id===cityId);
 if(s.finished||!scheduled&&(s.campaign.allAI||s.campaign.phase!=='planning')||c?.owner!==faction||!['goldReserve','grainReserve'].includes(key)||!Number.isSafeInteger(value)||value<0||value>ECONOMY_RULES.budget.maxReserve)return '预算设置无效';
 c.budget[key]=value;return null;
}
export function updateCityBudgetAlerts(s){
 const supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies});
 for(const c of s.cities){
  if(c.owner!==playerFaction(s)){c.budget.warning='';continue;}
  const b=cityBudget(s,c,{supplies,supplyForecast}),warning=['gold','grain'].filter(k=>b.shortages[k]>0).map(k=>k==='grain'&&b.daysSupply!==null&&b.daysSupply<=ECONOMY_RULES.budget.criticalFoodDays?'grain-critical':k).join(',');
  if(!warning){c.budget.warning='';continue;}
  if(warning===c.budget.warning)continue;
  c.budget.warning=warning;c.budget.warningSequence++;
  const text=`${c.name}钱粮预算不足：${b.shortages.gold?'金缺口约'+fmt(b.shortages.gold)+'；':''}${b.shortages.grain?'粮缺口约'+fmt(b.shortages.grain)+'，现粮约可维持'+(b.daysSupply??0).toFixed(1)+'天；':''}请调整本城事务、兵力或安排运输。`;
  appendActivityNode(s,{sourceId:`city-budget:${c.id}:${c.budget.warningSequence}`,category:'domestic',phase:'budget-warning',faction:c.owner,cityId:c.id,text,result:{budget:b}});
 }
}
export function validateCityBudget(c,fail){
 const b=c.budget;fail(b&&['goldReserve','grainReserve','warningSequence'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0)&&b.goldReserve<=ECONOMY_RULES.budget.maxReserve&&b.grainReserve<=ECONOMY_RULES.budget.maxReserve&&['','gold','grain','gold,grain','grain-critical','gold,grain-critical'].includes(b.warning),'城市预算无效');
}
export function cityBudgetMarkup(s,c,{editable=false}={}){
 const b=cityBudget(s,c),short=b.shortages.gold||b.shortages.grain;
 return `<section class="city-budget ${short?'budget-shortage':''}" data-city-budget="${c.id}"><h3>${c.name} · 钱粮预算（未来一旬）</h3><div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>资源</th><th>现存</th><th>预计收入</th><th>预计支出</th><th>预留</th><th>预计结余</th></tr></thead><tbody>${[['gold','金'],['grain','粮']].map(([k,label])=>`<tr><th>${label}</th><td data-label="现存">${fmt(b.stocks[k])}</td><td data-label="预计收入">${fmt(b.income[k])}</td><td data-label="预计支出">${fmt(b.costs[k])}</td><td data-label="预留">${fmt(b.reserve[k])}</td><td data-label="预计结余">${fmt(b.projected[k])}</td></tr>`).join('')}</tbody></table></div><p class="budget-status" role="status">${short?`${b.shortages.gold?'金不足约 '+fmt(b.shortages.gold)+'；':''}${b.shortages.grain?'粮不足约 '+fmt(b.shortages.grain)+'；':''}请调整事务或调运钱粮。`:'本城钱粮预计可覆盖预算。'}${b.daysSupply===null?'':` 现粮约可维持 ${b.daysSupply.toFixed(1)} 天。`}</p><small>收入在旬末入库；预算同时检查入库前的用度。未完成运营和在途物资不计入现存，已付款的事务不重复计费。</small>${editable?`<div class="city-budget-settings">${[['goldReserve','保留金'],['grainReserve','保留粮']].map(([key,label])=>`<label class="strategy-field">${label}<input type="number" min="0" max="1000000" step="100" data-city-budget-key="${key}" data-city-budget-id="${c.id}" value="${c.budget[key]}"></label>`).join('')}</div>`:''}</section>`;
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
