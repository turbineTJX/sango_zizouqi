import {mapNode} from './road-network.mjs';
import {playerFaction} from './player-faction.mjs';
import {armyPosition} from './strategic-campaign.mjs';

export const LOCAL_MAP_SIZE=360;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function clampMapView(view){
 const width=clamp(view.width,150,1024),height=clamp(view.height,150,1024);
 return {x:clamp(view.x,0,1024-width),y:clamp(view.y,0,1024-height),width,height};
}
export const centeredMapView=(point,width=LOCAL_MAP_SIZE,height=width)=>clampMapView({x:point.x-width/2,y:point.y-height/2,width,height});
export function operationFocus(s,ui,army){
 const city=mapNode(s,ui.city),selected=s.armies.find(a=>a.id===ui.army)||army;
 if(selected&&(ui.strategyTab==='army'||!city))return {...armyPosition(s,selected),key:'army:'+selected.id,name:selected.name,army:true};
 const node=city||s.cities.find(c=>c.owner===playerFaction(s))||s.cities[0];
 return {...node,key:'place:'+node.id};
}
export function operationMapView(s,ui,army){
 const focus=operationFocus(s,ui,army);
 if(!ui.strategicMapView||ui.mapFocusKey!==focus.key||focus.army&&!ui.mapCameraManual){
  const width=ui.strategicMapView?clamp(ui.strategicMapView.width,150,1024):LOCAL_MAP_SIZE;
  ui.strategicMapView=centeredMapView(focus,width,ui.strategicMapView?.height||width);ui.mapCameraManual=false;
 }
 ui.mapFocusKey=focus.key;ui.strategicMapView=clampMapView(ui.strategicMapView);
 return {view:ui.strategicMapView,focus};
}
