import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {famous,A,makeCase,simulate,sourceHash,RULES_VERSION} from './basic-balance-lib.mjs';
const dir=new URL(process.argv[2]||'../outputs/team-tactics/',import.meta.url);mkdirSync(dir,{recursive:true});
const hash=sourceHash(),seedGroups={development:[871013,872021],validation:[971029,972047]};
const shard=process.argv[3]===undefined?null:Number(process.argv[3]),suffix=shard===null?'':`-${shard}`;
const heroes=famous.filter(h=>A[h.id]?.specialTactic),cases=[];
for(const h of heroes)for(const formation of ['mixed','frontline','ranged']){
 const spec=makeCase(h,'squad');
 for(const key of ['ownTeam','enemyTeam'])spec.draft[key].forEach((u,i)=>{if(i&&formation==='frontline')u.type=i%2?'spear':'halberd';if(i&&formation==='ranged')u.type=i%2?'archer':'crossbow';});
 cases.push({...spec,formation});
}
writeFileSync(new URL('manifest.json',dir),JSON.stringify({hash,rulesVersion:RULES_VERSION,seedGroups,cases,note:'Paired same hero, roster, troop budget, seed and side. Only focal exclusive or all focal tactics disabled. Disabling is diagnostic, not legal win rate. Alternative frontline/ranged compositions keep officers and may lower aptitude; not optimized teams.'},null,2));
writeFileSync(new URL(`results${suffix}.jsonl`,dir),'');let n=0;
for(const h of heroes.filter((_,i)=>shard===null||i%4===shard)){for(const spec of cases.filter(c=>c.hero===h.id))for(const [phase,seeds]of Object.entries(seedGroups))for(const seed of seeds)for(const level of [5,10])for(const swapped of [false,true]){
 const baseline=simulate(spec,{seed,level,swapped,trace:true,replay:phase==='validation'&&seed===seedGroups.validation[0]&&level===5&&!swapped});
 const tactics=baseline.initial[swapped?1:0].positions.find(u=>u.id===h.id).tactics;
 for(const mode of ['on','exclusive-off','all-off']){
  const r=mode==='on'?baseline:simulate(spec,{seed,level,swapped,trace:true,disableTactics:mode==='exclusive-off'?[A[h.id].specialTactic]:tactics});
  r.mode=mode;r.phase=phase;r.formation=spec.formation;
  // Keep focal effects including zero-damage support/control signals, not only damage.
  r.events=r.events.filter(e=>e.from===h.id);delete r.logs;
  appendFileSync(new URL(`results${suffix}.jsonl`,dir),JSON.stringify(r)+'\n');n++;
 }
}if(sourceHash()!==hash)throw Error('Runtime changed; audit incomplete');console.log(h.name,n);}
writeFileSync(new URL(`complete${suffix}.json`,dir),JSON.stringify({hash,count:n,finished:new Date().toISOString()}));console.log('Complete',n);
