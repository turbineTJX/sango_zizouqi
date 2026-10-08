import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './automatic-domestic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {readyTalent} from '../tests/helpers/talent.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const s=newCampaign(15);s.armies.forEach(a=>a.stationary=true);const p=readyTalent(s),officer=s.campaign.idle.find(o=>o.location==='xuchang');
for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='talent'&&key!=='hire')s.cities.find(c=>c.id==='xuchang').domestic.cooldowns[key]=1000;
assignDomestic(s,'xuchang','talent',officer.unit.id);beginExecution(s);while(s.campaign.day<11)advanceCampaignDay(s);validateCampaign(JSON.parse(serializeCampaign(s)));
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],out='outputs/talent-ui';await mkdir(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(value=>localStorage.setItem('sango-sovereign-v2',value),serializeCampaign(s));await page.goto((process.env.GAME_URL||'http://127.0.0.1:4285')+'/#strategy');
 await page.locator('.talent-panel').waitFor();await page.locator('.talent-panel > summary').click();const panel=page.locator('.talent-panel');await panel.scrollIntoViewIfNeeded();
 assert.match(await panel.innerText(),/参考需求/);assert.match(await panel.innerText(),/意愿/);assert.match(await panel.innerText(),/接洽/);assert.ok((await panel.innerText()).includes(OFFICER_BY_ID[p.id].name));
 await page.screenshot({path:out+'/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.reload();await page.locator('.talent-panel').waitFor();assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,day:s.campaign.day},null,2));console.log('Talent UI: need, willingness, progress, reload, desktop/mobile and no JS errors passed.');
}finally{await browser.close();}
