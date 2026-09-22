import {operationMapView} from './strategic-map-camera.mjs';
import {renderJunctions} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {armyMapMarkers} from './strategic-army-markers.mjs';
import {renderRoads,renderMarchRoute,roadPoint,renderSupplyRoute} from './strategic-movement.mjs';
import {FACTIONS} from './engine.mjs';
import {activeBattles,armyPosition,liveSoldiers,supplyConnection} from './strategic-campaign.mjs';
import {MAP_SEASONS} from './strategic-map-art.mjs';
import {nationalScenario} from './national-scenarios.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NATIONAL_LAND_PATH='M0 0H1024V70L940 110 926 178 888 227 852 210 833 166 800 153 769 193 748 226 770 253 813 232 863 268 878 301 824 323 792 337 797 370 838 391 856 436 910 456 940 503 944 570 910 611 892 663 851 711 813 748 792 810 739 832 708 863 660 904 566 917 510 944 434 930 410 951 343 922 283 954 224 938 181 981 92 964 0 984Z';
export function nationalTerrain(season='summer'){
 const color={spring:'#dce2be',summer:'#d6d8b4',autumn:'#e4cfaa',winter:'#e4e6dc'}[season]||'#d6d8b4';
 return `<g class="drawn-terrain" data-season="${esc(season)}" style="pointer-events:none">
 <defs><pattern id="national-water" width="32" height="28" patternUnits="userSpaceOnUse"><path d="M2 14q8-5 15 0t15 0" fill="none" stroke="#f3f0d9" stroke-opacity=".3"/></pattern><pattern id="national-paper" width="17" height="21" patternUnits="userSpaceOnUse"><path d="M2 3h1m8 13h2" stroke="#716e50" stroke-opacity=".16"/></pattern></defs>
 <rect width="1024" height="1024" fill="#a8beb6"/><rect width="1024" height="1024" fill="url(#national-water)"/>
 <path d="${NATIONAL_LAND_PATH}" fill="${color}" stroke="#738c7b" stroke-width="2"/>
 <path d="M15 266L126 214 217 259 239 348 173 389 75 355Z M38 436L174 395 279 451 330 588 253 645 125 591 38 602Z M75 751L254 717 399 811 474 894 291 917 101 939Z" fill="#8d9e78" opacity=".2"/>
 <g fill="none" stroke="#809e99" stroke-linecap="round"><path d="M20 299Q123 346 170 298L228 200Q242 160 313 185L354 321Q396 376 446 353L513 327 560 312 608 337 650 310 708 295 776 280" stroke-width="7"/><path d="M35 611Q95 654 152 657L203 677 273 652 300 606 361 621 400 647 449 631 489 641 547 612 592 619 648 593 699 570 740 541 784 509 813 503 850 526" stroke-width="9"/><path d="M309 483Q370 488 410 530L447 583 489 641M563 442L602 459 639 470 683 462 742 474 806 481M399 833L395 733 450 684 489 641" stroke-width="3"/></g>
 <g fill="#7f8c68" stroke="#6d7c60" stroke-width=".7" opacity=".46">${[[240,154],[270,164],[310,178],[407,246],[421,274],[433,303],[340,415],[305,409],[265,398],[205,383],[210,489],[184,513],[160,541],[180,722],[220,740],[254,758],[365,791],[431,805],[471,817],[670,753],[708,737]].map(([x,y])=>`<path d="M${x-22} ${y+14}l19-40 25 40-23-6Z"/>`).join('')}</g>
 <g font-family="serif" font-size="28" letter-spacing="9" fill="#637559" opacity=".44">${[['幽州',668,84],['冀州',594,222],['青徐',784,351],['兖豫',569,496],['司隶',383,347],['雍州',266,289],['凉州',109,205],['扬州',750,642],['荆北',403,553],['荆南',452,768],['益州',153,615],['南中',142,870]].map(([n,x,y])=>`<text x="${x}" y="${y}">${n}</text>`).join('')}</g>
 <g font-family="serif" fill="#527a78" font-size="16" letter-spacing="8"><text x="621" y="278">黄河</text><text x="568" y="655">长江</text><text x="960" y="650" writing-mode="tb" font-size="27">东海</text><text x="800" y="929">南海</text></g>
 <rect width="1024" height="1024" fill="url(#national-paper)"/><g transform="translate(960 850)" fill="#546b5e"><path d="M0-27L8 0 0-5-8 0Z"/><text y="-37" text-anchor="middle" font-size="15">北</text></g>
 <text x="43" y="1000" fill="#5c705c" font-size="13" letter-spacing="3">汉末天下 · 城郭关津舆图</text></g>`;
}
export function nationalArtMap(s,ui,army){
 const spec=nationalScenario(s.campaign.scenarioId),{view:v,focus}=operationMapView(s,ui,army);
 const line=(a,b,cls)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="${cls}"/>`,supply=army?supplyConnection(s,army):null;
 const forces=[...new Set(s.cities.map(c=>c.owner))].sort((a,b)=>(a===playerFaction(s)?-1:b===playerFaction(s)?1:0)||s.cities.filter(c=>c.owner===b).length-s.cities.filter(c=>c.owner===a).length);
 return `<div class="national-map-tools"><div><b>周边舆图 · ${esc(focus.name)}</b><small>拖动主图巡视 · 滚轮缩放 · 小地图快速定位</small></div><div><button data-map-view="selected">操作中心</button><button data-map-view="in" aria-label="放大地图">＋</button><button data-map-view="out" aria-label="缩小地图">−</button><label>景色 <select id="map-season">${Object.entries(MAP_SEASONS).map(([k,n])=>`<option value="${k}" ${k===(ui.mapSeason||'summer')?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
 <div class="national-search"><label>查找据点 <select id="national-city-search"><option value="">选择城池、关隘或港口</option>${s.cities.map(c=>`<option value="${c.id}">${c.province} · ${c.name} · ${FACTIONS[c.owner].name}</option>`).join('')}</select></label><span>占领 ${s.cities.filter(c=>c.owner===playerFaction(s)).length} / 87 据点</span></div>
 <div class="national-map-stage"><svg data-focus-x="${focus.x}" data-focus-y="${focus.y}" class="strategy-world strategy-world-art strategy-world-drawn national-world ${v.width<=600?'map-detail':''}" data-national="true" data-art-ready="true" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" tabindex="0" role="group" aria-label="当前操作区域，方向键平移，加减键缩放；全国位置见小地图"><title>${spec.name} · ${esc(focus.name)}周边</title>
 <g class="national-map-terrain">${nationalTerrain(ui.mapSeason)}</g>
 ${renderRoads(s)}${renderJunctions(s,ui.city)}
 ${renderSupplyRoute(s,army,supply)}
 ${renderMarchRoute(s,army)}
 ${s.cities.map(c=>`<g data-city="${c.id}" data-x="${c.x}" data-y="${c.y}" tabindex="0" role="button" aria-label="${c.name}，${FACTIONS[c.owner].name}" class="strategy-city national-node node-${c.kind} ${ui.city===c.id?'selected':''}" style="--force-color:${FACTIONS[c.owner].color}" transform="translate(${c.x} ${c.y})"><circle class="city-halo" r="${c.kind==='city'?14:9}"/>${c.kind==='city'?'<path class="national-symbol" d="M-8 6V-4h4v-5h8v5h4V6ZM-2 6V1h4v5"/>':c.kind==='gate'?'<path class="national-symbol" d="M-7 6V-6h4v3h6v-3h4V6ZM-2 6V0h4v6"/>':'<path class="national-symbol" d="M0-7L7 0 0 7-7 0Z"/>'}<text class="national-place-name" y="${c.kind==='city'?28:21}">${esc(c.name)}</text><title>${esc(c.name)} · ${FACTIONS[c.owner].name} · 粮草 ${Math.floor(c.grain)}</title></g>`).join('')}
 ${armyMapMarkers(s,ui)}
 ${activeBattles(s).map(r=>`<g class="strategy-battle-marker" data-action="campaign-focus" data-battle="${r.id}" tabindex="0" role="button" aria-label="${r.name}" transform="translate(${r.point.x} ${r.point.y})"><circle r="12"/><text y="4">战</text></g>`).join('')}</svg>${radarMap(s,v)}</div>
 <details class="national-legend"><summary>势力一览 · ${forces.filter(f=>f!=='neutral').length} 路诸侯 · 展开查看</summary><div>${forces.map(f=>`<span><i style="background:${FACTIONS[f].color}"></i>${FACTIONS[f].name}<b>${s.cities.filter(c=>c.owner===f).length}</b></span>`).join('')}</div></details>`;
}

function radarMap(s,v){
 return `<aside class="strategy-radar" aria-label="全国小地图"><div class="radar-heading"><b>天下略图</b><span>点击 / 拖动定位</span></div><svg data-strategy-radar viewBox="0 0 1024 1024" role="group" tabindex="0" aria-label="全国雷达地图，点击或拖动移动主图视野，方向键平移，Home返回操作中心"><rect width="1024" height="1024" fill="#a8beb6"/><path d="${NATIONAL_LAND_PATH}" fill="#d6d8b4" stroke="#71806b" stroke-width="5"/>${s.cities.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="${c.kind==='city'?7:4}" fill="${FACTIONS[c.owner].color}"/>`).join('')}${s.armies.filter(a=>!a.disbanded).map(a=>{const p=armyPosition(s,a);return `<path d="M${p.x} ${p.y-9}l8 15h-16Z" fill="${FACTIONS[a.faction].color}" stroke="#fff8d3" stroke-width="2"/>`;}).join('')}<rect class="radar-viewport" x="${v.x}" y="${v.y}" width="${v.width}" height="${v.height}"/></svg></aside>`;
}
