import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {scoutCandidates,scoutTargets} from '../scouting.mjs';
import {chooseCommandTarget} from './map-target-ui-helpers.mjs';

const out='outputs/player-interaction-ui',port='4368',checks=[],errors=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
 page.on('pageerror',e=>errors.push(e.message));
 const initial=newCampaign(203,'guandu-200');
 await page.addInitScript(save=>{
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  if(!sessionStorage.getItem('interaction-seeded')){localStorage.setItem('sango-sovereign-v2',save);sessionStorage.setItem('interaction-seeded','1');}
 },serializeCampaign(initial));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 if(await page.getByRole('heading',{name:'战略奏报',exact:true}).isVisible())await page.locator('.modal-header [data-action="close"]').click();
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const original=await saved(),action=id=>page.locator(`[data-action="${id}"]`);
 const cityCommand=async(city,group,task)=>{
  if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search summary').click();
  await page.locator('#national-city-search').selectOption(city);
  await page.locator(`[data-action="map-city-commands"][data-group="${group}"]`).click();
  await page.locator(`.city-command-grid [data-task="${task}"]`).click();
 };
 const layout=async(name,width,height)=>{
  await page.setViewportSize({width,height});
  await page.waitForTimeout(150);
  const geometry=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   return {map:rect('.command-map'),aside:rect('.command-target-layout>aside'),footer:rect('.map-command-footer'),pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight};
  });
  assert.ok(geometry.map.width>=250&&geometry.map.height>=180,JSON.stringify(geometry));
  assert.ok(geometry.aside.x>=geometry.map.right&&geometry.aside.bottom<=geometry.footer.y+1,JSON.stringify(geometry));
  assert.ok(geometry.footer.bottom<=height+1&&geometry.pageHeight<=height+1&&geometry.pageWidth<=width+1,JSON.stringify(geometry));
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
 };

 await cityCommand('xuchang','military','expedition');
 assert.equal(await page.locator('.expedition-selection').count(),1);assert.match(await page.locator('.expedition-selection thead').first().innerText(),/统率[\s\S]*战法[\s\S]*羁绊/);
 const unit=page.locator('[data-command-army-unit]:not(:disabled)').first(),unitId=await unit.getAttribute('data-command-army-unit');
 await unit.check();assert.ok(await unit.evaluate(el=>el===document.activeElement),'selecting a unit must retain keyboard focus');
 await page.keyboard.press('Space');assert.equal(await unit.isChecked(),false);await page.keyboard.press('Space');assert.equal(await unit.isChecked(),true);
 assert.match(await page.locator('#command-readiness').innerText(),/已选 1/);
 await page.screenshot({path:`${out}/selection-desktop.png`});
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${out}/selection-landscape.png`});
 await action('campaign-unit-list').click();await action('campaign-command-next').click();assert.ok(await page.locator(`[data-command-army-unit="${unitId}"]`).isChecked(),'optional formation management retains expedition selection');
 await page.setViewportSize({width:1440,height:900});
 await action('campaign-command-next').click();await action('campaign-command-next').click();
 assert.ok(await action('campaign-command-next').isDisabled());assert.match(await page.locator('#command-readiness').innerText(),/选择终点/);
 for(const [w,h]of [[1440,900],[1024,600],[844,390],[740,360]])await layout('expedition',w,h);
 await page.locator('[data-map-view="national"]').click();
 assert.deepEqual(await page.locator('.national-world').evaluate(el=>{const v=el.viewBox.baseVal;return [v.width,v.height];}),[1024,1024]);
 assert.ok(await action('campaign-command-next').isDisabled());
 await page.locator('[data-map-view="selected"]').click();
 await chooseCommandTarget(page,'chenliu');assert.ok(await action('campaign-command-next').isEnabled());
 assert.match(await action('campaign-command-next').getAttribute('class'),/primary/);
 await action('campaign-command-next').click();
 const modal=page.locator('.modal');assert.ok(await modal.isVisible());
 assert.equal(await page.locator('.army-details-preview').isVisible(),false);
 // A closed disclosure must not leave invisible controls in the keyboard loop.
 const tabbables=await page.evaluate(async()=>{
  const {visibleFocusTargets}=await import('/detail-panels.mjs');return visibleFocusTargets(document.querySelector('#overlay-root')).map(el=>({visible:el.checkVisibility(),closed:!!el.closest('details:not([open])')&&!el.matches('summary')}));
 });assert.ok(tabbables.every(x=>x.visible&&!x.closed));
 await action('campaign-pick-confirm').focus();await page.keyboard.press('Tab');assert.ok(await page.evaluate(async()=>{const {visibleFocusTargets}=await import('/detail-panels.mjs');return visibleFocusTargets(document.querySelector('#overlay-root'))[0]===document.activeElement;}));
 await action('campaign-command-back').click();assert.equal(await page.locator('[data-map-target="selected"]').getAttribute('data-command-city'),'chenliu');
 await action('campaign-command-back').click();await action('campaign-command-back').click();assert.ok(await page.locator(`[data-command-army-unit="${unitId}"]`).isChecked());
 await action('campaign-command-cancel').click();assert.equal(await saved(),original);
 checks.push('keyboard selection, visible focus loop, retained expedition draft and cancellation without game-state writes');

 await page.setViewportSize({width:1440,height:900});await cityCommand('luoyang','personnel','transfer');
 const person=page.locator('[data-personnel-choice="person-195"]');await person.check();assert.ok(await person.evaluate(el=>el===document.activeElement));
 const personDetail=page.locator('.modal [data-action="campaign-person-detail"][data-officer="person-195"]');
 await personDetail.click();await action('campaign-person-back').click();assert.ok(await person.isChecked());
 assert.ok(await personDetail.evaluate(el=>el===document.activeElement),'returning from details restores the source control');
 await action('campaign-command-next').click();await chooseCommandTarget(page,'chenliu');
 const grain=page.locator('[data-transfer-cargo="grain"]');await grain.fill('47');await grain.press('Tab');
 assert.equal(await grain.inputValue(),'47');
 await layout('transport',844,390);
 // Scroll the long options column while the map and action bar remain in place.
 await page.locator('.command-sidebar-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 const scroll=await page.locator('.command-sidebar-scroll').evaluate(el=>el.scrollTop);assert.ok(scroll>0);
 assert.match(await page.locator('.command-sidebar-summary').innerText(),/粮 47/);assert.ok(await page.locator('.command-sidebar-summary').evaluate(el=>{const r=el.getBoundingClientRect();return r.y>=0&&r.bottom<=document.querySelector('.map-command-footer').getBoundingClientRect().y;}));
 assert.ok(await action('campaign-command-next').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
 await action('campaign-command-next').click();await action('campaign-command-back').click();assert.equal(await grain.inputValue(),'47');
 const returnedScroll=await page.locator('.command-sidebar-scroll').evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight}));assert.ok(Math.abs(returnedScroll.top-Math.min(scroll,returnedScroll.max))<=1,JSON.stringify({scroll,returnedScroll}));
 await action('campaign-command-cancel').click();assert.equal(await saved(),original);
 checks.push('detail return focus, transport cargo retained across review, independent sidebar scrolling');

 await page.setViewportSize({width:1440,height:900});await page.locator('.world-commands [data-action="scout-open"]').click();
 const city='town-8',officer=scoutCandidates(initial,city)[0].unit.id,target=scoutTargets(initial,city)[0].id;
 await page.locator('#scout-city').focus();await page.locator('#scout-city').selectOption(city);
 assert.ok(await page.locator('#scout-city').evaluate(el=>el===document.activeElement));
 await page.keyboard.press('Tab');assert.ok(await page.locator('#scout-officer').evaluate(el=>el===document.activeElement));
 await page.locator('#scout-officer').selectOption(officer);await page.keyboard.press('Tab');assert.ok(await page.locator('#scout-target').evaluate(el=>el===document.activeElement));
 await page.locator('#scout-target').selectOption(target);assert.ok(await action('scout-dispatch').isEnabled());
 await layout('scouting',844,390);
 await page.locator('#scout-city').selectOption('xuchang');assert.equal(await page.locator('#scout-officer').inputValue(),'');assert.equal(await page.locator('#scout-target').inputValue(),'');assert.ok(await action('scout-dispatch').isDisabled());
 await page.keyboard.press('Escape');assert.equal(await saved(),original);
 checks.push('scouting source/officer/target keyboard flow, upstream reset, landscape map and fixed dispatch');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,errors},null,2));console.log(checks.map(s=>'PASS '+s).join('\n'));
}catch(error){await page?.screenshot({path:`${out}/failure.png`,fullPage:true});throw error;}finally{await browser?.close();server.kill();}
