import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {_electron,chromium} from 'playwright';
import sharp from 'sharp';
import {ROOT,buildCodeRelease} from './release-lib.mjs';
import {buildDesktopManual} from './build-desktop-manual.mjs';

const out=join(ROOT,'outputs/desktop-manual',String(Date.now())),stage=join(out,'app');
await mkdir(stage,{recursive:true});
const executable=process.argv.slice(2).find(arg=>arg.endsWith('.exe'));
if(!executable){
 const {manifest}=await buildCodeRelease(join(stage,'code'));
 assert.ok(Object.keys(manifest.files).every(file=>!file.startsWith('manual/')),'Shared web/APK payload excludes desktop screenshots');
 await buildDesktopManual(ROOT,join(stage,'code/manual'));
 await build({entryPoints:[join(ROOT,'packaging/desktop.mjs')],outfile:join(stage,'main.cjs'),bundle:true,platform:'node',format:'cjs',external:['electron'],target:'node22'});
 await copyFile(join(ROOT,'packaging/preload.cjs'),join(stage,'preload.cjs'));
 await writeFile(join(stage,'package.json'),JSON.stringify({name:'sango-manual-verification',version:'0.3.0',main:'main.cjs'}));
}
const errors=[],checks=[];
const application=await _electron.launch({executablePath:executable?resolve(executable):join(ROOT,'node_modules/electron/dist/electron.exe'),...(!executable?{args:[stage]}:{}),env:{...process.env,SANGO_VERIFY:'1',SANGO_USER_DATA:join(out,'profile')},timeout:60000});
let browser,reader;
const page=await application.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
await application.evaluate(({BrowserWindow,app})=>{for(const window of BrowserWindow.getAllWindows())window.webContents.setBackgroundThrottling(false);app.on('browser-window-created',(_,window)=>window.webContents.setBackgroundThrottling(false));});
const capture=process.argv.includes('--capture');
const sourceFiles=['app.js','page-guide-view.mjs','packaging/desktop.mjs','packaging/preload.cjs','scripts/build-desktop-manual.mjs','ui-tokens.css','ui-theme.css','ui-fonts/font-face.css','ui-fonts/noto-serif-sc.woff2','ui-materials/ink-grain.svg','ui-materials/cloud-jade-frame.png','ui-materials/ink-silk-panel.png'];
const hash=createHash('sha256');for(const file of sourceFiles)hash.update(file).update(await readFile(join(ROOT,file)));const sourceHash=hash.digest('hex');
async function screenshot(id,title){
 const bytes=await nativeScreenshot(page,join(out,id+'.png'));
 if(!capture)return;
 const path=join(ROOT,'docs/images/player-actions/captures.json'),captures=JSON.parse(await readFile(path,'utf8'));
 await sharp(bytes).webp({quality:88}).toFile(join(ROOT,'docs/images/player-actions',id+'.webp'));
 captures[id]={title,file:'images/player-actions/'+id+'.webp',group:'desktop',sample:'实际电脑版内置手册入口；独立验证配置，不使用玩家存档',viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight})),capturedAt:new Date().toISOString(),sourceHash};
 await writeFile(path,JSON.stringify(captures,null,2)+'\n');
}
async function nativeScreenshot(target,path){
 await target.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
 await application.evaluate(async({BrowserWindow},url)=>{
  const window=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);
  window.webContents.invalidate();await window.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true});
 },target.url());
 await target.waitForTimeout(250);
 const data=await application.evaluate(async({BrowserWindow},url)=>{
  const window=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);if(!window)throw Error('Missing reading window');
  return (await window.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64');
 },target.url());
 const bytes=Buffer.from(data,'base64');await writeFile(path,bytes);return bytes;
}
async function openReader(){
 const catalogue=page.locator('#page-guide-root [data-guide-action="manual"]');
 const button=await catalogue.count()?catalogue:page.locator('#overlay-root [data-guide-action="manual"]');
 [reader]=await Promise.all([application.waitForEvent('window'),button.click()]);reader.on('pageerror',e=>errors.push(e.message));
 reader.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await reader.getByRole('heading',{name:'开始普通模式',exact:true}).waitFor();
 return reader;
}
async function closeReader(key=false){
 const closed=reader.waitForEvent('close');
 try{if(key)await reader.keyboard.press('Escape');else await reader.getByRole('button',{name:'返回游戏',exact:true}).click();}
 catch(error){if(!reader.isClosed())throw error;}
 await closed;reader=null;
}
try{
 await page.locator('[data-action="settings"]').first().waitFor();
 assert.equal(await page.evaluate(()=>typeof window.sangoDesktop.openManual),'function');
 await page.locator('[data-action="settings"]').first().click();
 const before=await page.locator('.modal').innerHTML();
 await screenshot('desktop-manual-settings','电脑版设置中的操作手册入口');
 await openReader();
 assert.equal(await reader.evaluate(()=>location.origin),'sango://game');
 assert.equal(await reader.evaluate(()=>typeof window.require+':'+typeof window.sangoDesktop),'undefined:undefined');
 const loaded=await reader.evaluate(async()=>{
  const files=Object.values(manual.captures).map(s=>s.file);
  await Promise.all(files.map(file=>new Promise((ok,no)=>{const img=new Image();img.onload=()=>img.naturalWidth?ok():no(Error(file));img.onerror=()=>no(Error(file));img.src=file;})));
  return {workflows:all.length,screenshots:files.length};
 });
 assert.ok(loaded.workflows>=106);assert.ok(loaded.screenshots>=143);
 console.log('Verified native manual and all '+loaded.screenshots+' offline screenshots');
 await reader.locator('#search').fill('预算');await reader.locator('.nav-action').filter({hasText:'修改城市保留预算'}).click();
 assert.match(await reader.locator('.steps').innerText(),/保存预算/);
 await reader.locator('[data-shot="1"]').click();assert.match(await reader.locator('#main-image').getAttribute('src'),/budget-draft/);
 await reader.locator('#open-image').click();await reader.locator('#zoom-size').click();assert.match(await reader.locator('#zoom-body').getAttribute('class'),/original/);
 await reader.keyboard.press('Escape');assert.equal(await reader.locator('#lightbox').isVisible(),false);
 await nativeScreenshot(reader,join(out,'manual-search.png'));
 await closeReader();assert.equal(await page.locator('.modal').innerHTML(),before,'Reading preserves the original settings DOM');
 checks.push('native settings entry, isolated offline reader, all images, search, screenshot switching, zoom/Escape, original page retained');
 await page.locator('[data-guide-action="catalogue"]').click();await screenshot('desktop-manual-catalogue','电脑版全部指引中的操作手册入口');
 await openReader();await closeReader(true);await page.locator('#page-guide-title').filter({hasText:'全部指引'}).waitFor();
 await page.locator('#page-guide-root [data-guide-done]').click();
 checks.push('guide catalogue entry, reader Escape returns to catalogue, no guide preference or draft reset');
 assert.deepEqual(errors,[]);
 if(!executable){
  // The same app bundle in a mobile browser has no desktop bridge or entry.
  browser=await chromium.launch({channel:'msedge',headless:true});
  const mobile=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  await mobile.route('https://manual-mobile.test/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   const name=pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1));
   if(name.startsWith('assets/')||name.startsWith('local-art/'))return route.fulfill({status:404});
   const contentType=name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':/\.(mjs|js)$/.test(name)?'text/javascript':name.endsWith('.svg')?'image/svg+xml':'application/octet-stream';
   try{await route.fulfill({body:await readFile(join(stage,'code',name)),contentType});}catch{await route.fulfill({status:404});}
  });
  await mobile.goto('https://manual-mobile.test/');await mobile.locator('[data-action="settings"]').first().click();
  assert.equal(await mobile.locator('[data-guide-action="manual"]').count(),0);
  await mobile.locator('[data-guide-action="catalogue"]').click();assert.equal(await mobile.locator('[data-guide-action="manual"]').count(),0);
  await mobile.screenshot({path:join(out,'mobile-no-manual.png')});checks.push('mobile settings and catalogue have no manual entry; shared web/APK bundle contains no manual assets');
 }
 await writeFile(join(out,'result.json'),JSON.stringify({passed:true,executable:executable||'actual Electron runtime with current bundled game',sourceHash,...loaded,checks,errors},null,2)+'\n');
 console.log('PASS desktop manual: '+JSON.stringify({out,...loaded,checks}));
}catch(error){await page.screenshot({path:join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();await application.close();}
