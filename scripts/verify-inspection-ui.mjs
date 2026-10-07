import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,validateSave} from '../engine.mjs';
import {inspectionStatuses,statusAttributeChanges} from '../status-display.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4193'},stdio:'pipe',windowsHide:true});
let browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
  const state=createScenario('field');let selected,status;
  for(let i=0;i<80&&!status;i++){
    stepBattle(state.battle);
    for(const u of state.battle.sides.flatMap(s=>s.units)){
      const found=inspectionStatuses(state.battle,u).find(s=>['armorBreak','weaken','curse'].includes(s.key)&&statusAttributeChanges(state.battle,u,s).some(r=>r.delta<0));
      if(found&&u.status==='active'){selected=u;status=found;break;}
    }
  }
  assert.ok(status);validateSave(JSON.parse(JSON.stringify(state)));
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>localStorage.setItem('sango-battle-lab-v1',JSON.stringify(data)),state);
  await page.goto('http://127.0.0.1:4193/#battle-lab');
  const unit=()=>page.locator(`[data-unit="${selected.id}"]`).first();
  const action=name=>page.locator(`[data-action="${name}"]`);
  await unit().click({button:'right'});
  assert.match(await page.locator('#modal-title').innerText(),/部队属性/);
  assert.equal(await page.locator('.modal .officer-four').count(),0);
  assert.equal(await page.locator('.modal .passive-panel').count(),0);
  assert.equal(await page.locator('.modal .tactic-chip').count(),3);
  const tile=page.locator(`[data-status="${status.key}"]`);
  assert.ok((await tile.locator('summary').innerText()).includes(status.sources[0]));
  assert.equal(await tile.getAttribute('open'),null);
  await mkdir('outputs/inspection',{recursive:true});
  await page.screenshot({path:'outputs/inspection/unit.png',fullPage:true,animations:'disabled'});
  await tile.locator('summary').click();
  assert.ok(await tile.locator('.effect-values').isVisible());
  assert.match(await tile.innerText(),/无此状态/);
  await tile.scrollIntoViewIfNeeded();
  await page.screenshot({path:'outputs/inspection/status.png',fullPage:true,animations:'disabled'});
  await action('unit-officer').click();
  assert.match(await page.locator('#modal-title').innerText(),/武将属性/);
  assert.equal(await page.locator('.officer-four').count(),1);
  assert.equal(await page.locator('.modal .attribute-grid').count(),0);
  await page.screenshot({path:'outputs/inspection/officer.png',fullPage:true,animations:'disabled'});
  await action('unit-stats').last().click();
  assert.equal(await page.locator('#inspect-unit').inputValue(),selected.id);
  await page.locator('.modal .tactic-chip').first().click();
  assert.match(await page.locator('.modal').innerText(),/效果/);
  await action('inspection-back').click();
  assert.equal(await page.locator('#inspect-unit').inputValue(),selected.id);
  await page.setViewportSize({width:390,height:844});
  await page.locator(`[data-status="${status.key}"] summary`).click();
  await page.screenshot({path:'outputs/inspection/mobile.png',fullPage:true,animations:'disabled'});
  assert.ok(await page.locator('.modal').evaluate(el=>el.scrollWidth<=el.clientWidth));
  assert.ok(await page.locator('.modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('.close-button').click();
  await page.setViewportSize({width:1440,height:1000});
  await unit().focus();await page.keyboard.press('Shift+F10');
  assert.match(await page.locator('#modal-title').innerText(),/部队属性/);
  await page.locator('.close-button').click();
  // Use a fresh deployment fixture to exercise actual loadout selection and return.
  await page.evaluate(data=>localStorage.setItem('sango-battle-lab-v1',JSON.stringify(data)),createScenario('field'));
  await page.removeAllListeners('pageerror');
  await page.close();
  const deployment=await browser.newPage({viewport:{width:1440,height:1000}});
  deployment.on('pageerror',e=>errors.push(e.message));
  await deployment.addInitScript(data=>localStorage.setItem('sango-battle-lab-v1',JSON.stringify(data)),createScenario('field'));
  await deployment.goto('http://127.0.0.1:4193/#battle-lab');
  await deployment.locator('[data-action="loadout"]').first().click();
  assert.equal(await deployment.locator('.compact-loadout').count(),3);
  assert.equal(await deployment.locator('.compact-loadout p').count(),0);
  await deployment.locator('.compact-loadout [data-action="tactic-detail"]').first().click();
  await deployment.locator('[data-action="inspection-back"]').click();
  assert.equal(await deployment.locator('.compact-loadout').count(),3);
  const slot=deployment.locator('[data-tactic-slot="0"]');
  const alternative=await slot.locator('option:not([disabled]):not([selected])').first().getAttribute('value');
  await slot.selectOption(alternative);
  assert.equal(await deployment.locator('[data-tactic-slot="0"]').inputValue(),alternative);
  await deployment.screenshot({path:'outputs/inspection/loadout.png',fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: right-click and keyboard inspection, status sources/numeric details, separate officer panel, skill details/back, compact loadout editing, mobile layout; zero browser errors.');
}finally{await browser?.close();server.kill();}
