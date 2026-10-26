import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {audioBrowser} from './audio-browser.mjs';
import {newCampaign,serializeCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS,decideDomesticProposal} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts} from '../domestic-feedback.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';

const host=await audioBrowser(4316),out=fileURLToPath(new URL('../.local/officer-voice-ui/',import.meta.url)),errors=[];
await mkdir(out,{recursive:true});
async function instrument(page){
 page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{
  const {GameAudio}=await import('./game-audio.mjs'),{OfficerVoicePlayer}=await import('./officer-voice-player.mjs');
  window.spoken=[];const unlock=GameAudio.prototype.unlock,start=OfficerVoicePlayer.prototype.start;
  GameAudio.prototype.unlock=function(...args){window.liveAudio=this;return unlock.apply(this,args);};
  OfficerVoicePlayer.prototype.start=function(line,...args){const ok=start.call(this,line,...args);if(ok)spoken.push({id:line.id,name:line.name,event:line.event,text:line.text,recorded:!!this.current.source});return ok;};
 });
}
const guide=()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
try{
 const page=await host.browser.newPage({viewport:{width:1440,height:1000}});await page.addInitScript(guide);await page.goto(host.url);await page.locator('[data-action="settings"]').waitFor();await instrument(page);
 await page.locator('[data-action="settings"]').click();await page.waitForFunction(()=>liveAudio.active);
 assert.equal(await page.locator('[data-audio-volume="voice"]').inputValue(),'85');
 await page.locator('[data-action="audio-voice-preview"]').click();await page.waitForFunction(()=>spoken.some(l=>l.recorded));
 assert.ok(await page.locator('#officer-voice').isVisible());assert.match(await page.locator('#officer-voice').innerText(),/曹操/);await page.screenshot({path:out+'settings-desktop.png'});
 const prefs=await page.evaluate(()=>({...liveAudio.preferences}));
 await page.locator('[data-audio-volume="voice"]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.evaluate(()=>liveAudio.officerVoice.current),null);assert.equal(await page.locator('#officer-voice').isVisible(),false);assert.equal(await page.evaluate(()=>liveAudio.preferences.music),prefs.music);assert.equal(await page.evaluate(()=>liveAudio.play('confirm')),true);
 await page.locator('[data-audio-volume="voice"]').evaluate(el=>{el.value='62';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-action="audio-voice-preview"]').click();await page.waitForFunction(()=>liveAudio.officerVoice.current?.source);
 await page.screenshot({path:out+'settings-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.audio-settings [data-action="audio-toggle"]').click();assert.equal(await page.evaluate(()=>liveAudio.officerVoice.current),null);await page.locator('.audio-settings [data-action="audio-toggle"]').click();
 await page.reload();await page.locator('[data-action="settings"]').waitFor();await instrument(page);await page.locator('[data-action="settings"]').click();assert.equal(await page.locator('[data-audio-volume="voice"]').inputValue(),'62');await page.locator('.modal [data-action="close"]').click();
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-action="campaign-lobby"]').click();await page.locator('[data-action="launch-custom"]').click();await page.locator('[data-action="scenario-launch-confirm"]').click();await page.keyboard.press('Escape');
 await page.locator('[data-action="pause"]').click();await page.waitForFunction(()=>spoken.some(l=>l.event==='start'&&l.recorded),{},{timeout:15000});
 await page.locator('[data-action="speed"]').click();await page.locator('[data-action="speed"]').click();
 await page.waitForFunction(()=>spoken.some(l=>['tactic','heal'].includes(l.event)&&l.recorded),{},{timeout:45000});await page.screenshot({path:out+'battle-desktop.png'});
 await page.locator('[data-action="pause"]').click();
 const spokenCount=await page.evaluate(()=>spoken.length);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>spoken.length),spokenCount);
 const cached=await page.evaluate(async()=>{
  await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(ok=>navigator.serviceWorker.addEventListener('controllerchange',ok,{once:true}));
  await liveAudio.officerVoice.warmLibrary();const entries=Object.values(liveAudio.officerVoice.library);return {count:entries.length,all:(await Promise.all(entries.map(e=>caches.match(e.url)))).every(Boolean)};
 });assert.equal(cached.count,97);assert.equal(cached.all,true);
 await page.context().setOffline(true);
 const offline=await page.evaluate(async()=>{const {officerVoiceLine}=await import('./officer-voice-lines.mjs'),{OFFICER_BY_ID}=await import('./officer-catalog.mjs');liveAudio.officerVoice.buffers.clear();return liveAudio.playOfficer({...officerVoiceLine(OFFICER_BY_ID.cao,'start',{signature:true}),priority:10},{preview:true});});assert.equal(offline,true);assert.equal(await page.evaluate(()=>!!liveAudio.officerVoice.current.source),true);
 const lifecycle=await page.evaluate(async()=>{await liveAudio.setHidden(true);const hidden=liveAudio.officerVoice.current===null&&!liveAudio.voiceSpeaking;await liveAudio.setHidden(false);return {hidden,replayed:liveAudio.officerVoice.current!==null};});assert.deepEqual(lifecycle,{hidden:true,replayed:false});await page.context().setOffline(false);

 // A controlled UI fixture uses real proposal payment and real construction.
 const s=newCampaign(1,'guandu-200','cao'),city=s.cities.find(c=>c.id==='xuchang'),officer=cityStaffStatus(s,city).idle[0].unit;
 const key=Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='build'&&ACTIONS[k].direction==='commerce');
 for(const [k,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&k!==key)city.domestic.cooldowns[k]=1000;
 assert.equal(assignDomestic(s,city.id,'commerce',officer.id),null);beginExecution(s);
 const assignment=s.campaign.domestic.assignments.find(a=>a.officerId===officer.id);assert.ok(assignment.proposal);
 const context=await host.browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),map=await context.newPage();
 await map.addInitScript(guide);await map.addInitScript(raw=>{if(!localStorage.getItem('voice-fixture-seeded')){localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('voice-fixture-seeded','1');}},serializeCampaign(s));
 await map.goto(host.url+'/#strategy');await map.locator('.domestic-proposal').first().waitFor();await instrument(map);
 await map.locator('[data-action="domestic-proposal-approve"]').first().click();await map.waitForFunction(()=>spoken.some(l=>l.event==='acknowledge'&&l.recorded));
 assert.equal(decideDomesticProposal(s,assignment.proposal.id,true),null);
 let completionFixture;
 for(let i=0;i<40;i++){
  if(s.campaign.phase==='planning')beginExecution(s);const before=structuredClone(s),sequence=s.campaign.activity.nextSequence;
  advanceCampaignDay(s);
  if(s.campaign.activity.nodes.some(n=>n.sequence>=sequence&&n.phase==='complete'&&n.result?.reward?.kind==='building'&&n.officerId===officer.id)){completionFixture=before;break;}
  acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(n=>n.id));
 }
 assert.ok(completionFixture,'prepare the day before an actual successful project, retaining any real failures');
 await importSaveFixture(map,serializeCampaign(completionFixture));await map.locator('.national-world').waitFor();await map.locator('[data-action="campaign-run"]').click();
 await map.waitForFunction(()=>spoken.some(l=>l.event==='complete'&&l.recorded),{},{timeout:20000});await map.screenshot({path:out+'strategy-report-desktop.png'});
 await map.setViewportSize({width:390,height:844});assert.ok(await map.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await map.screenshot({path:out+'strategy-report-mobile.png'});
 const strategicSamples=await map.evaluate(()=>spoken);
 await map.reload();await map.locator('.national-world').waitFor();await instrument(map);await map.locator('.modal-header h2').click();await map.waitForTimeout(300);assert.equal(await map.evaluate(()=>spoken.length),0,'loading existing reports must not replay speech');
 assert.deepEqual(errors,[]);
 const result={passed:true,battle:await page.evaluate(()=>spoken),strategic:strategicSamples,strategicAcknowledgement:true,realConstructionReport:true,offline:cached,lifecycle,mobile:true,volumePersisted:true,errors};await writeFile(out+'result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){
 const pages=host.browser.contexts().flatMap(c=>c.pages());
 for(const [i,p]of pages.entries()){await p.screenshot({path:out+'failure-'+i+'.png'}).catch(()=>{});console.error(await p.evaluate(()=>({url:location.href,spoken:window.spoken,current:window.liveAudio?.officerVoice.current?.line,active:window.liveAudio?.active,muted:window.liveAudio?.preferences.muted,body:document.body.innerText.slice(-500)})).catch(()=>null));}
 console.error(errors);throw error;
}finally{await host.close();}
