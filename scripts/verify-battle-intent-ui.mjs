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
  await page.locator('[data-action="launch-history"]').click();
  await page.locator('#battle-intent').selectOption('hold');
  await page.locator('[data-action="pause"]').click();
  await page.locator('[data-action="pause"]').click();
  assert.equal(await page.locator('#battle-intent').isVisible(),false);
  assert.match(await page.locator('#battle-header').innerText(),/固守.*已锁定/);
  await page.locator('[data-panel="commands"]').click();
  assert.equal(await page.locator('[data-command="focus"], [data-command="reserve"]').count(),0);
  assert.equal(await page.locator('[data-command="retreat"]').innerText().then(t=>t.includes('全军撤退')),true);
  assert.ok(await page.locator('[data-command]').count()>1,'stratagems remain available');
  await page.reload();
  assert.match(await page.locator('#battle-header').innerText(),/固守.*已锁定/);
  assert.deepEqual(errors,[]);
  console.log('Battle intent UI passed: selection, lock, stratagems, retreat, reload.');
} finally {
  await browser?.close();server.kill();
}
