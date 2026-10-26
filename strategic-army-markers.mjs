import {scoutAssignments,scoutOperator,scoutVisionProxy,scoutStatus} from './scouting-state.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {intelligenceWorld,armyVisible} from './strategic-vision.mjs';
import {METRIC_ICONS} from './map-metrics.mjs';
import {art} from './art-assets.mjs';
import {mapNode} from './road-network.mjs';
import {isTransport,transportProxy} from './personnel-movement.mjs';
import {armyPosition,armyBattle,activeBattles,liveSoldiers} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
import {servingPeople} from './talent-core.mjs';
import {missionStatus} from './officer-missions.mjs';
import {roadCost,roadDistance,chosenRoad} from './road-metrics.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ARMY_CARD={width:78,height:64,top:-91};
const armyKey=node=>node.dataset.scoutTask||node.dataset.campaignArmy||'transport:'+node.dataset.transportOfficer;
const soldier=(x,i)=>`<g transform="translate(${x} ${i===1?-3:0})"><g class="army-soldier" style="--step-delay:${-i*180}ms"><path class="army-spear" d="M5 4V-24m-2 3 2-6 2 6"/><path class="army-leg army-leg-back" d="M1 1 4 8"/><path class="army-leg army-leg-front" d="M-1 1-4 8"/><path class="army-armor" d="M-4-8 0-10 4-8 5 2H-5Z"/><path class="army-armor-seams" d="M-4-3h8M-4 0h8M0-7V2"/><circle class="army-face" cy="-13" r="3"/><path class="army-helmet" d="M-4-13q0-8 8 0ZM0-19v-2"/><path class="army-shield" d="M-6-6-1-5-1 1-4 4-7 1Z"/></g></g>`;

