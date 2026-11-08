import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {currentBattle} from '../tests/helpers/current-battle.mjs';
import {TACTICS_BOOK,statusPower,unitTactics} from '../tactics.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const out='outputs/three-power-tactics-ui',port=4374;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);
 for(const [id,type] of [['thrust','spear'],['doubt','spear'],['relief','spear'],['fortify','halberd'],['regroup','cavalry'],['stockpile','crossbow'],['regrowth','archer'],['refit','ship']]){
  const x=currentBattle(id,type),s=TACTICS_BOOK[id];await importSaveFixture(page,x.state);await page.locator('#battle-board').waitFor();
  if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
  await page.locator('.battle-unit[data-unit="'+x.u.id+'"]').click();await page.locator('.battle-brief-tactics').waitFor();
  const kit=unitTactics(x.u);assert.ok(kit.length<=4);assert.deepEqual(await page.locator('.battle-brief-tactic > span').allTextContents(),kit.map(s=>s.name));
  if(s.category==='politics')assert.ok(kit.some(s=>s.category==='politics'&&s.learningTier==='low'),'real political holder also gets a support small action');
  if(id==='relief'){await page.locator('.toast').waitFor({state:'hidden'}).catch(()=>{});await page.screenshot({path:out+'/personal-kit-desktop.png',fullPage:true});}
  await page.locator('.battle-brief-tactic[data-skill="'+id+'"]').click();
  const text=await page.locator('.modal-backdrop').innerText(),power=Math.round(statusPower(x.u,s,x.b));assert.ok(text.includes(s.power.name+' '+power));
  if(s.category==='politics')assert.ok(text.includes('营务威力'));
  results.push({officer:x.u.name,type,tactic:s.name,category:s.power.name,power,kit:kit.map(s=>s.name)});
  if(id==='relief'){
   await page.screenshot({path:out+'/relief-desktop.png',fullPage:true});await page.setViewportSize({width:844,height:390});
   assert.ok(await page.locator('.modal-backdrop').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await page.screenshot({path:out+'/relief-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,results,errors},null,2));console.log('PASS three real power channels, support small and large kits, current power details, desktop/mobile');
}finally{await browser?.close();server.kill();}
