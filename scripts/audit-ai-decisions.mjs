import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HISTORICAL_CAMPAIGNS} from '../historical-campaigns.mjs';
import {TACTICAL_CAMPAIGNS} from '../tactical-campaigns.mjs';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {canOccupy} from '../battlefield.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const count=Number(process.argv[2]||32);assert.ok(Number.isInteger(count)&&count>0);
const files=['engine.mjs','battle-ai.mjs','tactics.mjs','combat-rules.mjs','unit-stats.mjs','strategic-campaign.mjs','scenarios.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const before=hashes(),results=[];
for(const c of [...HISTORICAL_CAMPAIGNS,...TACTICAL_CAMPAIGNS]){
 const runs=[];
 for(let i=0;i<count;i++){
  const seed=2700000+i*7919,b=createScenario(c.id,seed).battle;lockDeployment(b);const commands={};
  while(!b.result){
   if(b.commandProgress>=COMMAND_RESOURCE.capacity){
    const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);
    if(key){assert.equal(issueCommand(b,key),null,`${c.id}/${seed}/${b.tick}: rejected ${key}`);commands[key]=(commands[key]||0)+1;assert.equal(b.commandProgress,0);}
   }
   stepBattle(b);
   assert.ok(b.tick<=c.limit);
   const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
   assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length,`${c.id}: overlapping units`);
   for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y),`${c.id}: illegal terrain for ${u.name}`);assert.ok(u.hp>0&&Number.isFinite(u.hp));}
  }
  runs.push({seed,winner:b.result.winner,ticks:b.tick,commands,enemyOrders:b.enemyCommand.commandSerial});
 }
 const row={id:c.id,name:c.name,count,wins:runs.filter(r=>r.winner===0).length,losses:runs.filter(r=>r.winner===1).length,draws:runs.filter(r=>r.winner===null).length,meanTicks:Math.round(runs.reduce((n,r)=>n+r.ticks,0)/count),commands:runs.reduce((n,r)=>n+Object.values(r.commands).reduce((a,b)=>a+b,0),0),runs};
 results.push(row);console.log(row.name,`${row.wins}/${row.losses}/${row.draws}`,row.commands);
}
assert.deepEqual(hashes(),before,'Runtime changed during audit');
const out=new URL('../docs/campaign-review/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('ai-decisions.json',out),JSON.stringify({rulesVersion:RULES_VERSION,count,hashes:before,results},null,2));
console.log(`PASS ${results.length*count} battles: legal commands, gauge spending, positions, terrain, finite health and termination`);
