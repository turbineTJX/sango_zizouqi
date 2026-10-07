import {scoutAssignments,scoutOperator,scoutVisionProxy,scoutStatus} from './scouting-state.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {intelligenceWorld,armyVisible} from './strategic-vision.mjs';
import {METRIC_ICONS} from './map-metrics.mjs';
import {art,assetURL} from './art-assets.mjs';
import {mapNode} from './road-network.mjs';
import {isTransport,transportProxy} from './personnel-movement.mjs';
import {armyPosition,armyBattle,liveSoldiers} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
import {servingPeople} from './talent-core.mjs';
import {missionStatus} from './officer-missions.mjs';
import {roadCost,roadDistance} from './road-metrics.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep the actual road position separate from the readable, collision-free label.
export function armyMapMarkers(s,ui,position=a=>armyPosition(s,a)){
 s=intelligenceWorld(s);

 const diplomats=[...servingPeople(s).values()].filter(o=>o.unit.mission?.type==='diplomacy').map(o=>{const m=o.unit.mission,to=m.route[0];return {id:'diplomat:'+o.unit.id,name:o.unit.name+' · '+missionStatus(m),faction:m.faction,location:m.location,route:[...m.route],travel:to?{from:m.location,to,road:'main',progress:roadDistance(s,m.location,to)*m.progress/roadCost(s,m.location,to)}:null,units:[{...o.unit,troops:0,wounded:0}],leader:o.unit.id,morale:0,task:missionStatus(m),diplomat:{unit:o.unit,mission:m}};});
 const scouts=scoutAssignments(s).map(t=>({id:t.id,name:'侦察斥候 · 负责人'+scoutOperator(s,t)?.unit.name,faction:t.faction,...scoutVisionProxy(s,t),route:[...t.route],units:[],leader:null,morale:0,scout:t}));
 return [...s.armies.filter(a=>!a.defense&&!a.disbanded),...s.campaign.idle.filter(isTransport).map(o=>transportProxy(s,o)),...diplomats,...scouts].filter(a=>armyVisible(s,a)).map(a=>{
  const p=position(a),width=78,height=64;
  const from=a.travel&&mapNode(s,a.travel.from),to=a.travel&&mapNode(s,a.travel.to),moving=!!a.travel&&!armyBattle(s,a.id),facing=to&&from&&to.x<from.x?-1:1;
  const capacity=a.units.reduce((n,u)=>n+troopCapacity(u),0),strength=capacity?Math.min(1,liveSoldiers(s,a)/capacity):0,morale=Math.max(0,Math.min(1,(a.morale||0)/100));
  const figure=`<g class="army-march-company" transform="scale(${facing} 1)"><ellipse cx="0" cy="5" rx="18" ry="5" class="army-march-shadow"/><g class="army-march-soldiers">${(a.diplomat||a.scout?[0]:[-10,0,10]).map((x,i)=>`<g transform="translate(${x} ${i===1?-3:0})"><circle cy="-10" r="3"/><path d="M-3-6h6l2 9H-5Z"/><path class="army-march-legs" d="M-2 2l-3 5M2 2l3 5"/></g>`).join('')}${a.diplomat||a.scout?'<path d="M4-12h8v12H4Z"/>':'<path class="army-march-pole" d="M-1-6V-30"/><path class="army-march-flag" d="M0-30h17l-4 6 4 6H0Z"/>'}</g></g>`;
  const faction=FACTIONS[a.faction],status=a.scout?scoutStatus(a.scout):a.diplomat?missionStatus(a.diplomat.mission):a.transport?(a.transport.journey?.blocked?'暂停':a.transport.retreating?'撤离':'运输'):armyBattle(s,a.id)?'交战':a.travel?'行军':a.task||'驻停',troops=a.scout?'斥候':a.diplomat?(a.diplomat.mission.cargo?Math.round(a.diplomat.mission.cargo.amount).toLocaleString('zh-CN'):'使臣'):Math.round(a.transport?a.transport.unit.troops+(a.transport.cargo?.manpower||0):liveSoldiers(s,a)).toLocaleString('zh-CN');
  const location=a.travel?`${mapNode(s,a.travel.from)?.name} → ${mapNode(s,a.travel.to)?.name}`:mapNode(s,a.location)?.name;
  const leader=a.scout?{name:'斥候'}:a.transport?.unit||a.units.find(u=>u.id===a.leader)||a.units[0],portrait=art.portraitURL(leader?.id,'portrait');
  return `<g class="strategy-army army-map-marker ${moving?'is-marching':''} ${ui.army===a.id?'selected':''}" ${a.scout?`data-scout-task="${a.id}" data-action="scout-open" data-town="${a.scout.homeCity}"`:a.diplomat?`data-transport-officer="${esc(a.diplomat.unit.id)}" data-diplomatic-officer="${esc(a.diplomat.unit.id)}"`:a.transport?`data-transport-officer="${esc(a.transport.unit.id)}"`:`data-campaign-army="${esc(a.id)}"`} data-x="${p.x}" data-y="${p.y}" data-map-army-anchor transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(a.name)}，${esc(faction.name)}，${a.scout?'模拟斥候':troops+'人'}，${esc(status)}，${esc(location)}，查看详情" aria-pressed="${ui.army===a.id}" style="--army-color:${faction.color}"><title>${esc(a.name)} · ${esc(location)} · 点击查看详情</title><g data-map-army-glyph><line class="army-location-line" x1="0" y1="0" x2="0" y2="-20"/><ellipse class="army-position-ring" cy="5" rx="21" ry="7"/><circle class="army-location-dot" r="2"/>${figure}<g data-map-army-card transform="translate(-39 -91)"><rect class="army-label-bg" width="${width}" height="${height}" rx="1"/><text class="army-map-name" x="4" y="13">${esc(leader?.name||a.name.slice(0,5))}</text>${portrait?`<image href="${esc(portrait)}" x="4" y="18" width="30" height="40" preserveAspectRatio="xMidYMin slice"/>`:`<rect class="army-portrait-fallback" x="4" y="18" width="30" height="40"/><text x="19" y="45" text-anchor="middle" class="army-map-initial">${esc(leader?.name?.slice(0,1)||faction.short)}</text>`}<rect class="army-portrait-frame" x="4" y="18" width="30" height="40"/><g class="army-troop-icon" transform="translate(51 18) scale(.65)"><path d="${METRIC_ICONS.troops}"/></g><text class="army-map-number" x="74" y="43">${troops}</text><g aria-label="兵力 ${Math.round(strength*100)}%"><rect class="army-meter-track" x="38" y="47" width="36" height="4"/><rect class="army-strength-fill" x="38" y="47" width="${36*strength}" height="4"/></g><g aria-label="士气 ${Math.round(morale*100)}"><rect class="army-meter-track" x="38" y="54" width="36" height="3"/><rect class="army-morale-fill" x="38" y="54" width="${36*morale}" height="3"/></g></g></g></g>`;
 }).join('');
}

// Playback only: simulation positions, path costs and encounters remain authoritative.
export function animateArmyMarch(root,previous){
 if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 for(const marker of root.querySelectorAll('[data-map-army-anchor]')){
  const key=marker.dataset.scoutTask||marker.dataset.campaignArmy||'transport:'+marker.dataset.transportOfficer,old=previous.get(key);
  const x=+marker.dataset.x,y=+marker.dataset.y;
  if(!old||old.x===x&&old.y===y)continue;
  marker.animate([{transform:`translate(${old.x}px, ${old.y}px)`},{transform:`translate(${x}px, ${y}px)`}],{duration:900,easing:'linear'});
 }
}
