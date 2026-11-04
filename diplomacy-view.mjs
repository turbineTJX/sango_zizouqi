import {diplomaticRelationsMarkup} from './diplomatic-matrix.mjs';
import {diplomaticProposalLabel} from './diplomatic-labels.mjs';
import {assignmentField} from './assignment-picker.mjs';
import {campaignDate} from './national-scenarios.mjs';
import {DIPLOMACY_DIRECTIONS as DIRECTIONS,DIPLOMACY_GOALS as GOALS,DIPLOMACY_ACTIONS as ACTIONS,DIPLOMACY_STAT_NAMES as STATS} from './data/design/diplomacy-rules.mjs';
import {lordCity,diplomaticOfficerCandidates,evaluateDiplomaticProposal,diplomaticApprovalError} from './diplomacy.mjs';
import {diplomaticTraits,diplomaticTraitProfile} from './diplomatic-traits.mjs';
import {playerFaction} from './player-faction.mjs';
import {FACTIONS} from './engine.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {mapNode} from './map-node-data.mjs';
import {strategicOrderLabel,currentDomesticWork} from './strategic-orders.mjs';
import {campaignOfficers,officerWorkMarkup} from './strategic-roster.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>Math.floor(n||0).toLocaleString('zh-CN');
const statuses={outbound:'出使中',negotiating:'谈判中',pending:'待批准',approved:'已批准，待签署',signed:'履约中',completed:'已完成',rejected:'未接受',expired:'已到期',cancelled:'已取消',failed:'履约中止',waiting:'待执行',active:'生效中',done:'已完成'};
export function diplomaticClauseText(s,c){
 const target=c.cityId?mapNode(s,c.cityId)?.name:c.targetId?mapNode(s,c.targetId)?.name:'';
 if(['gold','grain','manpower'].includes(c.kind))return `${ACTIONS[c.kind]} ${fmt(c.amount)}${c.deferred?`（签署后第${c.dueOffset}天偿付）`:c.milestone?'（援军抵达后支付）':''}`;
 if(c.kind==='city'||c.kind==='spoils')return `${ACTIONS[c.kind]} · ${target}`;
 if(c.kind==='prisoner')return '释放俘虏 · '+OFFICER_BY_ID[c.officerId]?.name;
 if(c.kind==='deploy')return `${c.task==='defend'?'防守':'出兵'}${target} · ${c.officerIds.length}队／${fmt(c.troops)}人 · ${campaignDate(s,{day:c.deadline})}前抵达`;
 if(c.kind==='declare')return '向'+FACTIONS[c.enemy]?.name+'宣战';
 if(c.kind==='restrictAid')return '不向'+FACTIONS[c.enemy]?.name+'提供军事支援';
 if(c.kind==='intelligence')return '共享'+c.information.length+'项已知情报';
 if(c.kind==='supply')return `君主城补给 · 累计${fmt(c.amount)}粮`;
 if(c.kind==='withdraw')return `${s.armies.find(a=>a.id===c.armyId)?.name||'撤离军团'}撤往${target}`;
 if(c.kind==='terminate')return `终止契约${c.contractId}，已发生债务继续结算`;
 return `${ACTIONS[c.kind]}${target?' · '+target:''}${c.duration?' · '+c.duration+'天':''}${c.quota?' · 总额度'+fmt(c.quota)+'粮 · '+c.unitPrice+'金／粮':''}${c.troopCap?' · 上限'+fmt(c.troopCap)+'人':''}`;
}
export function diplomaticProposalMarkup(s,p,{buttons=true}={}){
 const own=playerFaction(s),other=p.factions.find(f=>f!==own),assessment=evaluateDiplomaticProposal(s,p,own),action=p.status==='pending'&&buttons;
 const escrowNote=c=>{const held=(p.escrow||[]).find(e=>e.clauseId===c.id&&e.faction===own&&e.kind==='gold')?.amount||0;return held>0?`<small>已扣出预留 ${fmt(held)} 金</small>`:'';};
 const clauseStatus=c=>c.status==='waiting'&&c.kind==='gold'?'待划付':c.status==='waiting'&&['grain','manpower','prisoner'].includes(c.kind)?'待交付':statuses[c.status]||c.status;
 const side=f=>p.clauses.filter(c=>c.from===f).map(c=>`<li>${esc(diplomaticClauseText(s,c))}${c.after?.length?'<small>待交付</small>':''}${c.status?`<small>${clauseStatus(c)}${c.amount?' · '+fmt(c.delivered)+' / '+fmt(c.amount):''}${c.untilDay?' · 至'+campaignDate(s,{day:c.untilDay}):''}${c.overdue?' · 债务逾期':''}</small>`:''}${escrowNote(c)}${c.cityId?`<button class="dispatch-link" data-action="campaign-info-detail" data-kind="city" data-id="${esc(c.cityId)}">查看城市</button>`:''}${c.officerId?`<button class="dispatch-link" data-action="campaign-info-detail" data-kind="officer" data-id="${esc(c.officerId)}">查看武将</button>`:''}${c.armyId?`<button class="dispatch-link" data-action="campaign-info-detail" data-kind="army" data-id="${esc(c.armyId)}">查看军团</button>`:''}</li>`).join('');
 const summary=f=>p.clauses.filter(c=>c.from===f).map(c=>esc(diplomaticClauseText(s,c))+(c.after?.length?'（前置交付后生效）':'')).join('；')||'无';
 const approvalError=action?diplomaticApprovalError(s,p.id,p.version):null;
 const warning=approvalError||p.failure||p.clauses.some(c=>c.overdue)&&'债务逾期';
 return `<article class="diplomatic-proposal ${p.status==='pending'?'needs-approval':''}" data-diplomatic-proposal="${p.id}"><header><h3>${esc(diplomaticProposalLabel(p,own))} · ${esc(FACTIONS[other].name)}</h3><b>${p.status==='signed'&&p.fulfilledDay?'交付完成':statuses[p.status]}</b></header>${action?`<div class="diplomatic-offer-summary"><p><b>我方给予</b>${summary(own)}</p><p><b>对方给予</b>${summary(other)}</p></div><small>期限 ${campaignDate(s,{day:p.expiresDay})}</small>`:''}${warning?`<p class="decision-risk" role="status">${esc(warning)}</p>`:''}<details class="decision-details diplomatic-clause-details"><summary>条款与进度</summary><p class="diplomatic-officer">${esc(OFFICER_BY_ID[p.officerId]?.name)} · ${campaignDate(s,{day:p.createdDay})}</p><div class="diplomatic-terms"><section><h4>我方给予</h4><p class="diplomatic-settlement-site">收支地点：${esc(mapNode(s,p.sites[own])?.name)}</p><ul>${side(own)||'<li>无</li>'}</ul></section><section><h4>对方给予</h4><p class="diplomatic-settlement-site">收支地点：${esc(mapNode(s,p.sites[other])?.name)}</p><ul>${side(other)||'<li>无</li>'}</ul></section></div><p>${esc(assessment.reason)}</p></details>${action?`<div class="diplomatic-decisions"><button class="button primary" data-action="diplomacy-approve" data-proposal="${p.id}" data-version="${p.version}" ${approvalError?'disabled':''}>批准</button><button class="button secondary" data-action="diplomacy-renegotiate" data-proposal="${p.id}">交涉</button><button class="button secondary" data-action="diplomacy-reject" data-proposal="${p.id}">否决</button></div>`:''}</article>`;
}
export function diplomaticSelection(s,draft,direction){
 const own=playerFaction(s),cities=s.cities.filter(c=>c.owner===own),city=cities.find(c=>c.id===draft['diplomacy-city-'+direction]);
 const candidates=city?diplomaticOfficerCandidates(s,own,direction).filter(o=>o.location===city.id):[];
 return {cities,city,candidates,officer:candidates.find(o=>o.unit.id===draft['diplomacy-officer-'+direction])};
}
function directionMarkup(s,key,def,draft,editable,people){
 const d=s.campaign.diplomacy,own=playerFaction(s),assigned=d.assignments.filter(a=>a.faction===own&&a.direction===key),{cities,city,candidates,officer}=diplomaticSelection(s,draft,key);
 const current=assigned.map(a=>{const u=OFFICER_BY_ID[a.officerId],p=[...d.proposals,...d.contracts].find(p=>p.id===a.projectId);return `<p><button class="personnel-name" data-action="campaign-info-detail" data-kind="officer" data-id="${a.officerId}">${esc(u.name)}</button> · ${p?statuses[p.status]:esc(a.waiting)} <button class="button secondary" data-action="diplomacy-dismiss" data-officer="${a.officerId}" ${editable?'':'disabled'}>召回</button></p>`;}).join('')||'<p>未委任负责人</p>';
 return `<section class="diplomatic-direction"><h3>${def.name}</h3>${current}${assignmentField('diplomacy-city-'+key+'-button','派出城市',city?.name,{kind:'diplomacy-city',direction:key,disabled:!editable,selection:city?.id})}<input type="hidden" id="diplomacy-city-${key}" value="${esc(city?.id||'')}">${assignmentField('diplomacy-officer-'+key+'-button','执行人',officer?.unit.name,{kind:'diplomacy-officer',direction:key,disabled:!editable||!city,selection:officer?.unit.id})}<input type="hidden" id="diplomacy-officer-${key}" value="${esc(officer?.unit.id||'')}">${city&&!candidates.length?'<p>本城暂无可委任人员</p>':''}${officer?`${officer.work?.action?'':''}<dl class="info-fields"><div><dt>任职</dt><dd>${esc(people.get(officer.unit.id)?.duty||'空闲')}</dd></div><div><dt>事务</dt><dd>${officerWorkMarkup(s,officer.unit.id)}</dd></div></dl>`:''}<button class="button secondary" data-action="diplomacy-assign" data-direction="${key}" ${editable&&officer?'':'disabled'}>委任</button></section>`;
}
export function diplomacyMarkup(s,draft={}){
 const own=playerFaction(s),d=s.campaign.diplomacy,policy=d.policies[own],c=lordCity(s,own),editable=s.campaign.phase==='planning'&&!s.finished,pending=d.proposals.filter(p=>p.factions.includes(own)&&['pending','approved'].includes(p.status));
 const people=new Map(campaignOfficers(s).map(r=>[r.unit.id,r]));
 const directions=Object.entries(DIRECTIONS).map(([key,def])=>directionMarkup(s,key,def,draft,editable,people)).join('');
 const projects=d.proposals.filter(p=>p.factions.includes(own)&&!['pending','approved'].includes(p.status)),running=projects.filter(p=>['outbound','negotiating'].includes(p.status)),history=projects.filter(p=>!running.includes(p));const contracts=d.contracts.filter(p=>p.factions.includes(own));
 const locked=d.contracts.flatMap(p=>p.escrow).filter(e=>e.faction===own&&e.kind==='gold').reduce((n,e)=>n+e.amount,0);
 const risks=contracts.filter(p=>p.failure||p.clauses.some(c=>c.overdue)).map(p=>`<p class="decision-risk" role="status">${esc(FACTIONS[p.factions.find(f=>f!==own)]?.name)}：${esc(p.failure||'债务逾期')}</p>`).join('');
 const orders=d.orders.filter(q=>q.faction===own),after=orders.length?`<section class="strategy-ledger pending-orders"><h3>返城后安排 · ${orders.length}</h3>${orders.map(q=>`<article><div><b>${esc(strategicOrderLabel(s,q.command))}</b><small>${campaignDate(s,{day:q.requestedDay})} · ${q.choice==='now'?'召回中':'待返城'}</small><p>${q.officerIds.map(id=>esc(OFFICER_BY_ID[id]?.name)).join('、')}</p></div><button class="button secondary" data-action="diplomacy-cancel-order" data-order="${q.id}" ${editable?'':'disabled'}>取消安排</button></article>`).join('')}</section>`:'';
 const goals=`<div class="diplomatic-goals"><label class="strategy-field">目标<select id="diplomacy-goal" ${editable?'':'disabled'}>${Object.entries(GOALS).map(([key,name])=>`<option value="${key}" ${policy.goal===key?'selected':''}>${name}</option>`).join('')}</select></label><div class="strategy-field">势力<input type="hidden" id="diplomacy-target" value="${esc(policy.target||'')}"><button class="button secondary map-target-field" data-action="map-target-open" data-kind="diplomacy" ${editable?'':'disabled'}><span data-diplomacy-target-label>${esc(FACTIONS[policy.target]?.name||'自主选择')}</span></button><button class="text-button" data-action="diplomacy-target-clear" ${editable?'':'disabled'} ${policy.target?'':'hidden'}>自主选择</button></div><button class="button secondary" data-action="diplomacy-goal" ${editable?'':'disabled'}>确认</button></div>`;
 const budgets=`<details class="diplomatic-budget-settings"><summary>经费与留存</summary><p>${esc(c?.name||'君主未驻城')} · 已锁定金 ${fmt(locked)}</p><div class="diplomatic-budgets">${[['feeBudget','每旬行资'],['goldReserve','保留金'],['grainReserve','保留粮'],['manpowerReserve','保留预备兵']].map(([key,name])=>`<label class="strategy-field">${name}<input id="diplomacy-${key}" type="number" min="0" step="1" value="${policy[key]}" ${editable?'':'disabled'}></label>`).join('')}</div><button class="button secondary" data-action="diplomacy-budget" ${editable?'':'disabled'}>保存</button></details>`;
 return `<section class="diplomacy-panel">${diplomaticRelationsMarkup(s)}<section class="diplomatic-pending"><h3>待处理 · ${pending.length}</h3>${pending.map(p=>diplomaticProposalMarkup(s,p)).join('')||'<p class="strategy-muted">暂无待批方案</p>'}</section>${!c?'<p class="decision-risk">君主未驻城，资源交易暂停</p>':''}${goals}<details class="diplomatic-staff"><summary>负责人 · ${d.assignments.filter(a=>a.faction===own).length} 人</summary><div class="diplomatic-directions">${directions}</div></details>${budgets}${after}${running.length?`<section class="diplomatic-running"><h3>接洽中 · ${running.length}</h3>${running.map(p=>diplomaticProposalMarkup(s,p,{buttons:false})).join('')}</section>`:''}${risks}<details class="diplomatic-contracts"><summary>条约与履约 · ${contracts.length}</summary>${contracts.map(p=>diplomaticProposalMarkup(s,p,{buttons:false})).join('')||'<p>暂无条约</p>'}</details><details class="diplomatic-history"><summary>接洽记录 · ${history.length}</summary>${history.map(p=>diplomaticProposalMarkup(s,p,{buttons:false})).join('')||'<p>暂无记录</p>'}</details></section>`;
}
