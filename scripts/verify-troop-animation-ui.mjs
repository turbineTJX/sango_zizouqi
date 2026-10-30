import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';

// A controlled close view of the actual factory and animator. This checks
// articulation and transitions; real combat/timing is verified by battle-models.
const out=process.env.SANGO_BATTLE_UI_OUT||'work/troop-animation-20261026',port=4350;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1400,height:700},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);
 const checks=await page.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js'),{createTroopModel,animateTroopModel}=await import('./art-troop-models.mjs');
  const host=document.createElement('section');host.id='animation-gallery';host.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:1280px;padding:16px;z-index:9999;background:#29332b;display:grid;gap:10px;color:#d9c9a7';
  host.innerHTML='<div style="font:13px Microsoft YaHei">部队动作近景 · 与战场共用模型和动画</div><canvas></canvas><div style="display:flex;justify-content:space-around;font:12px Microsoft YaHei"><span>枪兵 · 突刺与收势</span><span>戟兵 · 转腰挥斩</span><span>弓兵 · 拉弓松弦</span><span>骑兵 · 马步与骑乘</span></div>';document.body.append(host);
  const renderer=new T.WebGLRenderer({canvas:host.querySelector('canvas'),antialias:true});renderer.setSize(1248,360);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setScissorTest(true);
  const entries=['spear','halberd','archer','cavalry'].map(type=>{
   const scene=new T.Scene();scene.background=new T.Color('#29332b');scene.add(new T.HemisphereLight(0xf5eedb,0x555f4b,2));const light=new T.DirectionalLight(0xffeed4,3);light.position.set(-3,5,6);scene.add(light);
   const model=createTroopModel(type),obj={model},camera=new T.OrthographicCamera(-1.3,1.3,1.5,-1.5,.1,50);camera.position.set(5,3.3,4);camera.lookAt(0,type==='cavalry'?1.45:1.15,0);scene.add(model);return {scene,obj,camera,type};
  });
  const render=time=>{
   for(const [i,{scene,obj,camera,type}]of entries.entries()){
    const moving=type==='cavalry'||time<.8,moveProgress=type==='cavalry'?(time%1.2)/1.2:time/.8,progress=type!=='cavalry'&&time>=1&&time<2.6?(time-1)/1.6:1;
    animateTroopModel(obj,{time,progress,moving,moveProgress,kind:type==='archer'?'volley':'strike',facing:-.35,compact:true});
    renderer.setViewport(i*312,0,312,360);renderer.setScissor(i*312,0,312,360);renderer.render(scene,camera);
   }
  };
  window.animationGallery={entries,render};render(0);
  const bow=entries[2].obj,rig=bow.troopRig[0];animateTroopModel(bow,{time:.2,progress:.22,facing:0});
  const string=rig.bow.getObjectByName('bow-string-upper'),drawn=string.position.z,arrow=rig.bow.getObjectByName('nocked-arrow');
  const checks={knees:entries.every(e=>e.obj.troopRig.every(r=>r.legs.every(l=>l.getObjectByName('knee')&&l.getObjectByName('ankle')))),drawnString:drawn<-.09,nocked:arrow.visible};
  const upper=rig.bow.localToWorld(new T.Vector3(0,.6,0)),lower=rig.bow.localToWorld(new T.Vector3(0,-.6,0));checks.bowStaysUpright=upper.y-lower.y>1;
  const spear={model:createTroopModel('spear')};animateTroopModel(spear,{progress:.52,facing:0,time:0});const held=spear.troopRig[0].weapon,grip=held.getWorldPosition(new T.Vector3()),tip=held.localToWorld(new T.Vector3(0,1.55,0));checks.spearPointsForward=tip.z-grip.z>1;
  animateTroopModel(bow,{time:.3,progress:.32,facing:0});checks.releasedString=string.position.z===0&&!arrow.visible;
  animateTroopModel(bow,{time:1,progress:1,facing:0});checks.reloads=arrow.visible;
  const mounted=entries[3].obj;animateTroopModel(mounted,{time:.4,moving:true,moveProgress:.4});checks.horseArticulates=mounted.troopRig[0].horseLegs.some(l=>l.getObjectByName('horse-knee').rotation.x>.1);
  render(0);return checks;
 });for(const [key,ok]of Object.entries(checks))assert.ok(ok,key);
 const frames=[];let info;
 for(let i=0;i<60;i++){
  await page.evaluate(t=>animationGallery.render(t),i*.06);
  if([17,23,30].includes(i))await page.locator('#animation-gallery').screenshot({path:out+`/pose-${i}.png`});
  const raw=await sharp(await page.locator('#animation-gallery').screenshot()).resize({width:1100}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map(()=>60),colours:160,effort:3}).toFile(out+'/troop-actions.gif');
 await page.evaluate(()=>animationGallery.render(1.35));const frozen=await page.locator('#animation-gallery').screenshot();await page.evaluate(()=>animationGallery.render(1.35));assert.deepEqual(await page.locator('#animation-gallery').screenshot(),frozen);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,checks,sameTimeSamePixels:true,frames:60,errors},null,2));console.log(JSON.stringify({passed:true,out,checks,errors}));
}finally{await browser?.close();server.kill();}
