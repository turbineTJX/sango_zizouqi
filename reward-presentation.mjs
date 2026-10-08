import {DOMESTIC_INCIDENTS} from './data/design/domestic-incidents.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {BUILDINGS} from './domestic-designs.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {mapNode} from './map-node-data.mjs';
import {playerFaction} from './player-faction.mjs';
import {reportText} from './report-presentation.mjs';
import {reportArtScene} from './officer-art-scenes.mjs';
import {townSprite} from './town-art.mjs';
import {metricIcon} from './map-metrics.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const signed=n=>(n>0?'+':'')+fmt(n);
const resources=[['gold','金','staff'],['grain','粮','grain'],['manpower','预备兵','reserve']];
const attrs=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
const link=(action,label,extra='')=>`<button class="dispatch-link" data-action="${action}" ${extra}>${label}</button>`;
export function reportTone(e){
 if(e.phase==='incident'&&DOMESTIC_INCIDENTS[e.result?.incident?.code]?.relationDelta<0)return 'concern';
 if(e.result?.reward)return 'reward';
 if(['discovered','project-resumed','retained'].includes(e.phase))return 'notice';
 return ['budget-warning','failure','pause','cancel','offer-paused','leave-warning','resigned','changed-side','DEAD','CAPTIVE','TRANSPORT_LOST'].includes(e.phase)||e.result?.lost?'concern':'notice';
}
function rewardBody(s,e){
 const r=e.result?.reward;if(!r)return '';
 if(r.kind==='officer'){
  const u=OFFICER_BY_ID[r.officerId],home=mapNode(s,e.cityId),place=mapNode(s,r.location);
  return `<span class="reward-kicker">新入麾下</span><h3>${esc(u.name)}${u.courtesy?`<small>字 ${esc(u.courtesy)}</small>`:''}</h3><div class="reward-arrival">${r.destination?`签约时在${esc(place?.name)}，沿路前往${esc(home?.name)}赴任`:`签约时已在${esc(home?.name)}`}</div><dl class="reward-attributes">${attrs.map(([k,label])=>`<div><dt>${label}</dt><dd>${fmt(r.stats[k])}</dd></div>`).join('')}</dl>${r.traits.length?`<div class="reward-traits">${r.traits.map(t=>link('ability-reference',esc(t.name),`data-kind="trait" data-id="${esc(t.id)}"`)).join('')}</div>`:''}<div class="reward-cost">接洽投入 ${fmt(e.result.cost)}金 · ${fmt(e.result.elapsed)}天</div>${link('campaign-info-detail','查看武将',`data-kind="officer" data-id="${esc(r.officerId)}"`)}${s.cities.find(c=>c.id===e.cityId)?.owner===playerFaction(s)?link('domestic-alert-city','人员安排',`data-town="${esc(e.cityId)}"`):''}`;
 }
 if(r.kind==='building'){
  const b=BUILDINGS[r.buildingKey],site=mapNode(s,r.siteId);
  const delta=resources.filter(([k])=>r.incomeDelta[k]>0).map(([k,label])=>`${label} +${fmt(r.incomeDelta[k])}／旬`).join(' · ');
  return `<span class="reward-kicker">${r.mode==='repair'?'设施修复':r.beforeLevel?'设施扩建':'新设施建成'}</span><h3>${esc(b.name)}<small>${esc(site?.name)}</small></h3><div class="reward-level"><span>${r.mode==='repair'?fmt(r.beforeHp)+' / '+fmt(r.maxHp):r.beforeLevel+'级'}</span><i>→</i><strong>${r.mode==='repair'?fmt(r.afterHp)+' / '+fmt(r.maxHp):r.afterLevel+'级'}</strong></div>${delta?`<div class="reward-effect">城市基础产出 ${delta}</div>`:`<div class="reward-effect">${esc(b.description)}</div>`}<div class="reward-cost">${e.result.spent===undefined?'':`实际花费 ${fmt(e.result.spent)}金 · `}由${esc(OFFICER_BY_ID[e.officerId]?.name||mapNode(s,e.cityId)?.name)}完成</div>${link('reward-show-building','查看设施',`data-node="${esc(e.id)}"`)}`;
 }
 if(r.kind==='technology'){
  const tech=TECHNOLOGIES.records.find(t=>t.id===r.technologyId);
  return `<span class="reward-kicker">技术突破</span><h3>${esc(tech?.name)}</h3><div class="reward-effect">${esc(mapNode(s,e.cityId)?.name)}：${esc(tech?.parameters.description)}</div>${link('domestic-alert-city','查看城市',`data-town="${esc(e.cityId)}"`)}`;
 }
 return '';
}
export function outcomeReportMarkup(s,e){
 const officer=OFFICER_BY_ID[e.officerId],city=mapNode(s,e.siteId),name=officer?.name||'纪事',reward=e.result?.reward,body=rewardBody(s,e);
 const label=e.phase==='incident'?'内政纪事':reward?.kind==='officer'?'新入麾下':reward?.kind==='building'?'设施成果':reward?.kind==='technology'?'技术突破':reportTone(e)==='concern'?'需留意':'事项通知';
 const portrait=reward?.kind==='building'?`<svg class="reward-building-art" viewBox="-70 -105 140 130" role="img" aria-label="${esc(BUILDINGS[reward.buildingKey].name)}">${townSprite(reward.buildingKey,{width:130,id:e.id+'-reward'})}</svg>`:`<div class="report-portrait" ${officer?`data-art-portrait="${esc(e.officerId)}" data-art-scene="${reward?.kind==='officer'?'detail':reportArtScene(e)}"`:''}><span>${esc(name.slice(0,1))}</span></div>`;
 const original=`<p>${reportText(e.text,e.officerIds?.map(id=>OFFICER_BY_ID[id]?.name).filter(Boolean)|| (officer?[name]:[]))}</p>`;
 return `<article class="report-dispatch report-${reportTone(e)} ${reward?'reward-'+reward.kind:''}" data-report-node="${esc(e.id)}" data-report-tone="${reportTone(e)}"><aside class="report-speaker">${portrait}<b>${esc(reward?.kind==='building'?BUILDINGS[reward.buildingKey].name:name)}</b></aside><div class="report-message"><small>第 ${e.day} 天${city?' · '+esc(city.name):''} · ${label}</small>${body}${body?`<details class="reward-source"><summary>办理经过</summary>${original}</details>`:original}${e.category==='diplomacy'&&e.phase==='pending'&&s.campaign.diplomacy.proposals.some(p=>p.id===e.result.proposalId&&p.status==='pending')?`<button class="button primary" data-action="diplomacy-review" data-proposal="${e.result.proposalId}">核阅方案</button>`:''}${link('activity-alert-record','查看当日记录 ↗',`data-node="${esc(e.id)}"`)}${!reward&&s.cities.find(c=>c.id===e.cityId)?.owner===playerFaction(s)?link('domestic-alert-city',esc(mapNode(s,e.cityId).name)+' ↗',`data-town="${esc(e.cityId)}"`):''}</div></article>`;
}
export function harvestStripMarkup(s){
 const e=s.campaign.activity.nodes.findLast(n=>n.phase==='harvest'&&n.faction===playerFaction(s));if(!e)return '';
 const r=e.result;
 return `<details class="harvest-strip" data-harvest-turn="${r.turn}"><summary><span class="harvest-title">第 ${r.turn} 旬收获</span><span class="harvest-totals">${resources.map(([k,label,icon])=>`<span>${metricIcon(icon,label)}<b>+${fmt(r.recurring[k]+r.work[k])}</b><small>${label}</small></span>`).join('')}</span><span class="harvest-counts">${[['officers','人才'],['buildings','设施'],['technologies','技术']].filter(([k])=>r.counts[k]).map(([k,label])=>`${label} +${r.counts[k]}`).join(' · ')||'城市经营'}</span></summary><div class="harvest-body"><div class="harvest-caption">城市产出、经营与纪事所得实际入库。</div><dl class="harvest-net">${r.net?resources.map(([k,label])=>`<div><dt>${k==='gold'?'各城金':label+'城仓'}净变化</dt><dd class="${r.net[k]<0?'is-negative':''}">${signed(r.net[k])}</dd></div>`).join(''):''}</dl><div class="harvest-caption">净变化统计本旬执行期间，包含实际支出、消耗和城仓变化。</div><details class="harvest-city-details"><summary>各城入库</summary><table><thead><tr><th>城市</th>${resources.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${r.cities.map(c=>`<tr><td>${esc(c.name)}</td>${resources.map(([k])=>`<td>+${fmt(c.credited[k]+c.work[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>${r.nodeIds.length?link('harvest-review','查看成果',`data-node="${esc(e.id)}"`):''}</div></details>`;
}
