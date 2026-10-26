import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCHIVE_PREFIX,AUTOMATIC_SAVES,writeArchive,readArchive,listArchives,deleteArchive,archivesMarkup} from '../save-archives.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {validateSave,lockDeployment,stepBattle} from '../engine.mjs';
function memory(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
const validate=value=>value.campaign?validateCampaign(value):validateSave(value);
test('named snapshots survive automatic saves, new games and independent loads',async()=>{
 const storage=memory(),a=newCampaign(1,'guandu-200','yuan'),b=newCampaign(2,'heroes-251','sunce');
 const one=await writeArchive(storage,{name:'河北开局',data:serializeCampaign(a)},validate),two=await writeArchive(storage,{name:'江东开局',data:serializeCampaign(b)},validate);
 storage.setItem(AUTOMATIC_SAVES[0].key,serializeCampaign(b));
 const rows=await listArchives(storage,validate);assert.equal(rows.length,3);assert.equal(rows[0].automatic,true);
 assert.equal(rows.find(x=>x.key===one).faction,'袁绍');assert.equal(rows.find(x=>x.key===two).scenario,'英雄集结');
 assert.equal((await readArchive(storage,one,validate)).campaign.playerFaction,'yuan');assert.equal((await readArchive(storage,two,validate)).campaign.playerFaction,'sunce');
 const loaded=await readArchive(storage,one,validate);loaded.gold=0;assert.equal((await readArchive(storage,one,validate)).gold,a.gold);
});
test('overwrite and deletion affect only the selected manual slot',async()=>{
 const storage=memory(),a=newCampaign(3,'guandu-200'),data=serializeCampaign(a);
 const one=await writeArchive(storage,{name:'甲',data},validate),two=await writeArchive(storage,{name:'乙',data},validate),before=storage.getItem(two);
 beginExecution(a);advanceCampaignDay(a);await writeArchive(storage,{key:one,name:'甲',data:serializeCampaign(a)},validate);
 assert.equal((await readArchive(storage,one,validate)).campaign.day,2);assert.equal(storage.getItem(two),before);
 await deleteArchive(storage,one);assert.equal(storage.getItem(one),null);assert.equal(storage.getItem(two),before);
 await assert.rejects(async()=>await deleteArchive(storage,AUTOMATIC_SAVES[0].key));
});
test('storage quota failure and invalid input preserve an existing slot',async()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(4,'guandu-200')),key=await writeArchive(storage,{name:'保留',data},validate),before=storage.getItem(key);
 await assert.rejects(async()=>await writeArchive(storage,{key,name:'',data},validate));await assert.rejects(async()=>await writeArchive(storage,{key,name:'损坏',data:'{}'},validate));
 storage.setItem=()=>{throw new DOMException('full','QuotaExceededError');};await assert.rejects(async()=>await writeArchive(storage,{key,name:'新名称',data},validate),/full/);assert.equal(storage.getItem(key),before);
});
test('corrupt and incompatible entries remain listed without hiding valid saves',async()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(5,'guandu-200'));await writeArchive(storage,{name:'正常',data},validate);
 storage.setItem(ARCHIVE_PREFIX+'broken','{');const old=JSON.parse(data);old.campaign.version=0;
 storage.setItem(AUTOMATIC_SAVES[0].key,JSON.stringify(old));const rows=await listArchives(storage,validate);
 assert.equal(rows.filter(x=>x.error).length,2);assert.equal(rows.filter(x=>!x.error).length,1);
 await assert.rejects(async()=>await readArchive(storage,ARCHIVE_PREFIX+'broken',validate));await assert.rejects(async()=>await readArchive(storage,'unrelated-key',validate));
 assert.match(archivesMarkup(rows),/data-action="archive-load"[^>]*disabled/);
});
test('names are escaped in the archive interface',async()=>{
 const storage=memory(),data=serializeCampaign(newCampaign(6,'guandu-200'));await writeArchive(storage,{name:'<img src=x onerror=alert(1)>',data},validate);
 const html=archivesMarkup(await listArchives(storage,validate),{canSave:true,name:'" autofocus onfocus="alert(1)'});assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&quot; autofocus'));
});
test('a manual battle snapshot resumes the current real engine deterministically',async()=>{
 const storage=memory(),state=createScenario('field',917);lockDeployment(state.battle);for(let i=0;i<18;i++)stepBattle(state.battle);
 const key=await writeArchive(storage,{name:'战中',data:JSON.stringify(state)},validate),loaded=await readArchive(storage,key,validate);
 for(let i=0;i<20;i++){stepBattle(state.battle);stepBattle(loaded.battle);}assert.deepEqual(loaded.battle,state.battle);
});

test('archive summaries reuse only committed unchanged slots and notice another connection changing bytes',async()=>{
 const data=new Map(),versions=new Map(),reads=new Map();let revision=0,validations=0;
 const storage={entryVersions:async()=>new Map(versions),getItemWithVersion:async key=>{reads.set(key,(reads.get(key)||0)+1);await Promise.resolve();return {raw:data.get(key),version:versions.get(key)};}};
 const validator=value=>{validations++;if(!value?.campaign)throw Error('invalid');return value;};
 const put=(key,day)=>{data.set(key,JSON.stringify({version:1,name:key,savedAt:day,data:JSON.stringify({campaign:{scenarioId:'guandu-200',playerFaction:'cao',day},turn:1})}));versions.set(key,String(++revision));};
 const one=ARCHIVE_PREFIX+'one',two=ARCHIVE_PREFIX+'two';put(one,1);put(two,2);
 const [a,b]=await Promise.all([listArchives(storage,validator),listArchives(storage,validator)]);
 assert.equal(validations,2);assert.equal(reads.get(one),1);assert.equal(reads.get(two),1);a[0].name='poison';assert.notEqual(b[0].name,'poison');
 put(one,3);const rows=await listArchives(storage,validator);assert.equal(validations,3);assert.match(rows.find(r=>r.key===one).progress,/第 3 天/);assert.equal(reads.get(two),1);
 data.set(two,'{');versions.set(two,String(++revision));assert.ok((await listArchives(storage,validator)).find(r=>r.key===two).error);
 data.delete(one);versions.delete(one);assert.deepEqual((await listArchives(storage,validator)).map(r=>r.key),[two]);
});
