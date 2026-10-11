import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {generateBattle} from '../battle-generator.mjs';
import {HISTORICAL_BATTLES,historicalBattleDraft} from '../historical-battle-library.mjs';
import {swapCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,planBattleCouncilsAI,validateSave,COMMAND_RESOURCE} from '../engine.mjs';
import {canOccupy} from '../battlefield.mjs';
import {hasStatus,validLoadout} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {isTargetable} from '../engagement.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

// Observers never change resources, actions, targets, loadouts or outcomes.
// Both controllers use the current council, reserve and command policies.
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const out=resolve(args.out||'work/ai-selfplay-20261009/tactical');
const seeds=(args.seeds||'20261009,20261010,30361009,30361010').split(',').map(Number);
const councilOrder=(args['council-order']||'0,1').split(',').map(Number);
assert.ok(!args.batch||['development','validation','diagnostic'].includes(args.batch),'Unknown sample role');
assert.ok(councilOrder.length===2&&new Set(councilOrder).size===2&&councilOrder.every(n=>[0,1].includes(n)));
assert.ok(seeds.length&&seeds.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=0xffffffff));
assert.equal(new Set(seeds).size,seeds.length,'Use distinct seeds');
await mkdir(out,{recursive:true});await mkdir(join(out,'incidents'),{recursive:true});
const initialHash=sourceHash(),rows=[];
const own=['cao','liao','chu','jia','dun','yu','jin','yuanxia'];
const enemy=['shao','yan','wen','he','ju','tian','gao','person-72'];
const makeTeam=(ids,types,troops)=>ids.map((id,i)=>({id,type:types[i%types.length],troops:Array.isArray(troops)?troops[i]:troops,level:10}));
const custom=(id,terrain,typesA,typesB,{count=6,troopsA=3000,troopsB=3000,equipment=null}={})=>{
 const draft={terrain,battleKind:'field',seed:seeds[0],limit:480,shieldPercent:0,
  ownTeam:makeTeam(own.slice(0,count),typesA,troopsA),enemyTeam:makeTeam(enemy.slice(0,count),typesB,troopsB)};
 if(equipment)for(const u of [...draft.ownTeam,...draft.enemyTeam])u.equipment=equipment;
 return {id,name:id,kind:'custom',draft};
};
const mixed=['spear','cavalry','halberd','archer','spear','archer'];
const cases=[...HISTORICAL_BATTLES.map(h=>({id:h.id,name:h.name,kind:'historical',expectedWinner:h.expectedWinner,draft:historicalBattleDraft(h.id)})),
 ...['land','forest','hill','marsh'].map(t=>custom('mixed-'+t,t,mixed,mixed)),
 custom('cavalry-vs-ranged','land',['cavalry'],['archer']),
 custom('line-vs-cavalry','land',['spear','halberd'],['cavalry']),
 custom('all-ranged','land',['archer'],['archer']),
 custom('core-vs-equal','land',mixed,mixed,{troopsA:[6000,2400,2400,2400,2400,2400]}),
 custom('reserves','land',mixed,mixed,{count:8,troopsA:2500,troopsB:2500}),
 custom('river-boats','river',mixed,mixed,{equipment:{siege:null,ship:'ship'}})];

