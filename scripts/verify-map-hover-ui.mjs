import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from '../tests/helpers/field-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(217,'guandu-200'),army=fieldFromCity(s,'xuchang');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4211',SANGO_ART:process.env.SANGO_ART||'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(s));
 await page.goto('http://127.0.0.1:4211/#strategy');await page.locator('.national-world').waitFor();
 await page.locator('#national-city-search').selectOption('xuchang');await page.locator('.close-button').click();await page.locator('[data-map-view="settlements"]').click();
 const city=page.locator('.national-world [data-city="xuchang"]'),troop=page.locator(`.national-world [data-campaign-army="${army.id}"]`),card=page.getByRole('tooltip');
 await city.locator('.map-city-banner').hover();await card.waitFor();assert.match(await card.innerText(),/许昌/);assert.match(await card.innerText(),/任职[\s\S]*空闲/);assert.doesNotMatch(await card.innerText(),/点击|负责人|空闲武将/);assert.equal(await city.getAttribute('aria-describedby'),'map-object-tooltip');
 mkdirSync('outputs/map-hover',{recursive:true});await page.screenshot({path:'outputs/map-hover/city.png',fullPage:true});
 await troop.locator('[data-map-army-card]').hover();assert.equal(await card.count(),1);assert.match(await card.innerText(),/主将[\s\S]*兵粮[\s\S]*士兵[\s\S]*士气/);assert.doesNotMatch(await card.innerText(),/点击|现役兵力|携粮/);assert.equal(await card.locator('.unit-radar').count(),0);assert.equal(await city.getAttribute('aria-describedby'),null);
 await page.screenshot({path:'outputs/map-hover/army.png',fullPage:true});
 await troop.locator('[data-map-army-card]').click();assert.equal(await card.count(),0);await page.locator('[data-action="close"]').click();
 await city.focus();await card.waitFor();await page.keyboard.press('Escape');assert.equal(await card.count(),0);
 await city.locator('.map-city-banner').hover();await card.waitFor();await page.mouse.move(1438,990);assert.equal(await card.count(),0);
 await city.locator('.map-city-banner').hover();await card.waitFor();await page.mouse.wheel(0,100);assert.equal(await card.count(),0);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-map-view="settlements"]').click();await city.focus();await card.waitFor();const bounds=await card.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=390&&bounds.y+bounds.height<=844);
 await page.screenshot({path:'outputs/map-hover/narrow.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS city/army hover, keyboard, pointer leave, click, zoom dismissal and narrow viewport bounds');
}finally{await browser?.close();server.kill();}

