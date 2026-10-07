import {scoutAssignment} from './scouting-state.mjs';
import {outcomeReportMarkup} from './reward-presentation.mjs';
import {METRIC_ICONS} from './map-metrics.mjs';
import {cityPersonnel} from './city-personnel.mjs';
import {DIRECTIONS} from './domestic-designs.mjs';
import {playerFaction} from './player-faction.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {importantActivityNode,pendingActivityReports,acknowledgeActivityReports} from './activity-nodes.mjs';
import {diplomaticAssignment} from './diplomacy-relations.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cityStaffStatus(s,c){
 const people=cityPersonnel(s,c.id).filter(o=>o.faction===c.owner&&!o.unit.mission),ids=new Set(people.map(o=>o.unit.id));
 const assignments=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&ids.has(a.officerId));
 const assigned=new Set(assignments.map(a=>a.officerId)),directions=new Set(assignments.map(a=>a.direction));
 const idle=people.filter(o=>!o.unit.scouting&&!assigned.has(o.unit.id)&&!diplomaticAssignment(s,o.unit.id)&&o.unit.id!==c.governor&&!o.army&&!plannedOfficer(s,o.unit.id)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(o.unit.id)));
 return {filled:directions.size,total:Object.keys(DIRECTIONS).length,missing:Object.keys(DIRECTIONS).filter(k=>!directions.has(k)).map(k=>DIRECTIONS[k]),idle,governor:people.find(o=>o.unit.id===c.governor)?.unit,working:assignments.filter(a=>a.action&&!a.action.paused).length+people.filter(o=>{const t=scoutAssignment(s,o.unit.id);return t&&!t.paused;}).length};
}
export function cityStaffBadge(s,c){
 if(c.owner!==playerFaction(s))return '';
 const x=cityStaffStatus(s,c),label=`内政 ${x.filled}/${x.total} · 空闲 ${x.idle.length}`;
 return `<g class="map-staff-status ${x.idle.length?'has-idle':''}" aria-label="${label}"><title>${esc(staffSummary(s,c))}</title><rect x="-39" y="43" width="78" height="14" rx="3"/><g transform="translate(-34 45) scale(.5)" fill="none" stroke="#e5d2a0" stroke-width="1.6"><path d="${METRIC_ICONS.staff}"/></g><text x="-13" y="53">${x.filled}/${x.total}</text><g transform="translate(6 45) scale(.5)" fill="none" stroke="#f6cd79" stroke-width="1.6"><path d="${METRIC_ICONS.idle}"/></g><text x="27" y="53">${x.idle.length}</text></g>`;
}
export function staffSummary(s,c){const x=cityStaffStatus(s,c);return `太守：${x.governor?.name||'未任命'}；内政 ${x.filled}/${x.total}，${x.working} 人办理中；${x.missing.length?'缺任：'+x.missing.join('、'):'六方向已齐备'}；空闲 ${x.idle.length} 人${x.idle.length?'：'+x.idle.map(o=>o.unit.name).join('、'):''}`;}
export function staffSummaryMarkup(s,c){return c.owner===playerFaction(s)?`<p class="city-staff-summary">${esc(staffSummary(s,c))}</p>`:'';}
export function importantDomesticEvent(phase,key,result={}){
 return importantActivityNode({category:'domestic',phase,key,result});
}
export const pendingDomesticAlerts=pendingActivityReports;
export const acknowledgeDomesticAlerts=acknowledgeActivityReports;
export function domesticAlertsMarkup(s,events){return `<div class="domestic-alert-list report-dispatches">${events.map(e=>outcomeReportMarkup(s,e)).join('')}</div>`;}
