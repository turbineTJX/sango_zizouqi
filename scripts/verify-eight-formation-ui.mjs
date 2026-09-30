import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,COMMAND_RESOURCE} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4199,server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',resolve);server.on('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const entry=id=>({id,type:'spear',troops:3000,level:5});const state=createScenario('custom-battle',7211,20,null,{seed:7211,terrain:'land',ownTeam:[entry('person-290'),entry('cao'),entry('yu')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:'person-290',advisor:'yu'}});lockDeployment(state.battle);state.battle.commandProgress=COMMAND_RESOURCE.capacity;
 await page.goto(`http://127.0.0.1:${port}`);await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'eight.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await page.locator('[data-action="choose-stratagem"]').click();assert.match(await page.locator('[data-command="zhuge-eight"]').innerText(),/军纪/);await page.locator('[data-command="zhuge-eight"]').click();
 const choose=async()=>{const b=await page.locator('#battle-board').boundingBox();await page.mouse.click(b.x+(6+.5+.5)/14.5*b.width,b.y+(3*.75+.5)/6.25*b.height);};
 await choose();assert.equal(await page.locator('#stratagem-area-overlay .area-hit').count(),0);assert.equal(await page.locator('[data-area-action="confirm"]').isEnabled(),true);
 await page.locator('[data-area-action="cancel"]').click();assert.equal(await page.locator('.stratagem-zone').count(),0);
 await page.locator('[data-action="choose-stratagem"]').click();assert.equal(await page.locator('[data-command="zhuge-eight"]').isEnabled(),true);await page.locator('[data-command="zhuge-eight"]').click();await choose();await page.locator('[data-area-action="confirm"]').click();
 assert.equal(await page.locator('.stratagem-zone').count(),1);assert.match(await page.locator('.stratagem-zone text').textContent(),/余18回合/);
 await page.reload();assert.equal(await page.locator('.stratagem-zone').count(),1);await page.locator('[data-action="choose-stratagem"]').click();assert.equal(await page.locator('[data-command="zhuge-eight"]').isDisabled(),true);await page.keyboard.press('Escape');
 await mkdir('outputs/eight-ui',{recursive:true});await page.screenshot({path:'outputs/eight-ui/desktop.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:'outputs/eight-ui/mobile.png'});
 assert.deepEqual(errors,[]);console.log('Eight formation UI passed: description, empty placement, cancel, persistent zone, reload, once per battle, desktop and mobile');
}finally{await browser?.close();server.kill();}
