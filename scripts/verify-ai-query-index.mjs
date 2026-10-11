import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const root=resolve('work/ai-unification-20261010'),load=(folder,file)=>import(pathToFileURL(join(root,folder,file)));
const original=await load('source','strategic-campaign.mjs'),indexed=await load('indexed-source','strategic-campaign.mjs');
const query=await load('indexed-source','activity-query-index.mjs');
const nodes=[{sourceId:'a',faction:'cao',day:1},{sourceId:'b',faction:'yuan',day:1}];
assert.deepEqual(query.activityByFaction(nodes,'cao'),nodes.filter(n=>n.faction==='cao'));
query.activityByFaction(nodes,'cao').length=0;assert.equal(query.activityByFaction(nodes,'cao').length,1);
nodes.push({sourceId:'c',faction:'cao',day:2});assert.equal(query.activityBySource(nodes,'c'),nodes[2]);assert.deepEqual(query.activityByDay(nodes,1),nodes.filter(n=>n.day===1));
const loaded=JSON.parse(JSON.stringify(nodes));assert.deepEqual(query.activityByFaction(loaded,'cao'),loaded.filter(n=>n.faction==='cao'));
const start=performance.now(),results=[];
async function compare(a,b,days,label){
 let originalSeconds=0,indexedSeconds=0;
 assert.equal(original.serializeCampaign(a),indexed.serializeCampaign(b));
 for(let i=0;i<days;i++){
  let t=performance.now();original.advanceCampaignDay(a);originalSeconds+=(performance.now()-t)/1000;
  t=performance.now();indexed.advanceCampaignDay(b);indexedSeconds+=(performance.now()-t)/1000;
  assert.equal(indexed.serializeCampaign(b),original.serializeCampaign(a),'Index changes full daily state: '+label+' day '+a.campaign.day);
  if((i+1)%10===0)console.log(JSON.stringify({event:'equal',label,days:i+1,day:a.campaign.day,originalSeconds,indexedSeconds}));
 }
 const row={label,days,day:a.campaign.day,originalSeconds,indexedSeconds,stateHash:createHash('sha256').update(original.serializeCampaign(a)).digest('hex')};results.push(row);
}
await compare(original.newCampaign(20261010,'guandu-200','cao',{allAI:true}),indexed.newCampaign(20261010,'guandu-200','cao',{allAI:true}),60,'fresh');
const saved=await readFile(join(root,'baseline-day-811.json'),'utf8');
await compare(original.validateCampaign(JSON.parse(saved)),indexed.validateCampaign(JSON.parse(saved)),10,'long-campaign');
await writeFile(join(root,'query-index-verification.json'),JSON.stringify({status:'passed',seconds:(performance.now()-start)/1000,results},null,2));
console.log(JSON.stringify({event:'verified',results}));
