import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/bond-player-advantage/ui';
const cases=JSON.parse(await readFile(process.argv[2]||'outputs/bond-player-advantage/after-bonds/bonds-cases.json','utf8')).cases;
const expected={bondValor:['50%','65%','免疫所有低战意'],bondWisdom:['50%','40%','6次'],bondBeauty:['24战意','70%','3回合'],bondPeach:['35%','30%','16回合','5回合'],bondReserve:['60战意','10回合','30%护盾'],bondLastStand:['60%','80%','40%']};
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4217',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Server exited '+code)));});
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],rows=[];
 for(const [id,words] of Object.entries(expected)){
  const spec=cases.find(c=>c.id===id);assert.ok(spec,id);const state=generateBattle(spec.draft);assert.equal(lockDeployment(state.battle),null);validateSave(state);
  const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(s=>{localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},state);
  await page.goto('http://127.0.0.1:4217/#historical-battle');await page.locator('#battle-bonds [data-id="'+id+'"]').first().click();
  const text=await page.locator('.modal').innerText();for(const word of words)assert.ok(text.includes(word),id+' missing '+word);assert.doesNotMatch(text,/NaN|undefined/);
  await page.screenshot({path:out+'/'+id+'-desktop.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/'+id+'-mobile.png',animations:'disabled'});rows.push({id,words,desktop:true,mobile:true});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({rows,errors},null,2));console.log('PASS six advanced bond details at desktop and mobile sizes');
}finally{await browser?.close();server.kill();}
