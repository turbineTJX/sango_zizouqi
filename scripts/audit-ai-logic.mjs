import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync, readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment, stepBattle, validateSave, battleStratagems, STRATAGEMS, COMMAND_RESOURCE, issueCommand} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {canOccupy} from '../battlefield.mjs';
import {validLoadout} from '../tactics.mjs';
import {classicCases, archetypes, opponents} from './custom-playability-lib.mjs';
import {HISTORICAL_CAMPAIGNS} from '../historical-campaigns.mjs';
import {TACTICAL_CAMPAIGNS} from '../tactical-campaigns.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const root=new URL('../',import.meta.url),out=new URL(`../docs/ai-logic-review-2026-09-19/rules${RULES_VERSION}/`,import.meta.url);
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>/\.(mjs|json)$/.test(f)).map(f=>'data/'+f)];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const before=hashes(),runs=[],incidents=[];
function run(id,state){
 const b=state.battle,streaks={},maxStreaks={},commands=[];let resumed=null,lastSerial=0;
 lockDeployment(b);
 while(!b.result){
  if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key){assert.equal(issueCommand(b,key),null);if(resumed)assert.equal(issueCommand(resumed.battle,key),null);}}
  stepBattle(b);if(resumed)stepBattle(resumed.battle);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp>0&&u.hp<=u.maxHp);assert.ok(validLoadout(u,u.tactics));}
  for(const u of active.filter(u=>u.side===1)){
   const idle=['调整阵线','策应队友','守护城门','固守 / 迟滞','撤离射击盲区'].includes(u.action);
   streaks[u.id]=idle?(streaks[u.id]||0)+1:0;maxStreaks[u.id]=Math.max(maxStreaks[u.id]||0,streaks[u.id]);
   if(streaks[u.id]===12)incidents.push({id,tick:b.tick,kind:'idle-streak',unit:u.id,action:u.action,battle:structuredClone(b)});
  }
  if(b.enemyCommand.commandSerial!==lastSerial){commands.push({...b.enemyCommand.lastCommand});lastSerial=b.enemyCommand.commandSerial;}
  if(!b.result&&b.enemyCommand.commandProgress===COMMAND_RESOURCE.capacity&&chooseEnemyCommand(b,battleStratagems(b,1),STRATAGEMS)===null){
   const allies=active.filter(u=>u.side===1);
   if(battleStratagems(b,1).includes('inspire')&&(b.enemyCommand.commandReady.inspire||0)<=b.tick&&allies.some(u=>u.intent<=65)&&!incidents.some(i=>i.id===id&&i.kind==='held-inspire'))incidents.push({id,tick:b.tick,kind:'held-inspire',battle:structuredClone(b)});
  }
  if(b.tick===20)resumed=validateSave(structuredClone(state));
  assert.ok(b.tick<=480);
 }
 if(resumed)assert.deepEqual(resumed.battle,b);validateSave(structuredClone(state));
 runs.push({id,seed:state.testScenario?.customBattle?.seed,result:b.result,ticks:b.tick,maxStreaks,commands,units:b.sides[1].units.map(u=>({id:u.id,name:u.name,type:u.type,initial:u.initial,hp:u.hp,casts:u.tacticCasts}))});
}
const seeds=[33000001,33104730,33209459,33314188];
for(const c of classicCases)for(const swapped of [false,true])for(const seed of seeds){const draft={seed,terrain:c.terrain,ownTeam:swapped?c.z:c.a,enemyTeam:swapped?c.a:c.z};run(`classic/${c.id}/${swapped}/${seed}`,createScenario('custom-battle',seed,20,null,draft));}
console.log('Completed 56 classic battles.');
const allocations={equal:[1500,1500,1500,1500,1500,1500],core:[6000,600,600,600,600,600],dual:[3500,3500,500,500,500,500],thin:[4116,2941,1765,60,59,59]};
for(const a of archetypes){
 for(const o of opponents)for(const [allocation,troops] of Object.entries(allocations))for(const seed of seeds){const draft={seed,terrain:o.terrain,ownTeam:o.team.map(u=>({...u,troops:1500})),enemyTeam:a.team.map((u,i)=>({...u,troops:troops[i]}))};run(`enemy/${a.id}/${o.id}/${allocation}/${seed}`,createScenario('custom-battle',seed,20,null,draft));}
 console.log('Completed enemy allocation matrix: '+a.id);
}
for(const c of [...HISTORICAL_CAMPAIGNS,...TACTICAL_CAMPAIGNS])for(const seed of seeds.slice(0,2))run(`campaign/${c.id}/${seed}`,createScenario(c.id,seed));
assert.deepEqual(hashes(),before,'Runtime source changed during audit');
mkdirSync(out,{recursive:true});
writeFileSync(new URL('runs.json',out),JSON.stringify({rulesVersion:RULES_VERSION,hashes:before,runs},null,2));
writeFileSync(new URL('incidents.json',out),JSON.stringify(incidents,null,2));
console.log(JSON.stringify({total:runs.length,timeouts:runs.filter(r=>r.result.reason==='久战收兵').map(r=>r.id),incidents:incidents.map(({battle,...i})=>i)},null,2));
