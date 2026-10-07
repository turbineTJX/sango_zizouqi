import {readFileSync,writeFileSync} from 'node:fs';
import {simulate,sourceHash,BY} from './basic-balance-lib.mjs';
import {unitTactics} from '../tactics.mjs';
import {tacticUsesLeft} from '../tactic-tempo.mjs';
const dir=new URL(process.argv[2]||'../outputs/team-tactics/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir)));
if(sourceHash()!==m.hash)throw Error('Source changed');
const records=[];
for(const spec of m.cases.filter(c=>c.hero==='jia'))for(const seed of m.seedGroups.validation)for(const level of [5,10])for(const swapped of [false,true]){
 let before;const hits=[];
 const snapshot=u=>({id:u.id,name:BY[u.id]?.name,status:u.status,intent:u.intent,hp:u.hp,cast:u.cast,tactics:unitTactics(u).map(s=>({id:s.id,name:s.name,left:tacticUsesLeft(u,s),ready:u.skillReady[s.id]||0,threshold:s.threshold,casts:u.tacticCasts[s.id]||0}))});
 const r=simulate(spec,{seed,level,swapped,observe:(b,phase)=>{
  if(phase==='before'){before=Object.fromEntries(b.sides.flatMap(s=>s.units).map(u=>[u.id,snapshot(u)]));return;}
  for(const e of b.effects.filter(e=>e.from==='jia'&&e.label==='十胜奇谋'&&e.intentDrained!==undefined)){
   const u=b.sides.flatMap(s=>s.units).find(u=>u.id===e.to);hits.push({tick:b.tick,drained:e.intentDrained,opening:e.openingTrigger,before:before[e.to],after:snapshot(u)});
  }
 }});
 records.push({formation:spec.formation,seed,level,swapped,win:r.win,margin:r.margin,hits,enemy:r.units[swapped?0:1].map(u=>({id:u.id,casts:u.metrics.casts}))});
}
if(sourceHash()!==m.hash)throw Error('Source changed');
writeFileSync(new URL('guojia-targets.json',dir),JSON.stringify(records,null,2));
const hits=records.flatMap(r=>r.hits);console.log(JSON.stringify({battles:records.length,casts:hits.length,spentBefore:hits.filter(h=>h.before.tactics.every(s=>!s.left)).length,spentAfter:hits.filter(h=>h.after.tactics.every(s=>!s.left)).length,samples:hits.filter(h=>h.before.tactics.every(s=>!s.left)).slice(0,3)},null,2));
