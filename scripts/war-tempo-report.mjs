export const strategicTurn=day=>Math.floor((day-1)/10)+1;

export function observedJointParticipation(record){
 const real=new Set(record.armyIds.filter(id=>/^a\d+$/.test(id)));
 return record.battle.sides.flatMap((side,index)=>{
  const armyIds=[...new Set(side.units.filter(u=>real.has(u.armyId)&&u.hp>0&&['active','reserve'].includes(u.status)&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=record.battle.tick&&!u.withdrawing&&!u.retreatDispatched).map(u=>u.armyId))].sort();
  return armyIds.length>=2?[{battleId:record.id,side:index,faction:side.faction,armyIds}]:[];
 });
}

export function warTempoReport(run,{earlyLastTurn=20,campaignLastTurn=60}={}){
 const {startDay,completedDay}=run.metrics,firstTurn=strategicTurn(startDay),lastTurn=strategicTurn(completedDay-1);
 const ranges=[['early',1,earlyLastTurn],['campaign',earlyLastTurn+1,campaignLastTurn],['joint',campaignLastTurn+1,lastTurn]];
 const phaseForDay=day=>{const turn=strategicTurn(day);return turn<=earlyLastTurn?'early':turn<=campaignLastTurn?'campaign':'joint';};
 const phases=ranges.map(([phase,from,to])=>{
  const first=Math.max(from,firstTurn),last=Math.min(to,lastTurn),within=day=>day>=startDay&&day<completedDay&&phaseForDay(day)===phase;
  const observedDays=Math.max(0,Math.min(completedDay,(to||0)*10+1)-Math.max(startDay,(from-1)*10+1));
  const starts=(run.battleStarts||run.battles).filter(b=>within(b.startedDay)),settled=run.battles.filter(b=>within(b.endedDay));
  const departures=run.departures.filter(a=>!a.existingAtStart&&within(a.day));
  const trace=run.planTrace.filter(p=>within(p.day)),attacks=trace.filter(p=>p.phase==='attack');
  const armyRefs=p=>(p.tasks.find(t=>t.id==='assault')?.refs||[]).filter(x=>x.startsWith('army:'));
  return {phase,fromTurn:observedDays?first:null,toTurn:observedDays?last:null,observedTurns:observedDays/10,startedBattles:starts.length,settledBattles:settled.length,battlesPerTenTurns:observedDays?settled.length*100/observedDays:null,
   departures:departures.length,captures:run.captures.filter(c=>within(c.day)).length,cityHungerDays:run.hunger.filter(h=>h.kind==='city'&&within(h.day)).length,armyHungerDays:run.hunger.filter(h=>h.kind==='army'&&within(h.day)).length,
   jointOperations:new Set(attacks.filter(p=>armyRefs(p).length>=2).map(p=>p.id)).size,maximumArmiesInOperation:Math.max(0,...attacks.map(p=>armyRefs(p).length)),maximumParallelAttacks:0,
   actualJointBattles:new Set((run.jointParticipation||[]).filter(r=>within(r.day)).map(r=>r.battleId)).size,maximumActualArmiesOnOneSide:Math.max(0,...(run.jointParticipation||[]).filter(r=>within(r.day)).map(r=>r.armyIds.length))};
 });
 const plans=new Map();for(const p of run.planTrace){plans.set(p.id,p);if(p.day<startDay||p.day>=completedDay)continue;const row=phases.find(x=>x.phase===phaseForDay(p.day));
  for(const f of new Set([...plans.values()].map(x=>x.faction)))row.maximumParallelAttacks=Math.max(row.maximumParallelAttacks,[...plans.values()].filter(x=>x.faction===f&&x.phase==='attack').length);
 }
 return {firstTurn,lastTurn,completedTurns:(completedDay-startDay)/10,boundaries:{earlyLastTurn,campaignLastTurn},phases};
}
