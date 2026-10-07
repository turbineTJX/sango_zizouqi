import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4196'},stdio:'pipe',windowsHide:true});
let browser;
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(`Server exited: ${code}`)));});
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4196');
  await page.locator('[data-action="campaign-lobby"]').click();
  await page.locator('[data-history="xiapi"]').click();await page.locator('[data-action="launch-custom"]').click();await page.locator('[data-action="scenario-launch-confirm"]').click();
  const first=page.locator('.battle-unit.side-0').first();
  const id=await first.getAttribute('data-unit');
  const unit=page.locator(`[data-unit="${id}"]`);
  const position=locator=>locator.evaluate(el=>({left:el.style.left,top:el.style.top}));
  const cell=(x,y)=>page.locator(`[data-deploy-x="${x}"][data-deploy-y="${y}"]`);
  const hit=await unit.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-unit]')?.dataset.unit;});
  assert.equal(hit,id,'the formation grid must not intercept input over units');
  await unit.dragTo(cell(0,0));
  assert.deepEqual(await position(unit),await position(cell(0,0)),'drag to an empty cell');
  const other=page.locator('.battle-unit.side-0').nth(1),otherId=await other.getAttribute('data-unit');
  const otherPosition=await position(other);
  await unit.dragTo(other);
  assert.deepEqual(await position(unit),otherPosition,'drag onto a friendly unit swaps positions');
  assert.deepEqual(await position(page.locator(`[data-unit="${otherId}"]`)),await position(cell(0,0)));
  const beforeClick=await position(unit);await unit.click();assert.equal(await page.locator('#inspect-unit').inputValue(),id);assert.deepEqual(await position(unit),beforeClick,'click opens details without moving');await page.locator('[data-action="deployment-select"]').click();await cell(1,0).click();
  assert.deepEqual(await position(unit),await position(cell(1,0)),'click placement');
  await page.evaluate(()=>localStorage.setItem('sango-art-mode','builtin'));await page.reload();await unit.waitFor();
  await page.locator('.roster-side-0 [data-inspect="'+id+'"]').dragTo(cell(2,0));
  assert.deepEqual(await position(unit),await position(cell(2,0)),'drag with art disabled');
  await page.setViewportSize({width:390,height:844});
  await unit.click();await page.locator('[data-action="deployment-select"]').click();await cell(3,0).click();
  assert.deepEqual(await position(unit),await position(cell(3,0)),'mobile click placement');
  const reserve=page.locator('.council-unit').first(),reserveId=await reserve.getAttribute('data-inspect'),fieldPosition=await position(unit);await reserve.click();await page.locator('[data-action="deployment-select"]').click();await unit.click();assert.deepEqual(await position(page.locator('[data-unit="'+reserveId+'"]')),fieldPosition,'explicit mobile placement swaps reserve with active unit');assert.ok(await page.locator('.council-unit[data-inspect="'+id+'"]').count());
  await page.locator('[data-action="pause"]').click();
  assert.equal(await page.locator('.battle-unit.side-0').first().getAttribute('draggable'),'false','deployment locks after battle starts');
  assert.deepEqual(errors,[]);
  console.log('Deployment UI passed: hit testing, drag, swap, click, art off, mobile, battle lock.');
} finally {
  await browser?.close();server.kill();
}
