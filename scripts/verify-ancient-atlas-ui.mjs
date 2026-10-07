import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {atlasPosition,ATLAS_CITY_POINTS} from '../data/design/ancient-atlas.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/ancient-atlas',port='4228';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const save=serializeCampaign(newCampaign(217,'guandu-200'));
 await page.addInitScript(save=>{if(!sessionStorage.getItem('atlas-fixture')){localStorage.setItem('sango-sovereign-v2',save);sessionStorage.setItem('atlas-fixture','1');}},save);
 await page.goto(`http://127.0.0.1:${port}/#strategy`);const main=page.locator('.national-world'),radar=page.locator('[data-strategy-radar]');await main.waitFor();
 assert.equal(await main.locator('[data-city]').count(),76);assert.equal(await main.locator('[data-junction]').count(),70);
 assert.equal(await main.locator('[data-city-size="large"] rect.city-size-mark').count(),42);assert.equal(await main.locator('[data-city-size="small"] circle.city-size-mark').count(),34);
 assert.equal(await radar.locator('[data-city-size="large"] rect').count(),42);assert.equal(await radar.locator('[data-city-size="small"] circle').count(),34);
 assert.equal(await main.locator('[data-city="atlas-jingxing"]').count(),1);assert.equal(await main.locator('[data-junction="atlas-jingxing"]').count(),0);assert.equal(await main.locator('.node-gate .atlas-gate-outline').count(),12);
 assert.equal(await main.locator('[data-city="xuchang"] .map-city-model').getAttribute('transform'),'scale(1)');assert.equal(await main.locator('[data-city="atlas-hefei"] .map-city-model').getAttribute('transform'),'scale(0.7)');
 const sync=async()=>{const v=await main.evaluate(el=>Object.fromEntries(['x','y','width','height'].map(k=>[k,el.viewBox.baseVal[k]]))),r=await radar.locator('.radar-viewport').evaluate(el=>Object.fromEntries(['x','y','width','height'].map(k=>[k,+el.getAttribute(k)])));for(const k in v)assert.ok(Math.abs(v[k]-r[k])<.001);return v;};
 for(const id of ['xuchang','town-18','luoyang','town-40','town-23','atlas-dunhuang','atlas-zhangye','atlas-panyu','atlas-longbian']){
  const pos=atlasPosition(ATLAS_CITY_POINTS[id]),pin=main.locator(`[data-city="${id}"]`);assert.equal(+await pin.getAttribute('data-x'),pos.x);assert.equal(+await pin.getAttribute('data-y'),pos.y);
 }
 const before=await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2'));
 await page.screenshot({path:out+'/local-desktop.png'});
 await page.locator('[data-map-view="national"]').click();await sync();await page.screenshot({path:out+'/national-desktop.png'});
 // Export the real terrain, labels and route geometry at full atlas resolution.
 let svg=await main.evaluate(el=>{const clone=el.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('viewBox','0 0 1024 1024');clone.setAttribute('style','width:1024px;height:1024px;max-height:none');clone.querySelector('.map-territories')?.remove();clone.querySelectorAll('script').forEach(g=>g.remove());return clone.outerHTML;});
 const css=(await Promise.all(['styles.css','strategic.css','art.css','classical.css','strategic-workspace.css','city-scene.css'].map(file=>readFile(file,'utf8')))).join('\n');
 svg=svg.replace(/(<svg[^>]*>)/,`$1<style>${css}</style>`).replace(/href="(?:\.\/)?assets\//g,'href="../../assets/');
 await writeFile(out+'/reconstructed-map.svg',svg);
 const preview=await browser.newPage({viewport:{width:1024,height:1024}});await preview.goto(`http://127.0.0.1:${port}/${out}/reconstructed-map.svg`);await preview.evaluate(()=>document.fonts.ready);await preview.screenshot({path:out+'/reconstructed-map.png'});await preview.close();
 await page.locator('#map-season').selectOption('winter');assert.equal(await main.locator('.drawn-terrain').getAttribute('data-season'),'winter');await page.screenshot({path:out+'/winter-desktop.png'});
 await page.locator('#map-season').selectOption('summer');
 await page.locator('#national-city-search').selectOption('atlas-hefei');assert.match(await page.locator('[data-info-section="overview"]').innerText(),/小城/);await page.locator('[data-action="map-city-inspect"]').click();assert.equal(await main.locator('.is-town-focused .city-scene').getAttribute('data-scene-city'),'atlas-hefei');assert.equal(await main.locator('.is-town-focused [data-city-building]').count(),9);await sync();await page.screenshot({path:out+'/small-city-interior.png'});await page.locator('[data-map-view="national"]').click();
 await page.locator('#national-city-search').selectOption('atlas-qiao');assert.equal(await page.locator('#modal-title').innerText(),'谯');assert.equal(await page.locator('.modal [data-action="city-domestic"]').count(),1);await page.locator('[data-action="map-city-inspect"]').click();assert.equal(await main.locator('.is-town-focused .city-scene').getAttribute('data-scene-city'),'atlas-qiao');assert.equal(await main.locator('.is-town-focused [data-city-building]').count(),9);await sync();await page.screenshot({path:out+'/added-city-interior.png'});
 await page.locator('[data-map-view="national"]').click();await page.locator('#national-city-search').selectOption('atlas-jincheng');assert.equal(await page.locator('#modal-title').innerText(),'金城');await page.locator('[data-action="close"]').click();await page.locator('[data-map-view="selected"]').click();await sync();await page.screenshot({path:out+'/northwest-desktop.png'});
 await page.locator('#national-city-search').selectOption('town-40');await page.locator('[data-action="close"]').click();await page.locator('[data-map-view="selected"]').click();await sync();await page.screenshot({path:out+'/shu-desktop.png'});
 await page.locator('#national-city-search').selectOption('xuchang');await page.locator('[data-action="close"]').click();await page.locator('[data-map-view="city"]').click();assert.equal(await main.locator('.is-town-focused [data-city-building]').count(),9);await sync();
 await page.locator('[data-map-view="national"]').click();const b=await radar.boundingBox();await radar.click({position:{x:b.width*.4,y:b.height*.65}});await sync();
 await main.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await sync();
 assert.equal(await page.evaluate(()=>localStorage.getItem('sango-sovereign-v2')),before);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-map-view="selected"]').click();await sync();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mobile.png'});
 await page.reload();await main.waitFor();await sync();assert.deepEqual(errors,[]);
 const lobby=await browser.newPage({viewport:{width:1600,height:1050}});lobby.on('pageerror',e=>errors.push(e.message));await lobby.goto(`http://127.0.0.1:${port}/`);await lobby.locator('[data-action="strategy"]').click();assert.equal(await lobby.locator('[data-selection-city][data-city-size="large"] rect').count(),42);assert.equal(await lobby.locator('[data-selection-city][data-city-size="small"] circle').count(),34);await lobby.screenshot({path:out+'/lobby-desktop.png'});await lobby.close();assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,checks:['76 cities: 42 large / 34 small; 12 gates / 35 ports / 23 junctions','square/circle markers and city model scale in main, radar and lobby','Jingxing is a real small city','atlas city positions','new city search and management menu','large and small city interiors','main/radar synchronization','national/local/season views','keyboard and radar','read-only navigation','mobile layout','save reload']},null,2));
 console.log('PASS ancient atlas: layout, terrain, radar, city zoom, mobile and reload');
}finally{await browser?.close();server.kill();}
