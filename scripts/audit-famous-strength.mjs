import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {famous,A,makeCase,simulate,sourceHash,RULES_VERSION} from './basic-balance-lib.mjs';
const dir=new URL(process.argv[2]||'../outputs/famous-strength/',import.meta.url),id=process.argv[3];mkdirSync(dir,{recursive:true});
const h=famous.find(h=>h.id===id);if(!h)throw Error('Choose a focal hero');const hash=sourceHash();
writeFileSync(new URL(id+'.jsonl',dir),'');let n=0;
for(const formation of ['mixed','frontline','ranged']){
 const spec=makeCase(h,'squad');for(const key of ['ownTeam','enemyTeam'])spec.draft[key].forEach((u,i)=>{if(i&&formation==='frontline')u.type=i%2?'spear':'halberd';if(i&&formation==='ranged')u.type=i%2?'archer':'crossbow';});
 for(const [phase,seeds]of Object.entries({development:[871013,872021],validation:[971029,972047]}))for(const seed of seeds)for(const level of [5,10])for(const swapped of [false,true])for(const mode of ['on','exclusive-off']){
  const r=simulate(spec,{seed,level,swapped,trace:true,disableTactics:mode==='on'?[]:[A[id].specialTactic],replay:mode==='on'&&level===5&&!swapped});
  r.events=r.events.filter(e=>e.from===id);delete r.logs;Object.assign(r,{phase,mode,formation});
  appendFileSync(new URL(id+'.jsonl',dir),JSON.stringify(r)+'\n');n++;
 }
}
if(sourceHash()!==hash)throw Error('Runtime changed');writeFileSync(new URL(id+'-complete.json',dir),JSON.stringify({hash,rulesVersion:RULES_VERSION,count:n}));console.log(h.name,n,'complete');
