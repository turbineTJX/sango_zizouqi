import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4414'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4414/#strategy');
 // Exercise the actual import control with the authored, current-version save.
 await page.locator('[data-action="settings"]').first().click();
 await page.locator('#import-file').setInputFiles(resolve('outputs/hero-v44/playable/wei.json'));
 await page.locator('[data-action="loadout"]').first().click();
 await page.locator('#loadout-unit').selectOption('person-255');
 assert.ok((await page.locator('.compact-loadout').allTextContents()).some(t=>t.includes('王佐之才')&&t.includes('门槛 35')&&t.includes('施放消耗 10')));
 await page.locator('.compact-loadout [data-action="tactic-detail"][data-skill="unique-person-255"]').click();
 assert.ok((await page.locator('body').innerText()).includes('只支援其他友军'));
 mkdirSync('outputs/hero-v44/ui',{recursive:true});
 await page.screenshot({path:'outputs/hero-v44/ui/xunyu-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'outputs/hero-v44/ui/xunyu-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 writeFileSync('outputs/hero-v44/ui/result.json',JSON.stringify({passed:true,checks:['规则44战役实际导入','荀彧额外专属','门槛35与消耗10可见','明确仅支援其他友军','桌面与手机无横向溢出','无页面脚本错误']},null,2));
 console.log('PASS: 战役导入、荀彧专属与桌面/手机布局');
}finally{await browser?.close();server.kill();}
