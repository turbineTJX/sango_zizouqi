import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {famous,ordinary,A,aptitude,simulate,sourceHash,RULES_VERSION} from './basic-balance-lib.mjs';
import {trainingCost} from '../troop-training.mjs';
const dir=new URL(process.argv[2]||'../outputs/expanded-heroes/',import.meta.url),shard=Number(process.argv[3]||0);mkdirSync(dir,{recursive:true});
const heroes=famous.filter(h=>A[h.id]?.specialTactic),hash=sourceHash(),seeds={development:[881031,882037],validation:[981043,982057]};
const scenarios=['mixed-a','mixed-b','frontline','ranged','elite-enemy','core-heavy'];
function make(h,scenario){
 const types=scenario==='frontline'?[h.type,'spear','halberd','spear','halberd','crossbow']:scenario==='ranged'?[h.type,'spear','archer','crossbow','archer','crossbow']:[h.type,'spear','halberd','cavalry','archer','crossbow'];
 const used=new Set([h.id]),score=o=>o.leadership+Math.max(o.force,o.intellect);
 const pick=(type,elite,index)=>{let pool=(elite?heroes:ordinary).filter(o=>!used.has(o.id));pool.sort((a,b)=>aptitude(b,type)-aptitude(a,type)||score(a)-score(b)||a.id.localeCompare(b.id));const best=pool[0]&&aptitude(pool[0],type);pool=pool.filter(o=>aptitude(o,type)>=(elite?best:2));if(!pool.length)throw Error('No eligible roster');const rank=scenario==='mixed-b'?.3:.75;const o=pool[Math.floor((pool.length-1)*rank)];used.add(o.id);return o;};
 const entry=(o,type,i)=>({id:o.id,type,troops:scenario==='core-heavy'?(i?1600:4000):2000,level:5,retreatAt:null});
 const own=types.map((t,i)=>entry(i?pick(t,false,i):h,t,i)),enemy=types.map((t,i)=>entry(pick(t,scenario==='elite-enemy',i),t,i));
 const cost=team=>team.reduce((n,u)=>n+trainingCost(u.type,u.troops),0);if(cost(own)!==cost(enemy))throw Error('Unequal cost');
 return {hero:h.id,focal:h.id,control:enemy[0].id,kind:'squad',type:h.type,scenario,draft:{battleKind:'field',terrain:'land',limit:360,shieldPercent:0,waves:[],seed:seeds.development[0],ownTeam:own,enemyTeam:enemy,ownTeamRoles:{leader:own[1].id,advisor:own[5].id},enemyTeamRoles:{leader:enemy[1].id,advisor:enemy[5].id}}};
}
const cases=heroes.flatMap(h=>scenarios.map(s=>make(h,s)));
writeFileSync(new URL('manifest.json',dir),JSON.stringify({hash,rulesVersion:RULES_VERSION,seeds,scenarios,cases,note:'Equal soldiers and training budget across sides; paired focal exclusive on/off; no roster/formation edits inside a pair. Elite enemy deliberately stronger personnel; no claim of matched officer quality.'},null,2));
writeFileSync(new URL(`results-${shard}.jsonl`,dir),'');let n=0;
for(const h of heroes.filter((_,i)=>i%4===shard)){
 for(const spec of cases.filter(c=>c.hero===h.id))for(const [phase,ss]of Object.entries(seeds))for(const seed of ss)for(const level of [5,10])for(const swapped of [false,true])for(const mode of ['on','off']){
  const castHealth=[];let castCount=0;
  const r=simulate(spec,{seed,level,swapped,trace:true,disableTactics:mode==='off'?[A[h.id].specialTactic]:[],replay:mode==='on'&&phase==='validation'&&seed===ss[0]&&level===5&&!swapped,observe:(b,when)=>{if(when!=='after')return;const u=b.sides[swapped?1:0].units.find(u=>u.id===h.id),count=u.tacticCasts[A[h.id].specialTactic]||0;if(count>castCount)castHealth.push({tick:b.tick,hp:u.hp,fraction:u.hp/u.initial});castCount=count;}});
  r.events=r.events.filter(e=>e.from===h.id);delete r.logs;Object.assign(r,{scenario:spec.scenario,phase,mode,castHealth});appendFileSync(new URL(`results-${shard}.jsonl`,dir),JSON.stringify(r)+'\n');n++;
 }
 console.log(h.name,n);if(sourceHash()!==hash)throw Error('Source changed');
}
writeFileSync(new URL(`complete-${shard}.json`,dir),JSON.stringify({hash,count:n}));console.log('Complete',n);
