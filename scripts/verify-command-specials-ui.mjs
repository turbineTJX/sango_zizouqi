import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,COMMAND_RESOURCE} from '../engine.mjs';
import {selectStratagemSource,stratagemEffectText} from '../stratagems.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4197,server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',resolve);server.on('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 const entry=id=>({id,type:'spear',troops:5000,level:10});const state=createScenario('custom-battle',7311,20,null,{seed:7311,terrain:'land',ownTeam:['cao','person-366','yu','liao'].map(entry),enemyTeam:['shao','wen','yan','tian'].map(entry),ownTeamRoles:{leader:'cao',advisor:'person-366'}});lockDeployment(state.battle);
 while(!state.battle.result&&state.battle.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(state.battle);assert.equal(state.battle.result,null);
 const load=async()=>{await page.goto(`http://127.0.0.1:${port}`);await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'commands.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});};
 await load();await page.locator('[data-action="choose-stratagem"]').click();assert.match(await page.locator('[data-command="cao-wuchao"]').innerText(),/号令如山.*魔免/s);assert.ok((await page.locator('[data-command="swift"]').innerText()).includes(stratagemEffectText(selectStratagemSource(state.battle.sides[0].commanders,'swift'))));await page.locator('[data-command="swift"]').click();
 const choose=async u=>{const r=await page.locator('#battle-board').boundingBox();await page.mouse.click(r.x+(u.x+(u.y&1)*.5+.5)/14.5*r.width,r.y+(u.y*.75+.5)/6.25*r.height);};
 await choose({x:0,y:0});assert.ok(await page.locator('[data-area-action="confirm"]').isDisabled());
 const target=state.battle.sides[0].units.find(u=>u.status==='active');await choose(target);
 const count=await page.locator('.battle-unit.stratagem-affected').count();assert.ok(count>0);assert.equal(await page.locator('.unit-nameplate.stratagem-affected').count(),count);
 await page.keyboard.press('Escape');assert.equal(await page.locator('.stratagem-affected').count(),0);
 await page.locator('[data-action="choose-stratagem"]').click();assert.ok(await page.locator('[data-command="swift"]').isEnabled());await page.locator('[data-command="swift"]').click();await choose(target);
 await mkdir('outputs/command-special-ui',{recursive:true});await page.screenshot({path:'outputs/command-special-ui/group-target.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('#stratagem-area-controls').screenshot({path:'outputs/command-special-ui/mobile-controls.png'});
 await page.locator('[data-area-action="confirm"]').click();await page.reload();await page.locator(`[data-inspect="${target.id}"]`).first().click();assert.match(await page.locator('.modal').innerText(),/神速/);await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1100});await load();await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="cao-wuchao"]').click();await page.reload();await page.locator(`[data-inspect="${target.id}"]`).first().click();assert.match(await page.locator('.modal').innerText(),/魔免/);await page.screenshot({path:'outputs/command-special-ui/protection.png'});
 assert.deepEqual(errors,[]);console.log('Command UI passed: single target, highlight, empty target, cancellation, mobile, effects and reload');
}finally{await browser?.close();server.kill();}
