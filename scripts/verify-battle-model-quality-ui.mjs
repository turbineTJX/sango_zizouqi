import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,planBattleCouncilsAI,stepBattle,validateSave} from '../engine.mjs';

const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
const state=createScenario('custom-battle',20261026,null,null,{seed:20261026,terrain:'land',
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(entry),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(entry)});
planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);
while(state.battle.tick<9&&!state.battle.result)stepBattle(state.battle,{aiSides:[]});validateSave(state);
const port=4348,out='work/battle-models-20261026';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}`);
 const modelChecks=await page.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js'),{createTroopModel,animateTroopModel}=await import('./art-troop-models.mjs'),{cloneAnimatedModel}=await import('./art-models.mjs');
  const result={types:[],independent:true,finite:true,articulated:true};
  for(const type of ['spear','halberd','archer','crossbow','cavalry','whiteHorse','greatHalberd','rattan','tigerCavalry']){
   const source=createTroopModel(type),model=cloneAnimatedModel(source),other=cloneAnimatedModel(source),obj={model};
   const before=new T.Box3().setFromObject(model);let vertices=0,meshes=0;model.traverse(n=>{if(n.isMesh){vertices+=n.geometry.attributes.position.count;meshes++;}});
   animateTroopModel(obj,{progress:.38,time:.4,facing:1});
   const arm=model.getObjectByName('arm-r');result.articulated&&=Math.abs(arm.rotation.x)>.3;
   result.independent&&=other.getObjectByName('arm-r').rotation.x===0;
   model.traverse(n=>{result.finite&&=[...n.position.toArray(),...n.scale.toArray(),n.rotation.x,n.rotation.y,n.rotation.z].every(Number.isFinite);});
   if(['spear','halberd','cavalry'].includes(type)){
    animateTroopModel(obj,{progress:.2,time:0,facing:1});const preparation=arm.rotation.x;
    animateTroopModel(obj,{progress:.52,time:0,facing:1});result.articulated&&=arm.rotation.x<preparation-.7;
   }
   animateTroopModel(obj,{progress:1,time:0,facing:1});result.articulated&&=arm.rotation.x===0;
   animateTroopModel(obj,{progress:1,time:0,compact:true});
   result.finite&&=model.children.filter(n=>n.name.startsWith('member-')&&n.visible).length===2;
   result.types.push({type,vertices,meshes,height:before.max.y-before.min.y});
  }
  return result;
 });
 assert.ok(modelChecks.independent&&modelChecks.finite&&modelChecks.articulated);assert.ok(modelChecks.types.every(t=>t.vertices>10000&&t.meshes<85));
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),{BattleArt}=await import('./art-battle.mjs');
  const update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return update.call(this,b,options);};
  const artUpdate=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){window.sprites=this;return artUpdate.apply(this,args);};
 });
 await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'native-models.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.waitForFunction(()=>window.sprites?.models&&[...sprites.models.objects.values()].filter(o=>o.model?.userData.nativeTroop).length===12);
 await page.clock.install({time:new Date('2026-10-26T03:00:00Z')});await page.clock.pauseAt(new Date('2026-10-26T03:00:00.100Z'));
 await page.screenshot({path:out+'/battle.png'});
 const budget=await page.evaluate(()=>({nativeUnits:[...sprites.models.objects.values()].filter(o=>o.model?.userData.nativeTroop).length,calls:sprites.models.renderer.info.render.calls,triangles:sprites.models.renderer.info.render.triangles}));
 assert.ok(budget.calls<800&&budget.triangles<1500000,JSON.stringify(budget));
 // Same battle and camera show the prior atlas fallback for a fair visual check.
 await page.evaluate(()=>{window.nativeHas=sprites.models.hasUnit;sprites.models.hasUnit=()=>false;sprites.models.renderer.domElement.style.display='none';});await page.clock.runFor(50);
 await page.screenshot({path:out+'/atlas-fallback.png'});
 await page.evaluate(()=>{sprites.models.hasUnit=nativeHas;sprites.models.renderer.domElement.style.display='';});await page.clock.runFor(50);
 const before=await page.evaluate(()=>JSON.stringify(actualBattle));
 const modelPose=()=>({clock:fx.clock,poses:[...sprites.models.objects.values()].flatMap(obj=>{const parts=[];obj.model.traverse(n=>parts.push([n.visible,...n.position.toArray(),n.rotation.x,n.rotation.y,n.rotation.z,...n.scale.toArray()]));return parts;})});
 const frozen=await page.evaluate(modelPose);await page.clock.runFor(600);
 assert.deepEqual(await page.evaluate(modelPose),frozen);
 assert.equal(await page.evaluate(()=>JSON.stringify(actualBattle)),before);
 await page.locator('[data-action="pause"]').click();
 const frames=[];let info;
 for(let i=0;i<36;i++){
  const raw=await sharp(await page.locator('.arena-stage').screenshot()).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?500:50),colours:160,effort:3}).toFile(out+'/native-battle.gif');
 await page.locator('[data-action="pause"]').click();await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);await page.screenshot({path:out+'/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const mobileBudget=await page.evaluate(()=>({calls:sprites.models.renderer.info.render.calls,triangles:sprites.models.renderer.info.render.triangles,visibleMembers:[...sprites.models.objects.values()].filter(o=>o.troopRig).map(o=>o.troopRig.filter(r=>r.member.visible).length)}));
 assert.ok(mobileBudget.calls<budget.calls&&mobileBudget.triangles<budget.triangles,JSON.stringify(mobileBudget));assert.ok(mobileBudget.visibleMembers.every(n=>n===2));
 // A close view renders exactly the native models used on the board.
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js'),{createTroopModel,animateTroopModel}=await import('./art-troop-models.mjs');
  const host=document.createElement('section');host.id='model-gallery';host.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:1280px;padding:20px;z-index:9999;background:#252b27;display:grid;place-content:center;gap:12px';
  const canvas=document.createElement('canvas');host.append(canvas);
  const labels=document.createElement('div');labels.style.cssText='display:flex;justify-content:space-around;color:#d9c9a7;font:14px Microsoft YaHei';labels.innerHTML='<span>枪兵</span><span>戟兵</span><span>弓弩兵</span><span>骑兵</span>';host.append(labels);document.body.append(host);
  const renderer=new T.WebGLRenderer({canvas,alpha:false,antialias:true});renderer.setSize(1280,420);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setScissorTest(true);
  for(const [i,type]of ['spear','halberd','crossbow','cavalry'].entries()){
   const scene=new T.Scene();scene.background=new T.Color('#252b27');scene.add(new T.HemisphereLight(0xf5eedb,0x555f4b,2));const light=new T.DirectionalLight(0xffeed4,3);light.position.set(-3,5,6);scene.add(light);
   const model=createTroopModel(type),obj={model};animateTroopModel(obj,{progress:1,facing:.35});scene.add(model);
   const camera=new T.OrthographicCamera(-1.3,1.3,1.72,-1.72,.1,50);camera.position.set(3,3.7,6);camera.lookAt(0,1.3,0);renderer.setViewport(i*320,0,320,420);renderer.setScissor(i*320,0,320,420);renderer.render(scene,camera);
  }
  window.galleryRenderer=renderer;
 });
 await page.locator('#model-gallery').screenshot({path:out+'/models-closeup.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,modelChecks,budget,mobileBudget,paused:true,mobile:true,errors},null,2));console.log(JSON.stringify({passed:true,out,budget,mobileBudget,errors}));
}finally{await browser?.close();server.kill();}
