import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as Thread} from 'node:worker_threads';
import {CampaignRunner} from '../campaign-runner.mjs';
import {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';

class FakeWorker {
 messages=[];terminated=false;
 postMessage(data){this.messages.push(structuredClone(data));}
 terminate(){this.terminated=true;}
 reply(data){this.onmessage({data});}
}
test('cancellation discards late results and permits a fresh calculation without mutating the input',async()=>{
 const workers=[],runner=new CampaignRunner({createWorker:()=>{const w=new FakeWorker();workers.push(w);return w;}}),state={day:1};
 const old=runner.run(state);assert.equal(runner.busy,true);assert.throws(()=>runner.run(state),/already running/);
 runner.cancel();assert.equal(await old,null);assert.equal(workers[0].terminated,true);
 const fresh=runner.run(state),id=workers[1].messages.at(-1).id;
 workers[0].reply({id:id-1,state:{day:999}});workers[0].onerror({message:'late failure'});assert.equal(runner.busy,true);
 workers[1].reply({id,state:{day:2},result:{dayEnded:true}});assert.equal((await fresh).state.day,2);
 assert.deepEqual(state,{day:1});runner.destroy();assert.equal(workers[1].terminated,true);
});
test('worker failures reject without a partial world and the next request can retry',async()=>{
 const workers=[],runner=new CampaignRunner({createWorker:()=>{const w=new FakeWorker();workers.push(w);return w;}});
 const attempt=runner.run({day:1});workers[0].onerror({message:'failed',preventDefault(){}});await assert.rejects(attempt,/failed/);
 assert.equal(runner.busy,false);assert.ok(workers[0].terminated);
 const retry=runner.run({day:1}),id=workers[1].messages.at(-1).id;workers[1].reply({id,error:'engine failure'});await assert.rejects(retry,/engine failure/);runner.destroy();
});
test('background natural all-AI days and saved continuations match the common engine byte for byte',async t=>{
 const url=new URL('../campaign-worker.mjs',import.meta.url).href;
 const createWorker=()=>{
  const w=new Thread(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:data=>parentPort.postMessage(data)};import(${JSON.stringify(url)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
  w.on('message',data=>w.onmessage?.({data}));w.on('error',error=>w.onerror?.({message:error.message}));return w;
 };
 const runner=new CampaignRunner({createWorker});t.after(()=>runner.destroy());
 let direct=newCampaign(81,'guandu-200','cao',{allAI:true}),background=structuredClone(direct);
 for(let i=0;i<12;i++){
  const before=serializeCampaign(background),result=await runner.run(background);
  assert.equal(serializeCampaign(background),before,'only a completed result can replace the caller world');
  const expected=advanceCampaignDay(direct);assert.deepEqual(result.result,expected);
  background=result.state;assert.equal(serializeCampaign(background),serializeCampaign(direct));
  if(i===1||i===9){background=validateCampaign(JSON.parse(serializeCampaign(background)));direct=validateCampaign(JSON.parse(serializeCampaign(direct)));}
 }
 assert.equal(background.campaign.day,13);assert.ok(background.campaign.ai.decisions.length);
});
