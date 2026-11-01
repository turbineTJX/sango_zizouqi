import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {completedRecording} from '../tests/helpers/recorded-campaign.mjs';
import {serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
const {s,r}=completedRecording();acknowledgeActivityReports(s,pendingActivityReports(s).map(n=>n.id));
const raw=serializeCampaign(s);validateCampaign(JSON.parse(raw));
const out='work/shared-time-replay',port=4498,origin=`http://127.0.0.1:${port}`;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});
let browser,page;const errors=[];
const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);},raw);
 await page.goto(origin+'/#strategy');await page.locator('dialog.scene-loading[open]').waitFor({state:'detached'});
 await page.locator('[data-action="campaign-battles"]').first().click();
 await page.locator(`[data-action="campaign-replay"][data-battle="${r.id}"]`).click();
 const timeline=page.locator('#campaign-replay-frame');await timeline.waitFor();const max=Number(await timeline.getAttribute('max'));
 assert.equal(max,r.battle.tick);assert.ok(max>2);const original=await saved();
 await timeline.evaluate(el=>window.originalReplayTimeline=el);
 await timeline.focus();await page.keyboard.press('End');assert.equal(await timeline.inputValue(),String(max));
 assert.match(await page.locator('[data-replay-position]').innerText(),/最终战果/);
 await page.keyboard.press('Home');assert.equal(await timeline.inputValue(),'0');
 assert.ok(await timeline.evaluate(el=>el===window.originalReplayTimeline&&document.activeElement===el));
 const bounds=await timeline.boundingBox();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.75,bounds.y+bounds.height/2,{steps:12});await page.mouse.up();
 const sought=Number(await timeline.inputValue());assert.ok(sought>max*.5&&sought<max*.9);assert.ok(await timeline.evaluate(el=>el===window.originalReplayTimeline));
 await page.locator('#campaign-replay-speed').selectOption('4');
 await page.getByRole('button',{name:'播放回放',exact:true}).click();
 await page.waitForFunction(previous=>Number(document.querySelector('#campaign-replay-frame').value)>previous,sought);
 await page.getByRole('button',{name:'暂停回放',exact:true}).click();const paused=await timeline.inputValue();await page.waitForTimeout(500);assert.equal(await timeline.inputValue(),paused);
 assert.equal(await saved(),original);await page.screenshot({animations:'disabled',path:out+'/replay-desktop.png'});
 await page.setViewportSize({width:844,height:390});await timeline.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.screenshot({animations:'disabled',path:out+'/replay-mobile.png'});
 await page.locator('[data-action="replay-reset"]').click();assert.equal(await timeline.inputValue(),'0');assert.equal(await saved(),original);
 await page.getByRole('button',{name:'关闭弹窗'}).last().click();assert.equal(await saved(),original);
 assert.deepEqual(errors,[]);
 if(process.argv.includes('--capture')){
  const path='docs/images/player-actions/captures.json',manifest=JSON.parse(await readFile(path,'utf8')),id='battle-replay';
  const files=['app.js','campaign-recording.mjs','campaign-replay.mjs','strategic-campaign.mjs','strategic-view.mjs','battle-presentation.css','ui-theme.css'];const hash=createHash('sha256');for(const file of files)hash.update(file).update(await readFile(file));
  const file=`images/player-actions/${id}.webp`;await sharp(out+'/replay-desktop.png').webp({quality:86}).toFile('docs/'+file);
  manifest[id]={title:'战后只读回放与可拖动时间条',file,group:'replay',sample:'真实战斗完成后的记录；接敌位置使用机制夹具，不作为自然局成绩',viewport:{width:1440,height:900},capturedAt:new Date().toISOString(),sourceHash:hash.digest('hex')};await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
 }
 await writeFile(out+'/result.json',JSON.stringify({passed:true,recordedSteps:max,recordingBytes:Buffer.byteLength(JSON.stringify(r.replay)),scrub:true,playPause:true,unchangedWorld:true,errors},null,2));
 console.log('PASS recorded battle playback, continuous mouse and keyboard seeking, speed, pause, reset, desktop/mobile and byte-identical world save.');
}catch(error){if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png',fullPage:true});throw error;}
finally{await browser?.close();server.kill();}
