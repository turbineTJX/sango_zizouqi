import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {domesticPriority} from '../faction-affairs.mjs';
const port=4399,out='outputs/management-ledgers-ui',errors=[],checks=[];
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'on'},windowsHide:true,stdio:'pipe'});
let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',hasTouch:true});page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(raw=>{
  localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));
  if(!localStorage.getItem('sango-sovereign-v2'))localStorage.setItem('sango-sovereign-v2',raw);
 },serializeCampaign(newCampaign(203,'guandu-200')));
 const url=`http://127.0.0.1:${port}/#strategy`,action=k=>page.locator(`[data-action="${k}"]`);
 const saved=()=>page.evaluate(async()=>JSON.parse(await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2')));
 await page.goto(url);await page.locator('.national-world').waitFor();await action('faction-domestic').click();
 const before=await saved(),order=domesticPriority(before),row=d=>page.locator(`[data-priority-direction="${d}"]`);
 assert.equal(await row(order[0]).locator('[data-action="faction-priority-up"]').isDisabled(),true);
 assert.equal(await row(order.at(-1)).locator('[data-action="faction-priority-down"]').isDisabled(),true);
 await row(order[0]).locator('[data-action="faction-priority-down"]').click();
 assert.deepEqual(domesticPriority(await saved()),[order[1],order[0],...order.slice(2)]);
 assert.deepEqual((await saved()).campaign.domestic.assignments,before.campaign.domestic.assignments);
 await action('close').click();await page.reload();await action('faction-domestic').click();
 assert.equal(await page.locator('.priority-row').nth(1).getAttribute('data-priority-direction'),order[0]);
 await row(order[0]).locator('[data-action="faction-priority-up"]').click();assert.deepEqual(domesticPriority(await saved()),order);
 checks.push('priority moves in either direction, persists after reload, preserves assignments, bounds disabled');
 for(const [width,height]of [[1440,900],[844,390],[390,844]]){
  await page.setViewportSize({width,height});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.ok(await row(order[2]).locator('.priority-move').first().evaluate(el=>el.getBoundingClientRect().height>=40));
  await page.screenshot({path:`${out}/domestic-${width}.png`});
 }
 await action('close').click();await page.setViewportSize({width:1440,height:900});
 await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();
 // Readability is checked from computed colors, including the frozen first column.
 const contrast=await page.locator('.officer-directory tbody').evaluate(body=>{
  const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(n=>{const v=Number(n)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  return [...body.querySelectorAll('tr:nth-child(-n+2) td')].map(td=>{const node=td.querySelector('button')||td,a=luminance(getComputedStyle(node).color),b=luminance(getComputedStyle(td).backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
 });assert.ok(contrast.every(n=>n>=4.5),JSON.stringify(contrast));
 for(const [width,height]of [[1440,900],[844,390]]){
  await page.setViewportSize({width,height});const rows=await page.locator('.officer-directory .personnel-table-wrap').evaluate(el=>{const h=el.querySelector('thead').getBoundingClientRect().height,r=el.querySelector('tbody tr').getBoundingClientRect().height;return(el.clientHeight-h)/r;});assert.ok(rows>=3,{width,rows});
  await page.screenshot({path:`${out}/roster-${width}.png`});
 }
 checks.push('touch-sized controls, readable table contrast, at least three rows on landscape');
 await action('close').click();assert.deepEqual((await saved()).campaign.domestic.assignments,before.campaign.domestic.assignments);assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,contrast,errors},null,2));console.log(checks.map(s=>'PASS '+s).join('\n'));
}catch(e){await page?.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser?.close();server.kill();}
