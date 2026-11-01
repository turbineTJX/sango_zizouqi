// Exercise the player's clock controls rather than exposing simulation steps.
const playback=page=>page.locator('.turn-seal,#battle-playback [data-action="pause"]').filter({visible:true}).first();
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
 await page.waitForFunction(async before=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')).campaign.day>before,day,{timeout:180000});
 await pausePlayerTime(page);
 await page.waitForFunction(()=>document.querySelector('.world-turn')?.getAttribute('aria-busy')!=='true');
}
export async function playBattleTicks(page,key,count=10){
 const tick=await page.evaluate(async key=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame(key)).battle.tick,key);
 await resumePlayerTime(page);
 await page.waitForFunction(async ({key,tick})=>{const b=JSON.parse(await(await import('/save-storage.mjs')).readSavedGame(key)).battle;return b.tick>=tick||!!b.result;},{key,tick:tick+count},{timeout:180000});
 await pausePlayerTime(page);
}
