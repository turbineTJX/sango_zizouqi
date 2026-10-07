import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {bondContributors} from '../bond-display.mjs';
import {setStatus,unitTactics} from '../tactics.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {sideBonds} from '../bonds.mjs';
import {OFFICER_DESIGNS} from '../data/design/officers.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=process.env.SANGO_URL?null:spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4207',SANGO_ART:process.env.SANGO_ART||'local'},stdio:'pipe',windowsHide:true});
let browser;
try{
 if(server)await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(new Error('server exited '+code)));});
 const u=id=>({id,type:'archer',level:10,troops:4000});
 const state=createScenario('custom-battle',95,20,null,{seed:95,terrain:'land',ownTeam:['cao','person-291','person-61','person-447','person-246','person-558'].map(u),enemyTeam:['shao','liao','chu'].map(u)});lockDeployment(state.battle);
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),state);await page.goto((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'#historical-battle');await page.locator('#battle-bonds').waitFor();
 await mkdir('outputs/bonds-ui',{recursive:true});await page.screenshot({path:'outputs/bonds-ui/desktop.png',animations:'disabled'});
 const details={bondSong:/相邻战意最低/,bondCrusher:/削减6战意/,bondDoubt:/独立判定/,bondLure:/迟滞2回合/,bondFire:/保留原单层威力与来源/,bondChain:/不递归/};
 for(const [id,expected]of Object.entries(details)){const button=page.locator('#battle-bonds [data-id="'+id+'"]').first();await button.hover();await page.locator('#bond-contributors-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#bond-contributors-tooltip [data-art-portrait]').count(),bondContributors([],state.battle,0,id).length);await button.click();assert.equal(await page.locator('#bond-contributors-tooltip').isVisible(),false);const content=await page.locator('.modal').innerText();for(const n of BOND_DESIGNS[id].thresholds)assert.match(content,new RegExp(n+' 点'));assert.match(content,expected);await page.locator('.modal [data-action="close"]').first().click();}
 await page.locator('#battle-bonds [data-id="bondChain"]').first().click();await page.screenshot({path:'outputs/bonds-ui/details.png',animations:'disabled'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'outputs/bonds-ui/mobile.png',animations:'disabled'});
 const preview=createScenario('custom-battle',130,20,null,{seed:130,terrain:'land',ownTeam:['person-661','person-662','person-644','cao','person-125','chu','person-447','person-291'].map(u),enemyTeam:['shao','jin','he'].map(u)});
 // A lawful wounded enemy with an existing fire lets the UI observe a real departure.
 const doomed=preview.battle.sides[1].units[0],fireSource=preview.battle.sides[0].units[0];doomed.hp=1;doomed.battleDamage=doomed.initial-1;doomed.retreatAt=null;setStatus(preview.battle,doomed,'burn',2,{sourceId:fireSource.id,sourceName:fireSource.name,sourceSkillName:'火攻',amount:1});
 const hoverPage=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});hoverPage.on('pageerror',e=>errors.push(e.message));await hoverPage.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),preview);await hoverPage.goto((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'#historical-battle');
 const hover=hoverPage.locator('#bond-contributors-tooltip'),valor=hoverPage.locator('#battle-bonds [data-id="bondValor"]');await valor.hover();await hover.waitFor({state:'visible'});const count=bondContributors([],preview.battle,0,'bondValor').length;assert.equal(await hover.locator('[data-art-portrait]').count(),count);assert.ok(count>1);assert.equal(await hover.locator('[data-art-portrait="person-291"]').count(),0);
 const manifest=await (await hoverPage.request.get((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'local-art/manifest.json')).json();let loadedPortraits=false;
 if(manifest.portraits?.[fireSource.id]){await hover.locator('[data-art-portrait="'+fireSource.id+'"].has-art-portrait').waitFor();loadedPortraits=true;}
 await hoverPage.screenshot({path:'outputs/bonds-ui/hover-desktop.png',animations:'disabled'});
 await hoverPage.locator('.battle-council details').first().evaluate(el=>{el.open=true;});await hoverPage.locator('.battle-unit.side-0').first().dragTo(hoverPage.locator('[data-reserve-bench]'));await valor.hover();assert.equal(await hover.locator('[data-art-portrait]').count(),count-1);assert.equal(await hover.locator('[data-art-portrait="'+fireSource.id+'"]').count(),0);
 await hoverPage.keyboard.press('Escape');assert.equal(await hover.isVisible(),false);await valor.focus();assert.equal(await hover.isVisible(),true);await hoverPage.keyboard.press('Escape');assert.equal(await hover.isVisible(),false);await hoverPage.evaluate(()=>document.activeElement.blur());
 const guard=hoverPage.locator('#enemy-battle-bonds [data-id="bondGuard"]');await guard.hover();assert.ok(await hover.locator('[data-art-portrait="'+doomed.id+'"]').count());await hoverPage.keyboard.press('Space');
 await hoverPage.waitForFunction(id=>{const tip=document.getElementById('bond-contributors-tooltip');return tip&&!tip.hidden&&tip.textContent.includes('军阵')&&!tip.querySelector('[data-art-portrait="'+id+'"]');},doomed.id,{timeout:10000});await hoverPage.keyboard.press('Space');assert.equal(await hover.locator('[data-art-portrait="'+doomed.id+'"]').count(),0);
 await hoverPage.setViewportSize({width:390,height:844});await valor.hover();await hover.waitFor({state:'visible'});const box=await hover.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);assert.equal(await hoverPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await hoverPage.screenshot({path:'outputs/bonds-ui/hover-mobile.png',animations:'disabled'});
 await hoverPage.mouse.move(0,0);assert.equal(await hover.isVisible(),false);
 const swiftState=createScenario('custom-battle',96,20,null,{seed:96,terrain:'land',ownTeam:['person-181','person-399','person-339','person-513'].map(id=>({...u(id),type:'cavalry'})),enemyTeam:['person-189','person-184'].map(u)});lockDeployment(swiftState.battle);
 for(const troop of swiftState.battle.sides.flatMap(s=>s.units)){troop.cooldown=999;troop.intent=0;troop.retreatAt=null;troop.skillReady=Object.fromEntries(unitTactics(troop).map(s=>[s.id,999]));}stepBattle(swiftState.battle);
 const swiftPage=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});swiftPage.on('pageerror',e=>errors.push(e.message));await swiftPage.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),swiftState);await swiftPage.goto((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'#historical-battle');
 await swiftPage.locator('#battle-bonds [data-id="bondSwift"]').click();const swiftText=await swiftPage.locator('.modal').innerText();for(const text of ['30%','40%','50%','4回合','5回合','6回合','无视ZOC','后排','每12回合'])assert.ok(swiftText.includes(text));assert.ok(!swiftText.includes('22%'));
 await swiftPage.screenshot({path:'outputs/bonds-ui/swift-desktop.png',animations:'disabled'});await swiftPage.setViewportSize({width:390,height:844});assert.equal(await swiftPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await swiftPage.screenshot({path:'outputs/bonds-ui/swift-mobile.png',animations:'disabled'});
 const basics={
  bondPower:{names:['孙坚','纪灵','孟获','祝融','兀突骨','沙摩柯'],effect:/攻击 \+20%/},
  bondArmor:{names:['于禁','曹真','朱异','留赞','田予','胡烈'],effect:/防御 \+30%/},
  bondHaste:{names:['颜良','文丑','徐荣','马腾','吕玲绮','鲍三娘'],effect:/攻速 \+10%/},
  bondSpirit:{names:['曹叡','孙权','刘虞','刘焉','何进','曹丕'],effect:/普攻与受击战意获取 \+150%/},
  bondSuppress:{names:['张宝','张梁','程远志','波才','邓茂','龚都'],effect:/100%概率阻止该次受击战意/}
 };
 for(const [key,fixture]of Object.entries(basics)){
  const own=fixture.names.map(name=>u(Object.values(OFFICER_DESIGNS).find(o=>o.name===name).id)),basicState=createScenario('custom-battle',99,20,null,{seed:99,terrain:'land',ownTeam:own,enemyTeam:['shao','liao','chu'].map(u)});lockDeployment(basicState.battle);
  const basicPage=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});basicPage.on('pageerror',e=>errors.push(e.message));await basicPage.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),basicState);await basicPage.goto((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'#historical-battle');
  const button=basicPage.locator('#battle-bonds [data-id="'+key+'"]');await button.hover();await basicPage.locator('#bond-contributors-tooltip').waitFor({state:'visible'});assert.equal(await basicPage.locator('#bond-contributors-tooltip [data-art-portrait]').count(),6);await button.click();const content=await basicPage.locator('.modal').innerText();assert.match(content,fixture.effect);for(const n of BOND_DESIGNS[key].thresholds)assert.match(content,new RegExp(n+' 点'));
  if(key==='bondPower')await basicPage.screenshot({path:'outputs/bonds-ui/basic-power-desktop.png',animations:'disabled'});
  await basicPage.setViewportSize({width:390,height:844});assert.equal(await basicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(key==='bondSuppress')await basicPage.screenshot({path:'outputs/bonds-ui/basic-suppress-mobile.png',animations:'disabled'});
  await basicPage.close();
 }
 const advanced={bondBeauty:['貂蝉','甄氏','大乔','小乔'],bondPeach:['刘备','关羽','张飞'],bondValor:['吕布','赵云','典韦','许褚','马超']};
 for(const [key,names]of Object.entries(advanced)){
  const own=names.map(name=>u(Object.values(OFFICER_DESIGNS).find(o=>o.name===name).id)),current=createScenario('custom-battle',100,20,null,{seed:100,terrain:'land',ownTeam:own,enemyTeam:['shao','jin','he'].map(u)});lockDeployment(current.battle);assert.equal(sideBonds(current.battle,0)[key].tier,3);
  const advancedPage=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});advancedPage.on('pageerror',e=>errors.push(e.message));await advancedPage.addInitScript(s=>localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s)),current);await advancedPage.goto((process.env.SANGO_URL||'http://127.0.0.1:4207/')+'#historical-battle');
  const button=advancedPage.locator('#battle-bonds [data-id="'+key+'"]');await button.hover();await advancedPage.locator('#bond-contributors-tooltip').waitFor({state:'visible'});assert.equal(await advancedPage.locator('#bond-contributors-tooltip [data-art-portrait]').count(),names.length);const tip=await advancedPage.locator('#bond-contributors-tooltip').innerText();for(const name of names)assert.ok(tip.includes(name));
  await advancedPage.screenshot({path:'outputs/bonds-ui/'+key+'-contributors.png',animations:'disabled'});await button.click();const content=await advancedPage.locator('.modal').innerText();for(const n of BOND_DESIGNS[key].thresholds)assert.ok(content.includes(n+' 点'));assert.ok(content.includes(BOND_DESIGNS[key].thresholds.at(-1)+' 点 · 当前'));await advancedPage.setViewportSize({width:390,height:844});assert.equal(await advancedPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await advancedPage.close();
 }
 assert.deepEqual(errors,[]);await writeFile('outputs/bonds-ui/result.json',JSON.stringify({errors,desktop:true,mobile:true,details:[...Object.keys(details),'bondSwift',...Object.keys(basics),...Object.keys(advanced)],hover:true,loadedPortraits,liveSubstitution:true,liveDeparture:true,keyboard:true,swiftBurst:true,basicStatsAndIntent:true,weightedAdvanced:true},null,2));console.log('PASS current bonds, weighted advanced cores, contributor portraits, live substitution/departure, keyboard, desktop/mobile');
}finally{await browser?.close();server?.kill();}



