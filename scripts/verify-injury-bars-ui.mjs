import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const d=defaultCustomBattle();d.ownTeam=['cao','jia','liao','dun','yuanxia','chu','yu','person-255'].map(id=>({id,type:'spear',troops:1000,level:5}));d.ownTeamRoles={leader:'cao',advisor:'jia'};d.enemyTeam=[{id:'shao',type:'spear',troops:1000,level:5}];
const s=generateBattle(d),own=s.battle.sides[0].units[0],reserve=s.battle.sides[0].units.find(u=>u.status==='reserve'),enemy=s.battle.sides[1].units[0];
// A labelled, valid UI fixture isolates visible wounds from battle randomness.
for(const [u,hp]of [[own,600],[reserve,700],[enemy,300]]){u.hp=hp;u.battleDamage=u.initial-hp;u.healed=0;}
validateSave(s);
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4208'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-historical-battle-v1',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},JSON.stringify(s));
 await page.goto('http://127.0.0.1:4208/#historical-battle');
 await page.waitForFunction(()=>{const b=document.querySelector('#battle-board');return b?.dataset.modelStatus==='ready'&&Number(b.dataset.modelCount)>=b.querySelectorAll('[data-unit]').length;});
 const output='outputs/injury-bars';await mkdir(output,{recursive:true});const results=[];
 for(const [name,viewport]of [['desktop',{width:1440,height:900}],['mobile',{width:844,height:390}]]){
  await page.setViewportSize(viewport);await page.locator('#battle-board').evaluate(async()=>{await document.fonts.ready;await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));});
  for(const [id,current,ceiling,maximum,bench]of [[own.id,600,740,1000,false],[enemy.id,300,544,1000,false],[reserve.id,700,805,1000,true]]){
   const bar=page.locator(bench?`[data-council-unit="${id}"] .label-health`:`[data-unit="${id}"] .map-health-bar`);
   const value=await bar.getAttribute('aria-valuetext');assert.ok(value.startsWith(`${current} / ${ceiling} / ${maximum}`),`${name} ${id}: ${value}`);
   const geometry=await bar.evaluate(el=>{const fill=el.querySelector('i,em'),style=getComputedStyle(el);return {ratio:fill.getBoundingClientRect().width/el.getBoundingClientRect().width,background:style.backgroundImage};});
   assert.ok(Math.abs(geometry.ratio-current/maximum)<.003,'current troops use the original scale');assert.ok(Math.abs(Number(geometry.background.match(/([\d.]+)%/)?.[1])-ceiling/maximum*100)<.001,'recoverable ceiling has its own segment');
   results.push({viewport:name,id,current,ceiling,maximum,...geometry});
  }
  assert.ok(await page.locator('.map-troops').first().isHidden());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:`${output}/${name}.png`,animations:'disabled'});
  const portrait=page.locator(`[data-unit="${own.id}"] .map-portrait-row`),rect=await portrait.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await portrait.click();
  assert.match(await page.locator('.battle-info-current').innerText(),/600 \/ 740 \/ 1000/);await page.screenshot({path:`${output}/${name}-details.png`,animations:'disabled'});await page.locator('.modal .close-button').click();
 }
 assert.deepEqual(errors,[]);await writeFile(`${output}/result.json`,JSON.stringify({fixture:'controlled valid injury demonstration',results,errors},null,2));console.log('PASS injury bars: current / recoverable ceiling / original, both sides, reserves, details, desktop and mobile.');
}finally{await browser?.close();server.kill();}
