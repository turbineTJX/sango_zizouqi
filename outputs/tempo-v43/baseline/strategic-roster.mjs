import {residentOfficer} from './city-personnel.mjs';
import {DIRECTIONS,assignmentFor,canTrain} from './domestic.mjs';
import {isPlanning,armyBattle} from './strategic-campaign.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const OFFICER_STATS=[['leadership','统率'],['force','武力'],['intellect','智力'],['politics','政治'],['charm','魅力']];
export function campaignOfficers(s){
 const town=id=>s.cities.find(c=>c.id===id)?.name||'—',rows=new Map();
 const appointments=id=>{const a=assignmentFor(s,id);return [s.cities.some(c=>c.governor===id)?'太守':'',a?DIRECTIONS[a.direction]+'负责人':''].filter(Boolean);};
 for(const a of s.armies.filter(a=>a.faction==='cao'&&!a.disbanded))for(const unit of a.units){
  const moving=!!a.travel,battle=armyBattle(s,a.id);
  rows.set(unit.id,{unit,location:moving?null:a.location,home:unit.homeCity,place:moving?`${town(a.travel.from)} → ${town(a.travel.to)}`:town(a.location),status:battle?'交战':moving?'行军':a.route.length?'待出征':'驻军',duty:[a.name,...appointments(unit.id)].join(' · '),appointments:appointments(unit.id),army:a});
 }
 const idle=[...s.campaign.idle,...s.armies.filter(a=>a.disbanded).flatMap(a=>a.returningOfficers||[])];
 for(const o of idle.filter(o=>o.faction==='cao')){
  const duty=assignmentFor(s,o.unit.id),governor=s.cities.find(c=>c.governor===o.unit.id),returning=!s.campaign.idle.includes(o);
  rows.set(o.unit.id,{unit:o.unit,location:o.destination||returning?null:o.location,home:o.unit.homeCity,place:o.destination?`${town(o.location)} → ${town(o.destination)}（${o.remainingDays}天）`:town(o.location),status:returning?'待返城':o.destination?'调任':governor?'太守':duty?'内政':'待命',duty:[governor?'太守':'',duty?DIRECTIONS[duty.direction]+'负责人':''].filter(Boolean).join(' · ')||'—',appointments:appointments(o.unit.id),idle:o,returning});
 }
 return [...rows.values()];
}
export function pickerReason(s,row,pick){
 if(!isPlanning(s)||s.finished)return '执行期间不可委任';
 if(row.returning)return '待返城';
 if(row.idle?.destination)return '调任途中';
 if(row.location!==pick.city)return '不在本城';
 const c=s.cities.find(c=>c.id===pick.city);
 if(c?.owner!=='cao')return '非己方据点';
 if(!residentOfficer(s,row.unit.id))return row.status+'中';
 if(pick.task==='transfer'&&row.army)return '已编制部队，请用军团调动';
 if(pick.task==='transfer'&&s.cities.some(c=>c.governor===row.unit.id))return '须先解除太守';
 if(pick.task==='draft'){
  if(row.army)return '已编制部队';
  if(s.campaign.battles.some(r=>!r.settled&&r.kind==='siege'&&r.cityId===c.id))return '围城期间不可编制';
  if(!canTrain(c,row.unit.type))return '本城未解锁兵种';
 }
 if(pick.task==='domestic'&&assignmentFor(s,row.unit.id)?.direction===pick.direction)return '已在此任职';
 if(pick.task==='governor'&&c.governor===row.unit.id)return '现任太守';
 return '';
}
export const pickerTitle=p=>({governor:'任命太守',domestic:'委任'+DIRECTIONS[p.direction]+'负责人',draft:'预编守城部队',transfer:'调任武将'}[p.task]);
export function campaignRosterMarkup(s,ui,pick=null){
 const all=campaignOfficers(s),filter=ui.personnel||{},selected=pick?.selected||[];
 let rows=all.filter(r=>(!filter.city||r.location===filter.city)&&(!filter.status||r.status===filter.status||(filter.status==='太守'&&r.appointments.includes('太守'))||(filter.status==='内政'&&r.appointments.some(x=>x.endsWith('负责人'))))&&(!filter.query||[r.unit.name,r.unit.courtesy,...(OFFICER_BY_ID[r.unit.id]?.aliases||[])].some(n=>n?.includes(filter.query.trim()))));
 const sort=filter.sort||(pick?.task==='draft'?'leadership':'politics');
 rows.sort((a,b)=>(pick?Number(!!pickerReason(s,a,pick))-Number(!!pickerReason(s,b,pick)):0)||(b.unit[sort]??OFFICER_BY_ID[b.unit.id]?.[sort]??0)-(a.unit[sort]??OFFICER_BY_ID[a.unit.id]?.[sort]??0)||a.unit.name.localeCompare(b.unit.name,'zh-CN'));
 return `<div class="personnel-summary"><b>${pick?esc(s.cities.find(c=>c.id===pick.city)?.name)+' · '+pickerTitle(pick):'麾下武将 '+all.length+' 人'}</b><span>${pick?'可选 '+all.filter(r=>!pickerReason(s,r,pick)).length+' 人 · 已选 '+selected.length+' 人':'待命 '+all.filter(r=>r.status==='待命').length+' · 内政 / 太守 '+all.filter(r=>r.appointments.length).length+' · 已编部队 '+all.filter(r=>r.army).length}</span></div>
 <div class="personnel-toolbar"><label>姓名<input type="search" data-personnel-filter="query" value="${esc(filter.query||'')}" placeholder="姓名 / 字"></label><label>所在据点<select data-personnel-filter="city"><option value="">全部据点（含途中）</option>${s.cities.filter(c=>c.owner==='cao'||all.some(r=>r.location===c.id)).map(c=>`<option value="${c.id}" ${filter.city===c.id?'selected':''}>${c.name} · ${all.filter(r=>r.location===c.id).length}人</option>`).join('')}</select></label><label>状态<select data-personnel-filter="status"><option value="">全部状态</option>${['待命','内政','太守','驻军','待出征','行军','交战','调任','待返城'].map(x=>`<option ${filter.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label>排序<select data-personnel-filter="sort">${OFFICER_STATS.map(([k,n])=>`<option value="${k}" ${sort===k?'selected':''}>${n} ↓</option>`).join('')}</select></label></div>
 ${pick?.task==='transfer'?`<label class="strategy-field">调往据点<select id="personnel-destination">${s.cities.filter(c=>c.owner==='cao'&&c.id!==pick.city).map(c=>`<option value="${c.id}" ${pick.destination===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label>`:''}
 <div class="personnel-table-wrap"><table class="personnel-table"><thead><tr>${pick?'<th>选择</th>':''}<th>武将</th><th>所在 / 归属</th><th>状态 / 职务</th>${OFFICER_STATS.map(([,n])=>`<th>${n}</th>`).join('')}<th>等级</th><th>忠诚</th></tr></thead><tbody>${rows.map(r=>{const u=r.unit,reason=pick?pickerReason(s,r,pick):'';return `<tr class="${reason?'unavailable':''}">${pick?`<td><input type="${['draft','domestic'].includes(pick.task)?'checkbox':'radio'}" name="personnel-choice" data-personnel-choice="${u.id}" aria-label="选择${esc(u.name)}" ${selected.includes(u.id)?'checked':''} ${reason?'disabled':''}>${reason?`<small>${reason}</small>`:''}</td>`:''}<td><button class="personnel-name" data-action="campaign-person-detail" data-officer="${u.id}">${esc(u.name)} ↗</button></td><td>${esc(r.place)}<small>归属 ${esc(s.cities.find(c=>c.id===r.home)?.name||'—')}</small></td><td>${r.status}<small>${esc(r.duty)}</small></td>${OFFICER_STATS.map(([k])=>`<td>${u[k]??OFFICER_BY_ID[u.id]?.[k]??'—'}</td>`).join('')}<td>${u.level}</td><td>${s.campaign.domestic.loyalty[u.id]??u.loyalty??85}</td></tr>`;}).join('')||`<tr><td colspan="11">没有符合筛选条件的武将。</td></tr>`}</tbody></table></div><p class="personnel-count">显示 ${rows.length} / ${all.length} 人${pick?' · 灰色条目列明不可任用原因':''}</p>`;
}
