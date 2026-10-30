import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {generateBattle} from '../battle-generator.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';

const id=name=>Object.values(O).find(o=>o.name===name).id;
const team=names=>names.map(name=>({id:id(name),type:'archer',troops:3000,level:10}));
const state=generateBattle({seed:20261028,terrain:'land',mapId:'plain-open',battleKind:'field',ownTeam:team(['周瑜','小乔','大乔','吕布','赵云','貂蝉']),enemyTeam:team(['文聘','臧霸','吕虔','颜良','文丑','袁绍']),shieldPercent:0,events:[]});
const out=process.env.SANGO_BOND_UI_OUT||'work/bond-activation-20261028',port=4318;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
const errors=[];
const hook=async page=>page.evaluate(async()=>{
 const {BattleEffects}=await import('./battle-effects.mjs'),original=BattleEffects.prototype.update;
 BattleEffects.prototype.update=function(b,options){window.fx=this;window.actualBattle=b;return original.call(this,b,options);};
});
async function animate(page,path,count){
 const area=await page.locator('.battle-layout').boundingBox(),frames=[];let info;
 for(let i=0;i<count;i++){
  const buffer=await page.screenshot({clip:{x:Math.floor(area.x),y:Math.floor(area.y),width:Math.floor(area.width),height:Math.floor(area.height)}});
  const raw=await sharp(buffer).resize({width:1000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});frames.push(raw.data);info=raw.info;await page.clock.runFor(50);
 }
 await sharp(Buffer.concat(frames),{raw:{width:info.width,height:info.height*count,channels:4,pageHeight:info.height}}).gif({loop:0,delay:frames.map((_,i)=>i===count-1?650:50),effort:3,colours:128}).toFile(path);
}
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto(`http://127.0.0.1:${port}`);await hook(page);
 await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'bond-opening.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('#battle-board').waitFor();await page.waitForTimeout(350);
 assert.ok(await page.locator('#battle-bonds [data-bond-icon="bondBeauty"]').count());
 assert.equal(await page.locator('.bond-row').count(),await page.locator('.bond-row>.bond-icon').count());
 await page.clock.install({time:new Date('2026-10-28T01:00:00Z')});await page.clock.pauseAt(new Date('2026-10-28T01:01:00Z'));
 await page.locator('[data-action="pause"]').click();await page.clock.runFor(250);
 const opening=await page.evaluate(()=>({tick:actualBattle.tick,items:fx.bonds.items.map(e=>({id:e.id,unit:e.unit,tier:e.tier,kind:e.kind})),clock:fx.clock}));
 assert.equal(opening.tick,0);assert.ok(opening.items.some(e=>e.id==='bondBeauty'&&e.tier===2));
 assert.ok(await page.locator('.bond-flashing').count());await page.screenshot({path:out+'/opening.png'});
 await page.locator('[data-action="pause"]').click();const frozen=await page.evaluate(()=>fx.clock);await page.clock.runFor(400);assert.equal(await page.evaluate(()=>fx.clock),frozen);
 await page.screenshot({path:out+'/opening-paused.png'});await page.locator('[data-action="pause"]').click();await animate(page,out+'/opening.gif',28);
 let proc=null;
 for(let i=0;i<900;i++){
  await page.clock.runFor(75);
  proc=await page.evaluate(()=>{const e=fx.bonds.items.find(e=>e.id==='bondSong'&&e.kind==='proc'&&fx.clock>=e.start+80&&fx.clock<e.end-200);return e?{...e,tick:actualBattle.tick,clock:fx.clock}:null;});
  if(proc)break;
 }
 assert.ok(proc,'real battle should produce a visible Song proc');assert.ok(proc.targets.length>0);await page.screenshot({path:out+'/song-proc.png'});await animate(page,out+'/song-proc.gif',22);
 // Changing speed or inspecting a running battle does not replay the opening.
 await page.evaluate(()=>{fx.update(actualBattle,{paused:true,speed:4,mode:'clear'});fx.draw(performance.now());});
 assert.equal(await page.evaluate(()=>fx.bonds.items.some(e=>e.kind==='opening')),false);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 // Mobile opening and reduced-motion use the actual deployment transition too.
 const mobile=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.addInitScript(s=>{localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},state);
 await mobile.goto(`http://127.0.0.1:${port}/#historical-battle`);await hook(mobile);await mobile.locator('#battle-board').waitFor();
 await mobile.clock.install({time:new Date('2026-10-28T01:00:00Z')});await mobile.clock.pauseAt(new Date('2026-10-28T01:01:00Z'));await mobile.locator('[data-action="pause"]').click();await mobile.clock.runFor(280);
 assert.equal(await mobile.evaluate(()=>fx.reduced),true);assert.ok(await mobile.evaluate(()=>fx.bonds.items.some(e=>e.kind==='opening')));await mobile.screenshot({path:out+'/mobile-opening-reduced.png',fullPage:true});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,opening,proc,pause:true,mobile:true,reducedMotion:true,errors},null,2));console.log('PASS real opening, bond icons, actual Song proc and recipients, pause, mobile and reduced motion');
}finally{await browser?.close();server.kill();}
