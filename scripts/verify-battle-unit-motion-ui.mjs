import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,planBattleCouncilsAI,stepBattle,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';

// Deliberate status fixtures test rendering, not balance or AI decisions.
const entry=([id,type])=>({id,type,level:10,troops:4000,retreatAt:null});
const state=createScenario('custom-battle',20261026,null,null,{seed:20261026,terrain:'land',
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','archer'],['jia','archer']].map(entry),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','archer'],['ju','archer'],['tian','spear']].map(entry)});
planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);
while(state.battle.tick<9&&!state.battle.result)stepBattle(state.battle,{aiSides:[]});
const statuses=['shield','valor','regrowth','haste','phalanx','ward','burn','stun','confuse','plague','root','seal'];
state.battle.sides.flatMap(s=>s.units).forEach((u,i)=>setStatus(state.battle,u,statuses[i],16,
 statuses[i]==='shield'?{amount:400,source:'visual-fixture'}:statuses[i]==='ward'?{percent:25}:['plague','regrowth','burn'].includes(statuses[i])?{amount:10,sourceId:u.id}:{}));
validateSave(state);
const port=4347,out='work/battle-body-20261026';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}`);
 const native=await page.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js');
  const {cloneAnimatedModel,animateModelParts,playModelClip,ModelLayer}=await import('./art-models.mjs');
  const {createSiegeModel}=await import('./art-siege-models.mjs');
  const ram={model:createSiegeModel('ram')},siege={model:createSiegeModel('siege')};
  animateModelParts(ram,.38,.5);animateModelParts(siege,.38,.5);
  const result={ramStrikes:ram.rig.ram.position.x>0,catapultReleases:siege.rig.arm.rotation.z>0};
  animateModelParts(ram,1,0);animateModelParts(siege,1,0);result.partsSettle=ram.rig.ram.position.x===0&&siege.rig.arm.rotation.z===0;
  const source=new T.Group(),bone=new T.Bone(),mesh=new T.SkinnedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());bone.name='arm';source.add(bone,mesh);mesh.bind(new T.Skeleton([bone]));
  const clone=cloneAnimatedModel(source),copied=clone.children.find(n=>n.isSkinnedMesh);copied.skeleton.bones[0].rotation.z=.5;
  result.independentSkeleton=copied.skeleton.bones[0]!==bone&&bone.rotation.z===0;
  const weapon=new T.Group(),root=new T.Group();weapon.name='weapon';root.add(weapon);
  const clip=new T.AnimationClip('attack',1,[new T.NumberKeyframeTrack('weapon.rotation[z]',[0,.5,1],[0,.8,0])]),obj={model:root,clips:[clip],mixer:new T.AnimationMixer(root)};
  playModelClip(obj,'attack',.4);result.nativeAttackClip=weapon.rotation.z>.5;const attackAngle=weapon.rotation.z;playModelClip(obj,'attack',.4);result.deterministicClip=weapon.rotation.z===attackAngle;
  playModelClip(obj,'stun',.4);result.missingStunStopsAttack=weapon.rotation.z===0;
  const layer=Object.create(ModelLayer.prototype),body=new T.Group(),tilt=new T.Group(),unit={id:'u',side:0};
  Object.assign(layer,{board:{clientWidth:700,clientHeight:400,classList:{toggle(){}}},pack:{},renderer:{setSize(){},render(){}},camera:{updateProjectionMatrix(){}},objects:new Map([['u',{root:body,tilt,width:1,height:1}]]),wanted:new Map([['u',{key:'spear',x:3,y:3,size:.8,unit}]])});
  layer.draw(0,{actions:[],clock:200,statuses:()=>[{key:'stun'}]});const first=body.rotation.z;
  layer.draw(0,{actions:[],clock:700,statuses:()=>[{key:'stun'}]});result.nativeStunBody=body.rotation.z!==first;
  layer.draw(0,{actions:[],clock:700,statuses:()=>[]});result.statusClears=body.rotation.z===0;
  return result;
 });
 assert.ok(Object.values(native).every(Boolean),JSON.stringify(native));
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs'),{BattleArt}=await import('./art-battle.mjs');
  const update=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return update.call(this,b,options);};
  const updateArt=BattleArt.prototype.update;BattleArt.prototype.update=function(...args){window.sprites=this;return updateArt.apply(this,args);};
 });
 await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'body-statuses.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('#battle-board').waitFor();await page.waitForFunction(()=>document.querySelectorAll('.has-unit-art').length>=10);
 await page.clock.install({time:new Date('2026-10-26T02:00:00Z')});await page.clock.pauseAt(new Date('2026-10-26T02:00:00.100Z'));
 await page.evaluate(()=>{
  window.auraCalls=0;window.fontSizes=[];const ellipse=fx.ctx.ellipse.bind(fx.ctx),label=fx.label;
  fx.ctx.ellipse=(x,y,rx,ry,rotation,start,end,...rest)=>{if(rx>fx.width/14.5*.35&&end-start>6.2)auraCalls++;ellipse(x,y,rx,ry,rotation,start,end,...rest);};
  fx.label=function(...args){fontSizes.push(args[5]||12);return label.apply(this,args);};
 });
 await page.screenshot({path:out+'/states.png'});await page.locator('[data-action="pause"]').click();
 const frames=[];let info;
 for(let i=0;i<40;i++){
  const raw=await sharp(await page.locator('.arena-stage').screenshot()).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;
  await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?500:50),colours:128,effort:3}).toFile(out+'/body-states.gif');
 await page.locator('[data-action="pause"]').click();await page.clock.runFor(50);
 const freeze=await page.evaluate(()=>({clock:fx.clock,body:sprites.canvas.toDataURL(),effects:fx.canvas.toDataURL(),battle:JSON.stringify(actualBattle)}));await page.clock.runFor(500);
 assert.deepEqual(await page.evaluate(()=>({clock:fx.clock,body:sprites.canvas.toDataURL(),effects:fx.canvas.toDataURL(),battle:JSON.stringify(actualBattle)})),freeze);
 assert.equal(await page.evaluate(()=>auraCalls),0);
 assert.ok(await page.evaluate(()=>fontSizes.every(n=>n<=16)));
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);await page.screenshot({path:out+'/mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(50);await page.screenshot({path:out+'/reduced.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,native,statuses,auraCalls:0,smallFonts:true,pause:true,mobile:true,errors},null,2));console.log(JSON.stringify({passed:true,out,native,errors}));
}finally{await browser?.close();server.kill();}
