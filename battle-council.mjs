import {battleAppointmentCandidates} from './battle-appointments.mjs';
import {appointmentFields} from './army-appointments-view.mjs';
import {frontlineCapacity} from './army-trait-rules.mjs';
import {isBattleCouncil,isReinforcementCouncil,fillSlots,reserveDeploymentUnit} from './engine.mjs';
import {shieldLayers,refreshShield,setStatus} from './tactics.mjs';
import {validRetreatAt} from './battle-retreat.mjs';
import {battleLabelMarkup} from './battle-labels.mjs';
import {battleArrivalLabel} from './reinforcement-arrival.mjs';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function retreatCouncilMarkup(b,{selected=[],retreatOpen=false,destinations=[]}={}){
 const units=b.sides[0].units.filter(u=>u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing),picked=new Set(selected);
 return `<details class="retreat-council" ${retreatOpen?'open':''}><summary>撤离设置</summary>
 ${b.strategicRetreat?`<label>撤离节点 <select data-retreat-destination aria-label="撤离节点"><option value="">${destinations.length?'选择节点':'暂无安全节点'}</option>${destinations.map(c=>`<option value="${esc(c.id)}" ${b.sides[0].retreatDestination===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`:'<p>撤离地点：本方战场出口</p>'}
 <div class="retreat-toolbar"><label><input type="checkbox" data-retreat-all ${units.every(u=>picked.has(u.id))?'checked':''}> 全选</label><label>批量人数 <input type="number" min="0" step="1" data-retreat-batch aria-label="批量撤离人数" placeholder="留空不自动撤离"></label><button data-action="retreat-batch-apply">应用</button><span>已选 ${units.filter(u=>picked.has(u.id)).length} 队</span></div>
 <p>现役兵力不超过所填人数时撤离；留空不自动撤离。离场后后备正常补位。</p><div class="retreat-units">${units.map(u=>`<div class="retreat-unit"><label><input type="checkbox" data-retreat-pick="${esc(u.id)}" ${picked.has(u.id)?'checked':''}> ${esc(u.name)} <small>${u.status==='active'?'首发':'后备'} · ${Math.round(u.hp)}</small></label><input type="number" min="0" step="1" data-unit-retreat="${esc(u.id)}" aria-label="${esc(u.name)}撤离人数" placeholder="不自动撤离" value="${u.retreatAt??''}"></div>`).join('')}</div></details>`;
}
export function configureCouncilRetreat(b,ids,policy,side=0){
 if(!isBattleCouncil(b))return '只能在战前会议或援军军议调整撤离';
 if(![0,1].includes(side))return '请选择本方军团';
 if(!validRetreatAt(policy))return '撤离设置无效';
 if(!Array.isArray(ids)||!ids.length)return '请先选择部队';
 const units=ids.map(id=>b.sides[side].units.find(u=>u.id===id&&u.hp>0&&['active','reserve'].includes(u.status)&&!u.withdrawing));
 if(units.some(u=>!u))return '请选择本方部队';
 for(const u of units)u.retreatAt=policy;
 return null;
}
export function battleCouncilMarkup(b,{open=true,selected=[],retreatOpen=false,destinations=[],armies=[],appointments={}}={}){
 if(!isBattleCouncil(b))return '';
 const units=b.sides[0].units;
  const reinforcement=isReinforcementCouncil(b);
 const appointmentMarkup=[...new Set(battleAppointmentCandidates(b,0).map(u=>u.armyId))].map(id=>{
  const army=armies.find(a=>a.id===id)||{id,name:'军团'},roles=Object.fromEntries(['leader','advisor'].map(role=>[role,b.sides[0].commanders.find(c=>c.armyId===id&&c.role===role)?.id??null]));
  return appointmentFields(army,battleAppointmentCandidates(b,0,id),appointments[id]||roles);
 }).join('');
 return `<section class="battle-council"><h3>${reinforcement?'援军军议':'战前会议'} · 已上阵 ${units.filter(u=>u.status==='active').length}／${frontlineCapacity(b,0)}</h3>${reinforcement?'<p>可重新任命各军团的军团长、军师，并调整后备顺序与撤离设置；在场部队保持原位，战斗意图与地形已锁定。</p>':''}<details><summary>军团任命</summary>${appointmentMarkup}</details><details ${open?'open':''}><summary>后备部队 · ${units.filter(u=>u.status==='reserve'&&u.hp>0).length} 队</summary><div class="reserve-bench" data-reserve-bench>${units.filter(u=>u.status==='reserve'&&u.hp>0).map(u=>`<button type="button" class="council-unit unit-nameplate side-0" draggable="true" data-council-unit="${esc(u.id)}" data-action="unit-stats" data-inspect="${esc(u.id)}" aria-label="后备部队${esc(u.name)}，兵力 ${Math.round(u.hp)}，点击查看部队属性">${battleLabelMarkup(u,b)}${u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick?`<small>待援 · ${esc(battleArrivalLabel(b,u,armies))}</small>`:''}</button>`).join('')||`<span>${reinforcement?'后备队列为空':'后备队列为空，可将场上部队拖回此处'}</span>`}</div></details>${retreatCouncilMarkup(b,{selected,retreatOpen,destinations})}</section>`;

}
export function changeBattleCouncil(b,{tactic,id,offset,toId}={}){
 if(!isBattleCouncil(b))return '只能在战前会议或援军军议调整';
 if(tactic!==undefined)return '不支持此调整';
 if(isReinforcementCouncil(b)){
  const queue=b.sides[0].units.filter(u=>u.status==='reserve'&&u.hp>0),i=queue.findIndex(u=>u.id===id);
  if(i<0)return '在场部队不能重新布置';
  if(toId)return reserveDeploymentUnit(b,id,toId);
  if(![-1,1].includes(offset)||!queue[i+offset])return '出阵顺序无效';
  return reserveDeploymentUnit(b,offset<0?id:queue[i+offset].id,offset<0?queue[i+offset].id:id);
 }
 const units=b.sides[0].units,i=units.findIndex(u=>u.id===id),j=toId?units.findIndex(u=>u.id===toId):i+offset;
 if((!toId&&![-1,1].includes(offset))||i<0||j<0||j>=units.length)return '出阵顺序无效';
 const shieldUnit=units.find(u=>shieldLayers(b,u).some(l=>l.source==='siege:opening'));const opening=shieldUnit&&shieldLayers(b,shieldUnit).find(l=>l.source==='siege:opening');const ratio=opening?opening.amount/shieldUnit.initial:0;
 if(i===j)return null;const [moved]=units.splice(i,1);units.splice(j,0,moved);
 for(const u of units){if(u.status==='active'||u.status==='reserve'){u.status='reserve';u.x=-1;u.y=-1;}}
 fillSlots(b,0);
 if(opening)for(const u of units){refreshShield(b,u,shieldLayers(b,u).filter(l=>l.source!=='siege:opening'));if(u.status==='active')setStatus(b,u,'shield',opening.until-b.tick,{amount:Math.round(u.initial*ratio),source:'siege:opening',label:'守城首发护盾'});}
 return null;
}
