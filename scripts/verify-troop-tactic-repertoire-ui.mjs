import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {tacticHolder} from '../tests/helpers/current-battle.mjs';
import {unitTactics} from '../tactics.mjs';
import {validateSave} from '../engine.mjs';
import {importSaveFixture} from './save-fixture-ui-helpers.mjs';
const cases=[['cleave','halberd'],['ward','spear'],['wildfire','archer'],['antiMagic','rattan'],['unique-person-396','cavalry']],taken=[];
const ownTeam=cases.map(([skill,type])=>{const id=tacticHolder(skill,type,taken);taken.push(id);return {id,type,troops:3000,level:10};});
const enemyTeam=OFFICER_CATALOG.filter(o=>!taken.includes(o.id)).slice(0,3).map(o=>({id:o.id,type:'spear',troops:3000,level:10}));
const state=generateBattle({...defaultCustomBattle(),seed:1471108,mapId:'plain-open',events:[],ownTroopBudget:15000,enemyTroopBudget:9000,ownTeam,enemyTeam});validateSave(structuredClone(state));
const out='outputs/troop-tactic-repertoire-ui',port=4354;await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('server '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]})));
 await page.goto('http://127.0.0.1:'+port);await importSaveFixture(page,state);await page.locator('#battle-board').waitFor();
 if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');
 async function inspect(id){if(await page.locator('.modal-backdrop').count())await page.keyboard.press('Escape');await page.locator('.battle-unit[data-unit="'+id+'"]').click();await page.locator('.battle-brief-tactics').waitFor();}
 for(const entry of ownTeam){await inspect(entry.id);const unit=state.battle.sides[0].units.find(u=>u.id===entry.id),skills=unitTactics(unit);
  assert.deepEqual(await page.locator('.battle-brief-tactic > span').allTextContents(),skills.map(s=>s.name));assert.ok(skills.length<=4);
  assert.equal(await page.locator('[data-tactic-slot],[data-action="tactic-up"],[data-action="tactic-preset"]').count(),0);
 }
 await inspect(ownTeam[0].id);assert.ok((await page.locator('.battle-brief-tactic > span').allTextContents()).includes('横扫'));
 await page.locator('.toast').waitFor({state:'hidden'}).catch(()=>{});await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await inspect(ownTeam[2].id);await page.locator('.battle-brief-tactic[data-skill="wildfire"]').click();
 assert.match(await page.locator('.modal-backdrop').innerText(),/谋略威力/);
 await page.setViewportSize({width:844,height:390});assert.ok(await page.locator('.modal-backdrop').isVisible());await page.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,cases:cases.map(([skill,type])=>({skill,type})),errors,checks:['真实导入流程','横扫与扰阵名称','仅显示个人已获战法','最多四项含专属','无自由换装和顺序操作','火计说明使用谋略威力','桌面和手机布局']},null,2));
 console.log('PASS repertoire names, personal kits, power details, desktop/mobile');
}finally{await browser?.close();server.kill();}