// Keep the actual road position separate from the readable, collision-free label.
export function armyMapMarkers(s,ui,position=a=>armyPosition(s,a)){
 s=intelligenceWorld(s);

 const diplomats=[...servingPeople(s).values()].filter(o=>o.unit.mission?.type==='diplomacy').map(o=>{const m=o.unit.mission,to=m.route[0];return {id:'diplomat:'+o.unit.id,name:o.unit.name+' · '+missionStatus(m),faction:m.faction,location:m.location,route:[...m.route],travel:to?{from:m.location,to,road:'main',progress:roadDistance(s,m.location,to)*m.progress/roadCost(s,m.location,to)}:null,units:[{...o.unit,troops:0,wounded:0}],leader:o.unit.id,morale:0,task:missionStatus(m),diplomat:{unit:o.unit,mission:m}};});
 const scouts=scoutAssignments(s).map(t=>({id:t.id,name:'侦察斥候 · 负责人'+scoutOperator(s,t)?.unit.name,faction:t.faction,...scoutVisionProxy(s,t),route:[...t.route],units:[],leader:null,morale:0,scout:t}));
 return [...s.armies.filter(a=>!a.defense&&!a.disbanded),...s.campaign.idle.filter(isTransport).map(o=>transportProxy(s,o)),...diplomats,...scouts].filter(a=>armyVisible(s,a)).map(a=>{
  const p=position(a),{width,height}=ARMY_CARD,battle=armyBattle(s,a.id);
  const moving=!!a.travel&&!battle,leg=a.travel||(!battle&&a.route.length?{from:a.location,to:a.route[0],road:chosenRoad(s,a.location,a.route[0],a.roadPolicy)?.id||'main',progress:0}:null);
  // Sample the same projection as the map, including a separately mounted theater map.
  const path=leg?Array.from({length:17},(_,i)=>position({...a,travel:{...leg,progress:roadDistance(s,leg.from,leg.to)*i/16}})):[];
  const next=path.length?path[Math.min(16,Math.floor(leg.progress/roadDistance(s,leg.from,leg.to)*16)+1)]:p,heading=Math.atan2(next.y-p.y,next.x-p.x)*180/Math.PI;
  const facing=path.length&&path.at(-1).x<path[0].x?-1:1;
  const capacity=a.units.reduce((n,u)=>n+troopCapacity(u),0),strength=capacity?Math.min(1,liveSoldiers(s,a)/capacity):0,morale=Math.max(0,Math.min(1,(a.morale||0)/100));
  const figure=`<g class="army-march-company" transform="scale(${facing} 1)"><rect class="army-company-hit" x="-24" y="-38" width="48" height="49"/><ellipse cx="0" cy="6" rx="21" ry="5" class="army-march-shadow"/><g class="army-march-soldiers">${(a.diplomat||a.scout?[0]:[-12,0,12]).map(soldier).join('')}<path class="army-march-pole" d="M-1-3V-35"/><path class="army-march-flag" d="M0-35h19l-4 6 4 6H0Z"/></g></g>${moving?`<g class="army-heading" transform="rotate(${heading})"><path d="M28-4 34 0 28 4M35-4 41 0 35 4"/></g>`:''}`;
  const faction=FACTIONS[a.faction],status=a.scout?scoutStatus(a.scout):a.diplomat?missionStatus(a.diplomat.mission):a.transport?(a.transport.journey?.blocked?'暂停':a.transport.retreating?'撤离':'运输'):armyBattle(s,a.id)?'交战':a.travel?'行军':a.task||'驻停',troops=a.scout?'斥候':a.diplomat?(a.diplomat.mission.cargo?Math.round(a.diplomat.mission.cargo.amount).toLocaleString('zh-CN'):'使臣'):Math.round(a.transport?a.transport.unit.troops+(a.transport.cargo?.manpower||0):liveSoldiers(s,a)).toLocaleString('zh-CN');
  const location=a.travel?`${mapNode(s,a.travel.from)?.name} → ${mapNode(s,a.travel.to)?.name}`:mapNode(s,a.location)?.name;
  const leader=a.scout?{name:'斥候'}:a.transport?.unit||a.units.find(u=>u.id===a.leader)||a.units[0],portrait=art.portraitURL(leader?.id,'portrait');
  const state=battle?'fighting':moving?'marching':a.route.length?'departing':'stationed',label=battle?(battle.awaiting?'尚未开战':battle.battle.reinforcementCouncil?'援军待部署':battle.kind==='siege'?'围城交战':'野外交战'):moving?status:a.route.length?'待出发':status;
  return `<g class="strategy-army army-map-marker ${moving?'is-marching':''} ${battle?'is-fighting':''} ${ui.army===a.id?'selected':''}" ${a.scout?`data-scout-task="${a.id}" data-action="scout-open" data-town="${a.scout.homeCity}"`:a.diplomat?`data-transport-officer="${esc(a.diplomat.unit.id)}" data-diplomatic-officer="${esc(a.diplomat.unit.id)}"`:a.transport?`data-transport-officer="${esc(a.transport.unit.id)}"`:`data-campaign-army="${esc(a.id)}"`} data-x="${p.x}" data-y="${p.y}" data-map-army-anchor data-map-day="${s.campaign.day}" data-map-session="${esc(s.campaign.scenarioId||'theater')}:${s.seed}" data-army-state="${state}" data-march-edge="${leg?esc([leg.from,leg.to,leg.road||'main'].join(':')):''}" data-march-path="${esc(JSON.stringify(path))}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(a.name)}，${esc(faction.name)}，${a.scout?'模拟斥候':troops+'人'}，${esc(label)}，${esc(location)}，查看详情" aria-pressed="${ui.army===a.id}" style="--army-color:${faction.color}"><title>${esc(a.name)} · ${esc(label)} · ${esc(location)}</title><g data-map-army-glyph><line class="army-location-line" x1="0" y1="0" x2="0" y2="${ARMY_CARD.top+height}"/><circle class="army-location-dot" r="2"/>${figure}<g data-map-army-card transform="translate(-39 ${ARMY_CARD.top})"><rect class="army-label-bg" width="${width}" height="${height}" rx="3"/><text class="army-map-name" x="4" y="13">${esc((leader?.name||a.name).slice(0,5))}</text><text class="army-map-sigil" x="69" y="13">${esc(faction.short)}</text>${portrait?`<image href="${esc(portrait)}" x="4" y="18" width="30" height="40" preserveAspectRatio="xMidYMin slice"/>`:`<rect class="army-portrait-fallback" x="4" y="18" width="30" height="40"/><text x="19" y="45" text-anchor="middle" class="army-map-initial">${esc(leader?.name?.slice(0,1)||faction.short)}</text>`}<rect class="army-portrait-frame" x="4" y="18" width="30" height="40"/><g class="army-troop-icon" transform="translate(51 18) scale(.65)"><path d="${METRIC_ICONS.troops}"/></g><text class="army-map-number" x="74" y="43">${troops}</text><g aria-label="兵力 ${Math.round(strength*100)}%"><rect class="army-meter-track" x="38" y="47" width="36" height="4"/><rect class="army-strength-fill" x="38" y="47" width="${36*strength}" height="4"/></g><g aria-label="士气 ${Math.round(morale*100)}"><rect class="army-meter-track" x="38" y="54" width="36" height="3"/><rect class="army-morale-fill" x="38" y="54" width="${36*morale}" height="3"/></g></g></g></g>`;
 }).join('');
}

