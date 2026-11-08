import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,planBattleCouncilsAI,stepBattle,validateSave} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';

const out='work/battle-reference-20261108',port=4357;
await mkdir(out,{recursive:true});
const state=createScenario('custom-battle',20261108,null,null,{seed:20261108,terrain:'land',
 ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(([id,type])=>({id,type,level:10,troops:4000,retreatAt:null})),
 enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(([id,type])=>({id,type,level:10,troops:4000,retreatAt:null}))});
planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);
while(state.battle.tick<55&&!state.battle.result)stepBattle(state.battle,{aiSides:[]});
validateSave(state);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}`);
 await page.evaluate(async()=>{
  const {BattleArt}=await import('./art-battle.mjs');const update=BattleArt.prototype.update;
  BattleArt.prototype.update=function(...args){window.sprites=this;window.actualBattle=args[0];return update.apply(this,args);};
 });
 await importSaveFixture(page,state);
 await page.getByRole('button',{name:'关闭全部新手指引',exact:true}).click().catch(()=>{});
 await page.waitForFunction(()=>window.sprites?.models?.objects.size>0);
 await page.evaluate(async()=>{await sprites.whenReady();await document.fonts.ready;document.getElementById('toast').classList.remove('show');});
 const artCheck=await page.evaluate(async()=>{
  const {assetCatalog}=await import('./asset-catalog.mjs');
  return {ground:assetCatalog.battlefield.ground,tree:assetCatalog.battlefield.tree,
   texture:!!document.querySelector('.environment-texture'),trees:document.querySelectorAll('image[data-environment-asset="tree"]').length,
   health:[...new Set([...document.querySelectorAll('.map-health-bar>i,.arena-strength em')].map(el=>getComputedStyle(el).backgroundColor))]};
 });
 assert.ok(artCheck.ground&&artCheck.tree&&artCheck.texture&&artCheck.trees>0,JSON.stringify(artCheck));
 assert.deepEqual(artCheck.health,['rgb(195, 75, 60)']);
 const checkPortraits=async minimum=>{
  const ids=await page.locator('.battle-unit').evaluateAll(els=>els.map(el=>el.dataset.unit));
  for(const id of ids){
   const face=page.locator(`[data-unit="${id}"] .map-portrait-row .portrait`),r=await face.boundingBox();
   assert.ok(r.width>=minimum&&r.height>=minimum,JSON.stringify({id,r,minimum}));
   assert.ok(r.y>=(await page.locator('#battle-header').boundingBox()).y+(await page.locator('#battle-header').boundingBox()).height,'face stays below the header');
   await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
   if(await page.locator('#inspect-unit').inputValue()!==id){
    await page.screenshot({path:out+'/portrait-hit-failure.png',style:'#toast{visibility:hidden}'});
    console.log(JSON.stringify(await page.evaluate(({id,r})=>({id,r,viewport:[innerWidth,innerHeight],portraits:[...document.querySelectorAll('[data-unit]')].map(el=>{const p=el.querySelector('.map-portrait-row').getBoundingClientRect(),c=el.querySelector('.unit-map-caption').getBoundingClientRect();return {id:el.dataset.unit,portrait:{x:p.x,y:p.y,w:p.width,h:p.height},caption:{x:c.x,y:c.y,w:c.width,h:c.height}};})}),{id,r})));
   }
   assert.equal(await page.locator('#inspect-unit').inputValue(),id,'each enlarged face opens its own unit');
   await page.keyboard.press('Escape');
  }
  return ids.length;
 };
 const checkBodyTargets=async()=>{
  const targets=await page.evaluate(()=>{
   const units=[...document.querySelectorAll('.battle-unit')],faces=units.map(el=>el.querySelector('.map-portrait-row').getBoundingClientRect());
   const clearOfFaces=p=>faces.every(r=>Math.hypot(p.x-r.x-r.width/2,p.y-r.y-r.height/2)>r.width/2+3);
   const result=[];
   for(const side of [.15,.85])for(const el of units){
    const r=el.getBoundingClientRect(),p={x:r.x+r.width*side,y:r.y+r.height*.55},hit=document.elementFromPoint(p.x,p.y);
    if(clearOfFaces(p)&&hit&&el.contains(hit)&&!hit.closest('.unit-map-caption')){result.push({...p,id:el.dataset.unit,side});break;}
   }
   return result;
  });
  assert.equal(targets.length,2,'both sides of the soldier have a usable click margin');
  for(const p of targets){await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);assert.equal(await page.locator('#inspect-unit').inputValue(),p.id,'a soldier click opens that soldier');await page.keyboard.press('Escape');}
  const empty=await page.evaluate(()=>{
   const board=document.querySelector('#battle-board').getBoundingClientRect();
   for(const x of [.9,.8,.1])for(const y of [.8,.7,.9]){const p={x:board.x+board.width*x,y:board.y+board.height*y},hit=document.elementFromPoint(p.x,p.y);if(hit?.closest('#battle-board')&&!hit.closest('[data-unit]'))return p;}
  });
  assert.ok(empty,'fixture retains empty ground between the fighting and the edge');
  await page.mouse.click(empty.x,empty.y);assert.equal(await page.locator('.battle-unit-inspection').count(),0,'empty field does not select the nearest unit');
  return targets.length;
 };
 const desktopPortraits=await checkPortraits(40);
 const desktopBodyTargets=await checkBodyTargets();
 await page.mouse.move(2,2);
 await page.screenshot({path:`${out}/${process.argv.includes('--before')?'before':'desktop'}.png`,style:'#toast{visibility:hidden}'});
 if(process.argv.includes('--before'))process.exitCode=0;
 else{
  const snapshot=await page.evaluate(()=>JSON.stringify(actualBattle));
  const budget=await page.evaluate(()=>({calls:sprites.models.renderer.info.render.calls,triangles:sprites.models.renderer.info.render.triangles,members:[...sprites.models.objects.values()].filter(o=>o.troopRig).map(o=>o.troopRig.filter(r=>r.member.visible).length)}));
  assert.ok(budget.calls<800&&budget.triangles<1500000,JSON.stringify(budget));
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(150);
  const mobilePortraits=await checkPortraits(36);
  const mobileBodyTargets=await checkBodyTargets();
  await page.mouse.move(2,2);
  await page.screenshot({path:out+'/landscape.png',style:'#toast{visibility:hidden}'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  const mobile=await page.evaluate(()=>({calls:sprites.models.renderer.info.render.calls,triangles:sprites.models.renderer.info.render.triangles,members:[...sprites.models.objects.values()].filter(o=>o.troopRig).map(o=>o.troopRig.filter(r=>r.member.visible).length)}));
  assert.ok(mobile.triangles<budget.triangles,JSON.stringify(mobile));
  assert.equal(await page.evaluate(()=>JSON.stringify(actualBattle)),snapshot);
  await page.setViewportSize({width:1440,height:900});
  await page.waitForTimeout(100);
  const target=await page.evaluate(()=>{
   const [key,obj]=[...sprites.models.objects].find(([id,o])=>id.startsWith('unit-')&&o.troopRig);
   const rect=sprites.board.getBoundingClientRect(),anchors=sprites.models.bodyAnchors(key.slice(5));
   return {id:key.slice(5),x:rect.left+anchors[0].x,y:rect.top+anchors[0].y-anchors[0].size*.35};
  });
  await page.mouse.click(target.x,target.y);
  assert.ok(await page.locator('.battle-unit-inspection').count(),'clicking the formation opens unit details');
  assert.equal(await page.locator('.battle-inspection-health>i').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(195, 75, 60)');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>JSON.stringify(actualBattle)),snapshot);
  await page.locator('[data-action="pause"]').click();
  await page.waitForFunction(()=>sprites.fx?.currentActions().some(a=>a.events.some(e=>e.skill)),{},{timeout:20000});
  await page.screenshot({path:out+'/combat.png'});
  await page.locator('[data-action="pause"]').click();
  const fallback=await browser.newPage({serviceWorkers:'block'});
  await fallback.route('**/assets/battlefield/**',route=>route.fulfill({status:404,body:''}));
  await fallback.goto(`http://127.0.0.1:${port}`);
  const missingArt=await fallback.evaluate(async()=>{
   const {art}=await import('./art-assets.mjs');await art.init();
   const {assetCatalog}=await import('./asset-catalog.mjs'),{battleMapArtwork}=await import('./battle-map-view.mjs');
   const result=battleMapArtwork({mapId:'plain-open'},{art:assetCatalog.battlefield});
   return {assets:assetCatalog.battlefield,textured:result.includes('environment-texture'),cells:(result.match(/data-map-terrain=/g)||[]).length};
  });
  assert.deepEqual(missingArt,{assets:{ground:'',tree:''},textured:false,cells:112});await fallback.close();
  assert.deepEqual(errors,[]);
  await writeFile(out+'/result.json',JSON.stringify({passed:true,budget,mobile,artCheck,missingArt,desktopPortraits,mobilePortraits,desktopBodyTargets,mobileBodyTargets,errors},null,2));
  console.log(JSON.stringify({passed:true,out,budget,mobile}));
 }
}finally{await browser?.close();server.kill();}
