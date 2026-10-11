import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics,setStatus,TACTICS_BOOK} from '../tactics.mjs';
import {relationshipKey} from '../relationships.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='outputs/historical-cooperation-20261011/ui',port=4239;
const state=generateBattle({seed:8191,terrain:'land',mapId:'plain-open',battleKind:'field',ownTeam:[{id:'cao',type:'spear',troops:5000,level:10},{id:'chu',type:'spear',troops:1000,level:10}],enemyTeam:[{id:'person-639',type:'spear',troops:5000,level:10},{id:'person-711',type:'spear',troops:5000,level:10}],shieldPercent:0,events:[]}),b=state.battle;
assert.equal(lockDeployment(b),null);const us=b.sides[0].units,es=b.sides[1].units;
for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
Object.assign(us[0],{x:4,y:2});Object.assign(us[1],{x:4,y:3});Object.assign(es[0],{x:5,y:3});Object.assign(es[1],{x:12,y:7});
const key=relationshipKey('cao','chu');state.relationshipTypes[key]='sworn';state.relationshipScores[key]=100;b.relationshipTypes=structuredClone(state.relationshipTypes);b.relationshipScores=structuredClone(state.relationshipScores);
us[0].intent=TACTICS_BOOK['unique-cao'].threshold;us[0].skillReady['unique-cao']=0;stepBattle(b);us[1].intent=TACTICS_BOOK.thrust.threshold;us[1].skillReady.thrust=0;stepBattle(b);validateSave(state);
const event=b.effects.find(e=>e.combo?.kind==='supported');assert.ok(event);event.tick=b.tick;
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('Server exited '+c)));});
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(s=>{localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},state);
  await page.goto('http://127.0.0.1:'+port+'/#historical-battle');await page.locator('#battle-bonds').waitFor();
  await page.evaluate(async({event})=>{const {BattleEffects}=await import('./battle-effects.mjs');const {relationshipEditorMarkup}=await import('./officer-roster.mjs');const box=document.createElement('div');box.id='cooperation-help-fixture';box.className='modal';box.style.cssText='position:fixed;top:8%;left:5%;width:90%;max-width:800px;max-height:85%;overflow:auto;z-index:1000;padding:20px;background:#172b2a;color:#eee;border:1px solid #9ab6a8';box.innerHTML='<h2>已结算连携与关系说明</h2><div class="battle-events"></div>'+relationshipEditorMarkup('person-396','person-487');document.body.append(box);const feed=box.querySelector('.battle-events');const canvas=document.createElement('canvas');canvas.style.cssText='width:1px;height:1px;position:absolute';box.append(canvas);const fx=new BattleEffects(canvas,feed);fx.notice([event]);fx.notices=[];fx.destroy();}, {event});
  const help=await page.locator('#cooperation-help-fixture').innerText();assert.match(help,/支援接续/);assert.match(help,/第1天/);assert.doesNotMatch(help,/undefined|NaN/);assert.match(help,/2格.*真实受益者/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/battle-'+label+'.png',animations:'disabled'});
  await page.goto('http://127.0.0.1:'+port+'/outputs/historical-cooperation-20261011/report.html');assert.equal(await page.locator('.group:visible').count(),26);
  await page.locator('[data-faction-picker="吴"]').click();assert.ok(await page.locator('.group:visible').count()>5);await page.locator('[data-faction-picker="全部"]').click();
  await page.locator('#search').fill('赵云');assert.equal(await page.locator('.group:visible').count(),2);await page.locator('#search').fill('');
  const rows=await page.locator('tr[data-layout="equal"]').count();if(rows){assert.equal(await page.locator('tr[data-layout]:visible').count(),12);await page.locator('[data-layout-picker="core"]').click();assert.equal(await page.locator('tr[data-layout]:visible').count(),12);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/report-'+label+'.png',animations:'disabled'});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({rulesVersion:state.rulesVersion,desktop:true,mobile:true,realSupportCombo:true,groups:26,errors},null,2));console.log('PASS real support combo, relationship help and research filters on desktop/mobile');
}finally{await browser?.close();server.kill();}
