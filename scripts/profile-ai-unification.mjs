import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Session} from 'node:inspector';
import {performance} from 'node:perf_hooks';

// Profile an independent continuation. The observed campaign is never touched.
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const out=resolve(args.out||'work/ai-unification-20261010/guandu-200-20261010');
const config=JSON.parse(await readFile(join(out,'run-config.json'),'utf8'));
const {advanceCampaignDay,validateCampaign}=await import(pathToFileURL(join(config.source,'strategic-campaign.mjs')));
const s=validateCampaign(JSON.parse(await readFile(join(out,'checkpoint-save.json'),'utf8')));
const session=new Session();session.connect();
const post=(method,params={})=>new Promise((res,rej)=>session.post(method,params,(error,result)=>error?rej(error):res(result)));
await post('Profiler.enable');await post('Profiler.start');
const start=performance.now(),first=s.campaign.day,days=Number(args.days||5);
for(let i=0;i<days&&!s.finished;i++)advanceCampaignDay(s);
const {profile}=await post('Profiler.stop');session.disconnect();
await writeFile(join(out,'cpu-profile.json'),JSON.stringify(profile));
const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
for(const n of profile.nodes)for(const child of n.children||[])parents.set(child,n.id);
const sums=new Map();
for(let i=0;i<(profile.samples||[]).length;i++){
 const duration=profile.timeDeltas[i]||0,seen=new Set();let id=profile.samples[i];
 for(let depth=0;id&&depth<200;depth++,id=parents.get(id)){
  const frame=nodes.get(id).callFrame,key=(frame.functionName||'(anonymous)')+' '+frame.url+':'+(frame.lineNumber+1);
  if(seen.has(key))continue;seen.add(key);
  const entry=sums.get(key)||{frame:key,selfMicroseconds:0,inclusiveMicroseconds:0};
  entry.inclusiveMicroseconds+=duration;if(depth===0)entry.selfMicroseconds+=duration;sums.set(key,entry);
 }
}
const result={startDay:first,endDay:s.campaign.day,seconds:(performance.now()-start)/1000,topSelf:[...sums.values()].sort((a,b)=>b.selfMicroseconds-a.selfMicroseconds).slice(0,15),topInclusive:[...sums.values()].sort((a,b)=>b.inclusiveMicroseconds-a.inclusiveMicroseconds).slice(0,20)};
await writeFile(join(out,'cpu-summary.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
