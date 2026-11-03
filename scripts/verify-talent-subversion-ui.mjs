import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {subversionFixture} from '../tests/helpers/talent-subversion.mjs';
import {observeFixtureCity} from '../tests/helpers/observed-city.mjs';
import {resolveOfficerLoss,officerLossResult,fateRoll} from '../officer-fates.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),out='outputs/talent-subversion-ui';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 for(const kind of ['visible','fogged','captive']){
  const {s,home,city,target,rival}=subversionFixture();observeFixtureCity(s,city.id,'cao',100);
  if(kind==='fogged'){s.campaign.vision.factions.cao.scouted=[];updateVision(s);}
  if(kind==='captive'){
   let eventId;for(let i=0;!eventId&&i<10000;i++){const key='ui-captive:'+i;if(officerLossResult(fateRoll(s,key),'cao','field')==='CAPTIVE')eventId=key;}
   assert.equal(resolveOfficerLoss(s,{unit:target.unit,faction:rival,location:home.id,enemy:'cao',eventId}), 'CAPTIVE');updateVision(s);
  }
  const saved=serializeCampaign(s);validateCampaign(JSON.parse(saved));
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(value=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',value);},saved);
  await page.goto((process.env.GAME_URL||'http://127.0.0.1:4285')+'/#strategy');await page.locator('.sovereign-hud').waitFor();
  const stored=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before=await stored();
  const open=async()=>{
   await page.locator('[data-action="campaign-info"]').click();await page.locator('[data-action="info-menu-scope"][data-scope="all"]').click();await page.locator('[data-action="info-menu-list"][data-kind="officer"]').click();await page.locator('#campaign-info-query').fill(target.unit.name);
   await page.waitForFunction(expected=>document.querySelector('.information-directory .personnel-count')?.textContent.trim().startsWith(expected+' /'),kind==='fogged'?0:1);
  };
  await open();const detail=page.locator(`[data-action="campaign-info-detail"][data-kind="officer"][data-id="${target.unit.id}"]`);
  if(kind==='fogged')assert.equal(await detail.count(),0);
  else{
   await detail.click();await page.locator('[data-action="campaign-info-page"][data-page="能力"]').click();assert.match(await page.locator('[data-info-section="attributes"]').innerText(),/忠诚\s+99/);
   for(const label of ['兵种适性','特性','羁绊','战法','军略'])assert.ok(await page.locator(`[data-action="campaign-info-page"][data-page="${label}"]`).count());
   if(kind==='captive'){await page.locator('[data-action="campaign-info-page"][data-page="基本"]').click();assert.match(await page.locator('[data-info-section="custody"]').innerText(),/释放/);await page.locator('[data-action="campaign-info-page"][data-page="能力"]').click();}
  }
  await page.screenshot({path:`${out}/${kind}-desktop.png`,fullPage:false});await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/${kind}-mobile.png`,fullPage:false});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.equal(await stored(),before,'viewing must not change the save');
  await page.reload();await page.locator('.sovereign-hud').waitFor();assert.equal(await stored(),before,'reload preserves the saved sight and custody');await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,cases:['visible','fogged','captive'],desktop:true,mobile:true,readOnly:true,reload:true,errors},null,2));console.log('Live officer sight and captive loyalty UI passed on desktop/mobile, including fog, read-only browsing and reload.');
 if(process.argv.includes('--manual')){
  const {default:sharp}=await import('sharp'),{runtimeSources,sha}=await import('./player-manual-sync.mjs'),sources=await runtimeSources(process.cwd()),sourceHash=sha(JSON.stringify(sources));
  const path='docs/images/player-actions/captures.json',captures=JSON.parse(await readFile(path,'utf8'));
  for(const [kind,id,title]of [['visible','officer-current-sight','当前视野内实时查看敌方武将能力与忠诚'],['captive','captive-current-loyalty','我方关押的俘虏可查看当前能力与忠诚'],['fogged','officer-lost-sight','失去视野后人物详情退出当前名册']]){
   await sharp(`${out}/${kind}-desktop.png`).webp({quality:85}).toFile(`docs/images/player-actions/${id}.webp`);
   captures[id]={title,file:`images/player-actions/${id}.webp`,group:'talent-subversion',sample:'实时视野与俘虏机制演示输入，不是自然局验收',viewport:{width:1440,height:1000},capturedAt:new Date().toISOString(),sourceHash};
  }
  await writeFile(path,JSON.stringify(captures,null,2)+'\n');
 }
}finally{await browser.close();}
