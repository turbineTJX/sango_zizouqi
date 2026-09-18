import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,issueCommand,battleStratagems,STRATAGEMS} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

export function fight(id,seed,{orders=false}={}){
 const state=createScenario(id,seed),b=state.battle;
 lockDeployment(b);
 let controls=0,ordersUsed=0,casts=0;
 while(!b.result){
  if(orders&&b.commandProgress>=12000){
   const key=chooseEnemyCommand({...b,sides:[b.sides[1],b.sides[0]],enemyCommand:{commandReady:b.commandReady}},battleStratagems(b),STRATAGEMS);
   if(key&&!issueCommand(b,key))ordersUsed++;
  }
  stepBattle(b);
  controls+=b.sides[1].units.filter(u=>u.status==='active'&&['stun','confuse','seal','slow'].some(k=>(u.statuses[k]?.until||0)>b.tick)).length;
  casts+=b.effects.filter(e=>e.phase==='cast'&&e.side===0).length;
 }
 return {seed,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),gate:b.siege?.gate.hp,controls,casts,ordersUsed};
}
export function sample(id,count=32,start=910000,options={}){
 const runs=Array.from({length:count},(_,i)=>fight(id,start+i*7919,options));
 return {id,count,start,wins:runs.filter(r=>r.winner===0).length,losses:runs.filter(r=>r.winner===1).length,draws:runs.filter(r=>r.winner===null).length,meanTicks:Math.round(runs.reduce((n,r)=>n+r.ticks,0)/count),runs};
}
