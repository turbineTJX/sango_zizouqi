import {completeDaysText} from './number-rules.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {DOMESTIC_INCIDENTS} from './data/design/domestic-incidents.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {ACTIONS,BUILDINGS} from './domestic-designs.mjs';
import {FACTIONS} from './engine.mjs';
import TECHNOLOGIES from './data/design/technologies.mjs';
import {mapNode} from './map-node-data.mjs';
import {playerFaction} from './player-faction.mjs';
import {reportText} from './report-presentation.mjs';
import {reportArtScene} from './officer-art-scenes.mjs';
import {townSprite} from './town-art.mjs';
import {metricIcon} from './map-metrics.mjs';
import {DIPLOMACY_ACTIONS} from './data/design/diplomacy-rules.mjs';
import {treasureCatalog} from './treasure-catalog.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n).toLocaleString('zh-CN');
const signed=n=>(n>0?'+':'')+fmt(n);
const resources=[['gold','金','staff'],['grain','粮','grain'],['manpower','预备兵','reserve']];
const attrs=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
const link=(action,label,extra='')=>`<button class="dispatch-link" data-action="${action}" ${extra}>${label}</button>`;
export function reportTone(e){
 if(e.phase==='incident'&&DOMESTIC_INCIDENTS[e.result?.incident?.code]?.relationDelta<0)return 'concern';
 if(e.result?.lost||e.result?.loss>0||e.category==='occupation'&&e.phase==='lost'||e.category==='battle'&&e.result?.winner!==null&&e.result?.winner!==e.faction)return 'concern';
 if(e.result?.reward)return 'reward';
 if(['discovered','project-resumed','loyalty-restored'].includes(e.phase))return 'notice';
 return ['budget-warning','failure','pause','cancel','offer-paused','loyalty-low','resigned','changed-side','DEAD','CAPTIVE','TRANSPORT_LOST'].includes(e.phase)||e.result?.lost?'concern':'notice';
}
// Only recorded outcomes belong here. Never reconstruct an old result from
// current stocks, personnel, hidden city information or a running project.
export function outcomeReportData(s,e){
 const r=e.result||{},reward=r.reward,person=OFFICER_BY_ID[e.officerId]?.name||'',place=id=>mapNode(s,id)?.name||'未知地点',faction=id=>id==='neutral'?'中立':FACTIONS[id]?.name||'未知势力',task=ACTIONS[e.key],facts=[];
 const add=(label,value)=>{if(value!==undefined&&value!==null&&value!=='')facts.push({label,value:String(value)});};
 const number=(label,n,suffix='')=>{if(Number.isFinite(n))add(label,fmt(n)+suffix);};
 let title='事项通知';
 if(reward?.kind==='building'){
  title=BUILDINGS[reward.buildingKey].name+(reward.mode==='repair'?'修复':reward.beforeLevel?'扩建完成':'建成');
  add('建设地点',place(reward.siteId));add('设施等级',`${reward.beforeLevel} → ${reward.afterLevel}级`);
  if(Number.isFinite(reward.afterHp))add('耐久',`${fmt(reward.beforeHp)} → ${fmt(reward.afterHp)} / ${fmt(reward.maxHp)}`);
  for(const [key,label]of resources)if(reward.incomeDelta[key])add('基础'+label+'产出',signed(reward.incomeDelta[key])+'／旬');
  if(!Object.values(reward.incomeDelta).some(Boolean))add('设施用途',BUILDINGS[reward.buildingKey].description);
 }else if(reward?.kind==='technology'){
  const tech=TECHNOLOGIES.records.find(t=>t.id===reward.technologyId);title=(tech?.name||'技术')+'研究完成';add('解锁效果',tech?.parameters.description);
 }else if(reward?.kind==='officer'){
  title=person+'加入本方';add('签约地点',place(reward.location));add('赴任状态',reward.destination?'赴任途中':'已在本城');if(reward.destination)add('赴任目的地',place(reward.destination));
  number('接洽总费用',r.cost,'金');number('接洽用时',r.elapsed,'天');
 }else if(e.phase==='budget-warning'&&r.budget){
  const b=r.budget,gap=b.fundingShortages||b.shortages;title=place(e.cityId)+'钱粮不足';
  for(const [key,label]of resources.slice(0,2))if(gap?.[key]>0)add(label+'缺口','约 '+fmt(gap[key]));
  if(Number.isFinite(b.fundingDaysSupply))add('现粮可维持','约 '+completeDaysText(b.fundingDaysSupply)+'天');
  for(const [key,label]of resources.slice(0,2)){
   number('报事时存'+label,b.stocks?.[key]);number(`未来${b.days}天预计${label}收入`,b.income?.[key]);number(`未来${b.days}天预计${label}支出`,b.costs?.[key]);number('已预留'+label,b.reserve?.[key]);
  }
 }else if(e.category==='battle'){
  title=r.winner===null?'双方收兵':r.winner===e.faction?'本方获胜':'本方败退';
  for(const [key,label]of [['remaining','本方余兵'],['wounded','本方伤兵'],['killed','本方阵亡'],['initial','本方参战'],['escaped','本方逃散']])number(label,r.stats?.[key],'人');
 }else if(e.category==='occupation'){
  title=place(e.cityId)+(e.phase==='lost'?'失守':'已占领');add('归属',faction(r.previous)+' → '+faction(r.owner));
  for(const [key,label]of resources)if(r.resources){number('接收'+label,r.resources.retained?.[key]);number('散失'+label,r.resources.lost?.[key]);}
 }else if(e.phase==='incident'&&r.incident){
  const incident=r.incident;title=DOMESTIC_INCIDENTS[incident.code]?.name||'内政纪事';
  for(const [key,label]of resources)if(incident.resources?.delta[key])add(label+'变化',`${fmt(incident.resources.before[key])} → ${fmt(incident.resources.after[key])}（${signed(incident.resources.delta[key])}）`);
  if(incident.relationship)add('交情',`${OFFICER_BY_ID[incident.sourceOfficerId]?.name}与${OFFICER_BY_ID[incident.otherOfficerId]?.name}：${incident.relationship.before} → ${incident.relationship.after}`);
 }else if(e.phase==='event'&&Number.isFinite(r.loss)){
  title=r.loss?'粮食受损':'灾情结束';number('实际损失',r.loss,'粮');
 }else if(e.category==='talent'){
  title=person+({discovered:'已发现','loyalty-low':'忠诚偏低',resigned:'离职','changed-side':'离开本方','offer-paused':'签约暂停','project-closed':'接洽结束',displaced:'离城'}[e.phase]||'人才消息');
 }else if(e.category==='personnel'){
  title=person+({DEAD:'战死',CAPTIVE:'被俘',ESCAPED:'脱身',TRANSPORT_LOST:'运输受损',RANSOM:'获赎',RELEASE:'获释',SCOUT_INTEL:'侦察发现'}[e.phase]||'人员消息');
 }else if(e.category==='domestic'){
  title=(task?.name||'事务')+({complete:'完成',failure:r.result==='部分达成'?'部分达成':'受阻',pause:'暂停',cancel:'中止','order-cancel':'取消',merit:'功绩结算',event:'消息'}[e.phase]||'');
  if(e.phase==='merit')title=person+(r.leveled?'等级提升':'功绩结算');
  if(e.phase==='event'&&r.opportunity)title={master:'名匠来访',disaster:'田间灾情',mold:'仓储霉变隐患'}[r.opportunity]||title;
 }
 if(e.category==='diplomacy'){
  title={pending:'外交方案待批准',signed:'外交方案已签署',fulfilled:'条约已履行',blocked:'外交履约受阻',failed:'外交失败',war:'战事变化',city:'领土交接',prisoner:'俘虏交接',aid:'援军消息','aid-end':'援军结束',withdrawal:'退兵消息',effective:'条约生效',expired:'条约到期',expiring:'条约即将到期'}[e.phase]||'外交消息';
  const p=[...(s.campaign.diplomacy?.proposals||[]),...(s.campaign.diplomacy?.contracts||[])].find(p=>p.id===r.proposalId&&p.version===r.version&&p.factions.includes(e.faction));
  if(p){
   add('对方',p.factions.filter(f=>f!==e.faction).map(faction).join('、'));
   // Signed/approved terms preserve the offer before any deliveries. Pending
   // terms are read only for the exact reported version, never a new quote.
   const saved=p.signedTerms||Object.values(p.approvals||{}).find(a=>a.version===r.version)?.terms;
   let clauses=p.clauses;if(saved){try{const terms=JSON.parse(saved);if(terms.version===r.version)clauses=terms.clauses;}catch{}}
   for(const c of clauses.filter(c=>!r.clauseId||c.id===r.clauseId)){
    const side=(c.from===e.faction?'本方':'对方')+(e.phase==='pending'?'拟':'约定'),action=DIPLOMACY_ACTIONS[c.kind]||'履行';
    if(['gold','grain','manpower','supply'].includes(c.kind))number(side+action,c.amount,c.kind==='gold'?'金':c.kind==='manpower'?'人':'粮');
    else if(c.cityId||c.targetId)add(side+action,place(c.cityId||c.targetId));
    else if(c.officerId)add(side+action,OFFICER_BY_ID[c.officerId]?.name||'未知武将');
    else if(c.enemy)add(side+action,faction(c.enemy));
    else add(side+'义务',action);
    if(c.kind==='deploy')number(side+'援军兵力',c.troops,'人');
    if(c.duration)number(action+'期限',c.duration,'天');
    if(c.quota){number(action+'总额度',c.quota,'粮');if(Number.isFinite(c.unitPrice))add(action+'单价',c.unitPrice+'金／粮');}
    if(c.deferred)add(action+'偿付时间','签署后第'+c.dueOffset+'天');
    if(c.milestone)add(action+'支付条件','援军抵达');
    if(c.after?.length)add(action+'生效条件','前置交付完成');
   }
  }
 }
 if(e.category==='treasure'){
  title=e.phase==='delivered'?'宝物已送达':'获得宝物';
  const catalog=treasureCatalog(s);for(const id of r.treasureIds||[r.treasureId])if(catalog[id]){add('宝物',catalog[id].name);add('效果',catalog[id].description);}
 }
 if(r.resourceCredit)for(const [key,label]of resources)if(r.resourceCredit[key]||key===({cash:'gold',grain:'grain',recruit:'manpower'}[task?.kind]))number('实际入库'+label,r.resourceCredit[key]);
 if(!reward&&['heal','repair'].includes(task?.kind))number(task.kind==='heal'?'恢复伤兵':'恢复耐久',r.actual,task.kind==='heal'?'人':'');
 if(reward?.kind!=='officer')number('本次净费用',r.spent,'金');
 number('退回费用',r.refund,'金');
 if(r.growth){add('功绩',signed(r.growth.gained));add('等级',`${r.growth.before} → ${r.growth.after}级`);if(r.growth.unlocked?.length)add('新获能力',r.growth.unlocked.join('、'));}
 return {title,facts};
}
function reportFactsMarkup(facts,compact=false){
 if(!facts.length)return '';
 return `<dl class="report-facts ${compact?'report-facts-compact':''}">${facts.map(({label,value})=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
}
function reportContextMarkup(s,e){
 return `<dl class="report-context"><div><dt>日期</dt><dd>${esc(campaignDate(s,{day:e.day}))}</dd></div>${e.siteId?`<div><dt>地点</dt><dd>${esc(mapNode(s,e.siteId)?.name||'未知地点')}</dd></div>`:''}</dl>`;
}
function reportActions(s,e,detail=false){
 const ownCity=s.cities.find(c=>c.id===e.cityId)?.owner===playerFaction(s),r=e.result||{};
 return (detail&&r.reward?.kind==='officer'?link('campaign-info-detail','查看武将',`data-kind="officer" data-id="${esc(r.reward.officerId)}"`):'')+
 (e.category==='diplomacy'&&e.phase==='pending'&&s.campaign.diplomacy.proposals.some(p=>p.id===r.proposalId&&p.status==='pending')?`<button class="button primary" data-action="diplomacy-review" data-proposal="${r.proposalId}">核阅方案</button>`:'')+
 (e.category==='battle'&&s.campaign.battles.some(b=>b.id===r.battleId&&b.settled)?link('campaign-replay','战场回放',`data-battle="${esc(r.battleId)}"`):'')+
 (ownCity&&(detail||!r.reward||r.reward.kind==='building')?link('campaign-info-detail','查看'+esc(mapNode(s,e.cityId).name),`data-kind="city" data-id="${esc(e.cityId)}"`):'');
}
export function activityReportMarkup(s,e){
 if(!e||e.faction!==playerFaction(s))return '<p class="muted">事项已结束</p>';
 const {title,facts}=outcomeReportData(s,e),names=(e.officerIds||[]).map(id=>OFFICER_BY_ID[id]?.name).filter(Boolean);
 const reward=e.result?.reward,person=reward?.kind==='officer'?`<dl class="reward-attributes">${attrs.map(([key,label])=>`<div><dt>${label}</dt><dd>${fmt(reward.stats[key])}</dd></div>`).join('')}</dl>${reward.traits.length?`<div class="reward-traits">${reward.traits.map(t=>link('ability-reference',esc(t.name),`data-kind="trait" data-id="${esc(t.id)}"`)).join('')}</div>`:''}`:'';
 return `<section class="activity-report-detail" data-activity-node="${esc(e.id)}"><h3>${esc(title)}</h3>${reportContextMarkup(s,e)}${person}${reportFactsMarkup(facts)}<p class="report-narrative">${reportText(e.text,names)}</p><div class="report-actions">${reward?.kind==='building'?link('reward-show-building','查看设施',`data-node="${esc(e.id)}"`):''}${reportActions(s,e,true)}</div></section>`;
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
  return `<h3>${esc(tech?.name)}</h3><div class="reward-effect">${esc(mapNode(s,e.cityId)?.name)}：${esc(tech?.parameters.description)}</div>${link('campaign-info-detail','查看城市',`data-kind="city" data-id="${esc(e.cityId)}"`)}`;
 }
 return '';
}
export function outcomeReportMarkup(s,e){
 const officer=OFFICER_BY_ID[e.officerId],name=officer?.name||'纪事',reward=e.result?.reward,body=rewardBody(s,e),data=outcomeReportData(s,e);
 const portrait=reward?.kind==='building'?`<svg class="reward-building-art" viewBox="-70 -105 140 130" role="img" aria-label="${esc(BUILDINGS[reward.buildingKey].name)}">${townSprite(reward.buildingKey,{width:130,id:e.id+'-reward'})}</svg>`:`<div class="report-portrait" ${officer?`data-art-portrait="${esc(e.officerId)}" data-art-scene="${reward?.kind==='officer'?'detail':reportArtScene(e)}"`:''}><span>${esc(name.slice(0,1))}</span></div>`;
 const original=`<p>${reportText(e.text,e.officerIds?.map(id=>OFFICER_BY_ID[id]?.name).filter(Boolean)|| (officer?[name]:[]))}</p>`+(e.phase==='loyalty-low'&&s.cities.find(c=>c.id===e.cityId)?.owner===playerFaction(s)?link('domestic-direction-open','人才事务',`data-town="${esc(e.cityId)}" data-direction="talent"`):'');
 return `<article class="report-dispatch report-${reportTone(e)} ${reward?'reward-'+reward.kind:''}" data-report-node="${esc(e.id)}" data-report-tone="${reportTone(e)}"><aside class="report-speaker">${portrait}<b>${esc(reward?.kind==='building'?BUILDINGS[reward.buildingKey].name:name)}</b></aside><div class="report-message">${reportContextMarkup(s,e)}${body||`<h3>${esc(data.title)}</h3>${reportFactsMarkup(data.facts.slice(0,3),true)}`}${body?`<details class="reward-source"><summary>办理经过</summary>${original}</details>`:original}<div class="report-actions">${link('activity-alert-record','查看事项 ↗',`data-node="${esc(e.id)}"`)}${reportActions(s,e)}</div></div></article>`;
}
export function harvestStripMarkup(s){
 const e=s.campaign.activity.nodes.findLast(n=>n.phase==='harvest'&&n.faction===playerFaction(s));if(!e)return '';
 const r=e.result;
 return `<details class="harvest-strip" data-harvest-turn="${r.turn}"><summary><span class="harvest-title">${campaignDate(s,{turn:r.turn,period:true})}收获</span><span class="harvest-totals">${resources.map(([k,label,icon])=>`<span>${metricIcon(icon,label)}<b>+${fmt(r.recurring[k]+r.work[k])}</b><small>${label}</small></span>`).join('')}</span><span class="harvest-counts">${[['officers','人才'],['buildings','设施'],['technologies','技术']].filter(([k])=>r.counts[k]).map(([k,label])=>`${label} +${r.counts[k]}`).join(' · ')||'城市经营'}</span></summary><div class="harvest-body"><dl class="harvest-net">${r.net?resources.map(([k,label])=>`<div><dt>${k==='gold'?'各城金':label+'城仓'}净变化</dt><dd class="${r.net[k]<0?'is-negative':''}">${signed(r.net[k])}</dd></div>`).join(''):''}</dl><details class="harvest-city-details"><summary>各城入库</summary><table><thead><tr><th>城市</th>${resources.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${r.cities.map(c=>`<tr><td>${esc(c.name)}</td>${resources.map(([k])=>`<td>+${fmt(c.credited[k]+c.work[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>${r.nodeIds.length?link('harvest-review','查看成果',`data-node="${esc(e.id)}"`):''}</div></details>`;
}
