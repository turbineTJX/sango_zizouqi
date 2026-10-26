import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,planBattleCouncilsAI} from '../engine.mjs';

const entry=([id,type])=>({id,type,level:10,troops:3000,retreatAt:null});
const shieldDemo=process.argv.includes('--shields');
const state=createScenario('custom-battle',20261024,null,null,{seed:20261024,terrain:'land',battleKind:shieldDemo?'defense':'field',shieldPercent:shieldDemo?12:0,
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','archer'],['jia','archer']].map(entry),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','archer'],['ju','archer'],['tian','spear']].map(entry)});
planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);
if(shieldDemo)assert.ok(state.battle.sides[0].units.some(u=>u.statuses.shield?.amount>0),'legal opening shields must exist before playback');
const out=shieldDemo?'work/battle-feedback-20261024':'work/battle-casting-20261024',port=4299,captureAnimation=process.argv.includes('--animation');await mkdir(out,{recursive:true});
async function recordAnimation(page,path,count,observe=async()=>{}){
 const board=await page.locator('#battle-board').boundingBox(),frames=[];
 const clip={x:Math.floor(board.x),y:Math.floor(board.y)-45,width:Math.floor(board.width),height:Math.floor(board.height)+60};let info;
 for(let i=0;i<count;i++){
  const buffer=await page.screenshot({clip}),raw=await sharp(buffer).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;
  await observe();await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*count,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===count-1?650:50),effort:3,colours:128}).toFile(path);
 assert.equal((await sharp(path,{animated:true}).metadata()).pages,count);return {output:path,frames:count};
}
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto(`http://127.0.0.1:${port}`);
 // Exercise the native model path in its browser import-map environment.
 const modelMotion=await page.evaluate(async()=>{
  const {ModelLayer}=await import('./art-models.mjs'),{Group,MeshStandardMaterial}=await import('./vendor/three/three.module.js');
  const original=window.matchMedia;let reduced=false;window.matchMedia=()=>({matches:reduced});
  try{
   const layer=Object.create(ModelLayer.prototype),root=new Group(),victim=new Group(),body=new MeshStandardMaterial({color:0x507766}),originalColor=body.color.clone();
   Object.assign(layer,{board:{clientWidth:700,clientHeight:400,classList:{toggle(){}}},pack:{},renderer:{setSize(){},render(){}},camera:{updateProjectionMatrix(){}},
    objects:new Map([['healer',{root,tilt:new Group(),width:1,height:1}],['ally',{root:victim,tilt:new Group(),width:1,height:1,flashMaterials:[{material:body,color:originalColor,emissive:body.emissive.clone(),intensity:body.emissiveIntensity}]}]]),
    wanted:new Map([['healer',{x:2,y:3,size:.8,key:'archer',unit:{id:'healer',side:0}}],['ally',{x:6,y:3,size:.8,key:'spear',unit:{id:'ally',side:0}}]])});
   const action={start:0,duration:1000,events:[{from:'healer',to:'ally',skill:true,healing:80,presentationKind:'heal',fromX:2,fromY:3}]};
   const before=JSON.stringify(action);
   layer.draw(0,{actions:[],clock:0});const base=root.position.clone(),baseVictim=victim.position.clone();
   layer.draw(0,{actions:[action],clock:380});const result={supportRaises:root.position.y>base.y,supportGestures:root.rotation.z!==0,healNoRecoil:victim.position.equals(baseVictim),readOnly:JSON.stringify(action)===before};
   action.events=[{from:'healer',to:'ally',damage:20,fromX:2,fromY:3}];
   layer.draw(0,{actions:[action],clock:400});result.beforeImpactStill=victim.position.equals(baseVictim);
   layer.draw(0,{actions:[action],clock:650});result.actualHitRecoil=victim.position.x>baseVictim.x;
   result.damageFlashesBody=!body.color.equals(originalColor);
   reduced=true;layer.draw(0,{actions:[action],clock:650});result.reducedStill=root.position.equals(base)&&victim.position.equals(baseVictim)&&root.rotation.z===0;
   result.flashRestores=body.color.equals(originalColor);
   reduced=false;action.events=[{from:'healer',to:'ally',damage:0,shieldAbsorbed:20,fromX:2,fromY:3}];layer.draw(0,{actions:[action],clock:650});result.shieldOnlyNoBodyHit=body.color.equals(originalColor)&&victim.position.equals(baseVictim);body.dispose();
   return result;
  }finally{window.matchMedia=original;}
 });
 assert.ok(Object.values(modelMotion).every(Boolean),JSON.stringify(modelMotion));
 await page.evaluate(async()=>{
  const {BattleEffects}=await import('./battle-effects.mjs');const original=BattleEffects.prototype.update;
  BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return original.call(this,b,options);};
 });
 await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'readability.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('#battle-board').waitFor();await page.waitForTimeout(400);
 await page.screenshot({path:out+'/formation.png'});
 // Identity flags below the unit must remain clickable outside its hitbox.
 await page.locator('[data-unit="jia"] .unit-map-caption b').click();
 assert.equal(await page.locator('#inspect-unit').inputValue(),'jia');
 await page.locator('.modal .close-button').click();
 await page.clock.install();await page.locator('[data-action="pause"]').click();
 const captured=new Set(),samples=[],feedbackSeen=new Set();let animation=null,shieldAnimation=null;
 async function feedbackSnapshot(){
  const state=await page.evaluate(()=>({
   absorption:fx.feedback.hits.some(h=>h.absorbed>0&&fx.clock>=h.start&&fx.clock<h.start+220),
   damage:fx.feedback.hits.some(h=>h.damage>0&&fx.clock>=h.start&&fx.clock<h.start+220),
   broken:fx.feedback.changes.some(c=>c.broken&&fx.clock>=c.start&&fx.clock<c.end),
   status:fx.feedback.changes.some(c=>c.key!=='shield'&&c.after&&fx.clock>=c.start&&fx.clock<c.end),
  }));
  for(const [key,visible]of Object.entries(state))if(visible&&!feedbackSeen.has(key)){await page.screenshot({path:out+'/'+key+'.png'});feedbackSeen.add(key);}
  return state;
 }
 for(let i=0;i<1800;i++){
  await page.clock.runFor(100);
  const view=await page.evaluate(()=>{
   const cast=fx.currentCinematic(),p=cast?(fx.clock-cast.start)/cast.duration:0;
   return {tick:actualBattle.tick,result:actualBattle.result,major:cast?.events[0].label,p,actions:fx.currentActions().map(a=>({from:a.events[0].from,important:a.important})),names:document.querySelectorAll('.unit-map-caption').length};
  });
  const feedback=await feedbackSnapshot();
  if(!captured.has('exchange')&&view.tick>=8&&view.actions.length){await page.screenshot({path:out+'/exchange.png'});captured.add('exchange');samples.push(view);}
  if(!captured.has('focus')&&view.tick>=10&&view.actions.length){
   const id=view.actions[0].from;
   const before=await page.evaluate(()=>JSON.stringify(actualBattle));
   await page.locator(`[data-unit="${id}"] .unit-map-caption`).hover();await page.evaluate(()=>fx.syncPresentation());
   const related=await page.locator('.battle-unit.observation-related').count();assert.ok(related>=1);
   assert.equal(await page.evaluate(()=>JSON.stringify(actualBattle)),before);
   await page.screenshot({path:out+'/focus.png'});await page.mouse.move(2,2);captured.add('focus');
  }
  if(shieldDemo&&captureAnimation&&!shieldAnimation&&feedback.absorption)shieldAnimation=await recordAnimation(page,out+'/shield-impact.gif',64,feedbackSnapshot);
  if(captureAnimation&&!animation&&view.major&&view.p<.12){
   const board=await page.locator('#battle-board').boundingBox(),frames=[],states=[];
   const clip={x:Math.floor(board.x),y:Math.floor(board.y)-45,width:Math.floor(board.width),height:Math.floor(board.height)+60};
   let info;
   for(let frame=0;frame<44;frame++){
    const buffer=await page.screenshot({clip}),raw=await sharp(buffer).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    frames.push(raw.data);info=raw.info;
    const current=await page.evaluate(()=>{const c=fx.currentCinematic();return {tick:actualBattle.tick,major:c?.events[0].label,p:c?(fx.clock-c.start)/c.duration:1};});states.push(current);
    if(current.major&&current.p>.12&&current.p<.24&&!captured.has('major')){await page.screenshot({path:out+'/major.png'});captured.add('major');samples.push(current);}
    if(current.major&&current.p>.33&&current.p<.48)await page.screenshot({path:out+'/release.png'});
    if(current.major&&current.p>.65&&current.p<.85&&!captured.has('impact')){await page.screenshot({path:out+'/impact.png'});captured.add('impact');samples.push(current);}
    await page.clock.runFor(50);
   }
   const output=out+'/casting.gif';
   await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*frames.length,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===frames.length-1?650:50),effort:3,colours:128}).toFile(output);
   const meta=await sharp(output,{animated:true}).metadata();assert.equal(meta.pages,frames.length);
   animation={output,frames:frames.length,states};
  }
  if(view.major&&view.p>.12&&view.p<.4&&!captured.has('major')){await page.screenshot({path:out+'/major.png'});captured.add('major');samples.push(view);}
  if(view.major&&view.p>.7&&view.p<.9&&!captured.has('impact')){await page.screenshot({path:out+'/impact.png'});captured.add('impact');samples.push(view);}
  if(captured.size===4||view.result)break;
 }
 assert.ok(captured.has('exchange'));assert.ok(captured.has('focus'));assert.ok(captured.has('major'));assert.ok(captured.has('impact'));
 if(shieldDemo)for(const key of ['absorption','damage','broken','status'])assert.ok(feedbackSeen.has(key),'missing real feedback: '+key);
 // Freeze every presentation channel on pause, including a queued action.
 await page.locator('[data-action="pause"]').click();await page.clock.runFor(50);
 const frozen=await page.evaluate(()=>({clock:fx.clock,battle:JSON.stringify(actualBattle),pixels:fx.canvas.toDataURL()}));
 await page.clock.runFor(1200);assert.deepEqual(await page.evaluate(()=>({clock:fx.clock,battle:JSON.stringify(actualBattle),pixels:fx.canvas.toDataURL()})),frozen);
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(50);await page.screenshot({path:out+'/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const labels=await page.locator('.unit-map-caption').evaluateAll(xs=>xs.map(el=>{const r=el.getBoundingClientRect();return {name:el.querySelector('b').textContent,x:r.x,y:r.y,w:r.width,h:r.height};}));
 for(let i=0;i<labels.length;i++)for(let j=0;j<i;j++){const a=labels[i],b=labels[j];assert.ok(a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1,`overlapping flags: ${a.name}, ${b.name}`);}
 const rosterBoxes=await page.locator('.roster-side').evaluateAll(xs=>xs.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right};}));
 assert.ok(rosterBoxes[0].right<=rosterBoxes[1].x+1,'both mobile rosters must have separate columns');
 await page.locator('[data-action="speed"]').click();await page.locator('[data-action="speed"]').click();assert.equal(await page.locator('[data-action="speed"]').innerText(),'4×');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-action="pause"]').click();await page.clock.runFor(1600);await page.screenshot({path:out+'/reduced.png'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({captured:[...captured],samples,labels,rosterBoxes,errors,paused:true,speed4:true,captionInspection:true,modelMotion,animation,shieldAnimation,feedbackSeen:[...feedbackSeen]},null,2));
 console.log(JSON.stringify({passed:true,out,captured:[...captured],samples,errors}));
}finally{await browser?.close();server.kill();}
