import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
const dir=new URL(process.argv[2]||'../outputs/team-tactics/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',dir)));
const parts=[0,1,2,3].map(i=>({i,...JSON.parse(readFileSync(new URL(`complete-${i}.json`,dir)))}));
if(parts.some(p=>p.count!==576||p.hash!==manifest.hash))throw Error('Shard incomplete or mismatched');
writeFileSync(new URL('results.jsonl',dir),'');
for(const p of parts){const data=readFileSync(new URL(`results-${p.i}.jsonl`,dir),'utf8');if(data.trim().split('\n').length!==p.count)throw Error('Row mismatch');appendFileSync(new URL('results.jsonl',dir),data);}
writeFileSync(new URL('complete.json',dir),JSON.stringify({hash:manifest.hash,count:2304,finished:new Date().toISOString(),parts}));console.log('Merged 2304 fights');
