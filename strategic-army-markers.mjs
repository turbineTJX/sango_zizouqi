import {mapNode} from './road-network.mjs';
import {isTransport,transportProxy} from './personnel-movement.mjs';
import {armyPosition,armyBattle,liveSoldiers} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Keep the actual road position separate from the readable, collision-free label.
export function armyMapMarkers(s,ui,position=a=>armyPosition(s,a)){
 const placed=[];
 return [...s.armies.filter(a=>!a.defense&&!a.disbanded),...s.campaign.idle.filter(isTransport).map(o=>transportProxy(s,o))].map(a=>{
  const p=position(a),width=148,height=44;
  let x=Math.max(4,Math.min(1020-width,p.x+16)),y=Math.max(4,p.y-height-20);
  while(placed.some(r=>x<r.x+width+4&&x+width+4>r.x&&y<r.y+height+4&&y+height+4>r.y))y+=height+5;
  placed.push({x,y});
  const faction=FACTIONS[a.faction],status=a.transport?(a.transport.journey?.blocked?'暂停':'运输'):armyBattle(s,a.id)?'交战':a.travel?'行军':a.task||'驻停',troops=Math.round(a.transport?a.transport.unit.troops+(a.transport.cargo?.manpower||0):liveSoldiers(s,a)).toLocaleString('zh-CN');
  const location=a.travel?`${mapNode(s,a.travel.from)?.name} → ${mapNode(s,a.travel.to)?.name}`:mapNode(s,a.location)?.name;
  return `<g class="strategy-army army-map-marker ${ui.army===a.id?'selected':''}" ${a.transport?`data-transport-officer="${esc(a.transport.unit.id)}"`:`data-campaign-army="${esc(a.id)}"`} data-x="${p.x}" data-y="${p.y}" tabindex="0" role="button" aria-label="${esc(a.name)}，${esc(faction.name)}，${troops}人，${esc(status)}，${esc(location)}，查看详情" aria-pressed="${ui.army===a.id}" style="--army-color:${faction.color}"><title>${esc(a.name)} · ${esc(location)} · 点击查看军团详情</title><line class="army-location-line" x1="${p.x}" y1="${p.y}" x2="${x+width/2}" y2="${y+height/2}"/><circle class="army-location-dot" cx="${p.x}" cy="${p.y}" r="5"/><g transform="translate(${x} ${y})"><rect class="army-label-bg" width="${width}" height="${height}" rx="6"/><rect class="army-faction-band" width="5" height="${height}" rx="2"/><text class="army-map-name" x="12" y="17">${esc(a.name.length>10?a.name.slice(0,9)+'…':a.name)}</text><text class="army-map-status" x="12" y="34">${a.transport?`${a.transport.journey?.blocked?'停':'运'} · ${troops}人 · 粮${Math.floor((a.transport.cargo?.grain||0))}`:`${esc(faction.short)} · ${troops}人 · ${esc(status)}`}</text></g></g>`;
 }).join('');
}
