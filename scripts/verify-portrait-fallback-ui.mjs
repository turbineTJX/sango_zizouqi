import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const port=4393,out='outputs/portrait-fallback',errors=[];
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(save=>{localStorage.setItem('sango-sovereign-v2',save);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(newCampaign(81,'guandu-200')));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 await page.waitForFunction(async()=>Object.keys((await import('/art-assets.mjs')).art.pack.portraits).length===832);
 if(await page.locator('#modal-title').count()){
  assert.equal(await page.locator('#modal-title').innerText(),'战略奏报');await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 }
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),before=await saved();
 await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();
 const original=page.locator('[data-art-portrait="chu"] img');await original.evaluate(img=>{img.loading='eager';return img.decode();});
 assert.match(await original.getAttribute('src'),/^\/local-art\/files\//);
 await page.screenshot({path:out+'/roster-desktop.png',animations:'disabled'});
 await page.locator('[data-action="faction-object"][data-id="chu"]').click();
 await page.locator('.info-portrait img').evaluate(img=>{img.loading='eager';return img.decode();});
 await page.screenshot({path:out+'/detail-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:out+'/detail-landscape.png',animations:'disabled'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(await saved(),before);
 const coverage=await page.evaluate(async()=>{
  const {art}=await import('/art-assets.mjs'),{BASE_OFFICER_CATALOG}=await import('/officer-catalog.mjs');
  const missing=BASE_OFFICER_CATALOG.filter(o=>!art.portraitURL(o.id)).map(o=>o.id);
  const pairs=['person-429','person-430','person-514','person-515','person-612','person-613','person-614'].map(id=>[id,art.portraitURL(id)]);
  const high=art.portraitURL('cao'),backup=art.pack.portraits.cao;
  const urls=[...new Set(Object.values(art.pack.portraits))];let decoded=0;
  for(let i=0;i<urls.length;i+=16)await Promise.all(urls.slice(i,i+16).map(url=>new Promise((ok,no)=>{const img=new Image();img.onload=()=>{decoded++;ok();};img.onerror=()=>no(Error('Decode failed '+url));img.src=url;})));
  return {missing,pairs,high,backup,decoded,mapped:BASE_OFFICER_CATALOG.length};
 });
 assert.deepEqual(coverage.missing,[]);assert.equal(coverage.decoded,761);assert.notEqual(coverage.pairs[0][1],coverage.pairs[1][1]);assert.notEqual(coverage.pairs[2][1],coverage.pairs[3][1]);assert.equal(new Set(coverage.pairs.slice(4).map(p=>p[1])).size,3);
 assert.match(coverage.high,/assets\/officers\/generated\//);
 // Exercise a real image failure, retaining the original source as the final fallback.
 const fallback=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 await fallback.route('**/assets/officers/generated/**',route=>route.fulfill({status:404,body:'missing'}));await fallback.goto(`http://127.0.0.1:${port}/`);
 await fallback.evaluate(async()=>{const {art}=await import('/art-assets.mjs');await art.init();const root=document.createElement('div');root.id='fallback-probe';root.innerHTML='<span class="portrait" data-art-portrait="cao"><span>曹</span></span>';document.body.append(root);art.decorate(root);});
 await fallback.waitForFunction(url=>document.querySelector('#fallback-probe img')?.getAttribute('src')===url&&document.querySelector('#fallback-probe img')?.naturalWidth>0,coverage.backup);
 assert.deepEqual(errors,[]);
 const portable=JSON.parse(await readFile('art/playtest/manifest.json','utf8'));assert.equal(Object.keys(portable.public.portraits).length,832);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,...coverage,checks:['actual roster and detail','desktop and landscape','832 mapped, 761 unique portraits decoded','homonyms retain distinct originals','HD priority','failed HD falls back to original','viewing preserves save','portable pack'],errors},null,2)+'\n');
 console.log('PASS 832 portrait mappings, 761 decoded originals, desktop/landscape, HD priority and real image-failure fallback');
}catch(error){await page?.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
