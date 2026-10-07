import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
const s=createScenario('custom-battle',14,20,null,{seed:14,terrain:'land',ownTeam:[entry('person-668','crossbow')],enemyTeam:[entry('shao','spear')]});
lockDeployment(s.battle);for(let i=0;i<35&&!s.battle.result;i++)stepBattle(s.battle);validateSave(structuredClone(s));
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4206'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),s);await page.goto('http://127.0.0.1:4206/#historical-battle');await page.locator('#battle-board').waitFor();
 await page.locator('.arena-dock [data-action="battle-panel"][data-panel="events"]').first().click();await page.locator('.compact-journal-row').first().waitFor();
 assert.equal(await page.locator('.compact-journal-row').count(),s.battle.logs.length);assert.ok(await page.locator('.report-person').count()>0);assert.ok(await page.locator('.report-value').count()>0);
 mkdirSync('outputs/report-ledger',{recursive:true});await page.screenshot({path:'outputs/report-ledger/battle-desktop.png',fullPage:true});
 await page.locator('[data-action="battle-log-filter"][data-kind="attack"]').click();assert.equal(await page.locator('.compact-journal-row').count(),s.battle.logs.filter(l=>l.kind==='attack').length);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/report-ledger/battle-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS real battle records, semantic highlights, filtering, desktop/mobile, no errors');
}finally{await browser?.close();server.kill();}
