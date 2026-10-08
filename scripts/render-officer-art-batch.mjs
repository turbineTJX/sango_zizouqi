import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBatch} from './officer-art-batch.mjs';
import {OFFICER_ASSET_ROOT} from '../asset-workspace.mjs';
const [id,...rest]=process.argv.slice(2),portraits=rest.includes('--portraits'),flag=rest.indexOf('--out'),out=resolve(flag<0?'outputs/officer-art-'+id:rest[flag+1]);
await mkdir(out,{recursive:true});await runBatch(['review',id,...(portraits?['--portraits']:[])]);
const b=JSON.parse(await readFile(resolve(OFFICER_ASSET_ROOT,'batches',id+'.json'),'utf8'));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright'),port='4192';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c)));});
 browser=await chromium.launch({...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{channel:'msedge'}),headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});
 await page.goto(`http://127.0.0.1:${port}/assets/officers/batches/${id}-review.html`);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode();})));
 if(portraits)await page.screenshot({path:resolve(out,'portrait-sheet.png'),fullPage:true});
 else for(const [i,officerId] of b.officerIds.entries())await page.locator('section').nth(i).screenshot({path:resolve(out,officerId+'-review.png')});
 console.log(JSON.stringify({batch:id,decodedImages:await page.locator('img').count(),out}));
}finally{await browser?.close();server.kill();}
