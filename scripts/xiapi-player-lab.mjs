import assert from 'node:assert/strict';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,deployUnit,reserveDeploymentUnit,configureBattleIntent,battleStratagems,STRATAGEMS,issueCommand,validateSave,COMMAND_RESOURCE,fillSlots} from '../engine.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {sideBonds} from '../bonds.mjs';
import {hasStatus} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';

export const DEV_SEEDS=Array.from({length:8},(_,i)=>710003+i*7919);
export const VALIDATION_SEEDS=Array.from({length:32},(_,i)=>1710011+i*104729);
export const XIAPI_IDS={lu:'person-661',chen:'person-447',gao:'person-170',liao:'liao',hou:'person-174',song:'person-334',wei:'person-128',cao:'person-343',zang:'person-347',diao:'person-425'};
export const STARTERS={default:['lu','chen','gao','liao','hou','song'],beauty:['lu','chen','gao','liao','hou','diao'],muster:['lu','chen','gao','hou','song','wei'],beautyMuster:['lu','chen','diao','hou','song','wei'],rearControl:['lu','chen','gao','liao','song','diao']};
const CELLS={center:[[4,3],[3,3],[4,4],[4,0],[3,4],[3,2]],north:[[4,0],[3,1],[4,1],[3,0],[4,2],[2,1]],south:[[4,7],[3,6],[4,6],[3,7],[4,5],[2,6]],fortress:[[3,3],[2,3],[3,4],[3,0],[2,4],[2,2]],spread:[[4,0],[2,2],[4,3],[4,7],[4,4],[2,4]]};

// The existing enemy planner sees a mirrored public board; only its proposed
// positions are applied through the normal player deployment API.
export function fixedOwnAI(b){
 const view=structuredClone(b);view.sides.reverse();
 for(const [side,army]of view.sides.entries())for(const u of army.units){u.side=side;if(u.status==='active'){u.x=13-u.x;u.y=7-u.y;}}
 if(view.siege){view.siege.attackerSide=1-view.siege.attackerSide;const g=view.siege.gate;g.side=1-g.side;g.x=13-g.x;g.y=7-g.y;}
 for(const u of view.sides[1].units){u.status='reserve';u.x=-1;u.y=-1;}
 fillSlots(view,1);
 planEnemyArmy(view);
 const placements=view.sides[1].units.filter(u=>u.status==='active').map(u=>({id:u.id,x:13-u.x,y:7-u.y}));
 for(const u of b.sides[0].units.filter(u=>u.status==='active'))assert.equal(reserveDeploymentUnit(b,u.id),null);
 for(const p of placements)assert.equal(deployUnit(b,p.id,p.x,p.y),null);
}

export function playerCommand(b,policy='human'){
 if(policy==='none'||b.result||b.commandProgress<COMMAND_RESOURCE.capacity)return null;
 const available=battleStratagems(b);
 if(policy==='fixed'){const key=chooseEnemyCommand(b,available,STRATAGEMS,0);return key?{key,point:chooseStratagemPoint(b,STRATAGEMS[key],0)}:null;}
 const own=b.sides[0].units.filter(u=>u.status==='active'&&u.hp>0),foes=b.sides[1].units.filter(u=>u.status==='active'&&u.hp>0&&!hasStatus(b,u,'stealth')&&!hasStatus(b,u,'stasis'));
 const harmful=['confuse','seal','despair','weaken','intentSuppression','burn'];
 const core=own.find(u=>u.id===XIAPI_IDS.lu),affected=own.filter(u=>harmful.some(k=>hasStatus(b,u,k))).length;
 let key=null;
 if(available.includes('cleanse')&&(affected>=2||core&&['confuse','seal','despair','intentSuppression'].some(k=>hasStatus(b,core,k))))key='cleanse';
 else if(available.includes('disrupt')&&foes.some(e=>own.some(u=>hexDistance(u,e)<=3))&&foes.some(e=>e.intent>=30))key='disrupt';
 else if(available.includes('assault')&&!((b.sides[0].assaultUntil||0)>b.tick)&&foes.some(e=>own.some(u=>hexDistance(u,e)<=3)))key='assault';
 else if(available.includes('haste')&&!((b.sides[0].hasteUntil||0)>b.tick)&&foes.some(e=>own.some(u=>hexDistance(u,e)<=4)))key='haste';
 if(!key)return null;
 return {key,point:chooseStratagemPoint(b,STRATAGEMS[key],0)};
}

