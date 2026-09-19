import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {configureUnitTactics,lockDeployment,stepBattle,issueCommand,battleStratagems,STRATAGEMS,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {SPECIAL_TACTICS} from '../tactics.mjs';
import {unit,setupRulePlayer} from './custom-playability-lib.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const rows=[],runs=[];
for(const [id,type] of [['person-290','crossbow'],['person-246','archer']])for(const level of [5,10])for(const mode of ['full','basic','ordinary']){
 const samples=[];
 for(let i=0;i<8;i++){
  const seed=12100000+i*104729,mage=mode==='ordinary'?'person-512':id;
  const draft={seed,terrain:'land',ownTeam:[unit('person-396','cavalry',6000,5),unit('person-646','spear',1500,5),unit(mage,type,1500,level)],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]};
  const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;b.sides.forEach(s=>s.tactic='balanced');setupRulePlayer(state);
  const basics=type==='archer'?['smoke','wildfire','rally']:['screen','seal','ambush'];
  const kit=mode==='full'?[SPECIAL_TACTICS[id],...basics.slice(type==='archer'?1:0,type==='archer'?3:2)]:basics;
  assert.equal(configureUnitTactics(state,mage,kit),null);lockDeployment(b);
  let saved=null;
  const order=b=>{if(b.commandProgress>=12000){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key)assert.equal(issueCommand(b,key),null);}};
  while(!b.result){order(b);stepBattle(b);if(saved){order(saved.battle);stepBattle(saved.battle);}if(i===0&&b.tick===20)saved=validateSave(structuredClone(state));assert.ok(b.tick<=480);}
  if(saved)assert.deepEqual(b,saved.battle);validateSave(structuredClone(state));
  const r={id,type,level,mode,seed,winner:b.result.winner,ticks:b.tick,remaining:b.sides[0].units.reduce((n,u)=>n+u.hp,0)/9000,enemyRemaining:b.sides[1].units.reduce((n,u)=>n+u.hp,0)/9000,commands:b.commandSerial,casts:b.sides[0].units.find(u=>u.id===mage).tacticCasts};samples.push(r);runs.push(r);
 }
 const row={id,type,level,mode,n:8,wins:samples.filter(r=>r.winner===0).length,remaining:samples.reduce((n,r)=>n+r.remaining,0)/8,enemyRemaining:samples.reduce((n,r)=>n+r.enemyRemaining,0)/8,orders:samples.reduce((n,r)=>n+r.commands,0)/8};rows.push(row);console.log(JSON.stringify(row));
}
const out=new URL('../docs/balance-diagnosis/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('famous-support.json',out),JSON.stringify({rulesVersion:RULES_VERSION,total:runs.length,sourceHash:createHash('sha256').update(readFileSync(new URL('../tactics.mjs',import.meta.url))).digest('hex'),rows,runs},null,2));
