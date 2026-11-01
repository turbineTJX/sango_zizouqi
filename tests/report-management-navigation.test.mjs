import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=name=>{const match=app.match(new RegExp('function '+name+'\\(\\)\\{[\\s\\S]*?\\n\\}'));assert.ok(match,name);return match[0];};
function fixture(fromReport){
 const ui={mode:'map',modal:'campaign-info',infoReturn:fromReport?'domestic-alerts':'faction-directory',infoHistory:[{id:'chenliu'}],paused:false,textDetails:null};
 const events=[{id:12},{id:13}];let clears=0;
 const context=vm.createContext({ui,state:{campaign:{}},detailPanels:{clear(){clears++;}},pendingDomesticAlerts:()=>events,pendingDomesticProposals:()=>[]});
 vm.runInContext(source('leaveDetailForMapManagement')+'\n'+source('presentDomesticAlerts'),context);
 return {ui,events,context,clears:()=>clears};
}
test('report management opens a paused map without consuming unread reports',()=>{
 const f=fixture(true);vm.runInContext('leaveDetailForMapManagement()',f.context);
 assert.equal(f.ui.modal,null);assert.equal(f.ui.paused,true);assert.equal(f.ui.infoReturn,null);assert.equal(f.clears(),1);
 assert.equal(vm.runInContext('presentDomesticAlerts()',f.context),false);assert.equal(f.events.length,2);
});
test('continuing after management still presents every unacknowledged report',()=>{
 const f=fixture(true);vm.runInContext('leaveDetailForMapManagement();ui.domesticAlertDeferred=false;ui.paused=false;presentDomesticAlerts()',f.context);
 assert.equal(f.ui.modal,'domestic-alerts');assert.equal(f.ui.paused,true);assert.deepEqual(Array.from(f.ui.domesticAlertIds),[12,13]);
 assert.match(app,/action==='campaign-run'\)\{ui\.domesticAlertDeferred=false;/);
});
test('ordinary directory management does not defer unrelated reports',()=>{
 const f=fixture(false);vm.runInContext('leaveDetailForMapManagement()',f.context);
 assert.equal(f.ui.domesticAlertDeferred,undefined);assert.equal(vm.runInContext('presentDomesticAlerts()',f.context),true);
});