export function xiapiState(plan,seed,{ratio=1,lock=true}={}){
 const draft=historicalBattleDraft('xiapi');draft.seed=seed;
 for(const u of draft.ownTeam){u.troops=Math.max(1000,Math.round((plan.troops?.[u.id]??u.troops)*ratio/100)*100);if(plan.types?.[u.id])u.type=plan.types[u.id];}
 const budget=Math.round(38000*ratio/100)*100;let excess=draft.ownTeam.reduce((n,u)=>n+u.troops,0)-budget;
 for(const u of [...draft.ownTeam].sort((a,b)=>b.troops-a.troops)){const remove=Math.min(excess,u.troops-1000);u.troops-=remove;excess-=remove;if(!excess)break;}
 if(plan.roles)draft.ownTeamRoles={...draft.ownTeamRoles,...plan.roles};
 assert.equal(draft.ownTeam.reduce((n,u)=>n+u.troops,0),Math.round(38000*ratio/100)*100,'player keeps the assigned total budget');
 const state=generateBattle(draft),b=state.battle;
 if(plan.starters){const selected=STARTERS[plan.starters].map(k=>XIAPI_IDS[k]);for(const u of [...b.sides[0].units].filter(u=>u.status==='active'))assert.equal(reserveDeploymentUnit(b,u.id),null);const cells=CELLS[plan.formation];selected.forEach((id,i)=>assert.equal(deployUnit(b,id,...cells[i]),null));}
 else if(plan.formation==='fixedAI')fixedOwnAI(b);
 assert.equal(configureBattleIntent(b,plan.intent||'hold'),null);if(lock)assert.equal(lockDeployment(b),null);
 assert.equal(b.sides[0].units.filter(u=>u.status==='active').length,6);
 validateSave(structuredClone(state));return state;
}

