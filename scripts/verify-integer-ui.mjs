import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';

const draft=defaultCustomBattle();
draft.ownTeam=['cao','jia','liao','dun','chu','yu'].map(id=>({id,type:'spear',troops:3000,level:5}));
draft.enemyTeam=['shao','yan','wen','he','ju','tian'].map(id=>({id,type:'spear',troops:3000,level:5}));
const state=generateBattle(draft);assert.equal(lockDeployment(state.battle),null);
const unit=state.battle.sides[0].units[0];
setStatus(state.battle,unit,'slow',9,{potency:1.15});
setStatus(state.battle,unit,'valor',9,{potency:1.15});
validateSave(state);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4404'},stdio:'pipe',windowsHide:true});
const out='outputs/integer-ui';await mkdir(out,{recursive:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
 for(const [name,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:844,height:390}]]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.addInitScript(raw=>{
   localStorage.setItem('sango-historical-battle-v1',raw);
   localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
   localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));
  },JSON.stringify(state));
  await page.goto('http://127.0.0.1:4404/#historical-battle');
  await page.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready');
  await page.locator('[data-unit="cao"] .map-portrait-row').click();
  await page.locator('.battle-inspection-more>summary').click();
  await page.locator('.attribute-card').first().waitFor({state:'visible'});
  const text=await page.locator('.modal-body').innerText();
  assert.doesNotMatch(text,/\d+\.\d+/,name+' exposes a decimal');
  assert.match(text,/移速[\s\S]*43%/);assert.match(text,/攻速[\s\S]*%/);
  await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});
  await page.locator('.attribute-grid').scrollIntoViewIfNeeded();
  await page.locator('.attribute-card').first().locator('summary').click();
  await page.screenshot({path:`${out}/${name}-attributes.png`,animations:'disabled'});
  const overflow=await page.locator('.modal').evaluate(el=>el.scrollWidth>el.clientWidth+2);
  assert.equal(overflow,false,name+' integer figures overflow');
  results.push({name,decimalFigures:false,horizontalOverflow:overflow});await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,results},null,2)+'\n');
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser?.close();server.kill();}
