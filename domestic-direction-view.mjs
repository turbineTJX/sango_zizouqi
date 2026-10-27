import {domesticStaffing} from './domestic-staffing.mjs';
import {DIRECTIONS,TECHS,actionName,domesticConfidence} from './domestic.mjs';
import {DIRECTION_STATS} from './domestic-designs.mjs';
import {DOMESTIC_STAT_LABELS} from './domestic-cooperation.mjs';
import {effectiveDomesticChance} from './domestic-incidents.mjs';
import {incidentWorkMarkup} from './domestic-incident-view.mjs';
import {domesticReference,buildingReference} from './domestic-reference.mjs';
import {BUILDINGS} from './domestic-designs.mjs';
import {buildingSiteName} from './metropolitan-areas.mjs';
import {campaignOfficers} from './strategic-roster.mjs';
import {officerRecommendation} from './officer-recommendation.mjs';
import {currentDomesticWork} from './strategic-orders.mjs';
import {playerFaction,isPlayerControlled} from './player-faction.mjs';
import {isPlanning} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {abilityButton} from './ability-reference.mjs';
import {detailLink} from './ui-detail-table.mjs';
import {campaignDate} from './national-scenarios.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// A read-only view of the same appointments and reservations used by execution.
export function domesticDirectionMarkup(s,cityId,direction){
 const c=s.cities.find(c=>c.id===cityId),name=DIRECTIONS[direction];
 if(!c||c.owner!==playerFaction(s)||!name)return '<p>无法查看该方向。</p>';
 const slots=domesticStaffing(s,c.id,direction),editable=isPlayerControlled(s,c.owner)&&isPlanning(s),officers=campaignOfficers(s);
 const assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction);
 const entries=assignments.map(a=>({id:a.officerId,assignment:a}));
 for(const id of slots.officerIds)if(!entries.some(e=>e.id===id))entries.push({id,order:s.campaign.domestic.orders.find(q=>q.kind==='assign'&&q.cityId===c.id&&q.direction===direction&&q.officerIds.includes(id))});
 const cards=Array.from({length:slots.limit},(_,index)=>{
  const entry=entries[index];
  if(!entry)return `<button type="button" class="domestic-slot empty" data-domestic-slot="${index}" data-action="campaign-pick" data-task="domestic" data-town="${c.id}" data-direction="${direction}" ${editable?'':'disabled'} aria-label="为${name}委任负责人"><span aria-hidden="true">＋</span><b>空缺</b><small>委任负责人</small></button>`;
  const {id,assignment:a,order}=entry,u=officers.find(o=>o.unit.id===id)?.unit||OFFICER_BY_ID[id],x=a?.action;
  const traits=officerRecommendation(s,u,{task:'domestic',city:c.id,direction}).traits;
  const work=x?`${actionName(c,x.key)}${x.paused?' · 暂停':''}`:a?.proposal?'待批：'+actionName(c,a.proposal.pick.key):order?'待任':a?.waiting||'待命';
  const current=order&&currentDomesticWork(s,id);
  const details=x?detailLink('事务说明',[{name:actionName(c,x.key),rows:[['办理人','',u.name],['地点','',buildingSiteName(s,x.siteId||c.id)],['目标','',TECHS[x.targetId]?.name||OFFICER_BY_ID[x.targetId]?.name||c.name],['剩余时间','',Number(x.remaining.toFixed(2))+' 天'],['已付费用','',x.cost+' 金'],['成功把握','',domesticConfidence(effectiveDomesticChance(s,a))],['状态','',x.paused?'暂停':'办理中']]}],'查看事务'):'';
  return `<article class="domestic-slot${order?' reserved':''}" data-domestic-slot="${index}" data-domestic-officer="${id}"><header><button type="button" class="domestic-slot-person" data-action="campaign-person-detail" data-officer="${id}"><span class="domestic-slot-portrait" data-art-portrait="${id}"><span>${esc(u.name.slice(-1))}</span></span><b>${esc(u.name)}</b></button><button class="button secondary" data-action="${order?'campaign-cancel-order':'domestic-dismiss'}" ${order?`data-order="${order.id}"`:`data-officer="${id}"`} ${editable?'':'disabled'}>${order?'取消待任':'解除'}</button></header><p class="domestic-slot-work">${esc(work)}</p>${x?`<p>${esc(buildingSiteName(s,x.siteId||c.id))} · 剩余 ${Number(x.remaining.toFixed(1))} 天</p>`:''}${current?`<p>当前：${esc(current.title)} · 剩余 ${Number(current.remaining.toFixed(1))} 天</p>`:''}${order?'<small>原事务完成并返城后委任</small>':''}<div class="domestic-slot-traits"><small>相关特性</small>${traits.map(t=>abilityButton('trait',t.id,t.name)).join('')||'<span>—</span>'}</div>${details}${a?incidentWorkMarkup(s,a):''}</article>`;
 }).join('');
 const record=s.campaign.domestic.cooperation[c.id+':'+direction];
 const cooperation=record?detailLink('协作记录',[{name,rows:[['时间','',campaignDate(s,{turn:record.turn,period:true})],['武将','',OFFICER_BY_ID[record.officerId].name+' · '+OFFICER_BY_ID[record.helperId].name],['事务','',actionName(c,record.actionKey)],['机会','',Math.round(record.chance*100)+'%'],['成果','',!record.success?'未触发':record.actual>0?(record.mode==='chance'?'成功率':record.mode==='progress'?'施工进度（天）':'行动成果')+' +'+Number(record.actual.toFixed(3))+(record.mode==='chance'?'个百分点':''):'无额外成果'],['关系','',String(record.relationGain||0)]]}],'协作记录'):'';
 return `<section class="domestic-direction-detail" data-domestic-direction-detail="${direction}"><header class="task-personnel-heading"><div><h3>${esc(c.name)} · ${name}</h3><p>${DOMESTIC_STAT_LABELS[DIRECTION_STATS[direction]]} · 负责人</p></div><span class="task-personnel-count${slots.remaining?'':' full'}">人数 <b>${slots.used}/${slots.limit}</b></span></header><div class="domestic-slots">${cards}</div><div class="domestic-direction-reference">${domesticReference(direction)}${cooperation}<p>${Object.entries(BUILDINGS).filter(([,b])=>b.direction===direction).map(([key])=>buildingReference(c,key)).join(' · ')}</p></div></section>`;
}
