import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';

// Diagnostic counterfactual in this Node process only; never edits game code.
const experimental=process.argv.includes('--counterfactual');
const sourceUrl=new URL('../tactics.mjs',import.meta.url),source=readFileSync(sourceUrl,'utf8');
const needle='export function supportAnchor(b,u) {';
assert.equal(source.split(needle).length,2);
if(experimental)registerHooks({load(url,context,nextLoad){
 if(url===sourceUrl.href)return {format:'module',shortCircuit:true,source:source.replace(needle,needle+"\n  if(u.type==='cavalry')return null; // diagnostic only")};
 return nextLoad(url,context);
}});
const {createScenario}=await import('../scenarios.mjs');
const {stepBattle,lockDeployment,configureUnitTactics,validateSave,issueCommand,battleStratagems,STRATAGEMS}=await import('../engine.mjs');
const {chooseEnemyCommand}=await import('../battle-ai.mjs');
const {setupRulePlayer,unit}=await import('./custom-playability-lib.mjs');
const {SPECIAL_TACTICS}=await import('../tactics.mjs');
const runs=[];
for(const id of ['person-661','person-396','person-99'])for(let i=0;i<8;i++){
 const seed=12100000+i*104729,draft={seed,terrain:'land',ownTeam:[unit(id,'cavalry',6000,5),unit('person-646','spear',1500,5),unit('person-123','logistics',1500,5)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]};
 const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;b.sides.forEach(s=>s.tactic='balanced');setupRulePlayer(state);
 assert.equal(configureUnitTactics(state,id,[SPECIAL_TACTICS[id],'gallop','relay']),null);lockDeployment(b);
 const main=b.sides[0].units[0];let supporting=0,active=0;
 while(!b.result){
  if(b.commandProgress>=12000){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key)assert.equal(issueCommand(b,key),null);}
  stepBattle(b);assert.ok(b.tick<=480);
  if(main.status==='active'){active++;if(main.action==='策应队友')supporting++;}
 }
 validateSave(structuredClone(state));
 runs.push({id,seed,winner:b.result.winner,ticks:b.tick,active,supporting,casts:main.tacticCasts,remaining:b.sides[0].units.reduce((n,u)=>n+u.hp,0)/9000});
}
const summary=[...new Set(runs.map(r=>r.id))].map(id=>{const rs=runs.filter(r=>r.id===id);return{id,n:rs.length,wins:rs.filter(r=>r.winner===0).length,meanSupportTicks:rs.reduce((n,r)=>n+r.supporting,0)/rs.length,meanRemaining:rs.reduce((n,r)=>n+r.remaining,0)/rs.length};});
const out=new URL('../docs/balance-diagnosis/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL(experimental?'support-counterfactual.json':'support-current.json',out),JSON.stringify({experimental,description:experimental?'仅本进程禁用骑兵supportAnchor停步策应；不是正式游戏配置':'正式规则，原样运行',sourceHash:createHash('sha256').update(source).digest('hex'),summary,runs},null,2));
console.log(JSON.stringify(summary,null,2));
