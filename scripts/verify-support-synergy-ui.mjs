import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,validateSave} from '../engine.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const id=name=>Object.values(O).find(o=>o.name===name).id;
const team=names=>names.map(name=>({id:id(name),type:'archer',troops:1000,level:10}));
const state=generateBattle({seed:51919,terrain:'land',mapId:'plain-open',battleKind:'field',ownTeam:team(['周瑜','小乔','大乔','甄氏','李典','郭淮']),enemyTeam:team(['文聘','臧霸','吕虔']),shieldPercent:0,events:[]});
assert.equal(lockDeployment(state.battle),null);validateSave(state);
const out='outputs/support-synergy-20261011/ui',port=4229,server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SANGO_ART:'off'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((ok,no)=>{server.stdout.once('data',ok);server.once('error',no);server.once('exit',code=>no(Error('Server exited '+code)));});
 await mkdir(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(s=>{localStorage.setItem('sango-historical-battle-v1',JSON.stringify(s));localStorage.setItem('sango-page-guides-v1',JSON.stringify({version:1,enabled:false,seen:[]}));},state);
  await page.goto('http://127.0.0.1:'+port+'/#historical-battle');
  await page.locator('#battle-bonds [data-id="bondSong"]').first().click();
  const text=await page.locator('.modal').innerText();for(const word of ['战歌','2格','门槛','12'])assert.ok(text.includes(word),'Song missing '+word);
  assert.doesNotMatch(text,/NaN|undefined|2／6／10|相邻其他友军中战意最低/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/song-'+label+'.png',animations:'disabled'});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/verification.json',JSON.stringify({rulesVersion:state.rulesVersion,desktop:true,mobile:true,errors},null,2));console.log('PASS current Song details on desktop and mobile');
}finally{await browser?.close();server.kill();}
