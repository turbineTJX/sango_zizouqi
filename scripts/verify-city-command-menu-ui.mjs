import {readMapView} from './map-camera-ui-helpers.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {DIRECTIONS} from '../domestic.mjs';
import {chooseAssignment} from './assignment-picker-ui-helpers.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port='4328',out='outputs/city-command-menu';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;
const errors=[],fixture=newCampaign(81,'guandu-200');
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('server '+code)));});
 await mkdir(out,{recursive:true});
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 page.setDefaultTimeout(10000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{if(!localStorage.getItem('city-command-fixture')){localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('city-command-fixture','1');}},serializeCampaign(fixture));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);
 await page.locator('.national-world').waitFor();
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved(),menu=page.locator('.city-command-menu');
 const select=async(id='xuchang')=>{if(!await page.locator('#national-city-search').isVisible())await page.locator('.map-search>summary').click();await page.locator('#national-city-search').selectOption(id);await menu.waitFor({state:'visible'});};
 const command=label=>menu.getByRole('button',{name:label,exact:true});
 const close=()=>page.locator('.modal-header [data-action="close"],.scouting-screen>header [data-action="close"]').click();
 const compact=async()=>{
  assert.deepEqual(await menu.locator('nav button').allTextContents(),['委任','军事','人事','详情']);
  assert.equal(await page.locator('.modal:visible,.strategy-panel:visible').count(),0);
  assert.equal(await menu.locator('table,.city-staff-summary,.strategy-stats').count(),0);
  const r=await menu.boundingBox(),v=page.viewportSize();
  assert.ok(r.width<=360&&r.height<=380);
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=v.width&&r.y+r.height<=v.height);
  assert.ok(await menu.locator('nav button').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=38)));
 };
 await select();await compact();
 await page.screenshot({path:out+'/desktop.png',animations:'disabled'});
 await command('军事').click();assert.deepEqual(await menu.locator('nav button').allTextContents(),['编制','出征']);
 await command('返回').click();await compact();
 await command('军事').click();await command('编制').click();await page.locator('.unit-muster').waitFor();
 assert.equal(await menu.count(),0);await page.locator('[data-action="campaign-command-cancel"]').click();assert.equal(await saved(),before);
 for(const id of ['xuchang','chenliu']){
  await select(id);await command('军事').click();await command('出征').click();await page.locator('.command-flow').waitFor();
  assert.deepEqual((await page.locator('[data-command-army-unit]').evaluateAll(ns=>ns.map(n=>n.dataset.commandArmyUnit))).sort(),fixture.cities.find(c=>c.id===id).units.filter(u=>!u.mission).map(u=>u.id).sort());
  await page.locator('[data-action="campaign-command-cancel"]').click();assert.equal(await saved(),before);
 }
 assert.deepEqual(await page.locator('.world-commands button').allTextContents(),['内政','侦察','外交','宝物','战役']);
 await select();await command('委任').click();await page.locator('.domestic-workbench').waitFor();
 assert.equal(await page.locator('#modal-title').innerText(),'委任');
 assert.deepEqual((await page.locator('.domestic-direction [data-direction]').evaluateAll(ns=>ns.map(n=>n.dataset.direction))).sort(),Object.keys(DIRECTIONS).sort());
 assert.equal(await page.locator('.domestic-workbench .domestic-proposals,.domestic-workbench [data-city-incident]').count(),0);
 await page.locator('.domestic-direction [data-direction="agriculture"]').click();await page.locator('.domestic-slots').waitFor();await close();await page.locator('.domestic-directions').waitFor();await close();
 await page.locator('.world-commands [data-action="faction-domestic"]').click();await page.locator('.faction-affairs .domestic-proposals').waitFor();assert.equal(await page.locator('.faction-priorities').isVisible(),true);await close();
 await page.locator('.world-commands [data-action="faction-diplomacy"]').click();await page.locator('.diplomacy-panel').waitFor();await close();
 await select();await command('人事').click();await command('武将').click();await page.locator('.modal .personnel-summary').waitFor();await close();
 for(const id of ['xuchang','chenliu']){
  await select(id);await command('人事').click();await command('调任').click();await page.locator('.command-flow').waitFor();
  assert.deepEqual((await page.locator('[data-personnel-choice]').evaluateAll(ns=>ns.map(n=>n.dataset.personnelChoice))).sort(),campaignOfficers(fixture).filter(r=>r.location===id).map(r=>r.unit.id).sort());
  await page.locator('[data-action="campaign-command-cancel"]').click();assert.equal(await saved(),before);
 }
 await select();await command('人事').click();await command('太守').click();await page.locator('.command-flow').waitFor();await page.locator('[data-action="campaign-command-cancel"]').click();
 for(const id of ['xuchang','chenliu']){await select(id);assert.equal(await menu.locator('[data-action="scout-open"]').count(),0);await page.locator('.world-commands [data-action="scout-open"]').click();await page.locator('#scout-city').waitFor();assert.equal(await page.locator('#scout-city').getAttribute('data-selected'),'');await chooseAssignment(page,'#scout-city',id);assert.equal(await page.locator('#scout-city').getAttribute('data-selected'),id);assert.equal(await page.locator('#scout-officer').getAttribute('data-selected'),'');assert.equal(await page.locator('#scout-officer').isDisabled(),false);assert.equal(await page.locator('#scout-target').isDisabled(),true);await close();}
 await select();await menu.getByRole('button',{name:'城市情报',exact:true}).click();await page.locator('.modal').waitFor();assert.match(await page.locator('#modal-title').innerText(),/许昌/);
 await select('chenliu');await compact();assert.match(await menu.locator('h3').innerText(),/陈留/);await menu.getByRole('button',{name:'城市情报',exact:true}).click();assert.match(await page.locator('#modal-title').innerText(),/陈留/);await close();
 await select();await page.keyboard.press('Escape');await page.locator('.national-world [data-city="xuchang"] .map-city-banner').dblclick();assert.equal(await page.locator('.national-world').getAttribute('data-map-detail'),'interior');await page.keyboard.press('Escape');
 const world=page.locator('.national-world');await world.focus();await page.keyboard.press('Home');for(let i=0;i<8&&await world.evaluate(readMapView).then(v=>Math.min(v.width,v.height)>420);i++)await page.keyboard.press('+');
 await page.locator('.national-world [data-city="xuchang"] [data-map-glyph]').click();await compact();
 await select('chenliu');assert.match(await menu.locator('h3').innerText(),/陈留/);assert.equal(await menu.count(),1);
 await page.keyboard.press('Escape');assert.equal(await menu.count(),0);
 await page.locator('.national-world [data-city="chenliu"]').focus();await page.keyboard.press('Enter');await compact();
 const blank=await page.evaluate(()=>{for(let y=170;y<innerHeight-70;y+=40)for(let x=250;x<innerWidth-40;x+=40){const el=document.elementFromPoint(x,y);if(el?.closest('.national-world')&&!el.closest('[data-city],[data-junction],[data-campaign-army],[data-metropolis-focus],[data-action],[data-map-building],[data-city-building],.map-object-menu'))return {x,y};}throw Error('No blank map point');});await page.mouse.click(blank.x,blank.y);assert.equal(await menu.count(),0);
 await page.locator('.self-city-navigation').click();
 await page.locator('.map-quick-directory [data-action="map-quick-select"][data-id="xuchang"]').click();await compact();assert.ok(await page.locator('.map-quick-directory').isVisible());
 await page.keyboard.press('Escape');await page.locator('.map-quick-directory [data-action="map-directory-toggle"]').click();
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await select();await compact();
  await page.screenshot({path:out+`/mobile-${width}.png`,animations:'disabled'});
  await command('人事').click();const r=await menu.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=844);await command('返回').click();await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});await select('ye');
 assert.equal(await menu.locator('[data-task],[data-action="city-domestic"],[data-action="scout-open"],[data-action="map-city-commands"]').count(),0);
 assert.equal(await saved(),before,'browsing and cancelled orders changed the campaign');
 assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,checks:['four primary commands','double-click city zoom','secondary military and personnel commands','all command entry points','map and directory selection','switch cities','keyboard and outside dismissal','desktop and mobile bounds','enemy intelligence','unchanged campaign'],errors},null,2));
 console.log('PASS city command menu: desktop, mobile, command flows, keyboard, intelligence and unchanged campaign.');
}catch(error){await page?.screenshot({path:out+'/failure.png',animations:'disabled'});throw error;}
finally{await browser?.close();server.kill();}
