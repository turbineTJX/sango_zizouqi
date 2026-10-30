// Local diagnosis of scripted historical events, not a global balance gate.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {customArmyColumns} from '../reinforcement-arrival.mjs';
import {customBattleTotals,swapCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {stepBattle,validateSave,battleWounded} from '../engine.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const out=resolve('work/player-fixes-20261028/event-control');mkdirSync(out,{recursive:true});
const files=[...readdirSync('.').filter(f=>f.endsWith('.mjs')),...readdirSync('data',{recursive:true}).filter(f=>/\.(mjs|json|bin)$/.test(f)).map(f=>'data/'+f)].sort();
const fingerprint=()=>createHash('sha256').update(files.map(f=>f+':'+createHash('sha256').update(readFileSync(f)).digest('hex')).join('\n')).digest('hex');
const source=fingerprint(),rows=[];
for(const scenario of ['hefei','chibi','yiling'])for(const [phase,seeds] of [['development',[2601,2602]],['validation',[7901,7902]]])for(const seed of seeds)for(const swapped of [false,true])for(const events of [false,true]){
 const original=historicalBattleDraft(scenario),budget=Math.min(...[0,1].map(side=>customBattleTotals(original,side).troops));
 // Same total soldiers, same level and actual rosters. Preserve each team's
 // troop proportions and real multi-army arrivals; no injected abilities.
 for(const side of [0,1]){
  const entries=customArmyColumns(original).filter(a=>a.side===side).flatMap(a=>a.team),total=entries.reduce((n,u)=>n+u.troops,0);
  for(const u of entries)u.troops=1000+Math.floor((u.troops-1000)*(budget-entries.length*1000)/(total-entries.length*1000));
  let remainder=budget-entries.reduce((n,u)=>n+u.troops,0);for(const u of entries){if(!remainder--)break;u.troops++;}
 }
 original.ownTroopBudget=budget;original.seed=seed;if(!events)original.events=[];
 const draft=swapped?swapCustomBattle(original):original;
 assert.equal(customBattleTotals(draft,0).troops,customBattleTotals(draft,1).troops);
 const s=generateBattle(draft),b=s.battle;let copy=null;
 while(!b.result){stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});else if(b.tick>=12)copy=validateSave(structuredClone(s));}
 assert.deepEqual(copy.battle,b);validateSave(s);
 const row={scenario,phase,seed,swapped,events,budget,tick:b.tick,days:Math.ceil(b.tick/24),winner:b.result.winner,originalSideWon:b.result.winner===(swapped?1:0),reason:b.result.reason,stats:b.sides.map(side=>({remaining:side.units.reduce((n,u)=>n+u.hp,0),wounded:side.units.reduce((n,u)=>n+battleWounded(u),0),killed:side.units.reduce((n,u)=>n+u.initial-u.hp-battleWounded(u),0)}))};
 rows.push(row);writeFileSync(resolve(out,`${scenario}-${phase}-${seed}-${swapped?'swap':'normal'}-${events?'events':'plain'}.json`),JSON.stringify({row,draft,state:s}));
 console.log(JSON.stringify(row));
}
assert.equal(fingerprint(),source,'Source changed during diagnosis');
const summary=[];for(const scenario of ['hefei','chibi','yiling'])for(const events of [false,true]){
 const runs=rows.filter(r=>r.scenario===scenario&&r.events===events);
 summary.push({scenario,events,runs:runs.length,originalSideWins:runs.filter(r=>r.originalSideWon).length,meanDays:runs.reduce((n,r)=>n+r.days,0)/runs.length});
}
writeFileSync(resolve(out,'results.json'),JSON.stringify({rules:RULES_VERSION,source,scope:'Equal total troop budgets, level 10, actual historical rosters, both sides AI; not equal economic costs or a global balance conclusion.',summary,rows},null,2));
console.log(JSON.stringify({summary}));
