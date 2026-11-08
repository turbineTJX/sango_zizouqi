import {WebGLRenderer,Container,Sprite,Texture,Rectangle,Graphics,RenderTexture,Matrix} from './vendor/pixi/pixi.mjs';
import {assetCatalog} from './asset-catalog.mjs';
import {validateMapGPUManifest,mapBudgetedTileLevel,mapVisibleTiles,MAP_GPU_PROFILE} from './map-gpu-assets.mjs';
import {MapGPUResources} from './map-gpu-resources.mjs';
import {mapCityDrawCommands} from './map-gpu-city.mjs';
import {townLayout} from './town-layout.mjs';
import {mapDetailBlend} from './map-detail-level.mjs';
import {prepareMapScreenLabels} from './map-screen-labels.mjs';
import {mapGPUGeometry} from './map-gpu-geometry.mjs';
const pools=new WeakMap(),manifests=new Map(),disabledRoots=new WeakSet();
const loadManifest=url=>{if(!manifests.has(url))manifests.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Map manifest HTTP '+r.status);return r.json();}).then(validateMapGPUManifest).catch(e=>{manifests.delete(url);throw e;}));return manifests.get(url);};
const number=(node,key,fallback=1)=>node?.style[key]===''?fallback:Number(node?.style[key]??fallback);
function releaseChildren(node){for(const child of node.removeChildren())child.destroy({children:true});}
async function context(root,url){
 let pool=pools.get(root);clearTimeout(pool?.timer);
 if(pool?.url===url&&!pool.faulted){await pool.promise;return pool;}
 pool?.resources?.destroy();pool?.renderer?.destroy();
 pool={url};pools.set(root,pool);
 pool.promise=(async()=>{
  pool.manifest=await loadManifest(url);const renderer=pool.renderer=new WebGLRenderer();
  await renderer.init({width:1,height:1,backgroundAlpha:0,antialias:false,resolution:Math.min(devicePixelRatio||1,2),powerPreference:'high-performance',hello:false});
  const extension=renderer.gl.getExtension('WEBGL_debug_renderer_info');pool.driver=extension?renderer.gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):renderer.gl.getParameter(renderer.gl.RENDERER);
  renderer.canvas.className='map-gpu-canvas';renderer.canvas.setAttribute('aria-hidden','true');
  pool.resources=new MapGPUResources(renderer,pool.manifest,()=>pool.wake?.());
 })();try{await pool.promise;}catch(e){if(pools.get(root)===pool)pools.delete(root);pool.renderer?.destroy();throw e;}return pool;
}
// GPU bulk artwork + a sparse SVG interaction/label layer. One world camera is shared.
export function prepareMapGPU(root,svg,{season='summer',onFailure}={}){
 if(!assetCatalog.mapGPU)return null;
 if(disabledRoots.has(root)){svg.dataset.mapGPUDisabled='true';return null;}
 if(!['spring','summer','autumn','winter'].includes(season))season='summer';
 const geometry=mapGPUGeometry([...svg.querySelectorAll('[data-road-from]')].map(p=>[p.dataset.roadFrom,p.dataset.roadTo,p.getAttribute('d')]));
 let pool,disposed=false,active=false,frame=0,currentView={...svg.viewBox.baseVal},bounds=svg.getBoundingClientRect(),dirty=true,moving=false;
 // SVGRect properties are not enumerable in every browser.
 currentView={x:svg.viewBox.baseVal.x,y:svg.viewBox.baseVal.y,width:svg.viewBox.baseVal.width,height:svg.viewBox.baseVal.height};
 const states=new Map(),restores=[],stage=new Container(),world=new Container(),terrainLayer=new Container(),territoryLayer=new Container(),footprintLayer=new Container(),roadLayer=new Container(),cityLayer=new Container(),fogLayer=new Container();
 stage.addChild(world);world.enableRenderGroup();world.addChild(terrainLayer,territoryLayer,footprintLayer,roadLayer,cityLayer,fogLayer);
 const sceneTextures=new Set(),tileDisplays=new Map();let layerNames=[season+'/base',season+'/landscape',season+'/relief',season+'/foreground','roads'];
 let terrainOriginal,territoryOriginal,fogOriginal,territoryMask,fogTexture,territoryTexture,footprintTexture,territoryGraphic,screenLabels,labelCompact,failed=false;
 const labelBindings=new AbortController();
 const stats=()=>{if(pool){svg.dataset.mapGPUStats=JSON.stringify({...pool.resources.stats,backend:'webgl',revision:pool.manifest.revision,driver:pool.driver,effectBytes:(fogTexture?16:0)*1024*1024+(territoryTexture?16:0)*1024*1024+(footprintTexture?4:0)*1024*1024,cities:states.size,tiles:[...tileDisplays.values()].filter(c=>c.visible).reduce((n,x)=>n+x.children.length,0)});svg.dataset.mapSpritePending=String(pool.resources.busy?1:0);}};
 const activeLayers=()=>{
  if(!pool.manifest.terrain[season+'/wide'])return layerNames;
  const blend=mapDetailBlend(currentView).interior;
  return blend<=0?[season+'/wide','roads']:blend>=1&&pool.resources.get(pool.manifest.terrain[season+'/close'][0][0])?[season+'/close','roads']:layerNames;
 };
 const wake=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(tick);};
 const textureFrame=(source,rect)=>{const t=new Texture({source:source.source,frame:new Rectangle(...rect)});sceneTextures.add(t);return t;};
 const atlas=(id,lod='low',priority=-25)=>{
  const f=pool.manifest.frames[lod][id];if(!f)throw Error('Missing map art ID: '+id);
  pool.resources.request(f.url,priority);const page=pool.resources.get(f.url);if(!page)return null;
  pool.resources.pin(f.url);return {page,frame:f};
 };
 const spriteFrame=(sprite,entry)=>{
  const key=entry.page.uid+':'+entry.frame.x+':'+entry.frame.y+':'+entry.frame.width;
  if(sprite._mapFrame===key)return;sprite.texture!==Texture.EMPTY&&sceneTextures.delete(sprite.texture)&&sprite.texture.destroy();
  sprite.texture=textureFrame(entry.page,[entry.frame.x,entry.frame.y,entry.frame.width,entry.frame.height]);sprite._mapFrame=key;
 };
 function buildCities(){
  for(const state of states.values()){
   if(state.container)continue;const c=state.container=new Container();c.position.set(state.x,state.y);c.scale.set(state.model.layout.mapScale);cityLayer.addChild(c);
   state.sprites=state.commands.map(command=>{const sprite=new Sprite(Texture.EMPTY);sprite.position.set(command.flip<0?-command.x:command.x,command.y);sprite.alpha=command.alpha;c.addChild(sprite);return sprite;});
  }
 }
 function planCities(){
  buildCities();const r=pool.resources,scale=Math.min(bounds.width/currentView.width,bounds.height/currentView.height)*pool.renderer.resolution;
  const baseURLs=new Set(Object.entries(pool.manifest.frames.low).filter(([id])=>!id.startsWith('ground/')||id.startsWith('ground/'+season+'/')).map(([,f])=>f.url));
  for(const url of baseURLs){r.request(url,-25);r.pin(url);}
  let lowReady=[...baseURLs].every(url=>r.get(url));
  for(const state of states.values()){
   const node=state.node,parent=state.interior?node.parentElement:node;
   const visible=node.isConnected&&parent?.style.display!=='none'&&Math.abs(state.x-(currentView.x+currentView.width/2))<currentView.width/2+45&&Math.abs(state.y-(currentView.y+currentView.height/2))<currentView.height/2+45;
   state.container.visible=visible;state.container.alpha=number(parent,'opacity');if(!visible||state.container.alpha<=0)continue;
   for(let i=0;i<state.commands.length;i++){
    const command=state.commands[i],sprite=state.sprites[i],low=atlas(command.id,'low',-25);
    if(!low){lowReady=false;continue;}
    const high=scale*state.model.layout.mapScale*Math.max(command.width,command.height)>160?atlas(command.id,'high',12):null;
    spriteFrame(sprite,high||low);sprite.width=command.width;sprite.height=command.height;sprite.scale.x=Math.abs(sprite.scale.x)*command.flip;
   }
  }
  return lowReady;
 }
 function planTerrain(){
  const keys=activeLayers(),r=pool.resources,scale=Math.min(bounds.width/currentView.width,bounds.height/currentView.height)*pool.renderer.resolution,level=mapBudgetedTileLevel(currentView,scale,keys.length,pool.manifest.profile.maxLevel),tiles=mapVisibleTiles(currentView,level,12/Math.max(.01,scale));
  // Both near/far parents stay resident, including when the browser goes offline
  // before the player first opens a city interior.
  for(const key of layerNames){r.request(pool.manifest.terrain[key][0][0],-30);r.pin(pool.manifest.terrain[key][0][0]);}
  for(const key of keys){
   const levels=pool.manifest.terrain[key];r.request(levels[0][0],-30);r.pin(levels[0][0]);
   if(level>0)for(const tile of tiles){const url=levels[level][tile.index];r.request(url,15+level);if(r.get(url))r.pin(url);}
  }
  return layerNames.every(key=>r.get(pool.manifest.terrain[key][0][0]));
 }
 function drawTerrain(){
  const keys=activeLayers(),r=pool.resources,scale=Math.min(bounds.width/currentView.width,bounds.height/currentView.height)*pool.renderer.resolution,level=mapBudgetedTileLevel(currentView,scale,keys.length,pool.manifest.profile.maxLevel),tiles=mapVisibleTiles(currentView,level,12/Math.max(.01,scale)),blend=mapDetailBlend(currentView);
  for(const [key,c]of tileDisplays)c.visible=keys.includes(key);
  for(const key of keys){
   let c=tileDisplays.get(key);if(!c){c=new Container();tileDisplays.set(key,c);(key==='roads'?roadLayer:terrainLayer).addChild(c);}
   c.visible=true;c.alpha=key.endsWith('/close')?blend.interior:key.endsWith('/relief')?1-blend.interior*.22:key.endsWith('/landscape')?1-blend.interior*.12:key==='roads'?(pool.manifest.terrain[season+'/wide']?.55+blend.settlements*.45:1+blend.settlements*.82):1;
   const descriptors=tiles.map(tile=>{
    let l=level,x=tile.x,y=tile.y,url=pool.manifest.terrain[key][l][y*2**l+x],t=r.get(url);
    while(!t&&l>0){l--;x>>=1;y>>=1;url=pool.manifest.terrain[key][l][y*2**l+x];t=r.get(url);}
    if(!t)return null;r.pin(url);const factor=2**(level-l),size=512/factor,g=pool.manifest.profile.gutter;
    return {url,t,tile,rect:[g+(tile.x-x*factor)*size,g+(tile.y-y*factor)*size,size,size]};
   }).filter(Boolean);
   const signature=descriptors.map(d=>[d.url,d.t.uid,d.tile.x,d.tile.y,...d.rect].join(':')).join('|');
   if(c._mapSignature===signature)continue;
   for(const s of c.children){sceneTextures.delete(s.texture);s.texture.destroy();}releaseChildren(c);
   for(const d of descriptors){const s=new Sprite(textureFrame(d.t,d.rect));s.position.set(d.tile.x*d.tile.span,d.tile.y*d.tile.span);s.width=s.height=d.tile.span;c.addChild(s);}
   c._mapSignature=signature;
  }
 }
 function buildEffects(){
  const land=atlas('territory/land'),edge=atlas('fog/edge');if(!land||!edge)return false;
  if(!territoryGraphic){
   const node=svg.querySelector('.map-territories'),territoryScene=new Container();territoryGraphic=new Graphics();
   for(const p of node?.querySelectorAll('polygon')||[]){const points=p.getAttribute('points').trim().split(/[ ,]+/).map(Number);territoryGraphic.poly(points).fill(p.getAttribute('fill'));}
   territoryScene.addChild(territoryGraphic);territoryMask=new Sprite();spriteFrame(territoryMask,land);territoryMask.width=territoryMask.height=1024;territoryScene.addChild(territoryMask);territoryGraphic.mask=territoryMask;
   // Resolve the mask once in bounded world space. A live world-sized SpriteMask
   // would allocate a camera-scaled framebuffer (32K pixels when zoomed in).
   territoryTexture=RenderTexture.create({width:2048,height:2048,resolution:1});territoryTexture.source.autoGarbageCollect=false;pool.renderer.render({container:territoryScene,target:territoryTexture,transform:new Matrix(2,0,0,2,0,0)});
   sceneTextures.delete(territoryMask.texture);territoryMask.texture.destroy();territoryScene.destroy({children:true});const plate=new Sprite(territoryTexture);plate.width=plate.height=1024;territoryLayer.addChild(plate);
   const footprints=svg.querySelector('.metropolis-footprints');if(footprints){
    const scene=new Container();for(const group of footprints.children){const graphics=new Graphics(),alpha=group.classList.contains('selected')?1:.12;for(const path of group.querySelectorAll('path')){const style=getComputedStyle(path);graphics.svg(`<svg><path d="${path.getAttribute('d')}" fill="${style.fill}" fill-opacity="${Number(style.fillOpacity)*alpha}" stroke="${style.stroke}" stroke-opacity="${Number(style.strokeOpacity)*alpha}" stroke-width=".4"/></svg>`);}scene.addChild(graphics);}
    const mask=new Sprite();spriteFrame(mask,land);mask.width=mask.height=1024;const content=new Container();content.addChild(...scene.removeChildren());scene.addChild(content,mask);content.mask=mask;
    footprintTexture=RenderTexture.create({width:1024,height:1024,resolution:1});footprintTexture.source.autoGarbageCollect=false;pool.renderer.render({container:scene,target:footprintTexture});sceneTextures.delete(mask.texture);mask.texture.destroy();scene.destroy({children:true});const sprite=new Sprite(footprintTexture);sprite.width=sprite.height=1024;footprintLayer.addChild(sprite);
   }
   const fog=svg.querySelector('.war-fog');if(fog){
    const maskId=fog.querySelector('[mask]')?.getAttribute('mask')?.match(/#([^)]*)/)?.[1],source=maskId&&svg.querySelector('[id="'+maskId+'"]'),fogScene=new Container(),bg=new Graphics().rect(0,0,1024,1024).fill('#515a55');fogScene.addChild(bg);
    for(const circle of source?.querySelectorAll('circle')||[]){const s=new Sprite();spriteFrame(s,edge);const radius=+circle.getAttribute('r');s.position.set(+circle.getAttribute('cx')-radius,+circle.getAttribute('cy')-radius);s.width=s.height=radius*2;s.blendMode='erase';fogScene.addChild(s);}
    for(const polygon of source?.querySelectorAll('polygon')||[]){const g=new Graphics().poly(polygon.getAttribute('points').trim().split(/[ ,]+/).map(Number)).fill('#ffffff');g.blendMode='erase';fogScene.addChild(g);}
    fogTexture=RenderTexture.create({width:2048,height:2048,resolution:1});fogTexture.source.autoGarbageCollect=false;pool.renderer.render({container:fogScene,target:fogTexture,transform:new Matrix(2,0,0,2,0,0)});
    for(const s of fogScene.children)if(s instanceof Sprite&&s.texture!==Texture.EMPTY){sceneTextures.delete(s.texture);s.texture.destroy();}fogScene.destroy({children:true});
    const sprite=new Sprite(fogTexture);sprite.width=sprite.height=1024;sprite.alpha=.28;fogLayer.addChild(sprite);
   }
  }
  territoryLayer.visible=!svg.classList.contains('hide-territory');territoryLayer.alpha=Math.min(currentView.width,currentView.height)<=420?.05:Math.min(currentView.width,currentView.height)>=720?.23:.11;
  footprintLayer.alpha=mapDetailBlend(currentView).metropolis;
  return true;
 }
 function strip(state){
  if(state.stripped)return;state.original=state.node.cloneNode(true);state.stripped=true;
  for(const n of state.node.querySelectorAll('.town-ground,.town-foundation,.prefecture-village,.town-building-sprite,.city-scaffold image,.city-compact-scaffold image'))n.remove();state.onChange?.();
 }
 function activate(){
  active=true;svg.dataset.mapGPUReady='true';svg.dataset.mapRenderer='webgl';svg.classList.remove('map-resource-pending');svg.classList.add('map-gpu-active');
  const terrain=svg.querySelector('.ancient-atlas-terrain');if(terrain){terrainOriginal=terrain.cloneNode(true);for(const n of [...terrain.children])if(!n.classList.contains('atlas-province-labels'))n.remove();terrain.dataset.previewReady='true';terrain.dataset.tilePending='0';}
  const territory=svg.querySelector('.map-territories');if(territory){territoryOriginal=territory.style.display;territory.style.display='none';}
  const fog=svg.querySelector('.war-fog');if(fog){fogOriginal=fog.style.display;fog.style.display='none';}
  const footprints=svg.querySelector('.metropolis-footprints');if(footprints){const children=[...footprints.childNodes];footprints.replaceChildren();restores.push(()=>footprints.replaceChildren(...children));}
  for(const road of svg.querySelectorAll('.map-road')){
   const original=road.cloneNode(true);restores.push(()=>road.replaceChildren(...original.childNodes));for(const child of [...road.children])if(!child.hasAttribute('data-road-from'))child.remove();road.classList.add('map-gpu-road-hit');restores.push(()=>road.classList.remove('map-gpu-road-hit'));
  }
  for(const state of states.values())strip(state);
  screenLabels=prepareMapScreenLabels(svg);labelCompact=bounds.width<=700;screenLabels.refresh();screenLabels.apply(currentView,bounds);
  const hover=event=>screenLabels?.hover(event.type==='pointerleave'?null:event.target.closest?.('[data-city],[data-junction]'));
  for(const event of ['pointermove','pointerleave','focusin'])svg.addEventListener(event,hover,{signal:labelBindings.signal});
  pool.renderer.canvas.style.visibility='visible';
 }
 function fail(error){if(disposed||failed)return;failed=true;disabledRoots.add(root);svg.dataset.mapGPUError=error.message;api.destroy();onFailure?.(error);}
 function tick(upload=true){
  frame=0;if(disposed||!pool||failed)return;
  try{
   const r=pool.resources;r.beginFrame();const terrainReady=planTerrain(),citiesReady=planCities(),effectsReady=buildEffects();r.endFrame();
   // One page/tile upload per animation frame; decoding is capped at two jobs.
   const uploaded=upload?r.drain():false;if(uploaded)dirty=true;
   if(terrainReady&&citiesReady&&effectsReady&&!active)activate();
   if(active&&(dirty||uploaded)){drawTerrain();for(const state of states.values())if(!state.stripped)strip(state);pool.renderer.render({container:stage});dirty=false;}
   stats();if(r.busy)wake();
  }catch(e){fail(e);}
 }
 const onContextLost=event=>{event.preventDefault();if(pool)pool.faulted=true;fail(Error('Map graphics context lost'));};
 const api={
  register(node,kind,onChange){
   if(!node||states.has(node))return;const place=node.closest('[data-x][data-y]');if(!place)return;
   const source=place.querySelector('[data-city-model],[data-city-public-model]'),id=place.dataset.city||place.dataset.commandCity||place.dataset.junction;
   const interior=kind.startsWith('interior');
   for(const [oldNode,state]of states)if(state.id===id&&state.interior===interior){
    for(const sprite of state.sprites||[])if(sprite.texture!==Texture.EMPTY){sceneTextures.delete(sprite.texture);sprite.texture.destroy();}state.container?.destroy({children:true});states.delete(oldNode);
   }
   const model=source?JSON.parse(source.textContent):{kind:place.classList.contains('node-junction')?'junction':'city',layout:townLayout({id,kind:'city',citySize:place.dataset.citySize,x:+place.dataset.x,y:+place.dataset.y}),gateCondition:1,districts:[]};
   states.set(node,{id,node,model,x:+place.dataset.x,y:+place.dataset.y,commands:mapCityDrawCommands(model,season),interior,onChange});dirty=true;wake();
  },
  apply(view,continuous=false){currentView={...view};moving=continuous;if(!continuous)bounds=svg.getBoundingClientRect();const scale=Math.min(bounds.width/view.width,bounds.height/view.height);world.scale.set(scale);world.position.set((bounds.width-view.width*scale)/2-view.x*scale,(bounds.height-view.height*scale)/2-view.y*scale);if(pool&&(pool.renderer.width/pool.renderer.resolution!==Math.round(bounds.width)||pool.renderer.height/pool.renderer.resolution!==Math.round(bounds.height)))pool.renderer.resize(Math.max(1,bounds.width),Math.max(1,bounds.height));screenLabels?.apply(view,bounds);dirty=true;if(continuous&&active){cancelAnimationFrame(frame);frame=0;tick(false);}else wake();},
  update(view){screenLabels?.refresh();api.apply(view);if(active){if(labelCompact!==(bounds.width<=700)){screenLabels.destroy();screenLabels=prepareMapScreenLabels(svg);labelCompact=bounds.width<=700;screenLabels.refresh();screenLabels.apply(view,bounds);}cancelAnimationFrame(frame);frame=0;tick(false);}},pause(){},
  destroy(){
   if(disposed)return;disposed=true;cancelAnimationFrame(frame);labelBindings.abort();pool?.renderer.canvas.removeEventListener('webglcontextlost',onContextLost);screenLabels?.destroy();for(const restore of restores)restore();
   for(const state of states.values())if(state.original)state.node.replaceChildren(...state.original.childNodes);
   const terrain=svg.querySelector('.ancient-atlas-terrain');if(terrainOriginal&&terrain)terrain.replaceChildren(...terrainOriginal.childNodes);
   const territory=svg.querySelector('.map-territories');if(territory&&territoryOriginal!==undefined)territory.style.display=territoryOriginal;
   const fog=svg.querySelector('.war-fog');if(fog&&fogOriginal!==undefined)fog.style.display=fogOriginal;
   stage.destroy({children:true});for(const t of sceneTextures)t.destroy();fogTexture?.destroy(true);territoryTexture?.destroy(true);footprintTexture?.destroy(true);
   svg.classList.remove('map-gpu-active');delete svg.dataset.mapGPUReady;delete svg.dataset.mapRenderer;delete svg.dataset.mapCameraMoving;
   if(pool){pool.wake=null;pool.renderer.canvas.remove();pool.timer=setTimeout(()=>{if(!pool.wake){pool.resources.destroy();pool.renderer.destroy();if(pools.get(root)===pool)pools.delete(root);}},60000);}
  }
 };
 context(root,assetCatalog.mapGPU).then(value=>{pool=value;if(pool.manifest.geometry!==geometry)throw Error('Map art geography is out of date');if(disposed){pool.timer=setTimeout(()=>{if(!pool.wake){pool.resources.destroy();pool.renderer.destroy();if(pools.get(root)===pool)pools.delete(root);}},60000);return;}if(pool.manifest.terrain[season+'/wide'])layerNames=[season+'/wide',season+'/close','roads'];pool.wake=()=>{dirty=true;wake();};pool.resources.onError=fail;pool.renderer.canvas.addEventListener('webglcontextlost',onContextLost);svg.before(pool.renderer.canvas);pool.renderer.canvas.style.visibility='hidden';api.apply(currentView);}).catch(fail);
 return api;
}
