import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4393',SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const s=newCampaign(33,'guandu-200'),u=s.cities.find(c=>c.id==='xuchang').units[0];
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const context=await browser.newContext({viewport,serviceWorkers:'block'});page=await context.newPage();
 await page.addInitScript(save=>localStorage.setItem('sango-sovereign-v2',save),serializeCampaign(s));
 await page.goto('http://127.0.0.1:4393/#strategy');
 await page.locator('.faction-navigation [data-kind="city"]').click();
 await page.locator('.city-directory-item[data-id="xuchang"]').click();
 await page.getByRole('button',{name:'军事',exact:true}).click();
 await page.getByRole('button',{name:'编制',exact:true}).click();
 const before=await page.evaluate(async()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const number=()=>page.locator(`[data-command-troops="${u.id}"]`);
 // Accessibility value editing can emit input without a native blur/change.
 await number().evaluate(el=>{el.value='2100';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator(`[data-muster-unit="${u.id}"] [data-action="campaign-unit-edit"]`).dispatchEvent('click');
 assert.equal(await number().inputValue(),'2100','typed roster count must survive opening the editor without Enter');
 assert.match(await page.locator('.command-flow').innerText(),new RegExp(u.name+'：.*2100 人'));
 await page.locator('[data-action="campaign-unit-list"]').click();
 assert.equal(await number().inputValue(),'2100');
 // Exercise normal player typing as well as the input-only accessibility path.
 await number().press('ControlOrMeta+A');await number().pressSequentially('2200');
 await page.locator(`[data-muster-unit="${u.id}"] [data-action="campaign-unit-edit"]`).click();
 assert.equal(await number().inputValue(),'2200','keyboard editing must survive clicking the editor without Enter');
 assert.match(await page.locator('.command-flow').innerText(),new RegExp(u.name+'：.*2200 人'));
 assert.match(await page.locator('.command-formation').innerText(),new RegExp('现役 '+u.troops+' ·'),'current troops must remain the actual count until the order is issued');
 await page.locator('[data-action="campaign-command-cancel"]').click();
 assert.equal(await page.evaluate(async()=>await (await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before);
 mkdirSync('outputs/muster-draft',{recursive:true});await page.screenshot({path:`outputs/muster-draft/${viewport.width}.png`});await context.close();
 }
 console.log('PASS input-only and keyboard roster edits survive editor/back without Enter; cancel leaves save unchanged, desktop/mobile');
}finally{await browser?.close();server.kill();}
