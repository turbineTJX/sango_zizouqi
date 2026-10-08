import {DOMESTIC_INCIDENTS,incidentFor,domesticIncidentText} from './domestic-incidents.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {playerFaction} from './player-faction.mjs';
import {mapNode} from './map-node-data.mjs';
import {detailLink} from './ui-detail-table.mjs';
const concern=e=>e.chance<0||e.relationDelta<0;
export function incidentWorkMarkup(s,a){
 if(mapNode(s,a.cityId)?.owner!==playerFaction(s)||a.action?.incidentId===null)return '';
 const r=s.campaign.domestic.incidents.events.find(r=>r.id===a.action?.incidentId);if(!r)return '';
 const e=DOMESTIC_INCIDENTS[r.code],active=!!incidentFor(s,a),names=r.participants.map(p=>OFFICER_BY_ID[p.id].name).join('、');
 return `<small class="domestic-incident-signal ${concern(e)?'concern':'favorable'} ${active?'':'inactive'}" data-domestic-incident="${r.id}">${detailLink('内政纪事',[{name:e.name,rows:[['参与武将','',names],['纪事','',domesticIncidentText(s,r)],['状态','',active?'当前事务生效':'当前协作或工作条件不满足']]}],e.name)}${active?' · 本轮生效':' · 暂不生效'}</small>`;
}
export function cityIncidentMarkup(s,c){
 if(c.owner!==playerFaction(s))return '';
 const current=Math.floor((s.campaign.day-1)/10)+1;
 return s.campaign.domestic.incidents.events.filter(r=>r.cityId===c.id&&r.turn===current&&DOMESTIC_INCIDENTS[r.code].story).slice(-2).map(r=>{const e=DOMESTIC_INCIDENTS[r.code];return '<p class="domestic-incident-signal '+(concern(e)?'concern':'favorable')+'" data-city-incident="'+r.id+'">'+detailLink('内政纪事',[{name:e.name,rows:[['当事人','',OFFICER_BY_ID[r.sourceOfficerId].name+'、'+OFFICER_BY_ID[r.otherOfficerId].name],['纪事','',domesticIncidentText(s,r)],['结算','', '已记入城仓与武将交情。']]}],e.name)+' · 第'+r.day+'天 · 已结算</p>';}).join('');
}
