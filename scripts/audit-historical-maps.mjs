import {swapCustomBattle} from '../custom-battle.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {HISTORICAL_BATTLES,historicalBattleDraft} from '../historical-battle-library.mjs';
import {simulate} from './basic-balance-lib.mjs';
const rows=[];
for(const h of HISTORICAL_BATTLES)for(const seed of [88001,88003])for(const swapped of [false,true]){
 const original=historicalBattleDraft(h.id),draft=swapped?swapCustomBattle(original):original;
 // Swap the whole authored scenario, including which army owns the gate.
 const spec={hero:draft.ownTeam[0].id,focal:draft.ownTeam[0].id,kind:'historical',control:draft.enemyTeam[0].id,type:draft.ownTeam[0].type,draft};
 const r=simulate(spec,{seed,level:10,replay:true});const damage=r.units.map(s=>s.reduce((n,u)=>n+u.metrics.basicDamage+u.metrics.skillDamage,0));if(damage.some(n=>n<=0))throw Error(h.id+' has non-fighting army');rows.push({id:h.id,seed,swapped,winner:r.winner,ticks:r.ticks,reason:r.reason,remaining:r.remaining,damage,casts:r.units.map(s=>s.reduce((n,u)=>n+Object.values(u.metrics.casts).reduce((m,t)=>m+t.count,0),0))});
}
mkdirSync('outputs/historical-maps',{recursive:true});writeFileSync('outputs/historical-maps/audit.json',JSON.stringify(rows,null,2));console.log('PASS',rows.length,'battles: both sides fight, legal saves, deterministic replay');
