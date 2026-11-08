import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {validateSave} from '../engine.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const entry=([name,type,troops])=>({id:id(name),type,troops,level:10,retreatAt:null});
const own=[['周瑜','archer',5000],['王粲','archer',2000],['文聘','halberd',3000],['陈武','halberd',3000],['李典','spear',2500],['曹性','archer',2500]];
const foe=[['张绣','cavalry',3000],['臧霸','cavalry',3000],['张任','spear',3000],['韩当','archer',3000],['严颜','archer',3000],['陈登','archer',3000]];
const state=generateBattle({...defaultCustomBattle(),seed:818217,mapId:'plain-open',events:[],shieldPercent:0,ownTroopBudget:18000,ownTeam:own.map(entry),enemyTeam:foe.map(entry)});
const points=[[3,3],[2,3],[4,2],[4,4],[3,4],[2,5]];
own.forEach((u,i)=>assert.equal(deployBattleUnit(state.battle,id(u[0]),...points[i]),null));validateSave(structuredClone(state));
const out='.local/formation-implementation-20261108/ui',port=4398;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({serviceWorkers:'block'}),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 for(const width of [1600,844]){
  await page.setViewportSize({width,height:width===1600?1000:390});
  await page.goto('http://127.0.0.1:'+port);
  await page.evaluate(async()=>{const {BattleEffects}=await import('./battle-effects.mjs'),original=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,options){window.formationBattle=b;return original.call(this,b,options);};});
  await page.locator('[data-action="settings"]').first().click();
  await page.locator('#import-file').setInputFiles({name:'formation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
  await page.locator('#battle-board').waitFor();await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
  const before=await page.evaluate(()=>JSON.stringify(formationBattle));
  await page.locator('.battle-unit[data-unit="'+id('李典')+'"]').hover();
  assert.ok(await page.locator('[data-formation-peer="'+id('周瑜')+'"]').count()>0);
  assert.ok(await page.locator('[data-formation-strong]').count()>0);
  assert.equal(await page.evaluate(()=>JSON.stringify(formationBattle)),before);
  await page.screenshot({path:out+'/guard-'+width+'.png',fullPage:true});
  await page.locator('.battle-unit[data-unit="'+id('王粲')+'"]').hover();
  assert.ok(await page.locator('[data-support-target="'+id('周瑜')+'"][data-support-preferred="true"]').count()>0);
  assert.equal(await page.locator('#deployment-support-overlay').innerText(),'');
  assert.equal(await page.evaluate(()=>JSON.stringify(formationBattle)),before);
  await page.screenshot({path:out+'/aid-'+width+'.png',fullPage:true});
  checks.push({width,guardPeer:true,strongZones:true,intentRecipient:true,readOnly:true});
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}catch(error){if(browser)await browser.contexts()[0]?.pages()[0]?.screenshot({path:out+'/failure.png',fullPage:true});throw error;}
finally{await browser?.close();server.kill();}
