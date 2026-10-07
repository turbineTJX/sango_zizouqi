import {readFileSync,writeFileSync} from 'node:fs';
import {simulate,sourceHash,A} from '../outputs/expanded-heroes/source/scripts/basic-balance-lib.mjs';
import {unitTactics,hasStatus,tacticTarget,TACTICS_BOOK} from '../outputs/expanded-heroes/source/tactics.mjs';
import {tacticUsesLeft} from '../outputs/expanded-heroes/source/tactic-tempo.mjs';
const dir=new URL('../outputs/expanded-heroes/',import.meta.url),m=JSON.parse(readFileSync(new URL('manifest.json',dir)));
if(sourceHash()!==m.hash)throw Error('Snapshot mismatch');
const rows=[0,1,2,3].flatMap(i=>readFileSync(new URL(`results-${i}.jsonl`,dir),'utf8').trim().split('\n').map(JSON.parse));
const selected=rows.filter(r=>r.phase==='validation'&&r.mode==='on'&&(r.hero==='person-290'||r.hero==='person-661'&&!r.castHealth.length)),out=[];
for(const r of selected){const spec=m.cases.find(s=>s.hero===r.hero&&s.scenario===r.scenario);let before,peak=0,atCap=0;const seals=[],blocked={},capActive=[];
 const result=simulate(spec,{seed:r.seed,level:r.level,swapped:r.swapped,observe:(b,phase)=>{
  const u=b.sides[r.swapped?1:0].units.find(u=>u.id===r.hero);peak=Math.max(peak,u.intent);if(u.intent>=100)atCap++;
  if(r.hero==='person-661'&&phase==='before'&&u.status==='active'&&u.intent>=100)capActive.push({tick:b.tick,hp:u.hp,action:u.action,cooldown:u.cooldown,recovery:u.tacticRecoveryUntil,phase:hasStatus(b,u,'phase'),target:tacticTarget(b,u,TACTICS_BOOK[A[r.hero].specialTactic],1)?.id??null});
  if(phase==='before'){before=Object.fromEntries(b.sides.flatMap(s=>s.units).map(u=>[u.id,{intent:u.intent,remaining:unitTactics(u).filter(t=>tacticUsesLeft(u,t)>0).map(t=>t.id),hp:u.hp}]));if(u.status==='active'){for(const key of ['confuse','seal','stasis','phase'])if(hasStatus(b,u,key))blocked[key]=(blocked[key]||0)+1;if(u.disengage)blocked.disengage=(blocked.disengage||0)+1;}return;}
  for(const e of b.effects)if(e.from===r.hero&&e.label==='八阵奇门'&&e.resolution?.effect==='seal')seals.push({tick:b.tick,target:e.to,success:e.resolution.success,before:before[e.to]});
 }});
 if(result.margin!==r.margin||result.win!==r.win)throw Error('Observational replay changed result');out.push({hero:r.hero,scenario:r.scenario,seed:r.seed,level:r.level,swapped:r.swapped,peakIntent:peak,atCapSnapshots:atCap,capActive,blocked,seals});
}
writeFileSync(new URL('focus-probes.json',dir),JSON.stringify(out,null,2));const lu=out.filter(r=>r.hero==='person-661'),seals=out.flatMap(r=>r.seals).filter(s=>s.success);
console.log(JSON.stringify({matchedReplays:out.length,lubu:lu,zhuge:{successful:seals.length,alreadySpent:seals.filter(s=>s.before.remaining.length===0).length}},null,2));
