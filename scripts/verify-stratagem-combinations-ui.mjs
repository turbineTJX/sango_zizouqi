import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {STRATAGEMS} from '../stratagems.mjs';
import {COMMAND_RESOURCE,stepBattle,validateSave} from '../engine.mjs';
import {stratagemAiFixture} from '../tests/helpers/stratagem-ai.mjs';

const out='outputs/stratagem-combinations-ui',port=4346,manual=process.argv.includes('--manual');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});await mkdir(out,{recursive:true});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));});
 const read=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame(location.hash==='#historical-battle'?'sango-historical-battle-v1':location.hash==='#battle-lab'?'sango-battle-lab-v1':'sango-sovereign-v2')));
 const load=async state=>{await page.goto('http://127.0.0.1:'+port);await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'combinations.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await page.locator('#battle-board').waitFor();};
 const point=async u=>{
  const board=page.locator('#battle-board'),center=r=>({x:r.x+(u.x+(u.y&1)*.5+.5)/14.5*r.width,y:r.y+(u.y*.75+.5)/6.25*r.height});
  let p=center(await board.boundingBox());const bounds=await page.evaluate(()=>({top:document.querySelector('#stratagem-area-controls').getBoundingClientRect().bottom+24,bottom:innerHeight-24}));
  const desired=Math.max(bounds.top,Math.min(bounds.bottom,p.y));if(p.y!==desired){await page.evaluate(delta=>window.scrollBy(0,delta),p.y-desired);p=center(await board.boundingBox());}await page.mouse.click(p.x,p.y);
 };
 for(const [key,s]of Object.entries(STRATAGEMS).filter(([,s])=>s.combination)){
  const state=stratagemAiFixture(key,0,14337),b=state.battle;while(b.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b,{aiSides:[]});validateSave(state);
  await page.setViewportSize({width:1440,height:1000});await load(state);const before=await read();
  await page.locator('[data-action="choose-stratagem"]').click();assert.ok((await page.locator('[data-command="'+key+'"]').innerText()).includes(s.name));await page.locator('[data-command="'+key+'"]').click();
  if(s.scope.anchor!=='provider')await point(b.sides[0].units.find(u=>u.status==='active'&&(!s.combination.intentCost||u.intent>=s.combination.intentCost)));
  const hits=await page.locator('#stratagem-area-overlay .area-hit').count();assert.ok(hits>0);assert.equal(await page.locator('.battle-unit.stratagem-affected').count(),hits);assert.ok(await page.locator('[data-area-action="confirm"]').isEnabled());
  await page.screenshot({path:out+'/'+key+'-desktop.png'});await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('#stratagem-area-controls').screenshot({path:out+'/'+key+'-mobile.png'});
  await page.keyboard.press('Escape');assert.deepEqual((await read()).battle,before.battle,'cancelling must preserve resources and simulation');
  await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="'+key+'"]').click();
  if(s.scope.anchor!=='provider')await point(b.sides[0].units.find(u=>u.status==='active'&&(!s.combination.intentCost||u.intent>=s.combination.intentCost)));
  await page.locator('[data-area-action="confirm"]').click();const saved=await read();validateSave(saved);const e=saved.battle.sides[0].stratagemEvents.at(-1);
  assert.equal(saved.battle.lastCommand.key,key);assert.equal(saved.battle.commandProgress,0);assert.equal(saved.battle.tick,b.tick);assert.equal(e.units.length,hits);
  if(s.combination.intentCost)assert.ok(e.units.every(u=>u.cost===20&&u.intentBefore-u.intentAfter===20));
  if(s.scope.anchor==='provider')assert.ok(e.units.every(u=>u.id!==e.source.id));
  await page.reload();assert.deepEqual((await read()).battle,saved.battle);results.push({key,hits,desktop:true,mobile:true,cancel:true,cast:true,reload:true});
 }
 if(manual){
  const folder='docs/images/player-actions',manifestPath=folder+'/captures.json',manifest=JSON.parse(await readFile(manifestPath,'utf8')),hash=createHash('sha256');
  for(const f of ['engine.mjs','combat-rules.mjs','stratagem-combinations.mjs','stratagem-area.mjs','stratagem-area-view.mjs','stratagems.mjs','data/design/stratagems.mjs'])hash.update(f).update(await readFile(f));const sourceHash=hash.digest('hex');
  for(const [id,key,title]of [['stratagem-combination','morale-bulwark','励军固阵选区、每队实际战意消耗与保护效果'],['stratagem-provider-cost','selfless-guard','舍己护军固定施放者范围与本队疲弱代价']]){
   await sharp(out+'/'+key+'-desktop.png').webp({quality:86}).toFile(folder+'/'+id+'.webp');manifest[id]={title,file:'images/player-actions/'+id+'.webp',group:'stratagemCombinations',sample:'正式规则、自然充能的组合军略机制演示',viewport:{width:1440,height:1000},capturedAt:new Date().toISOString(),sourceHash};
  }
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({verified:results.length,desktop:true,mobile:true,cancel:true,cast:true,reload:true,errors}));
}finally{await browser?.close();server.kill();}
