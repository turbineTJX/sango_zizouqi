import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const d=defaultCustomBattle();d.ownTeam=Object.keys(OFFICER_BY_ID).filter(id=>id!=='shao').slice(0,10).map(id=>({id,type:'spear',level:5,troops:3000}));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await mkdir('outputs/bond-display',{recursive:true});
try{
 await page.addInitScript(d=>localStorage.setItem('sango-custom-draft-v46',JSON.stringify(d)),d);
 await page.goto(`http://127.0.0.1:${process.env.SANGO_PORT||4175}/`);await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="custom-setup"]').click();
 assert.match(await page.locator('.custom-team').first().innerText(),/10 \/ 10/);
 await page.locator('[data-custom-option="battleKind"]').selectOption('defense');await page.locator('[data-custom-option="gateHp"]').fill('18000');await page.locator('[data-custom-option="gateHp"]').press('Tab');
 await page.locator('[data-action="launch-custom"]').click();
 assert.equal(await page.locator('.combat-preview th').filter({hasText:/^出阵$/}).count(),0);
 assert.equal(await page.locator('.combat-preview td').filter({hasText:/^(首发|后备|候补)$/}).count(),0);
 assert.match(await page.locator('[data-action="scenario-launch-confirm"]').innerText(),/前往战前会议/);
 await page.locator('[data-action="scenario-launch-confirm"]').click();

 assert.equal(await page.locator('#battle-bonds .bond-panel').count(),2);
 assert.ok(await page.locator('#battle-bonds').isVisible());
 const before=await page.locator('#battle-bonds').innerText();
 await page.locator('.battle-unit.side-0').first().dragTo(page.locator('[data-reserve-bench]'));
 assert.notEqual(await page.locator('#battle-bonds').innerText(),before);
 await page.locator('#battle-bonds [data-action="ability-reference"]').first().click();
 assert.match(await page.locator('body').innerText(),/羁绊说明/);
 await page.keyboard.press('Escape');
 await page.screenshot({path:'outputs/bond-display/desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/bond-display/mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const layout=await page.locator('.battle-layout').boundingBox(),bonds=await page.locator('#battle-bonds').boundingBox();assert.ok(layout.height>=220);assert.ok(bonds.y>=layout.y+layout.height-1);
 await page.locator('[data-action="pause"]').first().click();
 assert.ok(await page.locator('#battle-bonds').isVisible());
 assert.deepEqual(errors,[]);console.log('Bond UI passed: formation, live substitution, effect detail, desktop/mobile, battle visibility.');
}catch(e){await page.screenshot({path:'outputs/bond-display/failure.png'});throw e;}finally{await browser.close();}


