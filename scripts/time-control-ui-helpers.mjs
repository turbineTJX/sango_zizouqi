// Exercise the player's clock controls rather than exposing simulation steps.
const playback=page=>page.locator('.turn-seal,#battle-playback [data-action="pause"]').filter({visible:true}).first();
async function waitForSavedProgress(page,check,arg){
 const deadline=Date.now()+180000;
 // waitForFunction treats a Promise as truthy before its value is available.
 // evaluate awaits IndexedDB reads, so only committed progress ends this wait.
 while(!await page.evaluate(check,arg)){
  if(Date.now()>=deadline)throw Error('Timed out waiting for committed game progress');
  await page.waitForTimeout(100);
 }
}
export async function resumePlayerTime(page){
 const control=playback(page),label=await control.getAttribute('aria-label')||await control.innerText();
 if(label!=='暂停')await control.click();
}
export async function pausePlayerTime(page){
 const control=playback(page);
 if(await control.count()&&(await control.getAttribute('aria-label')||await control.innerText())==='暂停')await control.click();
}
export async function runCampaignDay(page){
 const day=await page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')).campaign.day);
 await resumePlayerTime(page);
 await waitForSavedProgress(page,async before=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')).campaign.day>before,day);
 await pausePlayerTime(page);
 await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')!=='true');
}
export async function playBattleTicks(page,key,count=10){
 const tick=await page.evaluate(async key=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame(key)).battle.tick,key);
 await resumePlayerTime(page);
 await waitForSavedProgress(page,async ({key,tick})=>{const b=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame(key)).battle;return b.tick>=tick||!!b.result;},{key,tick:tick+count});
 await pausePlayerTime(page);
}
