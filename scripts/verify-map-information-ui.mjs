import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4217',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(newCampaign(1,'guandu-200')));
 await page.goto('http://127.0.0.1:4217/#strategy');await page.locator('.national-world').waitFor();mkdirSync('outputs/map-information',{recursive:true});
 for(const [width,height] of [[1440,900],[1024,768],[390,844]]){
  await page.setViewportSize({width,height});
  const metrics=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}};const n=document.querySelector('.strategy-notice');return {dock:rect('.map-information'),notice:rect('.strategy-notice'),tools:rect('.national-map-tools'),font:getComputedStyle(n).fontSize,clipped:n.scrollHeight>n.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(metrics.font,'14px');assert.equal(metrics.clipped,false);assert.equal(metrics.overflow,false);assert.ok(metrics.dock.bottom<metrics.notice.y);assert.ok(metrics.notice.bottom<=height);console.log(width,metrics);
  await page.screenshot({path:`outputs/map-information/${width}.png`});
 }
 await page.locator('.national-legend>summary').click();assert.ok(await page.locator('.national-legend>div').isVisible());await page.screenshot({path:'outputs/map-information/mobile-expanded.png'});
 await page.selectOption('#national-city-search','xuchang');await page.locator('.national-world').waitFor();assert.ok(await page.locator('[data-city="xuchang"].selected').count());
 await page.locator('.map-reports>summary').click();assert.ok(await page.locator('.map-reports-body').isVisible());assert.deepEqual(errors,[]);console.log('PASS layout, full notice, legend, city selection, reports, no browser errors');
}finally{await browser?.close();server.kill();}

