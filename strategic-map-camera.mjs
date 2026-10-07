import {mapNode} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {armyPosition} from './strategic-campaign.mjs';
import {METROPOLITAN_DETAIL_THRESHOLD} from './map-detail-level.mjs';
export {METROPOLITAN_DETAIL_THRESHOLD,SETTLEMENT_DETAIL_THRESHOLD,MAP_DETAIL_NAMES,mapDetailLevel} from './map-detail-level.mjs';

export const LOCAL_MAP_SIZE=560;
export const MIN_MAP_SIZE=32;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function clampMapView(view){
 const width=clamp(view.width,MIN_MAP_SIZE,1024),height=clamp(view.height,MIN_MAP_SIZE,1024);
 return {x:clamp(view.x,0,1024-width),y:clamp(view.y,0,1024-height),width,height};
}
export const centeredMapView=(point,width=LOCAL_MAP_SIZE,height=width)=>clampMapView({x:point.x-width/2,y:point.y-height/2,width,height});
export function metropolitanOverviewView(point,aspect=1){
 aspect=Number.isFinite(aspect)&&aspect>0?aspect:1;
 return centeredMapView(point,Math.max(LOCAL_MAP_SIZE,LOCAL_MAP_SIZE*aspect),Math.max(LOCAL_MAP_SIZE,LOCAL_MAP_SIZE/aspect));
}
// Fit actual metropolis members while retaining a separate settlement scale.
export function metropolitanMemberView(members,aspect=1){
 const xs=members.map(n=>n.x),ys=members.map(n=>n.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 aspect=Number.isFinite(aspect)&&aspect>0?aspect:1;
 const size=Math.min(METROPOLITAN_DETAIL_THRESHOLD,Math.max(220,aspect>=1?bottom-top+70:(bottom-top+70)*aspect,aspect>=1?(right-left+70)/aspect:right-left+70));
 const width=aspect>=1?size*aspect:size,height=aspect>=1?size:size/aspect;
 return centeredMapView({x:(left+right)/2,y:(top+bottom)/2},width,height);
}
export function operationFocus(s,ui,army){
 const battle=ui.strategyTab==='battle'?s.campaign?.battles.find(r=>r.id===ui.directoryBattle&&!r.settled):null;
 if(battle?.point)return {...battle.point,key:'battle:'+battle.id,name:battle.name};
 const city=mapNode(s,ui.city),selected=s.armies.find(a=>a.id===ui.army)||army;
 if(selected&&(ui.strategyTab==='army'||!city))return {...armyPosition(s,selected),key:'army:'+selected.id,name:selected.name,army:true};
 const node=city||s.cities.find(c=>c.owner===playerFaction(s))||s.cities[0];
 return {...node,key:'place:'+node.id};
}
export function operationMapView(s,ui,army){
 const focus=operationFocus(s,ui,army);
 if(!ui.strategicMapView||ui.mapFocusKey!==focus.key||focus.army&&!ui.mapCameraManual){
  const width=ui.strategicMapView?clamp(ui.strategicMapView.width,MIN_MAP_SIZE,1024):LOCAL_MAP_SIZE;
  ui.strategicMapView=centeredMapView(focus,width,ui.strategicMapView?.height||width);ui.mapCameraManual=false;
 }
 ui.mapFocusKey=focus.key;ui.strategicMapView=clampMapView(ui.strategicMapView);
 return {view:ui.strategicMapView,focus};
}
