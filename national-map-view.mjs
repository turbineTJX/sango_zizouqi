import {scoutAssignments,scoutingPosition} from './scouting-state.mjs';
import {citySoldierLabel} from './city-budget.mjs';
import {cityMilitary} from './domestic.mjs';
import {intelligenceWorld,cityIntelligence,intelligenceLabel,fogMarkup,visionSources} from './strategic-vision.mjs';
import {cityStaffBadge} from './domestic-feedback.mjs';
import {LAND_PATH,RIVERS,LAKES,geographyLabels,polyline} from './national-geography.mjs';
import {ancientAtlasTerrain,atlasOverviewMarkup} from './ancient-atlas-terrain.mjs';
import {citySceneState,cityCompactMarkup} from './city-scene.mjs';
import {citySizeName,cityMarkerShape} from './city-classification.mjs';
import {territoryRegions} from './strategic-territory.mjs';
import {operationMapView,mapDetailLevel,MAP_DETAIL_NAMES} from './strategic-map-camera.mjs';
import {metropolitanMapMarkup} from './metropolitan-map.mjs';
import {renderJunctions,mapNodes,isJunction,nodeKindName} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {armyMapMarkers} from './strategic-army-markers.mjs';
import {renderRoads,renderMarchRoute,roadPoint,renderSupplyRoute} from './strategic-movement.mjs';
import {FACTIONS} from './engine.mjs';
import {activeBattles,armyPosition,liveSoldiers,supplyConnection} from './strategic-campaign.mjs';
import {MAP_SEASONS} from './strategic-map-art.mjs';
import {nationalScenario} from './national-scenarios.mjs';
import {officerActivities} from './officer-activity.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NATIONAL_LAND_PATH=LAND_PATH;
function cityPin(s,c,ui,activities){
 const intel=cityIntelligence(s,c.id);
 if(!intel.data)return `<g data-city="${c.id}" data-city-size="${c.citySize}" data-x="${c.x}" data-y="${c.y}" tabindex="0" role="button" aria-label="${esc(c.name)}，尚未侦察" class="strategy-city national-node node-city city-size-${c.citySize} fog-city ${ui.city===c.id?'selected':''}" style="--force-color:${FACTIONS[c.owner].color}" transform="translate(${c.x} ${c.y})"><g data-map-glyph>${cityMarkerShape(c,c.citySize==='small'?16:23,'class="city-size-mark"')}<rect class="map-city-banner" x="-27" y="12" width="54" height="38" rx="2"/><text class="national-place-name" y="24">${esc(c.name)}</text><text class="map-city-strength" y="35">未侦察</text></g><title>${esc(c.name)} · 尚未侦察</title></g>`;
 const model=citySceneState(s,c,{activities}),small=c.citySize==='small',sizeName=citySizeName(c),force=FACTIONS[c.owner];
 return `<g data-city="${c.id}" data-metropolis="${model.metropolis.id}" data-city-size="${c.citySize}" data-x="${c.x}" data-y="${c.y}" tabindex="0" role="button" aria-label="${c.name}，${sizeName}，${force.name}，${intelligenceLabel(s,c.id)}" class="strategy-city national-node node-city city-size-${c.citySize} ${intel.visible?'':'fog-city'} ${ui.city===c.id?'selected':''}" style="--force-color:${force.color}" transform="translate(${c.x} ${c.y})"><script type="application/json" data-city-model>${JSON.stringify(model).replaceAll('<','\\u003c')}</script><g class="map-city-scene" data-city-scene transform="scale(${model.layout.mapScale})"></g>${cityCompactMarkup(model)}<g data-map-glyph>${citySoldierLabel(s,c,small?-22:-30)}<circle class="city-halo" r="${small?14:20}"/>${cityMarkerShape(c,small?16:23,'class="city-size-mark"')}<rect class="map-city-banner" x="-27" y="12" width="54" height="38" rx="2"/><text class="national-place-name" y="24">${esc(c.name)}</text><text class="map-city-gold" y="35">${c.gold===null?'—':Math.floor(c.gold).toLocaleString('zh-CN')}金</text><text class="map-city-grain" y="45">${intel.visible?Math.floor(c.grain).toLocaleString('zh-CN'):'第'+intel.day+'天情报'}</text><g ${small?'transform="translate(5 3) scale(.85)"':''}><path class="map-city-flag" d="M-26-17h12v19l-6 4-6-4Z"/><text class="map-city-sigil" x="-20" y="-5">${esc(force.short)}</text></g><g transform="translate(0 10)">${cityStaffBadge(s,c)}</g></g><title>${esc(c.name)} · ${sizeName} · ${force.name} · ${intelligenceLabel(s,c.id)}</title></g>`;
}
export function nationalTerrain(season='summer'){return ancientAtlasTerrain(season);}
export function nationalArtMap(s,ui,army){
 s=intelligenceWorld(s);army=army?.faction===playerFaction(s)?army:s.armies.find(a=>a.id===army?.id);
 const activities=officerActivities(s,{all:false});
 const spec=nationalScenario(s.campaign.scenarioId),{view:v,focus}=operationMapView(s,ui,army),detail=mapDetailLevel(v);
 const line=(a,b,cls)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="${cls}"/>`,supply=army?supplyConnection(s,army):null;
 const forces=[...new Set(s.cities.map(c=>c.owner))].sort((a,b)=>(a===playerFaction(s)?-1:b===playerFaction(s)?1:0)||s.cities.filter(c=>c.owner===b).length-s.cities.filter(c=>c.owner===a).length);
 return `<div class="national-map-tools"><div><b>周边舆图 · ${esc(focus.name)}</b><small data-map-detail-label>${MAP_DETAIL_NAMES[detail]} · 滚轮逐级放大 · 小地图定位</small></div><div><button data-map-view="selected">操作中心</button><button data-map-view="national">全国</button><button data-map-view="metropolis" title="查看都市圈">都市圈</button><button data-map-view="settlements" title="展开圈内据点">据点</button><button data-map-view="city" title="放大查看城市建筑">城内</button><button data-map-view="territory" aria-pressed="${!ui.mapTerritoryHidden}" title="按最近据点归属显示势力示意，不代表逐格占领">势力示意</button><button data-map-view="in" aria-label="放大地图">＋</button><button data-map-view="out" aria-label="缩小地图">−</button><label>景色 <select id="map-season">${Object.entries(MAP_SEASONS).map(([k,n])=>`<option value="${k}" ${k===(ui.mapSeason||'summer')?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
 <aside class="map-information" aria-label="地图查找与势力"><div class="national-search"><label>查找据点 <select id="national-city-search"><option value="">选择城市、关卡、港口或路口</option>${mapNodes(s).map(c=>`<option value="${c.id}">${c.province} · ${c.name} · ${isJunction(s,c.id)?nodeKindName(c):citySizeName(c)+' · '+FACTIONS[c.owner].name}</option>`).join('')}</select></label><span>占领 ${s.cities.filter(c=>c.owner===playerFaction(s)).length} / ${s.cities.length} 城市</span></div>
 <details class="national-legend"><summary>势力一览 · ${forces.filter(f=>f!=='neutral').length} 路诸侯</summary><div>${forces.map(f=>`<span><i style="background:${FACTIONS[f].color}"></i>${FACTIONS[f].name}<b>${s.cities.filter(c=>c.owner===f).length}</b></span>`).join('')}</div></details></aside>
 <div class="national-map-stage"><svg data-focus-x="${focus.x}" data-focus-y="${focus.y}" data-map-detail="${detail}" class="strategy-world strategy-world-art strategy-world-drawn national-world map-layer-${detail} ${Math.min(v.width,v.height)<=420?'map-detail':''} ${Math.min(v.width,v.height)>=720?'map-overview':''} ${ui.mapTerritoryHidden?'hide-territory':''}" data-national="true" data-art-ready="true" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" tabindex="0" role="group" aria-label="当前操作区域，方向键平移，加减键缩放；全国位置见小地图"><title>${spec.name} · ${esc(focus.name)}周边</title>
 <g class="national-map-terrain">${nationalTerrain(ui.mapSeason)}</g>
 <defs><filter id="territory-edge" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="17"/><feDisplacementMap in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G"/></filter><clipPath id="territory-land"><path d="${NATIONAL_LAND_PATH}"/></clipPath></defs><defs><mask id="territory-dry-land"><rect width="1024" height="1024" fill="white"/>${RIVERS.map(r=>`<path d="${polyline(r.points)}" fill="none" stroke="black" stroke-width="${r.width+4}" stroke-linejoin="round"/>`).join('')}${LAKES.map(l=>`<path d="${l.d}" fill="black"/>`).join('')}</mask></defs><g mask="url(#territory-dry-land)" class="map-territories" filter="url(#territory-edge)" clip-path="url(#territory-land)" aria-hidden="true">${territoryRegions(s.cities).map(r=>`<polygon points="${r.points}" fill="${FACTIONS[s.cities.find(c=>c.id===r.id).owner].color}"/>`).join('')}</g>${renderRoads(s)}${geographyLabels()}${renderJunctions(s,ui.city)}
 ${renderSupplyRoute(s,army,supply)}
 ${renderMarchRoute(s,army)}
 ${s.cities.map(c=>cityPin(s,c,ui,activities)).join('')}
 ${metropolitanMapMarkup(s,ui)}
 ${armyMapMarkers(s,ui)}
 ${activeBattles(s).map(r=>`<g class="strategy-battle-marker" data-action="campaign-focus" data-battle="${r.id}" tabindex="0" role="button" aria-label="${r.name}" transform="translate(${r.point.x} ${r.point.y})"><circle r="12"/><text y="4">战</text></g>`).join('')}${fogMarkup(s)}</svg>${radarMap(s,v)}</div>
`;
}

function radarMap(s,v){
 return `<aside class="strategy-radar" aria-label="全国小地图"><div class="radar-heading"><b>天下略图</b><span>点击 / 拖动定位</span></div><svg data-strategy-radar viewBox="0 0 1024 1024" role="group" tabindex="0" aria-label="全国雷达地图，点击或拖动移动主图视野，方向键平移，Home返回操作中心">${atlasOverviewMarkup('radar-land')}${s.cities.map(c=>`<g data-radar-city="${c.id}" data-city-size="${c.citySize}" transform="translate(${c.x} ${c.y})">${cityMarkerShape(c,c.citySize==='small'?5:8,`fill="${FACTIONS[c.owner].color}" stroke="#fff1cf" stroke-width="1"`)}</g>`).join('')}${(s.junctions||[]).filter(n=>n.kind!=='junction').map(n=>n.kind==='gate'?`<path d="M${n.x} ${n.y-5}l5 5-5 5-5-5Z" fill="#6d6657"/>`:`<circle cx="${n.x}" cy="${n.y}" r="3" fill="#6d6657"/>`).join('')}${s.armies.filter(a=>!a.disbanded).map(a=>{const p=armyPosition(s,a);return `<path d="M${p.x} ${p.y-9}l8 15h-16Z" fill="${FACTIONS[a.faction].color}" stroke="#fff8d3" stroke-width="2"/>`;}).join('')}${scoutAssignments(s).map(t=>{const v=scoutingPosition(s,t);return `<circle cx="${v.x}" cy="${v.y}" r="6" fill="#edc46d" stroke="#fff8d3" stroke-width="2"/>`;}).join('')}${fogMarkup(s,'radar-fog')}<rect class="radar-viewport" x="${v.x}" y="${v.y}" width="${v.width}" height="${v.height}"/></svg><div class="atlas-map-key" aria-label="地图图例">□ 大城　○ 小城　◇ 关卡<br>灰雾：无视野 · 明亮：当前视野</div></aside>`;
}
