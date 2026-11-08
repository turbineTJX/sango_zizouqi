import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const out='work/troop-readiness-20261108',port=4358;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1500,height:720},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${port}`);
 const result=await page.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js'),{createTroopModel,animateTroopModel}=await import('./art-troop-models.mjs');
  const host=document.createElement('section');host.id='readiness-gallery';
  host.style.cssText='position:fixed;inset:0;z-index:9999;background:#353c34;color:#e6e2d3;display:grid;align-content:center;justify-content:center;gap:16px;font:18px Sango Serif,serif';
  host.innerHTML='<div style="padding-left:16px">备战姿态 · 与战场共用兵模</div><canvas></canvas><div style="display:grid;grid-template-columns:repeat(5,1fr);text-align:center"><span>枪兵 · 压枪护身</span><span>戟兵 · 沉腰蓄势</span><span>弓兵 · 侧身待发</span><span>弩兵 · 平举持弩</span><span>骑兵 · 俯身控马</span></div>';document.body.append(host);
  const renderer=new T.WebGLRenderer({canvas:host.querySelector('canvas'),antialias:true});renderer.setSize(1440,460);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setScissorTest(true);
  const entries=['spear','halberd','archer','crossbow','cavalry'].map(type=>{
   const scene=new T.Scene();scene.background=new T.Color('#353c34');scene.add(new T.HemisphereLight(0xdce2d4,0x514c3a,1.45));const light=new T.DirectionalLight(0xffedd0,2.25);light.position.set(-3,5,6);scene.add(light);
   const model=createTroopModel(type),obj={model};scene.add(model);
   const ground=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0x545c4c,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.015;scene.add(ground);
   const height=type==='cavalry'?1.8:1.5,camera=new T.OrthographicCamera(-height*288/460,height*288/460,height,-height,.1,50);camera.position.set(3.1,2.65,5.5);camera.lookAt(0,type==='cavalry'?1.35:1.15,0);
   return {scene,obj,camera,type};
  });
  const render=(time=2,reduced=false)=>{
   for(const [i,{scene,obj,camera}]of entries.entries()){
    animateTroopModel(obj,{time,progress:1,facing:-.25,maxMembers:1,reduced});
    renderer.setViewport(i*288,0,288,460);renderer.setScissor(i*288,0,288,460);renderer.render(scene,camera);
   }
  };
  const transforms=()=>entries.flatMap(e=>{const a=[];e.obj.model.traverse(n=>a.push([n.visible,...n.position.toArray(),...n.rotation.toArray().slice(0,3)]));return a;});
  window.readinessGallery={render,entries,transforms};render(2);
  const checks=entries.map(({type,obj})=>{
   const rig=obj.troopRig[0],footHeights=type==='cavalry'?[]:rig.ankles.map(ankle=>ankle.localToWorld(new T.Vector3(0,-.065,0)).y);
   return {type,bodyPitch:rig.body.rotation.x,knees:rig.knees.map(n=>n.rotation.x),footHeights,guardArms:rig.arms.map(n=>n.rotation.x)};
  });
  const before=JSON.stringify(transforms());render(2);const sameTime=before===JSON.stringify(transforms());render(9,true);const reducedBefore=JSON.stringify(transforms());render(99,true);const reducedStable=reducedBefore===JSON.stringify(transforms());render(2);
  return {checks,sameTime,reducedStable};
 });
 assert.ok(result.sameTime&&result.reducedStable);assert.ok(result.checks.every(c=>c.bodyPitch>.05&&c.guardArms.every(n=>n<-.25)));
 assert.ok(result.checks.filter(c=>c.type!=='cavalry').every(c=>c.knees.every(n=>n>.35)&&c.footHeights.every(y=>Math.abs(y)<.025)),JSON.stringify(result));
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('#readiness-gallery').screenshot({path:out+'/ready.png'});
 await page.evaluate(()=>readinessGallery.render(2,true));await page.locator('#readiness-gallery').screenshot({path:out+'/reduced.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,...result,errors},null,2));console.log(JSON.stringify({passed:true,out,...result}));
}finally{await browser?.close();server.kill();}
