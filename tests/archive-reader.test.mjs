import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as Thread} from 'node:worker_threads';
import {ArchiveReader} from '../archive-reader.mjs';
import {CampaignRunner} from '../campaign-runner.mjs';
import {newCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {validateGameSave} from '../game-save-validation.mjs';
import {inspectArchiveRaw,listArchives,writeArchive,readArchive,ARCHIVE_PREFIX} from '../save-archives.mjs';
function runner(){
 const url=new URL('../campaign-worker.mjs',import.meta.url).href;
 return new CampaignRunner({createWorker:()=>{
  const w=new Thread(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:data=>parentPort.postMessage(data)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
  w.on('message',data=>w.onmessage?.({data}));w.on('error',error=>w.onerror?.({message:error.message}));return w;
 }});
}
test('background archive validation matches the foreground, queues complete reads, and rejects corrupt saves',async t=>{
 const reader=new ArchiveReader({runner:runner(),background:true});t.after(()=>reader.destroy());
 const raw=serializeCampaign(newCampaign(81,'guandu-200')),manual=JSON.stringify({version:1,name:'甲',savedAt:1,data:raw});
 const [summary,loaded]=await Promise.all([reader.inspect(manual,true),reader.inspect(raw,false,true)]);
 assert.deepEqual(summary.summary,inspectArchiveRaw(manual,true,validateGameSave).summary);assert.equal(summary.name,'甲');assert.equal(summary.state,undefined);
 assert.equal(serializeCampaign(loaded.state),raw);assert.deepEqual(await reader.inspect(raw,false),{summary:summary.summary});
 await assert.rejects(reader.inspect('{',false));const old=JSON.parse(raw);old.campaign.version=0;await assert.rejects(reader.inspect(JSON.stringify(old),false));
 assert.equal((await reader.inspect(raw,false,true)).state.campaign.day,1);
});
test('archive optional background path still validates before overwrite and returns complete load state',async()=>{
 const data=new Map(),storage={keys:()=>[...data.keys()],getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 let calls=0;const options={inspect:async(raw,manual)=>{calls++;return inspectArchiveRaw(raw,manual,validateGameSave);}},raw=serializeCampaign(newCampaign(2,'guandu-200'));
 const key=await writeArchive(storage,{name:'甲',data:raw},validateGameSave,options),bytes=data.get(key);
 assert.equal((await listArchives(storage,validateGameSave,options))[0].name,'甲');assert.equal(serializeCampaign(await readArchive(storage,key,validateGameSave,options)),raw);
 await assert.rejects(writeArchive(storage,{key,name:'损坏',data:'{}'},validateGameSave,options));assert.equal(data.get(key),bytes);assert.equal(calls,4);
 assert.ok(key.startsWith(ARCHIVE_PREFIX));
});
