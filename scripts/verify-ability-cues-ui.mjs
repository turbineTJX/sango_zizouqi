import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics,setStatus} from '../tactics.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
const s=createScenario('custom-battle',14,20,null,{seed:14,terrain:'land',ownTeam:[entry('person-425','crossbow'),entry('person-636','spear')],enemyTeam:[entry('person-164','archer'),entry('shao','spear')]});
const b=s.battle;lockDeployment(b);
const [diao,liu]=b.sides[0].units,[huang,shao]=b.sides[1].units;
for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
Object.assign(diao,{x:4,y:3,cooldown:0});Object.assign(liu,{x:4,y:5});Object.assign(huang,{x:6,y:3,cooldown:0});Object.assign(shao,{x:7,y:5});
huang.hp=1100;huang.battleDamage=1900;stepBattle(b);validateSave(structuredClone(s));
assert.ok(b.effects.some(e=>e.label==='倾城'&&e.traitEffective));assert.ok(b.effects.some(e=>e.label==='苦肉'&&e.traitEffective));
const port=4198,url=`http://127.0.0.1:${port}`,out='outputs/ability-cues';await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'ability-cues.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
 await page.locator('.ability-cue.active').first().waitFor();await page.waitForTimeout(800);
 assert.match(await page.locator('.ability-cue.side-0').innerText(),/貂蝉[\s\S]*倾城[\s\S]*10%/);
 assert.match(await page.locator('.ability-cue.side-1').innerText(),/黄盖[\s\S]*苦肉[\s\S]*15%/);
 await page.screenshot({path:out+'/desktop.png'});
 await page.locator('.ability-cue.side-0').click();assert.equal(await page.locator('#arena-panel').isVisible(),true);assert.match(await page.locator('#battle-journal').innerText(),/特性[\s\S]*倾城/);await page.locator('[data-kind=attack]').click();assert.match(await page.locator('#battle-journal').innerText(),/普攻/);assert.ok(!(await page.locator('#battle-journal').innerText()).includes('倾城'));await page.locator('[data-kind=all]').click();
 await page.screenshot({path:out+'/records.png'});await page.locator('[data-action="close-battle-panel"]').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 const boxes=await page.locator('.ability-cue').evaluateAll(xs=>xs.map(e=>({width:e.clientWidth,scroll:e.scrollWidth,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));assert.ok(boxes.every(b=>b.width>=160&&b.scroll<=b.width+2));
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:out+'/reduced.png'});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-action="pause"]').click();await page.waitForTimeout(650);await page.screenshot({path:out+'/playing.png'});
 await page.locator('.ability-cue.side-0').click();assert.equal(await page.locator('#pause-note').isVisible(),true);
 assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({boxes,errors,realBattle:true,records:true},null,2));console.log('Ability cue UI passed',out);
}finally{await browser?.close();server.kill();}
