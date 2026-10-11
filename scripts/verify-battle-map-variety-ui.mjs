import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {battleMapPreview} from '../battle-map-view.mjs';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {validateSave} from '../engine.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/battle-map-variety',port=4264;
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 await page.route('**/art-battle.mjs',async route=>{
  const response=await route.fetch(),body=(await response.text()).replace('this.models?.update(this.snapshot);','window.battleMapArtSnapshot=this.snapshot;this.models?.update(this.snapshot);');
  await route.fulfill({response,body});
 });
 await page.addInitScript(()=>{
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  const fixture=sessionStorage.getItem('battle-map-verify');if(fixture)localStorage.setItem('sango-historical-battle-v1',fixture);
 });
 page.on('pageerror',e=>errors.push(e.message));
 const action=a=>page.locator(`[data-action="${a}"]`);
 await page.goto(`http://127.0.0.1:${port}`);await action('campaign-lobby').click();
 const selector=page.locator('[data-custom-option="mapId"]');
 assert.equal(await selector.locator('option').count(),22);
 for(const [id,m] of Object.entries(BATTLE_MAPS)){
  await selector.selectOption(id);
  assert.equal(await page.locator('[data-custom-option="terrain"]').inputValue(),m.terrain);
  assert.match(await page.locator('.battle-map-preview').innerText(),new RegExp(m.name));
  assert.equal(await page.locator('.battle-map-preview [data-map-terrain]').count(),112);
 }
 await selector.selectOption('hill-pass');
 await page.locator('.battle-map-preview').screenshot({path:out+'/pass-preview.png'});
 await action('launch-custom').click();await action('scenario-launch-confirm').click();await page.locator('#battle-board').waitFor();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sango-historical-battle-v1')));
 assert.equal(saved.battle.mapId,'hill-pass');validateSave(saved);
 await page.waitForFunction(()=>window.battleMapArtSnapshot?.mapId==='hill-pass');
 assert.equal(await page.locator('#battle-board [data-map-terrain="rock"]').count(),BATTLE_MAPS['hill-pass'].tiles.flat().filter(t=>t==='rock').length);
 await page.screenshot({path:out+'/pass-desktop.png'});
 await page.reload();await page.locator('#battle-board').waitFor();
 assert.match(await page.locator('.battlefield-name').innerText(),/狭口雄关/);
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile battle overflow');
 await page.screenshot({path:out+'/pass-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 for(const id of ['xiapi','guandu','chibi','hefei','yiling','wuzhang','river-harbor']){
  const state=generateBattle(id==='river-harbor'?{...defaultCustomBattle(),terrain:'river',mapId:id}:historicalBattleDraft(id));
  validateSave(state);
  await page.evaluate(state=>sessionStorage.setItem('battle-map-verify',JSON.stringify(state)),state);
  await page.reload();await page.locator('#battle-board').waitFor();
  assert.equal(await page.locator('#battle-board [data-map-terrain]').count(),112);
  assert.match(await page.locator('.battlefield-name').innerText(),new RegExp(BATTLE_MAPS[id].name));
  await page.waitForFunction(id=>window.battleMapArtSnapshot?.mapId===id,id);
  await page.screenshot({path:out+'/'+id+'.png'});
 }
 // A contact sheet makes the topology differences reviewable in one artifact.
 const sheet=await browser.newPage({viewport:{width:1500,height:1100}});
 const ids=['plain-crossroads','hill-pass','forest-ravine','marsh-dykes','river-twin-bridges','river-harbor','xiapi','guandu','chibi','hefei','yiling','wuzhang'];
 const html=`<!doctype html><meta charset="utf-8"><title>战场地图总览</title><style>body{margin:0;padding:24px;background:#17231d;color:#e3d8b5;font:16px system-ui}h1{margin:0 0 8px;font-size:26px}body>p{margin:0 0 24px;color:#afbea6}.maps{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.battle-map-preview{margin:0;border:1px solid #69715b;border-radius:8px;overflow:hidden;background:#24362a}.battle-map-preview>div{display:flex;justify-content:space-between;padding:12px}.battle-map-preview>div>span{font-size:11px;color:#a2b397}.battle-map-preview svg{width:100%;display:block}.battle-map-preview p{font-size:12px;line-height:1.7;margin:0;padding:12px;color:#b9c5b0;min-height:42px}</style><h1>战场地图总览</h1><p>普通战场与历史战场 · 山壁、渡桥、堤道、林谷与港湾</p><div class="maps">${ids.map(mapId=>battleMapPreview({mapId,terrain:BATTLE_MAPS[mapId].terrain})).join('')}</div>`;
 writeFileSync(out+'/index.html',html);
 await sheet.setContent(html);await sheet.screenshot({path:out+'/overview.png',fullPage:true});await sheet.close();
 assert.deepEqual(errors,[]);
 writeFileSync(out+'/result.json',JSON.stringify({passed:true,mapCount:21,previewCells:112,reload:true,mobile:true,errors},null,2));
 console.log('PASS 21 map previews, terrain selection, launch, reload, six historical boards, harbor, desktop and mobile');
}finally{await browser?.close();server.kill();}
