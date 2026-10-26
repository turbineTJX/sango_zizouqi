import {campaignDate} from './national-scenarios.mjs';
import {cityBudget,cityBudgetMarkup} from './city-budget.mjs';
import {citySupplyBudgets,forecastArmySupply} from './city-logistics.mjs';
import {cityIncomeBreakdown,cityWorkLimit,cityWorkRemaining} from './economy.mjs';
import {playerFaction,isPlayerControlled} from './player-faction.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const signed=n=>(n>0?'+':'')+fmt(n);
const resources=[['gold','金'],['grain','粮'],['manpower','预备兵']];
const sum=(rows,key)=>rows.reduce((n,row)=>n+row[key],0);
const editable=s=>!s.finished&&s.campaign.phase==='planning'&&!s.campaign.allAI;
const cityLink=c=>`<button class="personnel-name" data-action="campaign-info-detail" data-kind="city" data-id="${esc(c.id)}" data-page="收支预算">${esc(c.name)} ↗</button>`;

function actualFinanceMarkup(s,city=null){
 const receipt=s.campaign.activity.nodes.findLast(n=>n.phase==='harvest'&&n.faction===playerFaction(s));
 if(!receipt)return '<section class="finance-actual"><h3>实际结算</h3><p class="muted">尚无已结算旬记录。</p></section>';
 const r=receipt.result,row=city?r.cities.find(c=>c.id===city.id):null;
 if(city&&!row)return `<section class="finance-actual"><h3>${campaignDate(s,{turn:r.turn,period:true})}结算</h3><p class="muted">暂无本城结算记录。</p></section>`;
 const credited=city?row.credited:r.recurring,work=city?row.work:r.work;
 const table=`<div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>资源</th><th>旬末入库</th><th>运营与纪事入库</th><th>入库合计</th></tr></thead><tbody>${resources.map(([key,name])=>`<tr><th>${name}</th><td>${fmt(credited[key])}</td><td>${fmt(work[key])}</td><td>${fmt(credited[key]+work[key])}</td></tr>`).join('')}</tbody></table></div>`;
 const payroll=city&&city.payroll.lastTurn===r.turn?`<p>官员俸禄实发 ${fmt(city.payroll.lastPaid)} 金 · 欠俸 ${fmt(city.payroll.arrears)} 金</p>`:'';
 const net=!city&&r.net?`<p class="finance-net">城仓净变化：${resources.map(([key,name])=>`${name} ${signed(r.net[key])}`).join(' · ')}</p>`:'';
 const report=!city?s.campaign.turnReports.find(report=>report.turn===r.turn):null;
 const details=report?`<details><summary>旬末收支明细</summary>${report.items.map(text=>`<p>${esc(text)}</p>`).join('')}</details>`:'';
 return `<section class="finance-actual"><h3>${campaignDate(s,{turn:r.turn,period:true})}结算</h3>${table}${payroll}${net}${details}</section>`;
}

export function cityProductionMarkup(s,c){
 const income=cityIncomeBreakdown(s,c),format=row=>resources.map(([key,name])=>fmt(row[key])+' '+name).join(' · ');
 const operations=Object.fromEntries(resources.map(([key])=>[key,income.governor[key]+income.management[key]]));
 return `<details class="finance-production"><summary>产出明细</summary><p>建设收入／旬：${format(income.base)}</p><p>经营加成／旬：${format(operations)}</p><p>本旬运营入库：${format(income.work)}</p><p>本旬剩余产能：${resources.map(([key,name])=>fmt(cityWorkRemaining(s,c,key))+' / '+fmt(cityWorkLimit(s,c,key))+' '+name).join(' · ')}</p></details>`;
}

export function cityFinanceMarkup(s,c){
 if(c.owner!==playerFaction(s))return '';
 return `<section class="finance-detail" data-finance-city="${esc(c.id)}">${actualFinanceMarkup(s,c)}${cityBudgetMarkup(s,c,{editable:editable(s)&&isPlayerControlled(s,c.owner)})}${cityProductionMarkup(s,c)}</section>`;
}

export function factionFinance(s){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s)),supplies=citySupplyBudgets(s),supplyForecast=forecastArmySupply(s,{supplies});
 const rows=cities.map(city=>({city,budget:cityBudget(s,city,{supplies,supplyForecast})}));
 const totals=Object.fromEntries(['stocks','income','costs','reserve','projected','fundingShortages'].map(field=>[field,Object.fromEntries(['gold','grain'].map(key=>[key,sum(rows.map(row=>row.budget[field]),key)]))]));
 return {rows,totals};
}

export function factionFinanceMarkup(s,id){
 if(id!==playerFaction(s))return '';
 const {rows,totals}=factionFinance(s);
 const columns=[['stocks','现存'],['income','预计收入'],['costs','预计支出'],['reserve','预留'],['projected','预计结余']];
 const table=`<div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>资源</th>${columns.map(([,name])=>`<th>${name}</th>`).join('')}</tr></thead><tbody>${resources.slice(0,2).map(([key,name])=>`<tr><th>${name}</th>${columns.map(([field,label])=>`<td data-label="${label}">${fmt(totals[field][key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 const cities=`<div class="personnel-table-wrap finance-cities"><table class="personnel-table"><thead><tr><th>城市</th><th>预计金结余</th><th>预计粮结余</th><th>金缺口</th><th>粮缺口</th></tr></thead><tbody>${rows.map(({city,budget:b})=>`<tr><td>${cityLink(city)}</td><td>${fmt(b.projected.gold)}</td><td>${fmt(b.projected.grain)}</td><td>${fmt(b.fundingShortages.gold)}</td><td>${fmt(b.fundingShortages.grain)}</td></tr>`).join('')}</tbody></table></div>`;
 return `<section class="finance-detail" data-finance-faction="${esc(id)}">${actualFinanceMarkup(s)}<section class="finance-budget city-budget"><h3>各城预算合计 · 未来一旬</h3>${table}<p>各城独立核算 · 缺口合计：金 ${fmt(totals.fundingShortages.gold)} · 粮 ${fmt(totals.fundingShortages.grain)}</p></section><h3>各城预算</h3>${cities}</section>`;
}
