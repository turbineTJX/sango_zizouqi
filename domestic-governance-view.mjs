import {governorApprover} from './city-governance.mjs';
import {playerFaction} from './player-faction.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {DIRECTIONS,ACTIONS,TECHS,actionName} from './domestic.mjs';
import {buildingSiteName} from './metropolitan-areas.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.ceil(n).toLocaleString('zh-CN');
const cityLink=c=>`<button class="personnel-name" data-action="campaign-info-detail" data-kind="city" data-id="${esc(c.id)}" data-page="收支预算">${esc(c.name)}</button>`;
export function governorApprovalControl(s,c){
 const enabled=!!governorApprover(s,c),disabled=s.finished||s.campaign.allAI||c.owner!==playerFaction(s)||!c.governor;
 return `<button class="button secondary" data-action="domestic-governor-approval" data-city="${esc(c.id)}" role="switch" aria-label="${esc(c.name)}太守审批" aria-checked="${enabled}" ${disabled?'disabled':''}>太守审批 · ${enabled?'开':'关'}</button>`;
}
export function domesticGovernanceMarkup(s,{cityId=null}={}){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s)&&(!cityId||c.id===cityId));
 return `<section class="domestic-governance"><h3>城市审批</h3><div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>城市</th><th>太守</th><th>审批委托</th><th>收支</th></tr></thead><tbody>${cities.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(OFFICER_BY_ID[c.governor]?.name||'未任命')}</td><td>${governorApprovalControl(s,c)}</td><td>${cityLink(c)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
export function domesticWorkMarkup(s,{cityId=null}={}){
 const cities=s.cities.filter(c=>c.owner===playerFaction(s)&&(!cityId||c.id===cityId)&&!governorApprover(s,c));
 const rows=cities.flatMap(c=>s.campaign.domestic.assignments.filter(a=>a.cityId===c.id).map(a=>{
  const x=a.action,p=a.proposal,pick=x||p?.pick,def=ACTIONS[pick?.key],site=x?.siteId||p?.siteId||c.id;
  const target=pick?.targetId&&(TECHS[pick.targetId]?.name||OFFICER_BY_ID[pick.targetId]?.name);
  const work=pick?actionName(c,pick.key)+(target?' · '+target:''):a.waiting||'待命';
  const costs=pick?`${fmt(pick.cost)} 金${x?"（已付）":"（待支用）"}${def.kind==='heal'?' · 完成时支用 200 粮':''}${pick.key==='sell'?' · 成交时支用 '+fmt(pick.amount)+' 粮':''}${pick.recruitMode==='replenish'?' · 预留 '+fmt(pick.amount)+' 预备兵':''}`:'—';
  const days=x?Number(x.remaining.toFixed(1))+' 天':p?fmt(p.days)+' 天':'—';
  const status=x?(x.paused?'暂停':'办理中'):p?'待裁决':'待命';
  return `<tr data-domestic-work="${esc(a.officerId)}"><td>${esc(c.name)}</td><td><button class="personnel-name" data-action="campaign-person-detail" data-officer="${esc(a.officerId)}">${esc(OFFICER_BY_ID[a.officerId]?.name)}</button></td><td>${esc(DIRECTIONS[a.direction])}</td><td>${esc(work)}${site!==c.id?' · '+esc(buildingSiteName(s,site)):''}</td><td>${esc(costs)}${pick?.key==='sell'?` · 成交后扣 ${ACTIONS.sell.cost} 金手续费`:''}</td><td>${esc(days)}</td><td>${status}</td></tr>`;
 }));
 if(!cities.length)return '';
 return `<section class="domestic-work-overview"><h3>人员事务</h3><div class="personnel-table-wrap"><table class="personnel-table"><thead><tr><th>城市</th><th>姓名</th><th>任职</th><th>事务</th><th>费用</th><th>剩余／耗时</th><th>状态</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="7">暂无已委任的内政负责人</td></tr>'}</tbody></table></div></section>`;
}