export function simulateXiapi(plan,seed,{ratio=1,replay=false,trace=false,disabledBonds=[]}={}){
 const state=xiapiState(plan,seed,{ratio}),b=state.battle;
 // Mechanism ablation only, never a player option or a valid saved battle.
 const diagnostic=disabledBonds.length>0;assert.ok(!diagnostic||!replay);
 for(const u of b.sides.flatMap(s=>s.units))for(const key of disabledBonds)delete u.bondGrowth.levels[key];
 const opening={bonds:b.sides.map((_,i)=>sideBonds(b,i)),units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,hp:u.hp,status:u.status,x:u.x,y:u.y,tactics:u.tactics}))),commanders:b.sides.map(s=>s.commanders),commands:battleStratagems(b)};
 const metrics={damage:[0,0],healed:[0,0],casts:[{},{}],bonds:{},orders:[],luAlive:0,luIntentAdvantage:0,diaoAttacks:0,events:[]};let copy;
 while(!b.result){
  const controllers=plan.id==='fixed-ai'?{aiSides:[0,1]}:{pauseForReinforcements:false};
  const serial=b.commandSerial;stepBattle(b,controllers);if(copy)stepBattle(copy.battle,controllers);
  if(plan.id==='fixed-ai'&&b.commandSerial>serial)metrics.orders.push(structuredClone(b.lastCommand));
  for(const e of b.effects){const side=e.side??b.sides.findIndex(s=>s.units.some(u=>u.id===e.from));if(e.damage>0&&side>=0)metrics.damage[side]+=e.damage;if(e.healed&&side>=0)metrics.healed[side]+=e.healed;if(e.phase==='cast'&&side>=0)metrics.casts[side][e.label]=(metrics.casts[side][e.label]||0)+1;if(e.label&&Object.values(BOND_DESIGNS).some(d=>d.name===e.label)){const row=metrics.bonds[e.label]||={count:0,intentDrained:0,intentGained:0,shield:0};row.count++;row.intentDrained+=e.intentDrained||0;row.intentGained+=e.intentGained||0;row.shield+=e.shield||0;}if(e.text?.includes('勇武')){(metrics.bonds.勇武||={count:0,intentDrained:0,intentGained:0,shield:0}).count++;}if(e.from===XIAPI_IDS.diao&&e.damage>0&&!e.skill&&!e.ongoing)metrics.diaoAttacks++;}
  const lu=b.sides[0].units.find(u=>u.id===XIAPI_IDS.lu);if(lu.status==='active'&&lu.hp>0){metrics.luAlive++;metrics.luIntentAdvantage+=b.sides[1].units.filter(e=>e.status==='active'&&e.hp>0&&e.intent<lu.intent).length;}
  const order=plan.id==='fixed-ai'?null:playerCommand(b,plan.policy||'human');if(order){const error=issueCommand(b,order.key,order.point);if(copy)assert.equal(issueCommand(copy.battle,order.key,order.point),error);if(!error)metrics.orders.push({tick:b.tick,...order});}
  if(trace&&(b.tick%12===0||b.result))metrics.events.push({tick:b.tick,gate:b.siege.gate.hp,bonds:b.sides.map((_,i)=>sideBonds(b,i)),units:b.sides.map(s=>s.units.map(u=>({id:u.id,hp:u.hp,intent:u.intent,status:u.status,x:u.x,y:u.y,action:u.action,statuses:Object.keys(u.statuses)})))});
  if(replay&&b.tick===12)copy=validateSave(structuredClone(state));
 }
 if(copy)assert.deepEqual(b,copy.battle);if(!diagnostic)validateSave(structuredClone(state));
 return {plan:plan.id,seed,ratio,diagnostic,disabledBonds,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,remaining:b.sides.map(s=>s.units.filter(u=>['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0)),gate:b.siege.gate.hp,opening,metrics,units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,hp:u.hp,initial:u.initial,status:u.status,contribution:u.contribution,tacticCasts:u.tacticCasts}))),...(trace?{state}: {})};
}
export const plans=[{id:'fixed-ai',formation:'fixedAI',policy:'fixed'}, {id:'default',policy:'none'},...Object.keys(STARTERS).flatMap(starters=>Object.keys(CELLS).map(formation=>({id:starters+'-'+formation,starters,formation,policy:'human'})))];
const types=Object.fromEntries(Object.entries({lu:'halberd',chen:'archer',gao:'cavalry',liao:'halberd',hou:'cavalry',song:'cavalry',wei:'cavalry',cao:'archer',zang:'spear',diao:'archer'}).map(([k,v])=>[XIAPI_IDS[k],v]));
const concentration=Object.fromEntries(Object.entries({lu:9000,chen:5000,gao:7000,liao:7000,hou:3000,song:1000,wei:1000,cao:1000,zang:1000,diao:3000}).map(([k,v])=>[XIAPI_IDS[k],v]));
export const adaptedPlans=['center','north','south','fortress','spread'].flatMap(formation=>[
 {id:'aptitude-'+formation,starters:'beauty',formation,types,policy:'human'},
 {id:'concentrated-'+formation,starters:'beauty',formation,types,troops:concentration,policy:'human'},
 {id:'commanded-'+formation,starters:'beauty',formation,types,troops:concentration,roles:{leader:XIAPI_IDS.liao,advisor:XIAPI_IDS.chen,},policy:'human'},
]);
export function summarize(rows){const wins=rows.filter(r=>r.winner===0).length;return {n:rows.length,wins,losses:rows.filter(r=>r.winner===1).length,draws:rows.filter(r=>r.winner===null).length,winRate:wins/rows.length,remaining:rows.reduce((n,r)=>n+r.remaining[0]-r.remaining[1],0)/rows.length,gate:rows.reduce((n,r)=>n+r.gate,0)/rows.length,luAlive:rows.reduce((n,r)=>n+r.metrics.luAlive,0)/rows.length,diaoAttacks:rows.reduce((n,r)=>n+r.metrics.diaoAttacks,0)/rows.length};}
