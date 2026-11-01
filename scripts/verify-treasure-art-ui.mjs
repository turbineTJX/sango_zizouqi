import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {treasureOfficerRows,grantTreasure} from '../treasures.mjs';
import {TREASURE_IDS} from '../data/design/treasures.mjs';
import {treasureSlot,equippedTreasureIds} from '../treasure-equipment.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment} from '../engine.mjs';
import {chooseAssignment} from './assignment-picker-ui-helpers.mjs';
const out='outputs/treasure-expansion/ui',port=4328;await mkdir(out,{recursive:true});
const s=newCampaign(7);for(const r of treasureOfficerRows(s)){r.unit.treasureIds=[];delete r.unit.treasureId;}for(const t of s.campaign.treasures.items)Object.assign(t,{state:'treasury',holderId:null,cityId:null,factionId:'cao'});
for(const id of ['skyHalberd','redHare','brightArmor'])assert.equal(grantTreasure(s,id,'cao'),null);
const d=defaultCustomBattle();d.ownTeam=[{id:'cao',type:'cavalry',troops:3000,level:5,treasureIds:['skyHalberd','redHare','brightArmor']},{id:'liao',type:'halberd',troops:3000,level:5,treasureIds:['twinIronHalberds','dayuan','goldenArmor']},{id:'dun',type:'archer',troops:3000,level:5,treasureIds:['liGuangBow','whiteDragon','silverArmor']},{id:'jia',type:'spear',troops:3000,level:5,treasureIds:['whiteFeatherFan','fourWheels','phoenixRobe']}];d.enemyTeam=['shao','yan','wen'].map(id=>({id,type:'cavalry',troops:3000,level:5}));const battle=generateBattle(d);lockDeployment(battle.battle);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;const errors=[],results=[];
try{
 for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${port}`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [name,viewport]of [['desktop',{width:1440,height:1000}],['landscape',{width:844,height:390}],['portrait',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));},serializeCampaign(s));
  const action=id=>page.locator(`[data-action="${id}"]`),saved=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await action('treasure-open').first().click();await page.locator('.treasure-table').waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.treasure-table [data-art-treasure] img').length===70);
  await page.locator('.treasure-table img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));assert.equal(await page.locator('.treasure-table img').count(),70);
  assert.ok(await page.locator('.treasure-table img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth===256&&img.naturalHeight===256&&img.getBoundingClientRect().width<=64)));
  for(const category of ['weapon','mount','other']){await page.locator('[data-treasure-category]').selectOption(category);assert.equal(await page.locator('.treasure-table tbody tr').count(),TREASURE_IDS.filter(id=>treasureSlot(id)===category).length);}
  await page.locator('[data-treasure-category]').selectOption('all');await page.screenshot({path:`${out}/${name}-treasury.png`,animations:'disabled'});
  await page.locator('[data-action="treasure-select"][data-id="heavenSword"]').click();await chooseAssignment(page,'#treasure-recipient','cao');assert.match(await page.locator('.treasure-grant').innerText(),/将替换 方天画戟.*国库/s);const before=await saved();await action('treasure-cancel').click();assert.deepEqual(await saved(),before);
  await page.locator('[data-action="treasure-select"][data-id="heavenSword"]').click();await chooseAssignment(page,'#treasure-recipient','cao');await page.screenshot({path:`${out}/${name}-replace.png`,animations:'disabled'});await action('treasure-confirm').click();
  const changed=await saved(),u=changed.cities.flatMap(c=>c.units).find(u=>u.id==='cao');assert.deepEqual(equippedTreasureIds(u),['heavenSword','redHare','brightArmor']);assert.equal(changed.campaign.treasures.items.find(t=>t.id==='skyHalberd').state,'treasury');
  await action('close').last().click();await page.locator('[data-action="map-quick-open"][data-kind="city"]').first().click();await page.locator('[data-action="map-quick-select"][data-id="xuchang"]').click();await action('map-city-commands').filter({hasText:'人事'}).click();await page.locator('.city-command-grid [data-action="campaign-city-personnel"]').click();await page.locator('#modal-panel-root [data-action="campaign-person-detail"][data-officer="cao"]').click();
  await page.locator('.unit-treasure').waitFor();assert.equal(await page.locator('.unit-treasure .treasure-slots article').count(),3);assert.match(await page.locator('.unit-treasure').innerText(),/倚天剑/);assert.match(await page.locator('.unit-treasure').innerText(),/赤兔/);assert.match(await page.locator('.unit-treasure').innerText(),/明光铠/);await page.locator('.unit-treasure').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${name}-officer.png`,animations:'disabled'});
  await page.locator('.unit-treasure [data-action="text-details"]').first().click();await page.locator('.treasure-detail-art img').waitFor();await page.locator('.treasure-detail-art img').evaluate(img=>img.decode());assert.ok((await page.locator('.treasure-detail-art img').boundingBox()).width<=192);await page.screenshot({path:`${out}/${name}-treasure.png`,animations:'disabled'});
  await context.close();
  const combat=await browser.newContext({viewport,serviceWorkers:'block'}),fight=await combat.newPage();fight.on('pageerror',e=>errors.push(e.message));await fight.addInitScript(raw=>{localStorage.setItem('sango-historical-battle-v1',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0}));},JSON.stringify(battle));
  await fight.goto(`http://127.0.0.1:${port}/#historical-battle`);await fight.waitForFunction(()=>document.querySelector('#battle-board')?.dataset.modelStatus==='ready'&&Number(document.querySelector('#battle-board').dataset.modelCount)>=7);await fight.screenshot({path:`${out}/${name}-models.png`,animations:'disabled'});
  if(name==='portrait'){assert.ok(await fight.getByText('请横屏游玩',{exact:true}).isVisible());results.push({name,images:70,categories:true,threeSlots:true,replacementCancel:true,replacementConfirmed:true,otherSlotsPreserved:true,smallImages:true,portraitBattleGuard:true});await combat.close();continue;}
  await fight.locator('[data-unit="cao"] .map-portrait-row').click();assert.match(await fight.locator('.battle-brief-effects').innerText(),/奋战/);assert.match(await fight.locator('.battle-brief-effects').innerText(),/疾行/);assert.match(await fight.locator('.battle-brief-effects').innerText(),/护盾/);await fight.locator('.battle-inspection-more>summary').click();assert.match(await fight.locator('.battle-inspection-more').innerText(),/方天画戟/);assert.match(await fight.locator('.battle-inspection-more').innerText(),/赤兔/);assert.match(await fight.locator('.battle-inspection-more').innerText(),/明光铠/);await fight.screenshot({path:`${out}/${name}-battle.png`,animations:'disabled'});
  await fight.locator('[data-unit="jia"] .map-portrait-row').click();for(const effect of ['阵枢','坚阵','休整'])assert.match(await fight.locator('.battle-brief-effects').innerText(),new RegExp(effect));if(!await fight.locator('.battle-inspection-more').evaluate(e=>e.open))await fight.locator('.battle-inspection-more>summary').click();for(const item of ['白羽扇','四轮车','凤凰羽衣'])assert.match(await fight.locator('.battle-inspection-more').innerText(),new RegExp(item));await fight.screenshot({path:`${out}/${name}-new-equipment.png`,animations:'disabled'});
  results.push({name,images:70,categories:true,threeSlots:true,replacementCancel:true,replacementConfirmed:true,otherSlotsPreserved:true,actualNativeModels:true,threeBattleEffects:true,newEntryEffects:true,smallImages:true});await combat.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/result.json`,JSON.stringify({passed:true,results,errors},null,2));console.log('PASS 70 small images, category filters, three slots, replacement/cancel and officer details in all three viewports; native models and simultaneous original/new battle effects on desktop and landscape; portrait rotation guard.');
}finally{await browser?.close();server.kill();}
