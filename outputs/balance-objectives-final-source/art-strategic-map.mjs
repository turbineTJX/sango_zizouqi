import {nationalArtMap,nationalTerrain} from './national-map-view.mjs';
import {art} from './art-assets.mjs';
import {MAP_CITIES,MAP_SEASONS,terrainDrawing,cityDrawing} from './strategic-map-art.mjs';
import {roadLength,supplyConnection,activeBattles,liveSoldiers} from './strategic-campaign.mjs';
import {FACTIONS} from './engine.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const THEATER_VIEW={x:190,y:95,width:570,height:690};
export const NATIONAL_VIEW={x:0,y:0,width:1024,height:1024};
export function mapAsset(s,ui){const m=art.active&&art.pack.worldMap,url=m?.images?.[ui.mapSeason||'summer'];return url&&!art.failed.has(url)&&s.cities.every(c=>m.cities[c.id])?url:null;}
export function mapArmyPosition(s,a,anchors){
 if(!a.travel)return {...anchors[a.location]};
 const from=anchors[a.travel.from],to=anchors[a.travel.to],t=clamp(a.travel.progress/roadLength(s,a.travel.from,a.travel.to),0,1);
 return {x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t};
}
// Project encounters onto roads without changing any rule-space distance.
export function mapBattlePosition(s,r,anchors){
 if(r.kind==='siege'&&anchors[r.cityId])return anchors[r.cityId];
 const participant=r.armies?.find(a=>a.travel);if(participant)return mapArmyPosition(s,participant,anchors);
 let best=null;
 for(const [from,to]of s.roads){const a=s.cities.find(c=>c.id===from),b=s.cities.find(c=>c.id===to),dx=b.x-a.x,dy=b.y-a.y,t=clamp(((r.point.x-a.x)*dx+(r.point.y-a.y)*dy)/(dx*dx+dy*dy),0,1),distance=Math.hypot(r.point.x-a.x-t*dx,r.point.y-a.y-t*dy);
  if(!best||distance<best.distance){const p=anchors[from],q=anchors[to];best={distance,x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t};}
 }return best||anchors[r.cityId]||{x:512,y:512};
}
export function strategicArtMap(s,ui,army){
 if(s.campaign?.scenarioId)return nationalArtMap(s,ui,army);
 if(!s.cities.every(c=>MAP_CITIES[c.id]))return null;
 const anchors=MAP_CITIES,v=ui.strategicMapView||THEATER_VIEW,connection=army?supplyConnection(s,army):null;
 const line=(a,b,cls)=>`<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="${cls}"/>`;
 const supply=connection?connection.path.slice(1).map((id,i)=>line(anchors[connection.path[i]],anchors[id],'strategy-supply-path')).join('')+(army.travel?line(anchors[army.location],mapArmyPosition(s,army,anchors),'strategy-supply-path'):''):'';
 const previous=ui.armyArtPositions||{};ui.armyArtPositions={};
 return `<div class="national-map-tools"><div><b>山河舆图 · 中原</b><small>二维绘制 · 九城可交互 · 拖动平移 / 滚轮缩放</small></div><div><button type="button" data-map-view="national">全国</button><button type="button" data-map-view="theater">中原</button><button type="button" data-map-view="in" aria-label="放大地图">＋</button><button type="button" data-map-view="out" aria-label="缩小地图">−</button><label>景色 <select id="map-season" aria-label="地图季节外观">${Object.entries(MAP_SEASONS).map(([k,n])=>`<option value="${k}" ${k===(ui.mapSeason||'summer')?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
 <svg class="strategy-world strategy-world-art strategy-world-drawn" data-art-ready="true" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" tabindex="0" role="group" aria-label="全国地图，中原九城可交互；方向键平移，加减键缩放"><title>山河舆图 · 中原战区</title>
 <g class="national-map-terrain">${terrainDrawing(ui.mapSeason)}</g>
 ${s.roads.map(([a,b])=>line(anchors[a],anchors[b],'strategy-road')).join('')}
 ${army?.route.length?`<polyline points="${[mapArmyPosition(s,army,anchors),...army.route.map(id=>anchors[id])].map(p=>`${p.x},${p.y}`).join(' ')}" class="strategy-order-path"/>`:''}${supply}
 ${s.cities.map(c=>{const p=anchors[c.id];return `<g data-city="${c.id}" tabindex="0" role="button" aria-label="${esc(c.name)}，${esc(FACTIONS[c.owner].name)}" class="strategy-city ${c.owner} ${ui.city===c.id?'selected':''}" transform="translate(${p.x} ${p.y}) scale(.88)"><circle class="city-halo" r="37"/>${cityDrawing(c.id==='baima'||c.id==='guandu')}<rect class="city-nameplate" x="-37" y="32" width="74" height="28" rx="4"/><text y="53">${esc(c.name)}</text><title>${esc(c.name)} · 粮草 ${Math.round(c.grain).toLocaleString('zh-CN')}</title></g>`;}).join('')}
 ${s.armies.filter(a=>!a.disbanded).map((a,i)=>{const p=mapArmyPosition(s,a,anchors),x=p.x+(a.travel?0:(i%3-1)*19),y=p.y-43;ui.armyArtPositions[a.id]={x,y};const old=previous[a.id]||{x,y};return `<g data-campaign-army="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name)}，${Math.round(liveSoldiers(s,a))}人" class="strategy-army ${a.faction} ${ui.army===a.id?'selected':''}" transform="translate(${x} ${y})"><animateTransform attributeName="transform" type="translate" from="${old.x} ${old.y}" to="${x} ${y}" dur=".65s" fill="freeze"/><g transform="scale(.72)"><path d="M0 0V-30H68L60-18l8 12H0"/><text x="32" y="-14">${FACTIONS[a.faction].short} ${Math.round(liveSoldiers(s,a)/100)/10}千</text></g></g>`;}).join('')}
 ${activeBattles(s).map(r=>{const p=mapBattlePosition(s,r,anchors);return `<g class="strategy-battle-marker" data-action="campaign-focus" data-battle="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}" transform="translate(${p.x} ${p.y+8}) scale(.7)"><circle r="15"/><text y="5">战</text></g>`;}).join('')}</svg>`;
}
export function attachStrategicMap(root,ui,onFailure){
 const svg=root.querySelector('.strategy-world-art');if(!svg)return;
 const national=svg.dataset.national==='true';
 let view={...(ui.strategicMapView||(national?NATIONAL_VIEW:THEATER_VIEW))},drag=null;
 const apply=()=>{view.x=clamp(view.x,0,1024-view.width);view.y=clamp(view.y,0,1024-view.height);ui.strategicMapView={...view};svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.width} ${view.height}`);svg.classList.toggle('map-detail',view.width<=600);};
 const zoom=f=>{const width=clamp(view.width*f,150,1024),height=clamp(view.height*f,150,1024);view={x:view.x+(view.width-width)/2,y:view.y+(view.height-height)/2,width,height};apply();};
 for(const b of root.querySelectorAll('[data-map-view]'))b.addEventListener('click',()=>{const key=b.dataset.mapView;if(key==='in'||key==='out')zoom(key==='in'?.8:1.25);else{if(key==='selected'){const node=svg.querySelector(`[data-city="${ui.city}"]`);if(node?.dataset.x)view={x:+node.dataset.x-180,y:+node.dataset.y-180,width:360,height:360};}else view={...(key==='national'?NATIONAL_VIEW:national?{x:350,y:180,width:440,height:440}:THEATER_VIEW)};apply();}});
 root.querySelector('#map-season')?.addEventListener('change',e=>{e.stopPropagation();ui.mapSeason=e.target.value;svg.querySelector('.national-map-terrain').innerHTML=national?nationalTerrain(ui.mapSeason):terrainDrawing(ui.mapSeason);});
 root.querySelector('#national-city-search')?.addEventListener('change',e=>{const node=svg.querySelector(`[data-city="${e.target.value}"]`);if(!node)return;view={x:+node.dataset.x-180,y:+node.dataset.y-180,width:360,height:360};apply();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?.88:1.14);},{passive:false});
 svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-city],[data-campaign-army],[data-action]'))return;const m=svg.getScreenCTM();drag={x:e.clientX,y:e.clientY,view:{...view},scaleX:m.a,scaleY:m.d};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag)return;view={...drag.view,x:drag.view.x-(e.clientX-drag.x)/drag.scaleX,y:drag.view.y-(e.clientY-drag.y)/drag.scaleY};apply();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(event,()=>{drag=null;});
 svg.addEventListener('keydown',e=>{if(e.target!==svg)return;if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.25:.8);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();view.x+=e.key==='ArrowLeft'?-view.width*.1:e.key==='ArrowRight'?view.width*.1:0;view.y+=e.key==='ArrowUp'?-view.height*.1:e.key==='ArrowDown'?view.height*.1:0;apply();}});
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)svg.querySelectorAll('animateTransform').forEach(n=>n.remove());
}
