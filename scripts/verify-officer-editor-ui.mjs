import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4518,out='outputs/officer-editor',base=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});
let browser,page;const errors=[];
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',acceptDownloads:true});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 const a=x=>page.locator(`[data-action="${x}"]`),e=x=>page.locator(`[data-officer-edit-action="${x}"]`),f=x=>page.locator(`[data-officer-edit-field="${x}"]`);
 const open=async()=>{await a('officer-editor').first().click();await page.locator('.officer-editor').waitFor();};
 const library=()=>page.evaluate(async()=>{const s=await(await import('/officer-library.mjs')).openOfficerLibrary();try{return await s.read();}finally{s.close();}});
 const saved=()=>page.waitForFunction(()=>document.querySelector('[data-officer-save-status]')?.textContent==='已保存');
 await page.goto(base);await open();assert.equal(await e('load').count(),24);
 await page.locator('[data-officer-search]').fill('曹操');assert.equal(await e('load').count(),1);await e('load').click();
 await f('charm').fill('0');assert.equal(await f('charm').evaluate(el=>document.activeElement===el),true);await e('save').click();await saved();assert.equal((await library()).officers[0].charm,0);
 await f('force').fill('101');await e('save').click();await page.locator('.officer-editor-error').filter({hasText:/0～100/}).waitFor();assert.equal((await library()).officers.length,1);
 await f('force').fill('66');await e('new').click();await page.locator('.officer-editor-confirm').waitFor();await e('cancel-confirm').click();assert.equal(await f('force').inputValue(),'66');
 await e('new').click();await e('discard-leave').click();await f('name').fill('云台将军');await f('courtesy').fill('子衡');await f('charm').fill('93');await f('force').fill('88');await f('intellect').fill('15');await f('aptitude:spear').selectOption('3');await f('biography').fill('自建武将资料测试。');await e('save').click();await saved();
 const custom=(await library()).officers.find(o=>o.name==='云台将军');assert.ok(custom);assert.equal(custom.id.length,39);
 await page.keyboard.press('F1');await page.locator('#page-guide-title').waitFor();assert.equal(await page.locator('#page-guide-title').innerText(),'武将编辑器');await page.locator('[data-guide-done]').click();
 await page.locator('[data-officer-search]').fill('');await page.locator('[data-officer-filter]').selectOption('custom');assert.equal(await e('load').count(),1);
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));await page.screenshot({path:out+'/desktop.png',fullPage:true});
 const dl=page.waitForEvent('download');await e('export').click();await(await dl).saveAs(out+'/officer.json');assert.equal(JSON.parse(await readFile(out+'/officer.json','utf8')).officers[0].charm,93);
 await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('show'));await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/landscape.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/portrait.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.reload();await open();await page.locator('[data-officer-search]').fill('云台将军');await e('load').click();assert.equal(await f('charm').inputValue(),'93');
 const invalid={...(await library()),officers:[{...custom,charm:101}]};await page.locator('[data-officer-import]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});await page.locator('.officer-editor-error').waitFor();assert.equal((await library()).officers.find(o=>o.id===custom.id).charm,93);
 const pack={...(await library()),officers:[{...custom,charm:94}]};await page.locator('[data-officer-import]').setInputFiles({name:'officers.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await e('confirm-import').waitFor();assert.equal((await library()).officers.find(o=>o.id===custom.id).charm,93);await e('confirm-import').click();await saved();assert.equal(await f('charm').inputValue(),'94');
 await e('back').click();await a('campaign-lobby').click();await page.locator('[data-action="scenario-setup-open"][data-team="ownTeam"]').click();
 // Use the ordinary commander selector to verify authored officers are selectable.
 const setup=page.locator('#overlay-root');await setup.locator('[data-action="scenario-unit-new"]').click();await setup.locator('[data-action="scenario-unit-choose"]').click();
 await page.locator('[data-scenario-query]').fill('云台将军');await page.locator(`[data-scenario-choice="${custom.id}"]`).click();
 assert.match(await setup.innerText(),/云台将军/);
 await a('scenario-unit-save').click();for(let i=0;i<3;i++)await a('scenario-setup-next').click();await a('scenario-setup-confirm').click();
 await a('launch-custom').click();await a('scenario-launch-confirm').click();await page.locator('#battle-board').waitFor();
 const game=await page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-historical-battle-v1')));assert.ok(game.armies[0].units.some(u=>u.id===custom.id&&u.charm===94));
 await page.evaluate(async()=>{const s=await(await import('/officer-library.mjs')).openOfficerLibrary();try{await s.write({format:'sango-officer-library',version:1,officers:[]});}finally{s.close();}});
 await page.reload();await page.locator('#battle-board').waitFor();const retained=await page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-historical-battle-v1')));assert.ok(retained.armies[0].units.some(u=>u.id===custom.id&&u.charm===94));
 const safety=await page.evaluate(async custom=>{
  const {openOfficerLibrary}=await import('/officer-library.mjs'),s=await openOfficerLibrary({database:'officer-editor-safety'}),other=await openOfficerLibrary({database:'officer-editor-safety'}),before=await s.read(),next={...before,officers:[custom]};
  let conflict=false,corrupt=false;try{
   await s.write(next,before);try{await other.write(before,before);}catch{conflict=true;}
   const kept=(await s.read()).officers[0].name===custom.name;
   const db=await new Promise(ok=>{const r=indexedDB.open('officer-editor-safety',1);r.onsuccess=()=>ok(r.result);});
   await new Promise(ok=>{const tx=db.transaction('officers','readwrite');tx.objectStore('officers').put({format:'damaged',savedWork:'preserve'},'library');tx.oncomplete=ok;});
   try{await s.write(before);}catch{corrupt=true;}
   const raw=await new Promise(ok=>{const r=db.transaction('officers').objectStore('officers').get('library');r.onsuccess=()=>ok(r.result);});db.close();return conflict&&kept&&corrupt&&raw.savedWork==='preserve';
  }finally{s.close();other.close();}
 },custom);assert.ok(safety,'concurrent and corrupt records must not be overwritten');
 const worker=await page.evaluate(async()=>{
  const {activateOfficerLibrary,withOfficerLibrary}=await import('/officer-catalog.mjs'),{newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign}=await import('/strategic-campaign.mjs'),{CampaignRunner}=await import('/campaign-runner.mjs'),{newOfficerDocument}=await import('/officer-library-data.mjs');
  const officers={format:'sango-officer-library',version:1,officers:[newOfficerDocument('custom-abcdefabcdefabcdefabcdefabcdefab')]};activateOfficerLibrary(officers);
  const direct=newCampaign(81,'guandu-200','cao',{allAI:true}),background=structuredClone(direct),runner=new CampaignRunner();
  try{beginExecution(direct);advanceCampaignDay(direct);const first=await runner.run(background,'begin'),second=await runner.run(first.state);activateOfficerLibrary();validateCampaign(second.state);return serializeCampaign(second.state)===serializeCampaign(direct);}finally{runner.destroy();activateOfficerLibrary();}
 });assert.ok(worker,'custom officer worker/day must match foreground engine');
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,customOfficerId:custom.id,checks:['search','zero-charm','invalid-input','unsaved-choice','new','save-reload','help','export','import-preview','invalid-import-atomicity','commander-picker','battle-launch','snapshot-after-library-deletion','worker-determinism','desktop','landscape','portrait'],errors},null,2));
 console.log('PASS officer editor: authoring, persistence, JSON confirmation, normal commander picker, battle snapshot, worker continuation and responsive layouts.');
}catch(error){await page?.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
