import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {validateTreasurePack} from '../treasure-catalog.mjs';
const port=4387,out='outputs/treasure-editor',origin=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});
let browser,page;const errors=[];
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('Server exited '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:true});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 const action=a=>page.locator(`[data-treasure-editor-action="${a}"]`),field=f=>page.locator(`[data-treasure-editor-field="${f}"]`),status=()=>page.locator('[data-treasure-editor-status]');
 const open=async()=>{await page.locator('[data-action="treasure-editor"]').first().click();await page.locator('.treasure-editor').waitFor();await page.evaluate(()=>document.fonts.ready);};
 const saved=()=>page.evaluate(async()=>{const s=await(await import('/treasure-editor.mjs')).openTreasureLibrary();try{return await s.read();}finally{s.close();}});
 await page.goto(origin);await open();assert.equal(await action('select').count(),70);
 await field('category').selectOption('mount');assert.equal(await action('select').count(),10);
 await field('category').selectOption('other');assert.equal(await action('select').count(),30);
 await field('category').selectOption('all');await field('query').fill('方天');assert.equal(await action('select').count(),1);assert.equal(await field('query').evaluate(el=>el===document.activeElement),true);
 await action('select').click();await field('name').fill('');assert.equal(await field('name').inputValue(),'');await action('save').click();await page.locator('.treasure-editor-error').waitFor();assert.equal((await saved()).treasures.skyHalberd.name,'方天画戟');
 await field('name').fill('试制画戟');assert.equal(await field('name').evaluate(el=>el===document.activeElement),true);
 await field('kind').selectOption('entry');await field('effect').selectOption('resolve');await field('steps').fill('2');await field('steps').press('Tab');
 await action('save').click();await status().filter({hasText:'已保存'}).waitFor();assert.equal((await saved()).treasures.skyHalberd.status,'resolve');
 const dl=page.waitForEvent('download');await action('export').click();await(await dl).saveAs(out+'/treasures.json');const exported=validateTreasurePack(JSON.parse(await readFile(out+'/treasures.json','utf8')));assert.equal(exported.treasures.skyHalberd.name,'试制画戟');
 await field('query').fill('');await page.waitForFunction(()=>getComputedStyle(document.getElementById('toast')).opacity==='0');await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/landscape.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/narrow.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.reload();await open();await page.locator('[data-treasure-editor-action="select"][data-id="skyHalberd"]').click();assert.equal(await field('name').inputValue(),'试制画戟');
 await action('reset').click();assert.equal(await field('name').inputValue(),'方天画戟');await action('undo').click();assert.equal(await field('name').inputValue(),'试制画戟');await action('redo').click();assert.equal(await field('name').inputValue(),'方天画戟');
 await page.locator('[data-treasure-editor-import]').setInputFiles(out+'/treasures.json');await field('name').filter({visible:true}).waitFor();await page.waitForFunction(()=>document.querySelector('[data-treasure-editor-field="name"]')?.value==='试制画戟');
 const bad=structuredClone(exported);bad.treasures.skyHalberd.steps=99;await page.locator('[data-treasure-editor-import]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.locator('.treasure-editor-error').waitFor();assert.equal(await field('steps').inputValue(),'2');assert.equal((await saved()).treasures.skyHalberd.steps,2);
 await action('save').click();await status().filter({hasText:'已保存'}).waitFor();await action('back').click();await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="treasure-editor"]').click();await action('back').click();await page.locator('.custom-battle').waitFor();
 // Use the real launch path with a configured participant.
 await page.evaluate(async()=>{const {defaultCustomBattle}=await import('/custom-battle.mjs');const d=defaultCustomBattle();d.ownTeam[0].treasureIds=['skyHalberd'];localStorage.setItem('sango-custom-draft-v46',JSON.stringify(d));});
 await page.reload();await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="launch-custom"]').click();await page.locator('[data-action="scenario-launch-confirm"]').click();await page.locator('#battle-board').waitFor();
 const game=await page.evaluate(async()=>{const {readSavedGame}=await import('/save-storage.mjs');return JSON.parse(await readSavedGame('sango-historical-battle-v1'));});assert.equal(game.treasureDesigns.skyHalberd.name,'试制画戟');assert.equal(game.battle.sides[0].units[0].treasureDesigns.skyHalberd.steps,2);
 // A damaged stored pack stays intact and cannot be silently overwritten.
 const corrupt=await page.evaluate(async()=>{const {openTreasureLibrary,createTreasureEditor}=await import('/treasure-editor.mjs');const db=await new Promise((ok,no)=>{const r=indexedDB.open('sango-treasures',1);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});const raw={format:'damaged',work:'preserve'};await new Promise((ok,no)=>{const tx=db.transaction('config','readwrite');tx.objectStore('config').put(raw,'catalog');tx.oncomplete=ok;tx.onabort=()=>no(tx.error);});const editor=await createTreasureEditor();let refused=false;try{await editor.save();}catch{refused=true;}const retained=await new Promise((ok,no)=>{const tx=db.transaction('config'),r=tx.objectStore('config').get('catalog');tx.oncomplete=()=>ok(r.result);tx.onabort=()=>no(tx.error);});db.close();return{refused,retained};});assert.equal(corrupt.refused,true);assert.deepEqual(corrupt.retained,{format:'damaged',work:'preserve'});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,checks:['70 items','search and category','input focus','validation','save and reload','undo and redo','JSON round trip','invalid import atomicity','desktop and landscape','new game snapshot','corrupt storage preserved'],errors},null,2));console.log('PASS treasure editor UI, persistence, import/export, responsive layout and actual game launch');
}catch(e){await page?.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();server.kill();}
