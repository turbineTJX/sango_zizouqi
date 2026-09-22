import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {busyFixture} from '../tests/helpers/domestic-orders.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),out='outputs/domestic-orders-ui',errors=[];await mkdir(out,{recursive:true});
let page;
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sango-sovereign-v2'))),action=name=>page.locator(`[data-action="${name}"]`);
async function open(){const fixture=busyFixture(),context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.addInitScript(raw=>{if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},serializeCampaign(fixture.s));await page.goto((process.env.GAME_URL||'http://127.0.0.1:4173')+'/#strategy');await page.locator('.strategy-clock').waitFor();return fixture;}
async function execute(){await action('campaign-begin').click();if(await action('campaign-run').count()&&await action('campaign-run').innerText()==='暂停世界')await action('campaign-run').click();}
try{
 const {id}=await open();const before=await saved();await page.locator('.city-affairs').filter({hasText:'查看内政'}).locator('summary').first().click();
 await page.locator('[data-action="campaign-pick"][data-direction="commerce"]').click();await page.locator(`[data-personnel-choice="${id}"]`).check();await action('campaign-command-next').click();await action('campaign-pick-confirm').click();
 assert.match(await page.locator('.modal-body').innerText(),/工坊/);assert.match(await page.locator('.modal-body').innerText(),/剩余/);assert.deepEqual(await saved(),before);await action('campaign-command-return').click();assert.match(await page.locator('.command-decree').innerText(),/商业/);await action('campaign-pick-confirm').click();assert.deepEqual(await saved(),before);
 await page.screenshot({path:out+'/interruption-desktop.png',animations:'disabled'});
 await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').click();assert.equal((await saved()).campaign.domestic.orders.length,1);assert.equal((await saved()).campaign.domestic.assignments.find(a=>a.officerId===id).direction,'technology');
 await page.reload();await page.locator('.pending-orders').waitFor();await page.screenshot({path:out+'/queued-after-reload.png',animations:'disabled'});
 for(let i=0;i<60&&(await saved()).campaign.domestic.orders.length;i++){if((await saved()).campaign.phase==='planning')await execute();else await action('campaign-day').click();}
 let state=await saved();assert.equal(state.campaign.domestic.orders.length,0);assert.equal(state.campaign.domestic.assignments.find(a=>a.officerId===id).direction,'commerce');assert.equal(state.campaign.domestic.workHistory[id][0].status,'completed');
 await action('campaign-personnel').first().click();await page.locator(`[data-action="campaign-person-detail"][data-officer="${id}"]`).click();await page.locator('.officer-work details').evaluate(el=>el.open=true);assert.match(await page.locator('.officer-work').innerText(),/工坊/);await page.screenshot({path:out+'/personal-work-history.png',animations:'disabled'});
 const next=await open();await page.locator('[data-action="campaign-tab"][data-tab="army"]').click();await action('campaign-order').click();await page.locator('#command-destination').selectOption('chenliu');await action('campaign-command-next').click();await action('campaign-pick-confirm').click();assert.match(await page.locator('.modal-body').innerText(),/全军等/);
 await page.locator('[data-action="campaign-order-choice"][data-choice="after"]').click();state=await saved();assert.equal(state.armies.find(a=>a.id===next.army.id).route.length,0);assert.equal(state.campaign.domestic.orders[0].kind,'march');
 await action('campaign-order').click();await page.locator('#command-destination').selectOption('chenliu');await action('campaign-command-next').click();await action('campaign-pick-confirm').click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/interruption-mobile.png',animations:'disabled'});
 await page.locator('[data-action="campaign-order-choice"][data-choice="now"]').click();state=await saved();assert.equal(state.campaign.domestic.orders.length,0);assert.ok(state.armies.find(a=>a.id===next.army.id).route.length);assert.equal(state.campaign.domestic.workHistory[next.id][0].status,'interrupted');
 await page.reload();await page.locator('.strategy-clock').waitFor();assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors},null,2));console.log('Domestic order UI passed: side-effect-free prompt, delayed assignment, queued reload, real completion, personal history, departure wait, immediate replacement, mobile.');
}catch(e){console.error(errors);await page?.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
