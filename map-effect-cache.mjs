// Keep full-world SVG filters out of the live, zoomed viewport. A filter on
// that viewport can allocate and repaint an enormous surface for every hover.
const ns='http://www.w3.org/2000/svg',cache=new Map();
const idle=()=>new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(resolve):setTimeout(resolve,0));
function texture(source){
 let entry=cache.get(source);if(entry){cache.delete(source);cache.set(source,entry);return entry;}
 entry={vector:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source)};cache.set(source,entry);
 entry.task=(async()=>{
  const image=new Image();image.src=entry.vector;await image.decode();await idle();
  const bitmap=await createImageBitmap(image),canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));canvas.width=canvas.height=0;if(!blob)return;
  entry.raster=URL.createObjectURL(blob);const decoded=new Image();decoded.src=entry.raster;await decoded.decode();
  while(cache.size>4){const oldest=[...cache].find(([,value])=>value.raster);if(!oldest)break;const [key,old]=oldest;cache.delete(key);URL.revokeObjectURL(old.raster);}
 })().catch(()=>{});return entry;
}
export function prepareMapEffects(svg){
 const restores=[];
 for(const node of svg.querySelectorAll('.map-territories,.war-fog')){
  const copy=node.cloneNode(true),definitions=new Map();
  const collect=markup=>{for(const [,id]of markup.matchAll(/url\(#([\w-]+)\)/g)){
   if(definitions.has(id))continue;const def=svg.querySelector(`[id="${id}"]`);if(!def)continue;
   definitions.set(id,def.outerHTML);collect(def.outerHTML);
  }};collect(copy.outerHTML);
  copy.removeAttribute('class');copy.removeAttribute('style');
  if(node.matches('.map-territories')){
   const originals=[...node.querySelectorAll('polygon')];
   [...copy.querySelectorAll('polygon')].forEach((polygon,i)=>{const style=getComputedStyle(originals[i]);for(const key of ['stroke','stroke-width','stroke-opacity','vector-effect'])polygon.setAttribute(key,style.getPropertyValue(key));});
  }
  const source=`<svg xmlns="${ns}" width="2048" height="2048" viewBox="0 0 1024 1024"><defs>${[...definitions.values()].join('')}</defs>${new XMLSerializer().serializeToString(copy)}</svg>`;
  const entry=texture(source),children=[...node.childNodes],attributes=new Map();
  for(const key of ['filter','mask','clip-path'])if(node.hasAttribute(key)){attributes.set(key,node.getAttribute(key));node.removeAttribute(key);}
  const image=document.createElementNS(ns,'image');for(const [key,value]of Object.entries({href:entry.raster||entry.vector,width:1024,height:1024,'pointer-events':'none','data-map-effect-texture':''}))image.setAttribute(key,value);
  node.replaceChildren(image);let disposed=false;
  entry.task.then(()=>{if(!disposed&&entry.raster&&image.isConnected){image.setAttribute('href',entry.raster);image.dataset.mapEffectReady='true';}});
  restores.push(()=>{disposed=true;node.replaceChildren(...children);for(const [key,value]of attributes)node.setAttribute(key,value);});
 }
 return ()=>restores.forEach(restore=>restore());
}
