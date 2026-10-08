import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_PREFIX,AUTOMATIC_SAVES,writeArchive,readArchive,listArchives,deleteArchive,archivesMarkup} from '../save-archives.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {validateSave,lockDeployment,stepBattle} from '../engine.mjs';
function memory(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
const validate=value=>value.campaign?validateCampaign(value):validateSave(value);
test('named snapshots survive automatic saves, new games and independent loads',()=>{
 const storage=memory(),a=newCampaign(1,'guandu-200','yuan'),b=newCampaign(2,'heroes-251','sunce');
 const one=writeArchive(storage,{name:'河北开局',data:serializeCampaign(a)},validate),two=writeArchive(storage,{name:'江东开局',data:serializeCampaign(b)},validate);
 storage.setItem(AUTOMATIC_SAVES[0].key,serializeCampaign(b));
 const rows=listArchives(storage,validate);assert.equal(rows.length,3);assert.equal(rows[0].automatic,true);
 assert.equal(rows.find(x=>x.key===one).faction,'袁绍');assert.equal(rows.find(x=>x.key===two).scenario,'英雄集结');
 assert.equal(readArchive(storage,one,validate).campaign.playerFaction,'yuan');assert.equal(readArchive(storage,two,validate).campaign.playerFaction,'sunce');
 const loaded=readArchive(storage,one,validate);loaded.gold=0;assert.equal(readArchive(storage,one,validate).gold,a.gold);
});
test('overwrite and deletion affect only the selected manual slot',()=>{
 const storage=memory(),a=newCampaign(3,'guandu-200'),data=serializeCampaign(a);
 const one=writeArchive(storage,{name:'甲',data},validate),two=writeArchive(storage,{name:'乙',data},validate),before=storage.getItem(two);
 beginExecution(a);advanceCampaignDay(a);writeArchive(storage,{key:one,name:'甲',data:serializeCampaign(a)},validate);
 assert.equal(readArchive(storage,one,validate).campaign.day,2);assert.equal(storage.getItem(two),before);
 deleteArchive(storage,one);assert.equal(storage.getItem(one),null);assert.equal(storage.getItem(two),before);
 assert.throws(()=>deleteArchive(storage,AUTOMATIC_SAVES[0].key));
});
test('storage quota failure and invalid input preserve an existing slot',()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(4,'guandu-200')),key=writeArchive(storage,{name:'保留',data},validate),before=storage.getItem(key);
 assert.throws(()=>writeArchive(storage,{key,name:'',data},validate));assert.throws(()=>writeArchive(storage,{key,name:'损坏',data:'{}'},validate));
 storage.setItem=()=>{throw new DOMException('full','QuotaExceededError');};assert.throws(()=>writeArchive(storage,{key,name:'新名称',data},validate),/full/);assert.equal(storage.getItem(key),before);
});
test('corrupt and incompatible entries remain listed without hiding valid saves',()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(5,'guandu-200'));writeArchive(storage,{name:'正常',data},validate);
 storage.setItem(ARCHIVE_PREFIX+'broken','{');const old=JSON.parse(data);old.campaign.version=0;
 storage.setItem(AUTOMATIC_SAVES[0].key,JSON.stringify(old));const rows=listArchives(storage,validate);
 assert.equal(rows.filter(x=>x.error).length,2);assert.equal(rows.filter(x=>!x.error).length,1);
 assert.throws(()=>readArchive(storage,ARCHIVE_PREFIX+'broken',validate));assert.throws(()=>readArchive(storage,'unrelated-key',validate));
 assert.match(archivesMarkup(rows),/data-action="archive-load"[^>]*disabled/);
});
test('names are escaped in the archive interface',()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(6,'guandu-200'));writeArchive(storage,{name:'<img src=x onerror=alert(1)>',data},validate);
 const html=archivesMarkup(listArchives(storage,validate),{canSave:true,name:'" autofocus onfocus="alert(1)'});assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; autofocus'));
});
test('a manual battle snapshot resumes the current real engine deterministically',()=>{
 const storage=memory(),state=createScenario('field',917);lockDeployment(state.battle);for(let i=0;i<18;i++)stepBattle(state.battle);
 const key=writeArchive(storage,{name:'战中',data:JSON.stringify(state)},validate),loaded=readArchive(storage,key,validate);
 for(let i=0;i<20;i++){stepBattle(state.battle);stepBattle(loaded.battle);}assert.deepEqual(loaded.battle,state.battle);
});
