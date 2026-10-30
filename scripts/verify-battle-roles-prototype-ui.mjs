import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const out=args.out||'work/battle-roles-prototype/ui',url=args.url||'http://127.0.0.1:4349';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto(url+'/play.html');await page.screenshot({path:out+'/launcher.png',fullPage:true});await page.locator('[data-save="'+(args.save||'guan-ready')+'"]').click();await page.locator('#battle-board').waitFor({timeout:30000});
 await page.evaluate(async()=>{const {BattleEffects}=await import('./battle-effects.mjs'),original=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,o){window.trialBattle=b;return original.call(this,b,o);};});
 await page.locator('[data-action="choose-stratagem"]').click();await page.locator('[data-command="fortify"]').click();
 const before=await page.evaluate(()=>({tick:trialBattle.tick,resource:trialBattle.commandProgress,serial:trialBattle.commandSerial}));
 await page.screenshot({path:out+'/select-area.png',fullPage:true});
 // Actual board selection and confirmation, never direct state writes.
 const point=await page.evaluate(async id=>{const {areaPosition,AREA_HEIGHT}=await import('./stratagem-area.mjs'),{HEX_GRID}=await import('./hex-grid.mjs');const p=areaPosition(trialBattle.sides[0].units.find(u=>u.id===id)),r=document.querySelector('#battle-board').getBoundingClientRect();return {x:r.left+p.x/HEX_GRID.width*r.width,y:r.top+p.y/AREA_HEIGHT*r.height};},args.unit||'person-99');await page.mouse.click(point.x,point.y);
 await page.locator('[data-area-action="confirm"]').click();
 const after=await page.evaluate(()=>({tick:trialBattle.tick,resource:trialBattle.commandProgress,serial:trialBattle.commandSerial,layers:trialBattle.sides[0].units.flatMap(u=>(u.statuses.shield?.layers||[]).filter(l=>l.source==='command:fortify').map(l=>({id:u.id,...l})))}));
 assert.equal(after.tick,before.tick);assert.equal(after.resource,0);assert.equal(after.serial,before.serial+1);assert.ok(after.layers.length>0);assert.ok(after.layers.every(l=>l.until===after.tick+6));
 await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.setViewportSize({width:1600,height:1000});await page.locator('[data-action="pause"]').first().click();await page.waitForFunction(t=>trialBattle.tick>t+8,before.tick,{timeout:30000});await page.locator('[data-action="pause"]').first().click();
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,before,after,errors},null,2));console.log(JSON.stringify({passed:true,before,after}));
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});console.log(await page.locator('button').evaluateAll(es=>es.map(e=>({t:e.textContent,a:e.dataset.action,area:e.dataset.areaAction})).slice(-35)));throw e;}
finally{await browser.close();}
