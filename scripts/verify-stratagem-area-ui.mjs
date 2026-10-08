import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,COMMAND_RESOURCE} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4198,server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',resolve);server.on('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const entry=id=>({id,type:'spear',troops:3000,level:5});const s=createScenario('custom-battle',4511,20,null,{seed:4511,terrain:'land',ownTeam:[entry('person-246'),entry('person-668')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:'person-246',advisor:'person-668'}});lockDeployment(s.battle);s.battle.commandProgress=COMMAND_RESOURCE.capacity;
 await page.goto(`http://127.0.0.1:${port}`);await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name:'area.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
 await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="zhou-redcliffs"]').click();assert.equal(await page.locator('#stratagem-area-controls').isVisible(),true);
 const b=await page.locator('#battle-board').boundingBox(),u=s.battle.sides[1].units.find(u=>u.status==='active');
 const x=b.x+(u.x+(u.y&1)*.5+.5)/14.5*b.width,y=b.y+(u.y*.75+.5)/6.25*b.height;
 await page.mouse.click(x,y);assert.equal(await page.locator('#stratagem-area-overlay rect').count(),1);const hits=await page.locator('#stratagem-area-overlay .area-hit').count();assert.ok(hits>0);assert.equal(await page.locator('.battle-unit.stratagem-affected').count(),hits);assert.equal(await page.locator('.unit-nameplate.stratagem-affected').count(),hits);
 await page.locator('[data-area-action="rotate"]').click();assert.equal(await page.locator('#stratagem-area-overlay rect').getAttribute('width'),'3');
 await mkdir('outputs/area-ui',{recursive:true});await page.screenshot({path:'outputs/area-ui/rectangle.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.locator('#stratagem-area-controls').screenshot({path:'outputs/area-ui/mobile-selection.png'});await page.setViewportSize({width:1440,height:1100});
 await page.locator('[data-area-action="cancel"]').click();assert.equal(await page.locator('.stratagem-affected').count(),0);await page.locator('[data-action="choose-stratagem"]').click();assert.equal(await page.locator('[data-command="zhou-redcliffs"]').isEnabled(),true);
 await page.locator('[data-command="heal"]').click();await page.mouse.click(x,y);assert.equal(await page.locator('#stratagem-area-overlay circle').count(),1);assert.equal(await page.locator('[data-area-action="confirm"]').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('.stratagem-affected').count(),0);
 await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="zhou-redcliffs"]').click();await page.mouse.click(x,y);await page.locator('[data-area-action="confirm"]').click();assert.equal(await page.locator('#stratagem-area-controls').isHidden(),true);
 await page.locator('[data-action="choose-stratagem"]').click();assert.equal(await page.locator('[data-command="zhou-redcliffs"]').isDisabled(),true);await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:'outputs/area-ui/mobile.png'});assert.deepEqual(errors,[]);console.log('Area UI: preview, rotate, cancel, circle, confirm, resources, mobile and no JS errors passed');
}finally{await browser?.close();server.kill();}
