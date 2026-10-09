import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {ROOT} from './release-lib.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
if(!process.argv[2])throw Error('Pass the portable EXE');
const out=join(ROOT,'.local','verify-portable-'+Date.now());await mkdir(out,{recursive:true});
const executable=resolve(process.argv[2]),port=4220;
const child=spawn(executable,['--remote-debugging-port='+port],{windowsHide:true,stdio:'ignore',env:{...process.env,SANGO_VERIFY:'1',SANGO_USER_DATA:join(out,'profile')}});
let browser;
try{
 let ready=false;for(let i=0;i<300;i++){try{ready=(await fetch('http://127.0.0.1:'+port+'/json/version')).ok;}catch{}if(ready)break;await new Promise(ok=>setTimeout(ok,200));}
 assert.ok(ready,'portable launcher starts the bundled runtime');
 browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);const page=browser.contexts()[0].pages()[0];
 await page.locator('#app [data-action]').first().waitFor({timeout:60000});
 assert.equal(await page.evaluate(()=>location.origin),'sango://game');assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 await page.close();await browser.close();browser=null;
 await writeFile(join(out,'result.json'),JSON.stringify({passed:true,executable,checks:['actual portable EXE extracts and starts','bundled code and binary data load','native application origin','renderer has no Node access']},null,2));
 console.log('Portable EXE verified: '+out);
}finally{if(browser){for(const page of browser.contexts()[0].pages())await page.close().catch(()=>{});await browser.close().catch(()=>{});}child.kill();}
