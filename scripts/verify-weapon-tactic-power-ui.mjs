import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {currentBattle} from '../tests/helpers/current-battle.mjs';
import {TACTICS_BOOK,statusPower,unitTactics} from '../tactics.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';

const out='outputs/weapon-tactic-power-ui',port=4368;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);const results=[];
 for(const [type,id] of [['ram','ram'],['heavyRam','ram'],['siege','bombard'],['tower','siegeVolley']]){
  const x=currentBattle(id,type);await importSaveFixture(page,x.state);await page.locator('#battle-board').waitFor();
  if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
  await page.locator('.battle-unit[data-unit="'+x.u.id+'"]').click();await page.locator('.battle-brief-tactics').waitFor();
  assert.deepEqual(await page.locator('.battle-brief-tactic > span').allTextContents(),unitTactics(x.u).map(s=>s.name));
  await page.locator('.battle-brief-tactic[data-skill="'+id+'"]').click();
  const body=await page.locator('.modal-backdrop').innerText(),power=Math.round(statusPower(x.u,TACTICS_BOOK[id],x.b));
  assert.match(body,/当前武技威力与谋略威力各50%/);assert.ok(body.includes('合成威力 '+power));
  results.push({type,tactic:TACTICS_BOOK[id].name,power});
 }
 await page.locator('.toast').waitFor({state:'hidden'}).catch(()=>{});await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:844,height:390});assert.ok(await page.locator('.modal-backdrop').isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,results,errors},null,2));
 console.log('PASS all four siege forms show their unique large tactic and actual combined power, desktop/mobile');
}finally{await browser?.close();server.kill();}
