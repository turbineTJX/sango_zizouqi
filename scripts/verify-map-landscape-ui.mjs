import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';

const out='outputs/map-landscape-review',port='4387',errors=[],results=[];
const manual=process.argv.includes('--capture-manual'),captures={};
const hash=createHash('sha256');
for(const file of ['national-map-view.mjs','art-strategic-map.mjs','map-label-layout.mjs','map-overview-art.mjs','map-overview-layout.mjs','map-detail-level.mjs','road-network-view.mjs','strategic-movement.mjs','road-geometry.mjs','map-landscape.mjs','ancient-atlas-terrain.mjs','strategic-army-markers.mjs','strategic.css','town-layout.mjs','city-scene.mjs','city-scene.css','strategic-relief.mjs','strategic-vision.mjs','assets/manifest.json'])hash.update(file).update(await readFile(file));
const sourceHash=hash.digest('hex');
const capture=async(id,title)=>{
 if(!manual)return;
 await page.mouse.move(2,2);await page.screenshot({path:`docs/images/player-actions/${id}.webp`,type:'webp',quality:88,animations:'disabled'});
 captures[id]={title,file:`images/player-actions/${id}.webp`,group:['map','city-menu'].includes(id)?'civic':'extras',sample:'官渡剧本演示开局，种子81',viewport:page.viewportSize(),capturedAt:new Date().toISOString(),sourceHash};
};
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Map server exited: '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [name,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:844,height:390}],['portrait',{width:390,height:844}]]){
  if(process.argv.includes('--desktop-only')&&name!=='desktop')continue;
  page=await browser.newPage({viewport,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>{
   localStorage.setItem('sango-sovereign-v2',raw);
   localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  },serializeCampaign(newCampaign(81,'guandu-200')));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
  await page.waitForLoadState('networkidle');
  const saved=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  const inspect=async kind=>{
   const data=await page.locator('.national-world').evaluate(async svg=>{
    const {isLandPoint}=await import('/national-geography.mjs'),inverse=svg.getScreenCTM().inverse();
    const names=[];
    for(const label of svg.querySelectorAll('.map-metropolis:not(.is-marker-hidden):not(.is-label-hidden) .metropolis-label')){
     if(getComputedStyle(label.closest('.map-metropolises')).display==='none')continue;
     const r=label.getBBox(),matrix=label.getScreenCTM(),name=label.closest('[data-metropolis-focus]').dataset.metropolisFocus;
     if(!matrix)continue;
     for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){
      const p=new DOMPoint(r.x+r.width*i/4,r.y+r.height*j/4).matrixTransform(matrix).matrixTransform(inverse);
      if(p.x<0||p.x>1024||p.y<0||p.y>1024||!isLandPoint(p.x,p.y))throw Error(name+' label outside painted land');
     }
     names.push(name);
    }
    for(const label of svg.querySelectorAll('.overview-place-name')){
     const glyph=label.closest('[data-map-overview-glyph]');
     if(getComputedStyle(glyph).display==='none'||getComputedStyle(label).display==='none')continue;
     const r=label.getBBox(),matrix=label.getScreenCTM(),name=label.textContent;
     for(let i=0;i<=4;i++)for(let j=0;j<=4;j++){
      const p=new DOMPoint(r.x+r.width*i/4,r.y+r.height*j/4).matrixTransform(matrix).matrixTransform(inverse);
      if(p.x<0||p.x>1024||p.y<0||p.y>1024||!isLandPoint(p.x,p.y))throw Error(name+' name outside painted land');
     }
     names.push(name);
    }
    return {names,clip:svg.querySelector('.national-map-content')?.getAttribute('clip-path'),cities:svg.querySelectorAll('[data-city]').length,distant:+svg.dataset.distantBlend,icons:[...svg.querySelectorAll('[data-map-overview-glyph]')].filter(n=>getComputedStyle(n).display!=='none'&&+n.style.opacity>0).length,models:[...svg.querySelectorAll('.map-city-model')].filter(n=>getComputedStyle(n).display!=='none'&&+n.style.opacity>0).length};
   });
   assert.equal(data.cities,76);assert.equal(data.clip,'url(#national-map-extent)');
   if(kind==='national'&&name==='desktop')assert.ok(data.names.length>=12,'national map must retain useful city names');
   if(kind==='national'){assert.equal(data.distant,1);assert.equal(data.models,0);assert.ok(data.icons>=6&&data.icons<=42,'national map should contain sparse main cities');}
   if(kind==='national'){
    const architecture=await page.locator('[data-city="xuchang"] .overview-architecture').boundingBox();
    assert.ok(architecture.width>=26&&architecture.height>=18,'national architecture must remain large enough to recognize');
   }
   if(kind==='region'){assert.equal(data.distant,0);assert.equal(data.icons,0);assert.ok(data.models>0);}
   results.push({name,kind,labels:data.names.length,icons:data.icons,models:data.models});
   await page.screenshot({path:`${out}/after-${name}-${kind}.png`});
  };
  await inspect('region');if(name==='desktop')await capture('map','天下地图与进行按钮');
  await page.locator('[data-map-view="national"]').click();await inspect('national');
  await page.locator('[data-city="xuchang"] [data-map-overview-glyph] .overview-site-hit').click();
  await page.locator('.city-command-menu').waitFor();await page.locator('.city-command-menu [data-action="map-object-close"]').click();
  await page.locator('.map-search>summary').click();await page.locator('#national-city-search').selectOption('xuchang');
  if(name==='desktop')await capture('city-menu','城市一级命令');
  await page.locator('.city-command-menu [data-action="map-city-inspect"]').click();
  await page.locator('.national-world.map-close .is-town-focused .city-scene').waitFor();
  await inspect('city');if(name==='desktop')await capture('city-interior','近看城内建筑与施工');
  const site=page.locator('.is-town-focused .map-city-scene [data-city-building="commerce"] .city-district-hit');
  await site.click();assert.equal(await page.locator('.city-building-card').count(),1);
  if(name==='desktop')await capture('building-detail','建筑等级状态与负责人');
  assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,results,errors},null,2));
 if(manual){const path='docs/images/player-actions/captures.json',existing=JSON.parse(await readFile(path,'utf8'));await writeFile(path,JSON.stringify({...existing,...captures},null,2)+'\n');}
 console.log('PASS: 76 city anchors, inland labels, map clipping, three zoom levels, building details and unchanged saves on '+(process.argv.includes('--desktop-only')?'desktop.':'desktop/mobile.'));
}catch(error){await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
