import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';
import {battleMapPreview} from '../battle-map-view.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,planBattleCouncilsAI,stepBattle,validateSave} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';

const out='work/battle-environment-20261026',port=4349;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}`);
 const coverage=await page.evaluate(async()=>{
  const {BATTLE_MAPS}=await import('./data/design/battle-maps.mjs'),{terrainAreaPath,ENVIRONMENT_WIDTH,ENVIRONMENT_HEIGHT}=await import('./battle-environment-art.mjs'),{hexCenter}=await import('./hex-grid.mjs');
  const ctx=document.createElement('canvas').getContext('2d'),failures=[];
  for(const [id,map]of Object.entries(BATTLE_MAPS))for(const types of [['water','bridge'],['forest'],['hill'],['marsh'],['rock']]){
   const path=new Path2D(terrainAreaPath(map.tiles,types));
   for(let y=0;y<8;y++)for(let x=0;x<14;x++){
    const p=hexCenter(x,y),actual=ctx.isPointInPath(path,p.x*ENVIRONMENT_WIDTH,p.y*ENVIRONMENT_HEIGHT);
    if(actual!==types.includes(map.tiles[y][x]))failures.push({id,x,y,types,actual});
   }
  }
  return {maps:Object.keys(BATTLE_MAPS).length,centers:Object.keys(BATTLE_MAPS).length*112*5,failures};
 });assert.deepEqual(coverage.failures,[]);
 await page.evaluate(async()=>{
  const {BattleArt}=await import('./art-battle.mjs'),update=BattleArt.prototype.update;
  BattleArt.prototype.update=function(b,...args){window.environmentArt=this;window.environmentBattle=b;return update.call(this,b,...args);};
 });
 const captures=[];
 for(const mapId of ['plain-open','forest-stream','hill-pass','marsh-dykes','river-harbor']){
  const entry=([id,type])=>({id,type,troops:4000,level:10}),map=BATTLE_MAPS[mapId],state=generateBattle({...defaultCustomBattle(),seed:20261026,mapId,terrain:map.terrain,battleKind:mapId==='hill-pass'?'siege':'field',
   ownTeam:[['cao','spear'],['dun','spear'],['liao','cavalry'],['chu','halberd'],['yu','crossbow'],['jia','archer']].map(entry),enemyTeam:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','longbow'],['ju','archer'],['tian','spear']].map(entry)});
  planBattleCouncilsAI(state.battle,[0,1]);lockDeployment(state.battle);while(state.battle.tick<9&&!state.battle.result)stepBattle(state.battle,{aiSides:[]});validateSave(state);
  await importSaveFixture(page,state);
  await page.waitForFunction(id=>window.environmentBattle?.mapId===id&&environmentArt.models?.objects.size>0,mapId);await page.locator('.battle-environment').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-painted-building="loading"]'));
  assert.equal(await page.locator('#battle-board [data-map-terrain]').count(),112);
  const before=await page.evaluate(()=>{document.getElementById('toast').style.display='none';return JSON.stringify(environmentBattle);});await page.screenshot({path:out+'/'+mapId+'.png'});await page.locator('#battle-board').screenshot({path:out+'/'+mapId+'-detail.png'});
  await page.evaluate(()=>document.getElementById('toast').style.display='');
  const inspection=await page.evaluate(()=>({nodes:document.querySelector('.battle-environment').querySelectorAll('*').length,oldProps:[...environmentArt.models.objects.keys()].filter(id=>id.startsWith('ground-')),grid: getComputedStyle(document.querySelector('.hex-grid>polygon')).stroke,terrainLabels:[...document.querySelectorAll('.terrain-cell-label')].every(n=>getComputedStyle(n).opacity==='0')}));
  assert.deepEqual(inspection.oldProps,[]);assert.ok(inspection.nodes<4000);assert.ok(inspection.terrainLabels);assert.equal(await page.evaluate(()=>JSON.stringify(environmentBattle)),before);
  captures.push({mapId,...inspection});
  if(mapId==='hill-pass'){
   await page.locator('[data-action="inspect-gate"]').focus();await page.keyboard.press('Enter');assert.match(await page.locator('.modal').innerText(),/12,000/);await page.locator('.modal [data-action="close"]').first().click();assert.equal(await page.evaluate(()=>JSON.stringify(environmentBattle)),before);
  }
 }
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:out+'/mobile-river.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:out+'/reduced-motion.png'});
 const gallery=await browser.newPage({viewport:{width:1500,height:1100}}),ids=['plain-open','forest-stream','hill-pass','marsh-dykes','river-twin-bridges','river-harbor'];
 await gallery.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#202b24;color:#dfd5b5;font:14px Microsoft YaHei,sans-serif}h1{font-size:20px;font-weight:500;margin:0 0 18px}.maps{display:grid;grid-template-columns:1fr 1fr;gap:18px}.battle-map-preview{margin:0;overflow:hidden;border:1px solid #afab7730;border-radius:6px;background:#29392b}.battle-map-preview>div{padding:10px 14px;display:flex;justify-content:space-between;font-size:13px}.battle-map-preview span{font-size:10px;opacity:.55}.battle-map-preview svg{display:block;width:100%;height:auto}</style><h1>战场环境 · 连续地表、林带、坡地与水岸</h1><div class="maps">${ids.map(mapId=>battleMapPreview({mapId})).join('')}</div>`);
 await gallery.screenshot({path:out+'/environments.png',fullPage:true});
 await gallery.goto(`http://127.0.0.1:${port}`);await gallery.locator('[data-action="settings"]').first().waitFor();
 await gallery.evaluate(async()=>{
  const {battleBuildingArtwork,decorateBattleBuildings}=await import('./battle-building-art.mjs'),host=document.createElement('section');
  host.id='building-gallery';host.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;display:flex;gap:22px;padding:30px;background:#616e46;color:#e9dec4;font:12px Microsoft YaHei';
  host.innerHTML=['gate','arrowTower','musicStage','aidCamp','granary'].map(kind=>`<div style="width:180px;text-align:center">${battleBuildingArtwork({type:kind==='gate'?'gate':'building',kind,side:0,hp:2000,maxHp:2000,level:2})}${({gate:'城门',arrowTower:'箭楼',musicStage:'军乐台',aidCamp:'救护营',granary:'粮仓'})[kind]}</div>`).join('');
  document.body.append(host);for(const svg of host.querySelectorAll('svg'))svg.style.cssText='width:180px;height:180px;display:block';decorateBattleBuildings(host);
 });await gallery.waitForFunction(()=>!document.querySelector('#building-gallery [data-painted-building="loading"]'));assert.equal(await gallery.locator('#building-gallery [data-painted-building="ready"]').count(),5);await gallery.locator('#building-gallery').screenshot({path:out+'/buildings.png'});
 const fallback=await browser.newPage();await fallback.route('**/assets/town/*.png',route=>route.fulfill({status:404,body:''}));await fallback.goto(`http://127.0.0.1:${port}`);await fallback.locator('[data-action="settings"]').first().waitFor();
 await fallback.evaluate(async()=>{const {battleBuildingArtwork,decorateBattleBuildings}=await import('./battle-building-art.mjs'),host=document.createElement('div');host.id='missing-building';host.innerHTML=battleBuildingArtwork({type:'building',kind:'arrowTower',side:0,hp:2000,maxHp:2000,level:2});document.body.append(host);decorateBattleBuildings(host);});
 await fallback.waitForFunction(()=>document.querySelector('#missing-building svg').dataset.paintedBuilding==='failed');assert.ok(await fallback.locator('#missing-building .battle-building-fallback').isVisible());await fallback.close();
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,coverage,captures,buildingAssets:true,missingBuildingFallback:true,gateInspection:true,mobile:true,reducedMotion:true,errors},null,2));console.log(JSON.stringify({passed:true,out,coverage,captures,errors}));
}finally{await browser?.close();server.kill();}
