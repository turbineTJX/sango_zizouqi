import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {SCENARIOS,createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
const rows=[];
for(const scenario of SCENARIOS.filter(s=>s.id!=='officer-lab'))for(const seed of [101,307,743]){
 const b=createScenario(scenario.id,seed).battle;lockDeployment(b);
 let checks=0,successes=0,criticals=0,damage=0;
 while(!b.result){
  stepBattle(b);assert.ok(b.tick<=b.maxTicks);
  for(const e of b.effects){if(e.resolution){checks++;successes+=Number(e.resolution.success);}if(e.critical)criticals++;damage+=e.damage||0;}
  for(const u of b.sides.flatMap(s=>s.units))assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=u.maxHp);
 }
 rows.push({scenario:scenario.id,seed,ticks:b.tick,winner:b.result.winner,casts:b.sides.flatMap(s=>s.units).reduce((n,u)=>n+u.skillCasts,0),checks,successes,criticals,damage});
}
writeFileSync('outputs/power-v22/scenario-audit.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({battles:rows.length,checks:rows.reduce((n,r)=>n+r.checks,0),failures:rows.reduce((n,r)=>n+r.checks-r.successes,0),criticalHits:rows.reduce((n,r)=>n+r.criticals,0)}));
