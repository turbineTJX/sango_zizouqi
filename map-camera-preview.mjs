// A disposable movement texture of the already projected map. It contains no
// hidden world data and is never saved. The interactive vector map returns as
// soon as the gesture ends; resource or perspective changes discard the texture.
const ns='http://www.w3.org/2000/svg';
const idle=()=>new Promise(resolve=>globalThis.requestIdleCallback?requestIdleCallback(resolve):setTimeout(resolve,0));
const dataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
export function prepareMapCameraPreview(svg){
 delete svg.dataset.cameraPreviewReady;
 const vectors=document.createElementNS(ns,'g');vectors.dataset.cameraVectors='';
 while(svg.firstChild)vectors.append(svg.firstChild);svg.append(vectors);
 const image=document.createElementNS(ns,'image');image.dataset.cameraPreview='';
 for(const [key,value]of Object.entries({x:0,y:0,width:1024,height:1024,'pointer-events':'none'}))image.setAttribute(key,value);
 image.style.cssText='display:none;transform-origin:0 0;will-change:transform';svg.append(image);
 const abort=new AbortController();let url=null,disposed=false,ready=false,base=null;
 const preview=view=>{
  if(!ready||disposed)return false;
  const active=!!view;
  if(active){
   base??={x:svg.viewBox.baseVal.x,y:svg.viewBox.baseVal.y,width:svg.viewBox.baseVal.width,height:svg.viewBox.baseVal.height};
   const sx=base.width/view.width,sy=base.height/view.height;
   image.style.transform=`matrix(${sx},0,0,${sy},${base.x-view.x*sx},${base.y-view.y*sy})`;
   svg.dataset.cameraViewBox=[view.x,view.y,view.width,view.height].join(' ');
  }else {base=null;image.style.transform='';delete svg.dataset.cameraViewBox;}
  vectors.style.display=active?'none':'';image.style.display=active?'':'none';return true;
 };
 preview.ready=()=>ready&&!disposed;
 preview.destroy=()=>{
  disposed=true;abort.abort();delete svg.dataset.cameraViewBox;if(url)URL.revokeObjectURL(url);
  while(vectors.firstChild)svg.insertBefore(vectors.firstChild,vectors);vectors.remove();image.remove();
 };
 void (async()=>{
  await idle();if(disposed||!svg.isConnected)return;
  const copy=svg.cloneNode(true);copy.querySelector('[data-camera-preview]')?.remove();
  copy.querySelector('[data-camera-vectors]').style.display='';
  copy.classList.remove('map-camera-moving');copy.setAttribute('viewBox','0 0 1024 1024');
  copy.setAttribute('width','2048');copy.setAttribute('height','2048');copy.style.cssText='width:2048px;height:2048px';
  // Panoramas and HTML portraits remain live at close range. The movement
  // overview uses each settlement's actual compact buildings and worksites.
  copy.querySelectorAll('script,title,foreignObject,.map-city-scene,animate,animateTransform').forEach(node=>node.remove());
  copy.querySelectorAll('.national-node').forEach(node=>{node.style.display='';});
  copy.querySelectorAll('.map-city-model').forEach(node=>{node.style.opacity='1';});
  const css=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.cssText);}catch{return [];}}).join('\n');
  const style=document.createElementNS(ns,'style');style.textContent=css;copy.prepend(style);
  const resources=new Map();
  for(const node of copy.querySelectorAll('image[href]')){
   const href=node.getAttribute('href');if(!href||href.startsWith('data:'))continue;
   if(!resources.has(href))resources.set(href,(async()=>{
    const response=await fetch(href,{signal:abort.signal});return response.ok?dataURL(await response.blob()):null;
   })());
  }
  await Promise.all([...copy.querySelectorAll('image[href]')].map(async node=>{const resource=resources.get(node.getAttribute('href'));if(resource){const value=await resource;if(value)node.setAttribute('href',value);else node.removeAttribute('href');}}));
  if(disposed)return;
  const source=new Image();source.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));await source.decode();
  const bitmap=typeof createImageBitmap==='function'?await createImageBitmap(source).catch(()=>null):null;
  await idle();if(disposed){bitmap?.close();return;}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  canvas.getContext('2d').drawImage(bitmap||source,0,0,2048,2048);bitmap?.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve));canvas.width=canvas.height=0;
  if(disposed||!blob)return;
  url=URL.createObjectURL(blob);const decoded=new Image();decoded.src=url;await decoded.decode();
  if(disposed)return;image.setAttribute('href',url);ready=true;svg.dataset.cameraPreviewReady='true';
 })().catch(error=>{if(!disposed)svg.dataset.cameraPreviewError=error?.message||String(error);});
 return preview;
}