// These snapshots live only in the DOM. They never enter campaign state or saves.
export function captureArmyMarch(root){
 return new Map([...root.querySelectorAll('[data-map-army-anchor]')].map(node=>{
  const motion=node._marchMotion,t=motion?Math.min(1,(performance.now()-motion.start)/motion.duration):1;
  const point=motion?pointOnMarch(motion.points,t):{x:+node.dataset.x,y:+node.dataset.y};
  return [armyKey(node),{...point,day:+node.dataset.mapDay,session:node.dataset.mapSession,edge:node.dataset.marchEdge,path:JSON.parse(node.dataset.marchPath||'[]'),motion:t<1?motion:null}];
 }));
}
function pointOnMarch(points,t){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((n,v)=>n+v,0);let at=t*total;
 for(let i=0;i<lengths.length;i++){if(at<=lengths[i]){const f=lengths[i]?at/lengths[i]:0;return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}at-=lengths[i];}
 return points.at(-1);
}
export function marchPlaybackPoints(old,next,{sameDay=false}={}){
 // Never animate a load, a jump across dates, or a unit returning to visibility.
 if(!old||old.session!==next.session||next.day!==old.day+1&&!(sameDay&&next.day===old.day)||old.x===next.x&&old.y===next.y)return [];
 let path=next.path?.length?next.path:old.path;
 if(old.edge&&next.edge&&old.edge!==next.edge){const end=old.path?.at(-1);if(!end||Math.hypot(end.x-next.x,end.y-next.y)>.01)return [];path=old.path;}
 if(!path?.length)return [];
 const nearest=p=>path.reduce((best,v,i)=>Math.hypot(v.x-p.x,v.y-p.y)<Math.hypot(path[best].x-p.x,path[best].y-p.y)?i:best,0),a=nearest(old),b=nearest(next);
 // The simulation stops at each node; discontinuous orders must not draw a shortcut.
 const step=Math.max(...path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y)));
 if(Math.hypot(path[a].x-old.x,path[a].y-old.y)>step+1||Math.hypot(path[b].x-next.x,path[b].y-next.y)>step+1)return [];
 const between=a<=b?path.slice(a+1,b):path.slice(b+1,a).reverse();
 return [{x:old.x,y:old.y},...between,{x:next.x,y:next.y}];
}
export function animateArmyMarch(root,previous,{duration=2200,advance=true}={}){
 if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 for(const marker of root.querySelectorAll('[data-map-army-anchor]')){
  const old=previous.get(armyKey(marker)),next={x:+marker.dataset.x,y:+marker.dataset.y,day:+marker.dataset.mapDay,session:marker.dataset.mapSession,edge:marker.dataset.marchEdge,path:JSON.parse(marker.dataset.marchPath||'[]')};
  let points=advance?marchPlaybackPoints(old,next,{sameDay:true}):[],time=duration;
  if(old?.motion&&old.day===next.day&&old.session===next.session&&old.motion.points.at(-1).x===next.x&&old.motion.points.at(-1).y===next.y){const m=old.motion,t=Math.min(1,(performance.now()-m.start)/m.duration),rest=m.points.filter((p,i)=>i>0&&m.offsets[i]>t);points=[{x:old.x,y:old.y},...rest];time=Math.max(1,m.duration*(1-t));}
  if(points.length<2||!marker.animate)continue;
  const lengths=points.map((p,i)=>i?Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):0),total=lengths.reduce((n,v)=>n+v,0);if(!total)continue;let distance=0;
  const offsets=lengths.map(n=>(distance+=n)/total);
  marker._marchMotion={points,offsets,start:performance.now(),duration:time};
  marker.classList.add('is-playing-march');
  const animation=marker.animate(points.map((p,i)=>({transform:`translate(${p.x}px, ${p.y}px)`,offset:offsets[i]})),{duration:time,easing:'linear'});
  animation.onfinish=()=>{marker.classList.remove('is-playing-march');delete marker._marchMotion;};
 }
}

export function battleMapMarkers(s,position=r=>r.point){
 s=intelligenceWorld(s);
 return activeBattles(s).map(r=>{
  const p=position(r),sides=r.battle.sides,waiting=r.awaiting||r.battle.reinforcementCouncil==='pending',label=r.awaiting?'尚未开战':waiting?'援军待部署':r.kind==='siege'?'围城交战':'野外交战',day=Math.max(1,s.campaign.day-r.startedDay+1);
  const forces=sides.map(side=>({name:FACTIONS[side.faction]?.short||'军',color:FACTIONS[side.faction]?.color||'#b9ac8b',troops:Math.round(side.units.filter(u=>!u.retreatDispatched).reduce((n,u)=>n+u.hp,0)).toLocaleString('zh-CN')}));
  return `<g class="strategy-battle-marker map-encounter ${waiting?'is-awaiting':''}" data-action="campaign-focus" data-battle="${esc(r.id)}" data-map-battle-anchor data-x="${p.x}" data-y="${p.y}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${esc(r.name)}，${label}${waiting?'':'，交战第'+day+'天'}，${forces.map(f=>esc(f.name)+'军'+f.troops+'人').join('对')}，进入战场"><title>${esc(r.name)} · ${label}${waiting?'':' · 交战第'+day+'天'}</title><g data-map-battle-glyph><ellipse class="encounter-shadow" cy="7" rx="24" ry="7"/><g class="encounter-swords"><path d="M-17-20-11-19 12 6 7 10-16-14ZM17-20 11-19-12 6-7 10 16-14Z"/><path class="encounter-hilts" d="m4 4 10-7M-4 4-14-3"/></g><g class="encounter-sparks"><path d="M0-17v-5M-21-7h-5M21-7h5M-14-22l-3-4M14-22l3-4"/></g><g class="encounter-card" transform="translate(-56 17)"><rect width="112" height="24" rx="3"/>${forces.map((f,i)=>`<path class="encounter-force" fill="${f.color}" d="M${i?59:5} 5h7v15h-7Z"/><text class="encounter-troops" x="${i?68:14}" y="16">${esc(f.name)} ${f.troops}</text>`).join('')}</g></g></g>`;
 }).join('');
}
