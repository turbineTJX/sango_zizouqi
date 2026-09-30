import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment} from '../engine.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const u=(id,type)=>({id,type,level:10,troops:3000});
const state=createScenario('custom-battle',77,20,null,{seed:77,terrain:'land',ownTeam:[u('cao','cavalry'),u('person-246','spear'),u('person-603','spear'),u('person-70','spear'),u('person-119','spear'),u('person-126','spear')],enemyTeam:[u('shao','spear')]});lockDeployment(state.battle);
try{
 await page.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),state);
 await page.goto((process.env.SANGO_URL||'http://127.0.0.1:4189/')+'#historical-battle');
 await page.locator('#battle-bonds').waitFor();
 assert.match(await page.locator('#battle-bonds').innerText(),/我军羁绊/);
 await mkdir('outputs/bonds-ui',{recursive:true});await page.screenshot({path:'outputs/bonds-ui/desktop.png'});
 await page.locator('#battle-bonds [data-id="bondCommand"]').first().click();
 assert.match(await page.locator('.modal').innerText(),/1／2／3/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/bonds-ui/mobile.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);await writeFile('outputs/bonds-ui/result.json',JSON.stringify({errors,desktop:true,mobile:true,details:true},null,2));
}catch(e){console.error({errors,body:(await page.locator('body').innerText()).slice(0,1800)});throw e;}finally{await browser.close();}



