import {battleLabelMarkup} from './battle-labels.mjs';
import {battleDays} from './player-time.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('zh-CN');

// A council freezes time at the actual arrival. Never include scheduled or
// unconfirmed reinforcements, even when their names exist in a scenario.
export function councilArrivals(b){
 if(!b?.reinforcementCouncil)return [];
 return b.sides[0].units.filter(u=>u.status==='reserve'&&u.hp>0&&u.arrivalConfirmed!==false&&
  u.arrivalTick===b.tick&&(u.reinforcementIndex!==undefined||u.wave>1));
}

export function reinforcementArrivalMarkup(b,armies=[]){
 const units=councilArrivals(b);
 return `<div class="reinforcement-arrivals">${[...new Set(units.map(u=>u.armyId))].map(id=>{
  const team=units.filter(u=>u.armyId===id),leader=b.sides[0].commanders.find(c=>c.armyId===id&&c.role==='leader');
  return `<article><h3>${esc(armies.find(a=>a.id===id)?.name||(leader?.name||'援军')+'军团')}<small>${team.length} 队 · ${fmt(team.reduce((n,u)=>n+u.hp,0))} 人</small></h3><div class="arrival-units">${team.map(u=>`<div class="unit-nameplate side-0">${battleLabelMarkup(u,b)}</div>`).join('')}</div></article>`;
 }).join('')}</div><p class="muted">已加入后备，空位出现后按出阵顺序入场。</p>`;
}

export function battleResultTitle(r){return r.winner===0?'此战告捷':r.winner===null?'罢兵收军':r.reason==='撤退'?'全军收撤':'此战失利';}
export function battleStrength(b,side){
 const units=b.sides[side].units,alive=units.filter(u=>u.hp>0);
 const sum=list=>list.reduce((n,u)=>n+u.hp,0);
 const waiting=u=>u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick;
 return {hp:sum(alive),total:units.reduce((n,u)=>n+u.initial,0),active:sum(alive.filter(u=>u.status==='active')),reserve:sum(alive.filter(u=>u.status==='reserve'&&!waiting(u))),pending:sum(alive.filter(u=>waiting(u))),withdrawn:sum(alive.filter(u=>u.status==='withdrawn'&&!waiting(u)))};
}

export function participationMarkup(r){
 if(!r.participation)return '';
 return `<section class="participation-report"><h3>投入与后备</h3>${r.participation.map((team,side)=>{
  const bench=team.filter(u=>!u.entered),unarrived=bench.filter(u=>!u.arrived),waiting=bench.filter(u=>u.arrived);
  return `<p><b>${side?'敌军':'我军'}</b> · 实际上阵 ${team.filter(u=>u.entered).length} 队${waiting.length?' · 已到未上阵：'+waiting.map(u=>esc(u.name)).join('、'):''}${unarrived.length?' · 未抵达：'+unarrived.map(u=>esc(u.name)).join('、'):''}</p>`;
 }).join('')}<small>到达后先进入后备，出现本军团名额与合法入口才会上阵。总编制兵力包含未上阵部队。</small></section>`;
}

export function appointmentResultMarkup(s,pending,scenarioName=''){
 const reports=[...new Set(pending.map(p=>p.battleId))].map(id=>s.campaign?s.campaign.battles.find(b=>b.id===id)?.report:s.report?.id===id?s.report:null).filter(Boolean);
 return reports.map(r=>`<section class="appointment-result" aria-label="本场战果"><h2>${battleResultTitle(r)}</h2><p>${esc(!s.campaign&&scenarioName||r.city||'')} · ${esc(r.reason)} · 交战 ${battleDays(r.tick)} 天 / ${r.tick} 战斗回合</p><table class="report-table"><thead><tr><th>战果</th><th>我军</th><th>敌军</th></tr></thead><tbody>${[['存活兵力','remaining'],['伤兵','wounded'],['阵亡','killed']].map(([name,key])=>`<tr><td>${name}</td>${r.stats.map(stats=>`<td>${fmt(stats[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>${participationMarkup(r)}</section>`).join('');
}
