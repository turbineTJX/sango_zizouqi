import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics,hasStatus} from '../tactics.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const entry=name=>({id:id(name),type:'archer',troops:4000,level:10});
const state=generateBattle({...defaultCustomBattle(),seed:81901,terrain:'land',mapId:'plain-open',battleKind:'field',events:[],ownTroopBudget:24000,ownTeam:['孙坚','徐晃','审配','陆抗','夏侯玄','张春华'].map(entry),enemyTeam:['刘禅','刘璋','韩玄','刘度'].map(entry)}),b=state.battle;
lockDeployment(b);for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));}
b.sides[0].units.forEach((u,i)=>Object.assign(u,{x:1,y:i}));b.sides[1].units.forEach((u,i)=>Object.assign(u,{x:i?13:6,y:i?i:3}));
const target=b.sides[1].units[0];
for(const key of ['armorBreak','disciplineDown','powerDown'])assert.ok(hasStatus(b,target,key));
for(const u of b.sides.flatMap(s=>s.units))delete u.statuses.root;
validateSave(JSON.parse(JSON.stringify(state)));
const out='outputs/lasting-bonds-ui',port=4348;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1600,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'lasting-bonds.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await page.locator('#battle-board').waitFor();
 if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
 for(const [key,name] of [['bondMartial','骁勇'],['bondDisciplineBreak','乱纪'],['bondEnfeeble','折威']]){
  const row=page.locator('#battle-bonds [data-id="'+key+'"]').first();assert.ok(await row.isVisible());assert.equal(await row.getAttribute('data-bond-name'),name);await row.click();assert.match(await page.locator('.modal').innerText(),key==='bondMartial'?/激活期间常驻/:/首次满足条件.*180战斗回合/);await page.screenshot({path:out+'/'+key+'.png',fullPage:true});await page.keyboard.press('Escape');
 }
 await page.locator('#battle-board [data-unit="'+target.id+'"]').click();
 for(const key of ['armorBreak','disciplineDown','powerDown'])assert.match(await page.locator('[data-status="'+key+'"]').innerText(),/剩余 180 战斗回合/);
 await page.screenshot({path:out+'/desktop-statuses.png',fullPage:true});
 await page.setViewportSize({width:844,height:390});await page.locator('[data-status="powerDown"]').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:out+'/mobile-statuses.png',fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({passed:true,errors,bonds:3,onceDebuffs:3,desktop:true,mobile:true},null,2));console.log('PASS new bond details and opening durations on desktop and mobile');
}finally{await browser?.close();server.kill();}
