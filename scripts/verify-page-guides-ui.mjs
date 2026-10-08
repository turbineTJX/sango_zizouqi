import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PAGE_GUIDES,PAGE_GUIDE_STORAGE_KEY} from '../page-guides.mjs';
import {newCampaign,serializeCampaign,beginExecution} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {fundCities} from '../tests/resource-fixtures.mjs';
import {createScenario} from '../scenarios.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const port=4356,base='http://127.0.0.1:'+port,out='outputs/page-guides/ui',errors=[],checks=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,currentPage;
const action=(page,id)=>page.locator('[data-action="'+id+'"]');
const guide=page=>page.locator('#page-guide-root [role="dialog"]');
async function expectGuide(page,title){await guide(page).waitFor();assert.equal(await page.locator('#page-guide-title').innerText(),title);}
async function closeGuide(page){await page.locator('#page-guide-root [data-guide-done]').click();await guide(page).waitFor({state:'hidden'});}
async function pageFor({unseen=Object.keys(PAGE_GUIDES),save=null,key='sango-sovereign-v2',viewport={width:1440,height:1000}}={}){
 const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();currentPage=page;
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(({preferences,key,save})=>{if(!localStorage.getItem('sango-page-guides-v1'))localStorage.setItem('sango-page-guides-v1',JSON.stringify(preferences));if(save&&!localStorage.getItem(key))localStorage.setItem(key,save);},{preferences:{version:1,enabled:true,seen:Object.keys(PAGE_GUIDES).filter(id=>!unseen.includes(id))},key,save});
 return page;
}
const saved=(page,key='sango-sovereign-v2')=>page.evaluate(key=>localStorage.getItem(key),key);
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const page=await pageFor();await page.goto(base);
 await expectGuide(page,'选择游戏模式');await page.screenshot({path:out+'/first-desktop.png'});await closeGuide(page);
 await page.reload();await page.locator('.mode-selection').waitFor();assert.equal(await guide(page).count(),0);
 await page.locator('#app [data-guide-action="open"]').click();await expectGuide(page,'选择游戏模式');await page.keyboard.press('Escape');assert.equal(await guide(page).count(),0);
 await action(page,'strategy').click();await expectGuide(page,'选择剧本');await closeGuide(page);
 await page.locator('[data-action="select-national-scenario"][data-scenario="guandu-200"]').click();await expectGuide(page,'选择势力');await closeGuide(page);
 await page.locator('button[data-action="select-national-faction"][data-faction="cao"]').click();assert.equal(await guide(page).count(),0);
 await action(page,'launch-national').click();await guide(page).waitFor();
 if(await page.locator('#page-guide-title').innerText()==='奏报与每日记录'){await closeGuide(page);await page.keyboard.press('Escape');}
 await expectGuide(page,'天下大地图');await closeGuide(page);
 const before=await saved(page);await page.keyboard.press('F1');await expectGuide(page,'天下大地图');await closeGuide(page);assert.equal(await saved(page),before);
 await action(page,'scout-open').first().click();await expectGuide(page,'侦察');
 await page.screenshot({path:out+'/scouting-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/scouting-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('#page-guide-root').contains(document.activeElement)));
 await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.querySelector('#page-guide-root').contains(document.activeElement)));
 await page.keyboard.press('Escape');assert.equal(await page.locator('.scouting').count()>0||await page.locator('#modal-title').innerText()==='侦察',true);
 assert.equal(await saved(page),before);await page.keyboard.press('Escape');
 await action(page,'settings').first().click();await expectGuide(page,'设置与存档');await closeGuide(page);
 await page.locator('[data-guide-action="toggle"]').click();assert.equal(await page.locator('[data-guide-action="toggle"]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-guide-action="catalogue"]').click();await expectGuide(page,'全部指引');
 await page.locator('[data-guide-action="topic"][data-guide-id="troops"]').click();await expectGuide(page,'部队编制');await closeGuide(page);
 await page.reload();await page.locator('.sovereign-hud').waitFor();assert.equal(await guide(page).count(),0);
 const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-page-guides-v1')));assert.equal(prefs.enabled,false);assert.ok(prefs.seen.includes('troops'));
 await action(page,'settings').first().click();await page.locator('[data-guide-action="reset"]').click();await expectGuide(page,'设置与存档');await closeGuide(page);
 await page.keyboard.press('Escape');await expectGuide(page,'天下大地图');await closeGuide(page);
 checks.push('first visit, reopen, reload, per-page memory, F1, catalogue, disable, reset, mobile and focus');console.log('PASS '+checks.at(-1));

 const draftPage=await pageFor({unseen:['custom','troops']});await draftPage.goto(base);await action(draftPage,'campaign-lobby').click();await expectGuide(draftPage,'战役编辑器');await closeGuide(draftPage);
 await draftPage.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();await expectGuide(draftPage,'部队编制');await closeGuide(draftPage);
 await action(draftPage,'scenario-unit-edit').first().click();
 const count=draftPage.locator('input[data-scenario-troops]').first();await count.fill('2345');await count.press('Tab');await draftPage.waitForFunction(()=>document.querySelector('input[data-scenario-troops]')?.value==='2345');
 const draftBefore=await saved(draftPage,'sango-custom-draft-v46');
 await draftPage.locator('#modal-panel-root .modal-body').evaluate(el=>{el.dataset.guidePreserve='same-page';el.scrollTop=100;});
 const scrollBefore=await draftPage.locator('#modal-panel-root .modal-body').evaluate(el=>el.scrollTop);
 await draftPage.locator('#modal-panel-root [data-guide-action="open"]').click();await expectGuide(draftPage,'部队编制');await draftPage.keyboard.press('Escape');
 assert.equal(await count.inputValue(),'2345');assert.equal(await saved(draftPage,'sango-custom-draft-v46'),draftBefore);
 assert.equal(await draftPage.locator('#modal-panel-root .modal-body').getAttribute('data-guide-preserve'),'same-page');
 assert.equal(await draftPage.locator('#modal-panel-root .modal-body').evaluate(el=>el.scrollTop),scrollBefore);
 checks.push('muster draft retained and not submitted by help');console.log('PASS '+checks.at(-1));

 const routeState=newCampaign(42);fundCities(routeState,40000);for(const n of routeState.campaign.activity.nodes)n.read=true;
 const routePage=await pageFor({unseen:['routes'],save:serializeCampaign(routeState)});await routePage.goto(base+'/#strategy');await routePage.locator('.sovereign-hud').waitFor();
 await routePage.locator('[data-action="map-quick-open"][data-kind="city"]').first().click();
 await routePage.locator('[data-action="map-quick-select"][data-id="xuchang"]').click();
 await routePage.locator('[data-action="map-quick-manage"][data-kind="city"][data-id="xuchang"]').click();
 await routePage.locator('.city-command-hub [data-task="expedition"]').click();
 await action(routePage,'campaign-command-next').click();await routePage.locator('[data-command-army-unit]').first().check();
 await action(routePage,'campaign-command-next').click();await action(routePage,'campaign-command-next').click();await expectGuide(routePage,'大地图选路');await closeGuide(routePage);
 await routePage.locator('[data-command-city="chenliu"]').first().click();await routePage.locator('[data-action="map-route-end"]').waitFor();const routeBefore=await saved(routePage);
 await routePage.locator('.map-command-screen [data-guide-action="open"]').click();await expectGuide(routePage,'大地图选路');await closeGuide(routePage);
 assert.equal(await routePage.locator('.map-point-menu h3').innerText(),'陈留');assert.equal(await saved(routePage),routeBefore);
 checks.push('full-screen route guide leaves destination and unsubmitted military order intact');console.log('PASS '+checks.at(-1));

 const s=newCampaign(7);fundCities(s,40000);const c=s.cities.find(c=>c.id==='xuchang'),officer=s.campaign.idle.find(o=>o.location===c.id);
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'commerce',officer.unit.id),null);assert.equal(beginExecution(s),null);
 assert.ok(s.campaign.domestic.assignments.some(a=>a.proposal));
 const proposalPage=await pageFor({unseen:['proposals'],save:serializeCampaign(s)});await proposalPage.goto(base+'/#strategy');await expectGuide(proposalPage,'内政提案');
 const proposalBefore=await saved(proposalPage);await proposalPage.keyboard.press('Escape');
 assert.ok(await proposalPage.locator('.domestic-proposal').count());assert.equal(await saved(proposalPage),proposalBefore);
 await proposalPage.reload();await proposalPage.locator('.domestic-proposal').first().waitFor();assert.equal(await guide(proposalPage).count(),0);assert.equal(await saved(proposalPage),proposalBefore);
 checks.push('help close and reload leave unpaid proposal pending');console.log('PASS '+checks.at(-1));

 const d=defaultCustomBattle();d.seed=4511;d.ownTeam=[{id:'cao',type:'spear',troops:3000,level:5},{id:'jia',type:'archer',troops:3000,level:5},{id:'yu',type:'halberd',troops:3000,level:5}];d.enemyTeam=[{id:'shao',type:'spear',troops:3000,level:5},{id:'wen',type:'cavalry',troops:3000,level:5},{id:'yan',type:'cavalry',troops:3000,level:5}];d.ownTeamRoles={leader:'cao',advisor:'yu'};
 const battle=createScenario('custom-battle',4511,20,null,d),battleKey='sango-historical-battle-v1';
 const battlePage=await pageFor({unseen:['deployment','combat','stratagems'],save:JSON.stringify(battle),key:battleKey});await battlePage.goto(base+'/#historical-battle');await expectGuide(battlePage,'战前布阵');await closeGuide(battlePage);
 await action(battlePage,'pause').first().click();await expectGuide(battlePage,'战场指挥');const start=await saved(battlePage,battleKey);await battlePage.waitForTimeout(700);assert.equal(await saved(battlePage,battleKey),start);await closeGuide(battlePage);
 await battlePage.waitForFunction(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')).battle.tick>0);
 await battlePage.keyboard.press('F1');await expectGuide(battlePage,'战场指挥');const frozen=await saved(battlePage,battleKey);
 await guide(battlePage).focus();await battlePage.keyboard.press('Space');await battlePage.waitForTimeout(700);assert.equal(await saved(battlePage,battleKey),frozen);
 await battlePage.setViewportSize({width:390,height:844});await battlePage.screenshot({path:out+'/combat-mobile.png'});assert.ok(await battlePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await closeGuide(battlePage);
 const tick=JSON.parse(frozen).battle.tick;await battlePage.waitForFunction(t=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')).battle.tick>t,tick);
 await action(battlePage,'choose-stratagem').click();await expectGuide(battlePage,'施放军略');const commandBefore=await saved(battlePage,battleKey);await battlePage.keyboard.press('Escape');assert.equal(await battlePage.locator('#modal-title').innerText(),'选择军略');assert.equal(await saved(battlePage,battleKey),commandBefore);
 checks.push('deployment/combat guide, battle clock pause/resume, shortcut isolation and stratagem selection retained');console.log('PASS '+checks.at(-1));
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,guides:Object.keys(PAGE_GUIDES).length,checks,errors},null,2));
 console.log('Page guides UI passed.');
}catch(e){if(currentPage)await currentPage.screenshot({path:out+'/failure.png'}).catch(()=>{});console.error(errors);throw e;}finally{await browser?.close();server.kill();}
