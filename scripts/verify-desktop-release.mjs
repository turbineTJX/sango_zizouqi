import {createRequire} from 'node:module';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {ROOT} from './release-lib.mjs';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';

const {_electron}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
if(!process.argv[2])throw Error('Pass the built win-unpacked/SangoSovereign.exe');
const executablePath=resolve(process.argv[2]),out=join(ROOT,'.local','verify-desktop-'+Date.now()),userData=join(out,'profile');await mkdir(out,{recursive:true});
const environment={...process.env,SANGO_VERIFY:'1',SANGO_USER_DATA:userData};
const errors=[],initial=serializeCampaign(newCampaign(7));let expected;
async function launch(){const application=await _electron.launch({executablePath,env:environment,timeout:60000}),page=await application.firstWindow();page.on('pageerror',error=>errors.push(error.message));await page.locator('#app [data-action]').first().waitFor({timeout:60000});return {application,page};}
let current;
try{
 current=await launch();await current.application.context().addInitScript(raw=>{
  if(!localStorage.getItem('native-verification-fixture')){localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('native-verification-fixture','1');}
 },initial);
 await current.page.goto('sango://game/#strategy');await current.page.reload();await current.page.locator('.sovereign-hud').waitFor({timeout:60000});
 assert.equal(await current.page.evaluate(()=>location.origin),'sango://game');
 assert.equal(await current.page.evaluate(()=>typeof window.require),'undefined');
 assert.deepEqual(await current.application.evaluate(({BrowserWindow})=>{const prefs=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {nodeIntegration:prefs.nodeIntegration,contextIsolation:prefs.contextIsolation,sandbox:prefs.sandbox};}),{nodeIntegration:false,contextIsolation:true,sandbox:true});
 const report=current.page.locator('#overlay-root').getByRole('button',{name:'确认',exact:true});
 if(await report.isVisible())await report.click();
 expected=JSON.parse(await current.page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')));
 await current.page.locator('[data-action="settings"]').first().click();assert.match(await current.page.locator('.modal').innerText(),/本机应用/);
 await current.page.locator('[data-action="export"]').click();await current.page.getByText('存档已导出',{exact:true}).waitFor();
 const files=await readdir(join(userData,'exports'));assert.equal(files.length,1);const saveFile=join(userData,'exports',files[0]);assert.deepEqual(JSON.parse(await readFile(saveFile,'utf8')),expected);
 await current.page.locator('#import-file').setInputFiles(saveFile);await current.page.locator('.sovereign-hud').waitFor();
 await current.application.close();current=null;
 current=await launch();await current.page.goto('sango://game/#strategy');await current.page.reload();await current.page.locator('.sovereign-hud').waitFor({timeout:60000});assert.deepEqual(JSON.parse(await current.page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'))),expected);
 assert.deepEqual(errors,[]);await writeFile(join(out,'result.json'),JSON.stringify({passed:true,executablePath,userData,checks:['packaged executable starts','stable application origin','sandboxed renderer','export and import','save survives process restart'],errors},null,2));console.log('Desktop native release verified: '+out);
}catch(error){
 if(current)console.error(await current.page.locator('#overlay-root').innerText().catch(()=>''));
 throw error;
}finally{if(current)await current.application.close();}
