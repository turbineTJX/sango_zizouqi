import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {fieldCampaign,approachDestination} from '../tests/helpers/field-campaign.mjs';
import {beginExecution,orderCampaignArmy,advanceCampaignDay,activeBattles,chooseEncounter,takeOverBattle,serializeCampaign,validateCampaign} from '../tests/helpers/auto-domestic-campaign.mjs';

// Mechanism fixture: two legal encounters, with both columns near their targets.
const state=fieldCampaign();
for(const id of ['guandu','baima'])state.cities.find(c=>c.id===id).kind='gate';
orderCampaignArmy(state,'a1','guandu');orderCampaignArmy(state,'a3','baima');beginExecution(state);
for(const army of state.armies.filter(a=>a.route.length))approachDestination(state,army,2);
for(let i=0;i<10&&activeBattles(state).length<2;i++){
 advanceCampaignDay(state);for(const battle of activeBattles(state).filter(b=>b.awaiting))chooseEncounter(state,battle.id,false);
}
const [first,second]=activeBattles(state);assert.ok(second);assert.equal(takeOverBattle(state,first.id),null);
const save=serializeCampaign(state);validateCampaign(JSON.parse(save));
const port=4497,origin=`http://127.0.0.1:${port}`,out='work/battle-navigation';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
let browser,page;const errors=[],checks=[];
const stored=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
const ready=()=>page.locator('dialog.scene-loading[open]').waitFor({state:'detached'});
const target=()=>page.locator('#campaign-view-target');
const confirm=()=>page.locator('[data-action="campaign-navigation-confirm"]').click();
const current=()=>page.locator('#battle-board').getAttribute('data-battle-id');
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',save);
 },save);
 await page.route('**/art-models.mjs',async route=>{await new Promise(r=>setTimeout(r,700));await route.continue();});
 await page.goto(origin+'/#strategy');await page.locator('dialog.scene-loading[open]').waitFor();
 await page.screenshot({animations:'disabled',path:out+'/loading-desktop.png'});await ready();await target().waitFor();
 assert.equal(await current(),first.id);assert.equal(await target().locator('option').count(),3);
 await page.evaluate(async()=>{
  const {BattleArt}=await import('/art-battle.mjs'),update=BattleArt.prototype.update;
  window.navigationBattles=new Map();
  BattleArt.prototype.update=function(b,...args){navigationBattles.set(b.id,b);return update.call(this,b,...args);};
 });
 const before=await stored();
 for(const cancel of ['button','escape','close']){
  await target().selectOption(second.id);await page.getByRole('heading',{name:'确认切换'}).waitFor();
  assert.equal(await current(),first.id);assert.equal(await target().inputValue(),first.id);
  assert.deepEqual(await stored(),before);
  if(cancel==='button')await page.getByRole('button',{name:'取消',exact:true}).click();
  if(cancel==='escape')await page.keyboard.press('Escape');
  if(cancel==='close')await page.getByRole('button',{name:'关闭弹窗'}).click();
  await page.getByRole('heading',{name:'确认切换'}).waitFor({state:'detached'});
  assert.equal(await current(),first.id);assert.deepEqual(await stored(),before);
 }
 checks.push('取消、Esc、关闭确认框均保留原战场与存档');
 // Delay actual model work so the progress dialog can be inspected on a warm switch.
 await page.evaluate(async()=>{
  const {ModelLayer}=await import('/art-models.mjs'),load=ModelLayer.prototype.load;
  ModelLayer.prototype.load=async function(key){await new Promise(r=>setTimeout(r,450));return load.call(this,key);};
 });
 await target().selectOption(second.id);
 await page.screenshot({animations:'disabled',path:out+'/confirm-desktop.png'});await confirm();
 await page.locator('dialog.scene-loading[open]').waitFor();await page.screenshot({animations:'disabled',path:out+'/switch-loading.png'});
 const switched=await stored();assert.equal(switched.campaign.focusId,second.id);
 assert.equal(switched.campaign.battles.find(b=>b.id===first.id).control,'auto');
 assert.deepEqual(switched.campaign.battles.filter(b=>!b.settled&&b.control==='manual').map(b=>b.id),[second.id]);
 for(const original of before.campaign.battles)assert.deepEqual(switched.campaign.battles.find(b=>b.id===original.id).battle,original.battle);
 assert.equal(switched.campaign.day,before.campaign.day);await ready();assert.equal(await current(),second.id);
 await page.getByRole('button',{name:'暂停',exact:true}).waitFor();
 await page.waitForFunction(({ids,ticks})=>ids.every((id,i)=>window.navigationBattles.get(id)?.tick>ticks[i]),{ids:[first.id,second.id],ticks:[first.battle.tick,second.battle.tick]});
 await page.getByRole('button',{name:'暂停',exact:true}).click();
 await page.waitForFunction(async({ids,ticks})=>{const s=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));return ids.every((id,i)=>s.campaign.battles.find(b=>b.id===id).battle.tick>ticks[i]);},{ids:[first.id,second.id],ticks:[first.battle.tick,second.battle.tick]});
 checks.push('仅一场玩家指挥，加载后两场自动同步推进');
 const pausedTicks=()=>page.evaluate(ids=>ids.map(id=>window.navigationBattles.get(id).tick),[first.id,second.id]);
 const paused=await pausedTicks();await page.waitForTimeout(1100);assert.deepEqual(await pausedTicks(),paused);
 await page.getByRole('button',{name:'继续战斗',exact:true}).click();
 await page.waitForFunction(({ids,ticks})=>ids.every((id,i)=>window.navigationBattles.get(id)?.tick>ticks[i]),{ids:[first.id,second.id],ticks:paused});
 await page.locator('.battle-unit.side-0').first().dispatchEvent('click');await page.locator('#overlay-root [role="dialog"]').waitFor();
 const inspecting=await pausedTicks();await page.waitForTimeout(1100);assert.deepEqual(await pausedTicks(),inspecting);
 await page.getByRole('button',{name:'关闭弹窗'}).click();
 checks.push('主动暂停及查看部队详情时，两场同步暂停');
 await page.screenshot({animations:'disabled',path:out+'/battle-desktop.png'});
 await page.setViewportSize({width:844,height:390});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const bounds=await target().boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=844);
 await page.screenshot({animations:'disabled',path:out+'/battle-mobile.png'});
 await target().selectOption('map');await page.screenshot({animations:'disabled',path:out+'/confirm-mobile.png'});await confirm();await ready();
 await page.locator('.strategy-map-first').waitFor();assert.equal(await page.locator('#battle-board').count(),0);
 const onMap=await stored();assert.equal(onMap.campaign.focusId,null);assert.equal(onMap.battle,null);
 assert.equal(onMap.campaign.battles.filter(b=>!b.settled&&b.control==='manual').length,0);
 await page.waitForFunction(async before=>{const s=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));return s.campaign.day>before.campaign.day&&before.campaign.battles.every(b=>s.campaign.battles.find(r=>r.id===b.id).battle.tick>b.battle.tick);},onMap);
 checks.push('返回大地图自动继续，所有战场由AI在后台推进');
 await page.locator('[data-action="campaign-run"]').first().click();
 await page.waitForFunction(async day=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')).campaign.day>day,onMap.campaign.day);
 const pausedMap=await stored();await page.waitForTimeout(3400);assert.deepEqual(await stored(),pausedMap);
 assert.ok(await page.locator('.strategy-map-first.map-paused').count());checks.push('大地图主动暂停时，全局日期和所有战场同步停止');
 const marker=page.locator(`[data-action="campaign-focus"][data-battle="${first.id}"]`).first();await marker.click();
 await page.getByRole('heading',{name:'确认切换'}).waitFor();assert.equal(await page.locator('#battle-board').count(),0);
 await confirm();await ready();assert.equal(await current(),first.id);await page.getByRole('button',{name:'暂停',exact:true}).click();checks.push('手机横屏、大地图往返及地图入口确认');
 await page.reload();await ready();await target().waitFor();assert.equal(await current(),first.id);checks.push('读档恢复当前战场');
 // A graphics failure uses the existing sprite fallback and still releases loading.
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).startsWith('webgl')?null:get.call(this,kind,...args);};});
 await page.reload();await ready();await target().waitFor();assert.equal(await current(),first.id);
 checks.push('三维初始化失败仍能完成加载并操作');assert.deepEqual(errors,[]);
 if(process.argv.includes('--capture')){
  const manifestPath='docs/images/player-actions/captures.json',manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const hash=createHash('sha256');for(const file of ['app.js','strategic-view.mjs','scene-loading.mjs','art-battle.mjs','art-models.mjs','battle-presentation.css','ui-tokens.css','ui-theme.css'])hash.update(file).update(await readFile(file));
  const sourceHash=hash.digest('hex');
  for(const [id,name,title]of [['battle-navigation','battle-mobile','战斗顶部战场与大地图切换'],['battle-navigation-confirm','confirm-mobile','切换前确认目标与交还委托'],['battle-navigation-loading','switch-loading','等待实际部队画面加载']]){
   const file=`images/player-actions/${id}.webp`;await sharp(`${out}/${name}.png`).webp({quality:86}).toFile('docs/'+file);
   manifest[id]={title,file,group:'navigation',sample:'双战场机制演示，军团按测试夹具接近实际目标；延迟部队准备以实拍加载条，非自然局性能证据',viewport:name.includes('mobile')?{width:844,height:390}:{width:1440,height:900},capturedAt:new Date().toISOString(),sourceHash};
  }
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 }
 await writeFile(out+'/result.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS '+checks.join('；'));
}catch(error){if(page&&!page.isClosed())await page.screenshot({animations:'disabled',path:out+'/failure.png',fullPage:true});throw error;}
finally{await browser?.close();server.kill();}
