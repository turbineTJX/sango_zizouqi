import {mkdirSync,writeFileSync} from 'node:fs';
import {HISTORICAL_BATTLES,historicalBattleDraft} from '../historical-battle-library.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {customParticipants,customBattleTotals,swapCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {fixedOwnAI,DEV_SEEDS,VALIDATION_SEEDS} from './xiapi-player-lab.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';

export function officerQuality(entries){return entries.reduce((n,u)=>{const p=OFFICER_BY_ID[u.id];return n+.5*p.leadership+.3*Math.max(p.force,p.intellect)+.2*Math.min(p.force,p.intellect);},0)/entries.length;}
export function equalizeBudget(draft,side,target){
 const entries=[draft[side===0?'ownTeam':'enemyTeam'],...draft.reinforcements.filter(a=>a.side===side).map(a=>a.team)].flat(),total=entries.reduce((n,u)=>n+u.troops,0);
 for(const u of entries)u.troops=Math.max(1000,Math.floor(u.troops*target/total/100)*100);
 let remaining=target-entries.reduce((n,u)=>n+u.troops,0);
 while(remaining>=100){for(const u of entries){if(remaining<100)break;u.troops+=100;remaining-=100;}}
 return validateCustomBattle(draft);
}
export function simulateHistory(input,{seed=input.seed,swapped=false,verify=false}={}){
 const draft=swapped?swapCustomBattle(input):structuredClone(input);draft.seed=seed;
 const state=generateBattle(draft),b=state.battle;fixedOwnAI(b);lockDeployment(b);validateSave(structuredClone(state));
 let copy=null;
 while(!b.result){
  const before=b.tick;
  stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
  if(b.tick===before&&!b.result)throw Error('Historical AI stalled: '+JSON.stringify({mapId:draft.mapId,seed,swapped,tick:b.tick,council:b.reinforcementCouncil}));
  if(verify&&!copy&&b.tick>=24)copy=validateSave(structuredClone(state));
 }
 if(copy&&JSON.stringify(copy.battle)!==JSON.stringify(b))throw Error('Historical continuation differs');
 validateSave(structuredClone(state));
 return {seed,swapped,winner:b.result.winner,originalWinner:b.result.winner===null?null:swapped?1-b.result.winner:b.result.winner,reason:b.result.reason,ticks:b.tick,remaining:b.sides.map(s=>s.units.filter(u=>u.arrivalConfirmed!==false&&['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0)),arrivals:b.sides.map(s=>s.units.filter(u=>u.reinforcementIndex!==undefined&&u.arrivalConfirmed).length),fielded:b.sides.map(s=>s.units.filter(u=>u.reinforcementIndex!==undefined&&u.passiveState.reserveEntered).length),reinforcementCasts:b.sides.map(s=>s.units.filter(u=>u.reinforcementIndex!==undefined).reduce((n,u)=>n+u.skillCasts,0)),resumed:!!copy,events:structuredClone(b.battleEvents),reinforcementArmies:draft.reinforcements.map((a,index)=>{const units=b.sides[a.side].units.filter(u=>u.reinforcementIndex===index);return {index,side:a.side,name:a.name,scheduledTick:a.tick??null,condition:a.arrivalCondition??null,arrivedAt:units.every(u=>u.arrivalConfirmed)?units[0].arrivalTick:null,arrived:units.filter(u=>u.arrivalConfirmed).length,fielded:units.filter(u=>u.passiveState.reserveEntered).length,casts:units.reduce((n,u)=>n+u.skillCasts,0)};})};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/audit-historical-reinforcements.mjs')){
 const phase=process.argv[2]||'dev',count=Number(process.argv[3]||(phase==='dev'?4:8)),seeds=(phase==='dev'?DEV_SEEDS:VALIDATION_SEEDS.slice(16)).slice(0,count),directory='outputs/historical-reinforcements';
 mkdirSync(directory,{recursive:true});const rows=[],summary=[],drafts={},snapshotHash=sourceHash();
 for(const history of HISTORICAL_BATTLES){
  const input=historicalBattleDraft(history.id);drafts[history.id]=input;
  for(const seed of seeds)for(const swapped of [false,true]){const row={id:history.id,...simulateHistory(input,{seed,swapped,verify:phase!=='dev'&&seed===seeds[0]})};rows.push(row);console.log(history.id,seed,swapped?'swapped':'original',row.originalWinner,row.ticks);}
  const cases=rows.filter(r=>r.id===history.id),quality=[0,1].map(side=>officerQuality([input[side===0?'ownTeam':'enemyTeam'],...input.reinforcements.filter(a=>a.side===side).map(a=>a.team)].flat()));
  const result={id:history.id,name:history.name,expectedWinner:history.expectedWinner,forces:[0,1].map(side=>customBattleTotals(input,side)),quality,ownWins:cases.filter(r=>r.originalWinner===0).length,enemyWins:cases.filter(r=>r.originalWinner===1).length,draws:cases.filter(r=>r.originalWinner===null).length,n:cases.length,expectedWins:history.expectedWinner===null?null:cases.filter(r=>r.originalWinner===history.expectedWinner).length,arrivals:cases.map(r=>r.arrivals),fielded:cases.map(r=>r.fielded)};
  summary.push(result);console.log(history.id,JSON.stringify(result));
  writeFileSync(directory+'/'+phase+'-results.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:snapshotHash,phase,seeds,drafts,summary,rows,losses:rows.filter(r=>HISTORICAL_BATTLES.find(h=>h.id===r.id).expectedWinner!==null&&r.originalWinner!==HISTORICAL_BATTLES.find(h=>h.id===r.id).expectedWinner)},null,2));
 }
}
