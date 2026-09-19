import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createScenario} from '../scenarios.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {validateSave} from '../engine.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {classicCases,archetypes,opponents,fight} from './custom-playability-lib.mjs';

const root=new URL('../',import.meta.url),out=new URL('../docs/engine-foundations/',import.meta.url);
mkdirSync(out,{recursive:true});
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>/\.(mjs|json)$/.test(f)).map(f=>'data/'+f),'scripts/audit-engine-foundations.mjs','scripts/custom-playability-lib.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const initialHashes=hashes(),runs=[],checks=[];
const seeds=[33000001,33104730,33209459,33314188];
function run(id,draft,options){
 // Replanning must be idempotent, side-local and independent of RNG.
 const state=createScenario('custom-battle',draft.seed,20,null,draft),before=structuredClone(state.battle);
 planEnemyArmy(state.battle);assert.deepEqual(state.battle,before);validateSave(state);
 assert.ok(state.battle.sides.every(s=>s.tactic==='balanced'));
 const result=fight(draft,{...options,resume:true});
 // No victory quotas: these are engine gates, not balance targets.
 runs.push({id,draft,...result});
}
for(const c of classicCases){
 for(const swapped of [false,true])for(const seed of seeds)run(`classic/${c.id}/${swapped?'swapped':'normal'}`,{terrain:c.id==='fleet'?'river':c.id==='fire-forest'?'forest':'land',seed,ownTeam:swapped?c.z:c.a,enemyTeam:swapped?c.a:c.z},{controller:'rule'});
 checks.push({id:c.id,runs:8});
}
console.log('Classics: 56 battles, both starting sides checked.');
const allocations={equal:[1500,1500,1500,1500,1500,1500],core:[6000,600,600,600,600,600],dual:[3500,3500,500,500,500,500],thin:[4116,2941,1765,60,59,59]};
for(const a of archetypes){
 for(const o of opponents)for(const [allocation,troops] of Object.entries(allocations))for(const seed of seeds){
  run(`player/${a.id}/${o.id}/${allocation}`,{seed,terrain:o.terrain,ownTeam:a.team.map((u,i)=>({...u,troops:troops[i]})),enemyTeam:o.team.map(u=>({...u,troops:1500}))},{controller:'player',plan:'compact'});
 }
 console.log(a.id+': 48 battles, four soldier allocations checked.');
}
assert.deepEqual(hashes(),initialHashes,'Source changed during audit');
const summary={rulesVersion:RULES_VERSION,total:runs.length,seeds,checks,hashes:initialHashes,maxStill:Math.max(...runs.map(r=>r.maxStill)),timeouts:runs.filter(r=>r.result.reason==='久战收兵').map(r=>({id:r.id,seed:r.seed,ticks:r.ticks,maxStill:r.maxStill})),groups:[...new Set(runs.map(r=>r.id))].map(id=>{const group=runs.filter(r=>r.id===id);return {id,n:group.length,maxTicks:Math.max(...group.map(r=>r.ticks)),maxStill:Math.max(...group.map(r=>r.maxStill))};})};
writeFileSync(new URL('results.json',out),JSON.stringify(summary,null,2));
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(runs)));
console.log(JSON.stringify({total:summary.total,maxStill:summary.maxStill,timeouts:summary.timeouts.length,rulesVersion:RULES_VERSION}));
