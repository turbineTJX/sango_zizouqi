import {mapNode} from './map-node-data.mjs';

// Drafts contain public road nodes; the command handler validates again on issue.
export function routeThrough(from,target,waypoints,path,valid){
 let at=from;const route=[],stops=[...waypoints,target];
 for(let i=0;i<stops.length;i++){
  const to=stops[i],blocked=new Set([from,...route,...stops.slice(i+1)]);blocked.delete(at);blocked.delete(to);
  const leg=path(at,to,blocked);if(!leg?.length)return null;route.push(...leg);at=to;
 }
 return valid(route)?route:null;
}
export function editRouteWaypoint(draft,from,target,index,id,build){
 const points=[from,...draft.route],waypoints=[...(draft.waypoints||[])],existing=waypoints.findIndex(v=>points.indexOf(v)===index);
 let insert=waypoints.filter(v=>points.indexOf(v)<index).length;
 if(existing>=0){waypoints.splice(existing,1);insert=existing;}
 if(id!==from&&id!==target&&!waypoints.includes(id))waypoints.splice(insert,0,id);
 const route=build(waypoints);
 return route?{route,waypoints}:null;
}
export function attachMapRouteEditor(root,s,{from,target,route,waypoints=[],candidates,edit,onError}){
 const svg=root.querySelector('.strategy-world-art');if(!svg||!route?.length)return;
 const bindings=new AbortController();
 const ns='http://www.w3.org/2000/svg',create=(tag,attrs,parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 const inverse=svg.getScreenCTM().inverse(),locations=new Map([...svg.querySelectorAll('[data-command-city]')].map(el=>{const m=inverse.multiply(el.getScreenCTM());return [el.dataset.commandCity,{x:m.e,y:m.f}];}));
 const position=id=>locations.get(id)||mapNode(s,id);
 const points=[from,...route],layer=create('g',{class:'map-route-editor'},svg);
 const line=create('polyline',{class:'route-draft-line',points:points.map(id=>{const p=position(id);return `${p.x},${p.y}`;}).join(' ')},layer);
 const origin=new Map();
 const add=(index,p,label,pinned=false)=>{
  const h=create('g',{'data-route-handle':index,transform:`translate(${p.x} ${p.y})`,tabindex:0,role:'button','aria-label':label,class:pinned?'route-handle pinned':'route-handle'},layer);
  create('circle',{r:18,class:'route-handle-touch'},h);create('circle',{r:8,class:'route-handle-hit'},h);create('circle',{r:3,class:'route-handle-dot'},h);create('title',{},h).textContent=label;origin.set(h,p);
 };
 for(let i=0;i<points.length-1;i++){
  const a=position(points[i]),b=position(points[i+1]);
  add(i+.5,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},'拖动添加中转点');
  if(i>0)add(i,a,`${mapNode(s,points[i]).name} · 拖动改线`,waypoints.includes(points[i]));
 }
 const sizeHandles=()=>{
  if(!svg.isConnected){resize.disconnect();changes.disconnect();bindings.abort();return;}
  const m=svg.getScreenCTM(),unit=Math.hypot(m.a,m.b)||1;
  for(const h of origin.keys())for(const [cls,r]of [['touch',18],['hit',8],['dot',3]])h.querySelector('.route-handle-'+cls).setAttribute('r',r/unit);
 };
 const resize=new ResizeObserver(sizeHandles),changes=new MutationObserver(sizeHandles);resize.observe(svg);changes.observe(svg,{attributes:true,attributeFilter:['viewBox']});sizeHandles();
 let drag=null,suppressClick=false;
 const restore=h=>{const p=origin.get(h);h.setAttribute('transform',`translate(${p.x} ${p.y})`);h.classList.remove('dragging','snapped');};
 const nearest=e=>{
  const matrix=svg.getScreenCTM();let best=null,distance=40;
  for(const id of new Set([from,target,...candidates])){const p=position(id);if(!p)continue;const screen=new DOMPoint(p.x,p.y).matrixTransform(matrix),d=Math.hypot(screen.x-e.clientX,screen.y-e.clientY);if(d<distance){distance=d;best=id;}}
  return best;
 };
 layer.addEventListener('pointerdown',e=>{
  const h=e.target.closest('[data-route-handle]');if(!h||e.button!==0)return;e.preventDefault();e.stopPropagation();
  drag={handle:h,index:Number(h.dataset.routeHandle),pointerId:e.pointerId,start:{x:e.clientX,y:e.clientY}};h.classList.add('dragging');h.setPointerCapture(e.pointerId);
 });
 layer.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const id=nearest(e),at=id?position(id):p.matrixTransform(svg.getScreenCTM().inverse());drag.handle.setAttribute('transform',`translate(${at.x} ${at.y})`);drag.handle.classList.toggle('snapped',!!id);});
 layer.addEventListener('pointerup',e=>{
  if(!drag)return;e.preventDefault();e.stopPropagation();const d=drag;drag=null;restore(d.handle);
  if(Math.hypot(e.clientX-d.start.x,e.clientY-d.start.y)<4)return;
  suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
  const id=nearest(e);if(!id||!edit(d.index,id))onError?.('此处不能作为中转点');
 });
 const cancel=()=>{if(drag){restore(drag.handle);drag=null;}};
 layer.addEventListener('pointercancel',cancel);layer.addEventListener('lostpointercapture',cancel);
 root.ownerDocument.addEventListener('keydown',e=>{
  if(!svg.isConnected){bindings.abort();return;}
  if(e.key!=='Escape'||!drag)return;
  e.preventDefault();e.stopImmediatePropagation();
  const {handle,pointerId}=drag;cancel();
  if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
 },{capture:true,signal:bindings.signal});
 svg.addEventListener('click',e=>{if(suppressClick||e.target.closest('[data-route-handle]')){e.preventDefault();e.stopPropagation();}},true);
 layer.addEventListener('keydown',e=>{
  const h=e.target.closest('[data-route-handle]');if(!h)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();edit(Number(h.dataset.routeHandle),from);}
 });
 return {line};
}
