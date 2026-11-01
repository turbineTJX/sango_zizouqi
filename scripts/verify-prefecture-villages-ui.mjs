import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';

const out='outputs/prefecture-villages',port='4391',errors=[],results=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:844,height:390}]]){
  page=await browser.newPage({viewport,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(newCampaign(81,'guandu-200')));
  await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();await page.waitForLoadState('networkidle');
  const svg=page.locator('.national-world');
  const saved=await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
  const inspect=async level=>{
   await page.mouse.move(2,2);
   const data=await svg.evaluate(svg=>{
    const shown=node=>{for(let p=node;p&&p!==svg.parentElement;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||+s.opacity<.15)return false;}return true;};
    const labels=[...svg.querySelectorAll('.national-place-name,.junction-name,.metropolis-name,.overview-place-name')].filter(shown).map(node=>{const r=node.getBoundingClientRect();return {name:node.textContent,x:r.x,y:r.y,w:r.width,h:r.height};}).filter(r=>r.x>=0&&r.y>=0&&r.x+r.w<=innerWidth&&r.y+r.h<=innerHeight);
    const collisions=[];for(let i=0;i<labels.length;i++)for(const b of labels.slice(i+1)){const a=labels[i];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)collisions.push([a.name,b.name]);}
    return {labels:labels.length,collisions,villages:[...svg.querySelectorAll('.prefecture-village')].filter(shown).length,level:svg.dataset.mapDetail};
   });
   assert.deepEqual(data.collisions,[],name+' '+level+' names overlap');
   assert.ok(data.labels<=28,name+' '+level+' too many labels');
   results.push({name,view:level,...data});
   await page.screenshot({path:`${out}/${name}-${level}.png`});
   return data;
  };
  await inspect('region');await page.locator('[data-map-view="national"]').click();const national=await inspect('national');assert.equal(national.villages,0);
  await svg.evaluate(svg=>svg.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id:'junction:chenliu:xuchang'}})));
  const close=await inspect('village');assert.ok(close.villages>0);assert.equal(close.level,'interior');
  assert.equal(await page.locator('[data-junction="junction:chenliu:xuchang"] .map-city-scene .village-house').count(),10);
  await svg.focus();for(let i=0;i<8;i++)await page.keyboard.press('-');const surroundings=await inspect('surroundings');assert.equal(surroundings.level,'settlements');assert.ok(surroundings.villages>0);
  if(name==='desktop')for(const [area,id,zoomOut] of [['jiangnan','junction:town-23:town-24',1],['xiangnan','junction:town-32:town-34',7]]){
   await svg.evaluate((svg,id)=>svg.dispatchEvent(new CustomEvent('map-inspect-city',{detail:{id}})),id);
   await svg.focus();for(let i=0;i<zoomOut;i++)await page.keyboard.press('-');await inspect(area);
  }
  assert.equal(await page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/ui-result.json`,JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,results}));
}catch(error){await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