const active=b=>b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);
const sum=xs=>xs.reduce((n,v)=>n+v,0);
const fingerprint=u=>JSON.stringify([u.x,u.y,u.hp,u.status,u.intent,u.skillCasts,u.healed,u.passiveState.shots,u.contribution]);
const selectedCases=cases.filter(c=>!args.case||args.case.split(',').includes(c.id));
assert.ok(selectedCases.length,'No matching self-play cases');
for(const c of selectedCases){
 for(const seed of seeds)for(const swapped of [false,true]){
  const draft=swapped?swapCustomBattle(c.draft):structuredClone(c.draft);draft.seed=seed;
  const state=generateBattle(draft),b=state.battle;
  planBattleCouncilsAI(b,councilOrder);
  assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
  const opening=b.sides.map(s=>({intent:s.battleIntent,commanders:s.commanders,units:s.units.map(u=>({id:u.id,name:u.name,type:u.type,initial:u.initial,status:u.status,x:u.x,y:u.y}))}));
  const commands=[],streak=new Map(),maxStreak={},actions={},targetChanges={},lastTargets=new Map(),firstDamage=[null,null],fullHeld=[0,0];
  let copy=null,checkpoint=null,maxGlobalQuiet=0,globalQuiet=0,lastBoard=null,incidentCount=0;
  const snapshot=()=>structuredClone({tick:b.tick,gate:b.siege?.gate.hp,units:b.sides.map(s=>s.units.map(u=>({id:u.id,hp:u.hp,intent:u.intent,status:u.status,x:u.x,y:u.y,action:u.action,target:u.passiveState.targetId,statuses:u.statuses,casts:u.tacticCasts})))});
  const timeline=[];
  while(!b.result){
   const before=b.tick,serials=[b.commandSerial,b.enemyCommand.commandSerial],previous=new Map(active(b).map(u=>[u.id,fingerprint(u)]));
   stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
   assert.ok(b.tick>before||b.result,'Battle stopped advancing');assert.ok(b.tick<=b.maxTicks+1);
   const live=active(b);assert.equal(new Set(live.map(u=>`${u.x},${u.y}`)).size,live.length);
   for(const u of live){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp<=u.maxHp);assert.ok(validLoadout(u,u.tactics));
    const key=u.side+':'+u.action;actions[key]=(actions[key]||0)+1;
    const n=previous.get(u.id)===fingerprint(u)?(streak.get(u.id)||0)+1:0;streak.set(u.id,n);maxStreak[u.id]=Math.max(maxStreak[u.id]||0,n);
    const target=u.passiveState.targetId;if(lastTargets.has(u.id)&&lastTargets.get(u.id)!==target)targetChanges[u.id]=(targetChanges[u.id]||0)+1;lastTargets.set(u.id,target);
    if(n===48&&incidentCount<2){await writeFile(join(out,'incidents',`${c.id}-${seed}-${swapped}-${u.id}-${b.tick}.json`),JSON.stringify({case:c.id,seed,swapped,unit:u.id,kind:'unchanged-unit-state-48',state},null,2));incidentCount++;}
   }
   const board=JSON.stringify([b.siege?.gate.hp,live.map(u=>[u.id,fingerprint(u)])]);globalQuiet=board===lastBoard?globalQuiet+1:0;maxGlobalQuiet=Math.max(maxGlobalQuiet,globalQuiet);lastBoard=board;
   for(const side of [0,1]){
    if(firstDamage[side]===null&&b.sides[side].units.some(u=>u.battleDamage>0))firstDamage[side]=b.tick;
    const resource=side===0?b:b.enemyCommand;
    if(resource.commandSerial>serials[side]){
     const allies=live.filter(u=>u.side===side&&!hasStatus(b,u,'stasis')),foes=live.filter(u=>u.side!==side&&isTargetable(b,u));
     const distance=allies.length&&foes.length?Math.min(...allies.flatMap(u=>foes.map(v=>hexDistance(u,v)))):null;
     commands.push({side,...structuredClone(resource.lastCommand),distance,firstDamage:firstDamage[side]});
    }
    if(!b.result&&resource.commandProgress>=COMMAND_RESOURCE.capacity)fullHeld[side]++;
   }
   if(b.tick%24===0||b.result)timeline.push(snapshot());
   if(seed===seeds[0]&&b.tick===24){checkpoint=structuredClone(state);copy=validateSave(structuredClone(state));}
  }
  if(copy)assert.deepEqual(copy.battle,b,'Deterministic continuation differs');validateSave(structuredClone(state));
  const row={id:c.id,name:c.name,kind:c.kind,seed,batch:args.batch||(seeds.indexOf(seed)<Math.ceil(seeds.length/2)?'development':'validation'),swapped,
   expectedWinner:c.expectedWinner,winner:b.result.winner,originalWinner:b.result.winner===null?null:swapped?1-b.result.winner:b.result.winner,
   reason:b.result.reason,ticks:b.tick,opening,firstDamage,commands,fullHeld,maxGlobalQuiet,maxStreak,actions,targetChanges,replayed:!!copy,
   remaining:b.sides.map(s=>sum(s.units.filter(u=>u.arrivalConfirmed!==false&&['active','reserve'].includes(u.status)).map(u=>u.hp))),
   units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,initial:u.initial,hp:u.hp,status:u.status,casts:u.tacticCasts,contribution:u.contribution,arrived:u.arrivalConfirmed,arrivalTick:u.arrivalTick,reinforcementIndex:u.reinforcementIndex}))),timeline};
  rows.push(row);
  if(b.result.reason==='久战收兵'||c.expectedWinner!==undefined&&c.expectedWinner!==null&&row.originalWinner!==c.expectedWinner){
   await writeFile(join(out,'incidents',`${c.id}-${seed}-${swapped}-outcome.json`),JSON.stringify({draft,row,checkpoint,finalState:state},null,2));
  }
 }
 await writeFile(join(out,'tactical-audit.json'),JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:initialHash,seeds,councilOrder,councilMode:'simultaneous',productionController:true,rows},null,2));
 const rs=rows.filter(r=>r.id===c.id);console.log(JSON.stringify({case:c.id,n:rs.length,wins:[0,1,null].map(w=>rs.filter(r=>r.originalWinner===w).length),maxTicks:Math.max(...rs.map(r=>r.ticks)),maxQuiet:Math.max(...rs.map(r=>r.maxGlobalQuiet)),unchanged48:rs.filter(r=>Object.values(r.maxStreak).some(n=>n>=48)).length}));
}
assert.equal(sourceHash(),initialHash,'Runtime source changed during audit');
console.log(JSON.stringify({event:'finish',rulesVersion:RULES_VERSION,battles:rows.length,replayed:rows.filter(r=>r.replayed).length,sourceStable:true,out}));
