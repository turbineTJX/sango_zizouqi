// Cross-page visual contract: readability, matching dialog chrome, viewport bounds
// and unchanged saves. Screenshots are part of the review, not a replacement for it.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
const out=process.env.UI_STYLE_OUT||'work/ui-style-system/current',port=Number(process.env.UI_STYLE_PORT)||4495,origin=`http://127.0.0.1:${port}`;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'pipe'});
let browser,page;const errors=[],panels=[],checks=[];
const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/${name}.png`,animations:'disabled'});};
const a=name=>page.locator(`[data-action="${name}"]`);
const close=()=>page.locator('.modal-header [data-action="close"]').click();
async function expectToken(selector,property,token){
 const values=await page.locator(selector).first().evaluate((el,{property,token})=>{
  const probe=document.createElement('span');probe.style[property]=`var(${token})`;document.body.append(probe);
  const actual=getComputedStyle(el)[property],expected=getComputedStyle(probe)[property];probe.remove();return {actual,expected};
 },{property,token});
 assert.equal(values.actual,values.expected,selector+' '+property);
}
async function inspect(name){
 await page.evaluate(()=>document.fonts.ready);
 const style=await page.locator('.modal').evaluate(el=>{
  const s=getComputedStyle(el),h=getComputedStyle(el.querySelector('.modal-header')),c=getComputedStyle(el.querySelector('.close-button'));
  const lum=rgb=>{const v=rgb.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
  const contrast=(a,b)=>{a=lum(a);b=lum(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);};
  const rgb=s=>s.match(/[\d.]+/g)?.slice(0,3).map(Number);
  const box=el.getBoundingClientRect(),probe=document.createElement('span');
  probe.style.color='var(--ui-panel-raised)';el.append(probe);const panel=rgb(getComputedStyle(probe).color);probe.remove();
  return {font:s.fontFamily,color:s.color,background:s.backgroundImage,header:h.backgroundImage,frame:s.borderImageSource,closeRadius:c.borderRadius,closeColor:c.color,
   contrast:contrast(rgb(s.color),panel),inside:box.left>=0&&box.top>=0&&box.right<=innerWidth+1&&box.bottom<=innerHeight+1,
   titleSize:getComputedStyle(el.querySelector('h2')).fontSize};
 });
 assert.ok(style.contrast>=4.5,`${name}: text contrast`);assert.ok(style.inside,`${name}: viewport bounds`);
 assert.match(style.frame,/cloud-jade-frame\.png/,`${name}: shared drawn frame`);
 const cdp=await page.context().newCDPSession(page);
 try{
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.modal-header h2'});
  style.renderedFonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;
  assert.ok(style.renderedFonts.some(f=>f.isCustomFont&&/Noto Serif SC/.test(f.familyName)&&f.glyphCount>0),`${name}: title must render the shipped font, not an installed fallback`);
 }finally{await cdp.detach();}
 panels.push({name,...style});await shot(name);
}
try{
 let serverErrors='';server.stderr.on('data',b=>serverErrors+=b);
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',c=>no(Error('server '+c+': '+serverErrors)));});
 const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
 browser=await chromium.launch(existsSync(edge)?{executablePath:edge,headless:true}:{channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sango-battle-onboarding-v1',JSON.stringify({version:1,status:'skipped',battleKey:null,step:0})));
 await page.goto(origin);await page.locator('.mode-selection').waitFor();
 await page.evaluate(async()=>{for(const src of ['/ui-materials/cloud-jade-frame.png','/ui-materials/ink-silk-panel.png']){const img=new Image();img.src=src;await img.decode();if(!img.naturalWidth)throw Error('Missing dialog artwork: '+src);}});
 await shot('01-lobby');
 await a('settings').click();await inspect('02-settings');await close();
 await a('strategy').click();await page.locator('.scenario-ribbon').first().waitFor();await page.waitForTimeout(600);await shot('03-scenarios');
 await a('lobby').click();await a('campaign-lobby').click();
 const contrast=await page.locator('.historical-map-card').first().evaluate(el=>{
  const s=getComputedStyle(el.querySelector('summary'));return {color:s.color,fontSize:s.fontSize};
 });assert.equal(contrast.color,panels[0].color);await shot('04-historical');
 await a('historical-template').first().click();await a('launch-custom').click();await inspect('05-battle-review');
 await a('scenario-launch-confirm').click();await page.locator('#battle-board').waitFor();await page.waitForTimeout(700);await shot('06-battle');
 await page.setViewportSize({width:844,height:390});await page.locator('.battle-unit').first().click();await inspect('07-battle-detail-landscape');
 await close();await shot('08-battle-landscape');
 await context.close();
 const campaign=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',hasTouch:true});
 await campaign.addInitScript(raw=>{localStorage.setItem('sango-sovereign-v2',raw);localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},serializeCampaign(newCampaign(203,'guandu-200')));
 page=await campaign.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#strategy');await page.locator('.national-world').waitFor();await shot('09-map');
 const saved=()=>page.evaluate(async()=>await(await import('/save-storage.mjs')).readSavedGame('sango-sovereign-v2'));
 const before=await saved();
 await page.locator('[data-action="faction-directory"][data-kind="officer"]').click();await inspect('10-roster');
 await page.locator('[data-action="officer-directory-tab"][data-tab="aptitudes"]').click();
 await expectToken('[data-officer-page="aptitudes"] td.numeric','color','--ui-accent');await shot('10a-aptitudes');
 await page.locator('[data-action="officer-directory-tab"][data-tab="status"]').click();
 await page.locator('.talent-panel>summary').click();await expectToken('.talent-panel>summary','backgroundColor','--ui-panel-recessed');
 await page.locator('.officer-directory [data-action="faction-object"]').first().click();await inspect('11-officer');
 await a('directory-back').click();await page.setViewportSize({width:844,height:390});await inspect('12-roster-landscape');await close();
 await a('faction-domestic').click();await inspect('13-domestic-landscape');await close();
 await a('settings').click();await inspect('14-settings-landscape');await close();
 await page.setViewportSize({width:1440,height:900});
 await a('campaign-info').click();await page.locator('[data-action="info-menu-list"][data-kind="city"]').click();
 await expectToken('.info-scope-filter button[aria-pressed=true]','backgroundColor','--ui-selected');await close();await close();
 await page.locator('.map-search summary').click();await page.locator('#national-city-search').selectOption('xuchang');
 await page.locator('[data-action="map-city-commands"][data-group="military"]').click();
 await page.locator('.city-command-grid [data-task="draft"]').click();
 await expectToken('.unit-muster','backgroundColor','--ui-panel-recessed');await expectToken('.unit-muster-name','color','--ui-text');
 await inspect('15-muster');await close();
 await page.keyboard.press('F1');await page.locator('.page-guide-speech').waitFor();
 await expectToken('.page-guide-current p','color','--ui-text');await shot('16-guide');
 for(const viewport of [{width:1440,height:900},{width:844,height:390}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(200);
  assert.ok(await page.locator('.page-guide-speech').evaluate(el=>{
   const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&
    [...el.querySelectorAll('.page-guide-footer button')].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left&&x.right<=r.right&&x.bottom<=r.bottom;});
  }),'Guide controls remain inside the speech panel and viewport');
 }
 await shot('17-guide-landscape');
 await page.locator('.page-guide-x').click();
 assert.equal(await saved(),before,'Browsing the themed pages must leave the save unchanged.');
 for(const p of panels){assert.equal(p.font,panels[0].font,p.name+' font');assert.equal(p.header,panels[0].header,p.name+' header');assert.equal(p.closeRadius,panels[0].closeRadius,p.name+' close');}
 checks.push('All sampled dialog types render the shipped Noto Serif SC font and share header material and close shape','Readable main text and historical-card disclosure','Aptitude grades, roster details, scope selection, muster and help use shared tokens','Desktop and landscape modal bounds','Campaign save unchanged after all inspections');
 assert.deepEqual(errors,[]);
 await writeFile(`${out}/result.json`,JSON.stringify({passed:true,checks,panels,errors},null,2));console.log(checks.join('\n'));
}catch(error){await page?.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
