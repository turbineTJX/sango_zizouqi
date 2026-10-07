import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,validateSave} from '../engine.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4194'},stdio:'pipe',windowsHide:true});
let browser;
try{
  await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('Server '+c)));});
  const state=createScenario('defense',17);let actor;
  while(!state.battle.result&&!actor){stepBattle(state.battle);actor=state.battle.sides.flatMap(s=>s.units).find(u=>u.statuses.attackOrb?.charges===3);}
  assert.ok(actor);validateSave(JSON.parse(JSON.stringify(state)));
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(data=>localStorage.setItem('sango-battle-lab-v1',JSON.stringify(data)),state);
  await page.goto('http://127.0.0.1:4194/#battle-lab');
  await page.locator(`[data-unit="${actor.id}"]`).click({button:'right'});
  const orb=page.locator('[data-status="attackOrb"]');
  assert.match(await orb.innerText(),/3 次/);assert.ok((await orb.innerText()).includes(actor.statuses.attackOrb.sourceSkillName));
  await orb.locator('summary').click();assert.match(await orb.innerText(),/不随时间消耗/);
  await mkdir('outputs/attack-orbs',{recursive:true});
  await page.screenshot({path:'outputs/attack-orbs/charges-desktop.png',animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await orb.scrollIntoViewIfNeeded();
  assert.ok(await page.locator('.modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.screenshot({path:'outputs/attack-orbs/charges-mobile.png',animations:'disabled'});
  await page.locator('.close-button').click();await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(async()=>{
    const {BattleEffects}=await import('/battle-effects.mjs');
    const update=BattleEffects.prototype.update;
    window.orbHits=[];window.orbCutins=[];
    BattleEffects.prototype.update=function(b,options){
      const result=update.call(this,b,options);window.fx=this;window.actualBattle=b;
      for(const e of b.effects)if(e.attackOrb)window.orbHits.push({id:e.from,charges:e.orbRemaining});
      for(const c of this.cinematics)if(c.events.some(e=>e.enchantment||e.attackOrb))window.orbCutins.push(c);
      return result;
    };
  });
  await page.clock.install();await page.locator('[data-action="pause"]').click();
  for(let i=0;i<120;i++){
    await page.clock.runFor(200);
    if(await page.evaluate(id=>orbHits.some(e=>e.id===id),actor.id))break;
  }
  assert.ok(await page.evaluate(id=>orbHits.some(e=>e.id===id&&e.charges===2),actor.id));
  await page.clock.runFor(250);
  await page.screenshot({path:'outputs/attack-orbs/impact.png',animations:'disabled'});
  await page.locator('[data-action="pause"]').click();
  await page.locator(`[data-unit="${actor.id}"]`).click({button:'right'});
  assert.match(await page.locator('[data-status="attackOrb"]').innerText(),/2 次/);
  assert.deepEqual(await page.evaluate(()=>orbCutins),[]);assert.deepEqual(errors,[]);
  console.log('PASS: source skill and 3→2 charge display, mobile details, real enchanted attack playback without cut-ins, zero browser errors.');
}finally{await browser?.close();server.kill();}
