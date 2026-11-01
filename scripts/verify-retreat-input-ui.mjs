import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
const out='outputs/retreat-input-ui',port='4389';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server exit '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(state=>{
  localStorage.setItem('sango-historical-battle-v1',JSON.stringify(state));
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));
 },generateBattle(defaultCustomBattle()));
 await page.goto(`http://127.0.0.1:${port}/#historical-battle`);
 await page.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready');
 await page.getByRole('button',{name:'军议',exact:true}).click();
 await page.locator('.retreat-council > summary').click();
 const batch=page.locator('[data-retreat-batch]'),all=page.locator('[data-retreat-all]');
 await batch.fill('1200');await all.check();assert.equal(await batch.inputValue(),'1200');
 await all.uncheck();assert.equal(await batch.inputValue(),'1200');await all.check();
 await page.locator('[data-action="retreat-batch-apply"]').click();
 assert.ok((await page.locator('[data-unit-retreat]').evaluateAll(els=>els.map(el=>el.value))).every(v=>v==='1200'));
 await batch.fill('');await all.uncheck();await all.check();assert.equal(await batch.inputValue(),'');
 await page.locator('[data-action="retreat-batch-apply"]').click();
 assert.ok((await page.locator('[data-unit-retreat]').evaluateAll(els=>els.map(el=>el.value))).every(v=>v===''));
 await page.screenshot({path:`${out}/mobile.png`});assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks:['typed threshold survives selection and deselection','apply updates all selected units','explicit empty input disables automatic retreat'],errors},null,2));
 console.log('PASS retreat threshold survives selection; apply and explicit clearing remain correct');
} catch(error){await page?.screenshot({path:`${out}/failure.png`});throw error;}finally{await browser?.close();server.kill();}
