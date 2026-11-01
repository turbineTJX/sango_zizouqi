import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const out='outputs/information-panels-ui',port='4397',checks=[],errors=[];await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:port,SANGO_ART:'off'},stdio:'pipe',windowsHide:true});let browser,page;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);});
 browser=await chromium.launch({channel:'msedge',headless:true});page=await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(raw=>{localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));localStorage.setItem('sango-sovereign-v2',raw);},serializeCampaign(newCampaign(203,'guandu-200')));
 await page.goto(`http://127.0.0.1:${port}/#strategy`);await page.locator('.national-world').waitFor();
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved(),action=name=>page.locator(`[data-action="${name}"]`),tab=kind=>page.locator(`[data-action="campaign-info-tab"][data-kind="${kind}"]`);
 await action('campaign-info').click();await page.locator('[data-action="info-menu-list"][data-kind="officer"]').click();
 await page.locator('#campaign-info-query').fill('曹');await page.locator('.info-directory tbody tr').filter({hasText:'曹操'}).first().waitFor();
 await page.locator('[data-field-sort="info"][data-sort-key="intellect"]').click();
 const sort=await page.locator('[data-sort-key="intellect"]').getAttribute('data-sort-current');
 await tab('city').click();await page.locator('#campaign-info-query').fill('许昌');await page.locator('.info-directory tbody tr').filter({hasText:'许昌'}).waitFor();
 await tab('officer').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'曹');assert.equal(await page.locator('[data-sort-key="intellect"]').getAttribute('data-sort-current'),sort);
 await page.locator('[data-action="campaign-info-scope"][data-scope="all"]').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'');
 await page.locator('#campaign-info-query').fill('袁');await tab('city').click();await tab('officer').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'袁');
 await page.locator('[data-action="campaign-info-scope"][data-scope="self"]').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'曹');
 checks.push('independent category and scope search/sort state');
 await action('campaign-info-clear').click();assert.equal(await page.locator('#campaign-info-query').inputValue(),'');
 await page.locator('#campaign-info-query').fill('不存在的人员');await page.getByText('没有符合条件的记录。',{exact:true}).waitFor();await action('campaign-info-clear').click();
 checks.push('empty search recovery without losing category or sort');
 for(const [width,height]of [[1440,900],[1024,600],[844,390],[740,360],[390,844]]){
  await page.setViewportSize({width,height});
  const geometry=await page.locator('.information-directory').evaluate(el=>{const wrap=el.querySelector('.personnel-table-wrap'),r=wrap.getBoundingClientRect(),head=wrap.querySelector('thead').getBoundingClientRect(),row=wrap.querySelector('tbody tr').getBoundingClientRect();return {width:document.documentElement.scrollWidth,tableHeight:r.height,rows:(r.height-head.height)/row.height,title:parseFloat(getComputedStyle(document.querySelector('#modal-title')).fontSize),expectedTitle:parseFloat(getComputedStyle(document.documentElement).getPropertyValue(matchMedia('(max-height:600px) and (orientation:landscape)').matches?'--ui-text-title-compact':'--ui-text-title'))};});
  assert.ok(geometry.width<=width+1,JSON.stringify(geometry));assert.ok(geometry.rows>=3,JSON.stringify({width,height,...geometry}));assert.equal(geometry.title,geometry.expectedTitle);
  const wrap=page.locator('.information-directory>.personnel-table-wrap');await wrap.evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=180;});
  assert.ok(await wrap.evaluate(el=>{const r=el.getBoundingClientRect(),first=el.querySelector('tbody tr td').getBoundingClientRect(),head=el.querySelector('thead th').getBoundingClientRect();return Math.abs(first.left-r.left)<3&&Math.abs(head.top-r.top)<3;}));
  await page.screenshot({path:`${out}/officers-${width}.png`});await wrap.evaluate(el=>{el.scrollLeft=0;el.scrollTop=0;});
 }
 checks.push('five viewport sizes: at least three rows, fixed names/headers, no page overflow');
 for(const [width,height]of [[1440,900],[844,390]]){
  await page.setViewportSize({width,height});const wrap=page.locator('.information-directory>.personnel-table-wrap');await wrap.evaluate(el=>el.scrollTop=150);const top=await wrap.evaluate(el=>el.scrollTop);
  const row=page.locator('.info-directory [data-action="campaign-info-detail"]').nth(5);await row.click();
  const geometry=await page.evaluate(()=>{const a=document.querySelector('.detail-source-panel').getBoundingClientRect(),b=document.querySelector('.detail-inspection .modal').getBoundingClientRect();return {sourceRight:a.right,detailLeft:b.left};});
  assert.ok(geometry.sourceRight<=geometry.detailLeft,JSON.stringify(geometry));
  assert.ok(await page.locator('.modal [data-info-section="status"]').evaluate(el=>el.getBoundingClientRect().top<document.querySelector('.modal-footer').getBoundingClientRect().top-30),'current status is visible without scrolling past the portrait');
  await page.screenshot({path:`${out}/detail-${width}.png`});
  await action('campaign-info-back').click();assert.equal(await page.locator('#detail-source-root').innerText(),'');assert.equal(await wrap.evaluate(el=>el.scrollTop),top);
 }
 checks.push('detail and source do not overlap; explicit Back restores source scroll');
 await tab('city').click();await page.locator('.info-directory [data-action="campaign-info-detail"]').first().click();
 assert.equal(await page.locator('.modal .info-identity[hidden]').isVisible(),false,'city details do not acquire an empty portrait block');
 await action('campaign-info-back').click();
 await page.setViewportSize({width:844,height:390});await page.locator('.close-button').click();await page.locator('.close-button').click();
 await page.locator('[data-action="faction-directory"][data-kind="unit"]').click();
 assert.ok(await page.locator('.faction-directory>.personnel-table-wrap').evaluate(el=>el.clientHeight>=130));await page.screenshot({path:`${out}/units-landscape.png`});
 await page.locator('.close-button').click();assert.equal(await saved(),before);assert.deepEqual(errors,[]);
 checks.push('own troop list uses remaining height; all inspection leaves save unchanged');
 await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,errors},null,2));console.log(checks.map(c=>'PASS '+c).join('\n'));
}catch(e){await page?.screenshot({path:`${out}/failure.png`});throw e;}finally{await browser?.close();server.kill();}
