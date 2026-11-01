import {playerFaction} from './player-faction.mjs';
import {campaignOfficers,officerWorkMarkup} from './strategic-roster.mjs';
import {scoutCandidates,scoutOfficerReason,scoutTargets,scoutRoute,scoutingDurationRange} from './scouting.mjs';
import {diplomaticOfficerCandidates} from './diplomacy.mjs';
import {DIPLOMACY_DIRECTIONS} from './data/design/diplomacy-rules.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
import {diplomaticTraits,diplomaticTraitProfile} from './diplomatic-traits.mjs';
import {abilityButton} from './ability-reference.mjs';
import {sortRows,sortHeader} from './list-sort.mjs';
import {cityStaffStatus} from './domestic-feedback.mjs';
import {roadCost} from './road-metrics.mjs';
import {MOVEMENT_RULES} from './data/design/movement-rules.mjs';
import {CAMPAIGN_TIME} from './combat-rules.mjs';
import {treasureRecipient,grantTreasure} from './treasures.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const assignmentField=(id,label,value,{kind,direction='',disabled=false,selection=''}={})=>`<label class="strategy-field">${label}<button type="button" id="${id}" class="button secondary map-target-field" data-action="assignment-picker-open" data-kind="${kind}" data-selected="${esc(selection)}" data-direction="${direction}" aria-haspopup="dialog" ${disabled?'disabled':''}>${esc(value||'选择'+(kind.endsWith('officer')?'武将':kind.endsWith('target')?'终点':'城市'))}</button></label>`;
export function assignmentCandidates(s,p){
 const own=playerFaction(s),roster=campaignOfficers(s);
 if(p.kind.endsWith('city'))return s.cities.filter(c=>c.owner===own).map(c=>({id:c.id,name:c.name,people:roster.filter(r=>r.location===c.id).length,idle:cityStaffStatus(s,c).idle.length,reason:''}));
 if(p.kind==='scout-target')return scoutCandidates(s,p.city,own,{reassign:true}).some(o=>o.unit.id===p.officer)?scoutTargets(s,p.city).map(n=>{let from=p.city,cost=0;for(const to of scoutRoute(s,p.city,n.id)||[]){cost+=roadCost(s,from,to);from=to;}return {id:n.id,name:n.name,kind:n.units?'城市':({port:'港口',gate:'关卡',junction:'路口'})[n.kind]||'据点',days:Math.ceil(cost/MOVEMENT_RULES.scouting.speed),reason:''};}):[];
 if(p.kind==='treasure-officer')return roster.map(r=>({...r,id:r.unit.id,name:r.unit.name,reason:!treasureRecipient(s,r.unit.id,own)?'随军锁定':grantTreasure(s,p.treasureId,r.unit.id,{checkOnly:true})||''}));
 const eligible=p.kind==='diplomacy-officer'?new Set(diplomaticOfficerCandidates(s,own,p.direction).map(o=>o.unit.id)):null;
 return roster.filter(r=>r.location===p.city).map(r=>{
  const assignment=diplomaticAssignment(s,r.unit.id),reason=p.kind==='scout-officer'?scoutOfficerReason(s,p.city,r.unit.id,own,{reassign:true}):!eligible.has(r.unit.id)?'当前无法委任':assignment?.projectId?'已有外交项目':assignment?.direction===p.direction?'已在此任职':'';
  const range=scoutingDurationRange(r.unit.intellect);
  return {...r,id:r.unit.id,name:r.unit.name,stat:r.unit[p.kind==='scout-officer'?'intellect':DIPLOMACY_DIRECTIONS[p.direction].stat],duration:`${range.min/CAMPAIGN_TIME.daysPerTurn}–${range.max/CAMPAIGN_TIME.daysPerTurn} 回合`,reason};
 });
}
export function assignmentPickerMarkup(s,p){
 const officer=p.kind.endsWith('officer'),treasure=p.kind==='treasure-officer',target=p.kind.endsWith('target'),stat=officer&&!treasure?(p.kind==='scout-officer'?'智力':({politics:'政治',charm:'魅力',intellect:'智力',leadership:'统率',force:'武力'})[DIPLOMACY_DIRECTIONS[p.direction].stat]):null;
 const columns=officer?[['name','武将'],...(stat?[['stat',stat]]:[]),...(p.kind==='scout-officer'?[['duration','视野持续']]:[]),['place','所在'],['duty','任职'],['work','事务'],...(p.kind==='diplomacy-officer'?[['traits','特性']]:[])]:target?[['name','终点'],['kind','类型'],['days','抵达天数']]:[['name','城市'],['people','武将'],['idle','空闲']];
 const all=assignmentCandidates(s,p),query=p.query?.trim(),sort=p.sort||(officer&&!treasure?'stat':'name'),direction=p.order||'desc';
 const rows=sortRows(all.filter(r=>!query||[r.name,r.unit?.courtesy].some(n=>n?.includes(query))),sort,direction,(r,k)=>r[k]).sort((a,b)=>Number(!!a.reason)-Number(!!b.reason));
 const selected=all.find(r=>r.id===p.selected&&!r.reason),title=treasure?'选择接收武将':officer?'选择执行人':target?'选择侦察终点':'选择派出城市';
 return {title,body:`<section class="task-personnel"><div class="task-personnel-tools"><label>查找<input type="search" data-assignment-query value="${esc(p.query||'')}" placeholder="${officer?'姓名 / 字':'名称'}"></label></div><div class="task-candidate-list"><table class="personnel-table"><thead><tr><th>选择</th>${columns.map(([key,label])=>['work','traits'].includes(key)?`<th>${label}</th>`:sortHeader('assignment',key,label,sort,direction)).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.reason?'unavailable':''} ${p.selected===r.id?'selected':''}"><td><input type="radio" name="assignment-choice" data-assignment-choice="${esc(r.id)}" aria-label="选择${esc(r.name)}" ${p.selected===r.id?'checked':''} ${r.reason?'disabled':''}></td>${columns.map(([key])=>`<td>${key==='work'?officerWorkMarkup(s,r.id):key==='traits'?(diplomaticTraits(r.unit,p.direction).map(t=>abilityButton('trait',t.id,t.name)).join(' · ')+(diplomaticTraits(r.unit,p.direction).length?`<small>办理×${diplomaticTraitProfile(r.unit,p.direction).rate}</small>`:''))||'—':key==='name'&&officer?`<button data-action="campaign-person-detail" data-officer="${esc(r.id)}">${esc(r.name)}</button>${r.reason?`<small>${esc(r.reason)}</small>`:''}`:esc(r[key])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${columns.length+1}">暂无人选或目标</td></tr>`}</tbody></table></div></section>`,footer:`<button class="button secondary" data-action="assignment-picker-cancel">取消</button><button class="button primary" data-action="assignment-picker-confirm" ${selected?'':'disabled'}>确认</button>`};
}
export function selectScoutField(p,field,id){
 if(p[field]===id)return;
 if(field==='city')Object.assign(p,{city:id,officer:null,target:null,route:null,waypoints:[],mapUI:null});
 else if(field==='officer')Object.assign(p,{officer:id,target:null,route:null,waypoints:[]});
 else Object.assign(p,{target:id,route:null,waypoints:[]});
}
