import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics,setStatus} from '../tactics.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const own=[['黄忠','longbow'],['赵云','cavalry'],['魏延','spear'],['严颜','halberd'],['邓芝','archer'],['诸葛瑾','archer'],['法正','archer'],['陈到','baier']];
const foe=[['袁绍','spear'],['颜良','cavalry'],['文丑','halberd'],['张郃','cavalry'],['沮授','archer'],['田丰','archer']];
const entries=a=>a.map(([name,type])=>({id:id(name),type,troops:3000,level:10}));
const state=generateBattle({...defaultCustomBattle(),seed:812321,terrain:'land',mapId:'plain-open',battleKind:'field',events:[],ownTroopBudget:24000,ownTeam:entries(own),enemyTeam:entries(foe)});
validateSave(structuredClone(state));
const out='work/autochess-trial/ui',port=4337;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);
 await page.evaluate(async()=>{const {BattleEffects}=await import('./battle-effects.mjs'),original=BattleEffects.prototype.update;BattleEffects.prototype.update=function(b,options){window.positioningBattle=b;return original.call(this,b,options);};});
 async function load(s,name){if(!await page.locator('[data-action="settings"]').first().isVisible())await page.getByRole('button',{name:'战斗工具',exact:true}).click();await page.locator('[data-action="settings"]').first().click();await page.locator('#import-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});await page.locator('#battle-board').waitFor();}
 await load(state,'positioning.json');
 const unit=id('法正');
 await page.getByRole('button',{name:'法正入场位置',exact:true}).click();
 await page.locator('[data-deploy-x="4"][data-deploy-y="7"]').click();
 assert.equal(await page.evaluate(id=>positioningBattle.sides[0].units.find(u=>u.id===id).reserveEntry,unit),null);
 await page.locator('[data-action="deployment-cancel"]').click();
 assert.equal(await page.evaluate(id=>positioningBattle.sides[0].units.find(u=>u.id===id).reserveEntry,unit),null);
 await page.getByRole('button',{name:'法正入场位置',exact:true}).click();await page.locator('[data-deploy-x="4"][data-deploy-y="7"]').click();
 await page.screenshot({path:out+'/desktop-preview.png',fullPage:true});
 await page.locator('[data-action="deployment-confirm"]').click();
 const preferred=await page.evaluate(id=>{const u=positioningBattle.sides[0].units.find(u=>u.id===id);return {point:u.reserveEntry,status:u.status,x:u.x,y:u.y};},unit);
 assert.deepEqual(preferred,{point:{x:4,y:7},status:'reserve',x:-1,y:-1});
 assert.match(await page.locator('.reserve-card').filter({has:page.getByRole('button',{name:'法正入场位置',exact:true})}).innerText(),/5列 8行/);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile-reserves.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.setViewportSize({width:1600,height:1000});
 // A real cast creates the lock, then a displaced target supplies a UI fixture
 // for an empty impact. This is mechanism/UI evidence, not natural gameplay.
 const pending=structuredClone(state),b=pending.battle;lockDeployment(b);
 b.sides[0].units.filter(u=>u.status==='active').forEach((u,i)=>Object.assign(u,{x:i?1:4,y:i?i-1:3}));
 b.sides[1].units.forEach((u,i)=>Object.assign(u,{x:i?11+i%3:8,y:i?i-1:3}));
 for(const u of b.sides.flatMap(s=>s.units)){setStatus(b,u,'root',999);u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));}
 const shooter=b.sides[0].units.find(u=>u.id===id('黄忠'));shooter.intent=55;shooter.skillReady['longbow-shot']=0;
 stepBattle(b,{aiSides:[]});assert.ok(shooter.tacticAim);Object.assign(b.sides[1].units.find(u=>u.id===shooter.tacticAim.targetId),{x:8,y:6});validateSave(structuredClone(pending));
 await load(pending,'pending-positioning.json');
 assert.ok(await page.locator('[data-tactic-aim="'+shooter.id+'"]').count()>0);
 await page.screenshot({path:out+'/desktop-locked-area.png',fullPage:true});
 await page.locator('[data-action="pause"]').first().click();
 await page.waitForFunction(()=>positioningBattle.logs.some(l=>l.text.includes('长弓狙射')&&l.text.includes('落空')));
 if((await page.locator('[data-action="pause"]').first().innerText()).includes('暂停'))await page.locator('[data-action="pause"]').first().click();
 await page.locator('[data-action="battle-panel"][data-panel="events"]').first().click();
 assert.match(await page.locator('#battle-journal').innerText(),/落空/);await page.screenshot({path:out+'/desktop-miss.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile-miss.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,preferred,errors,mechanismFixture:true},null,2));
 console.log('PASS actual import, reserve preview/cancel/confirm, preserved bench status, locked cells and miss log, desktop/mobile');
}finally{await browser?.close();server.kill();}
