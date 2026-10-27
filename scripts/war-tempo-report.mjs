export const strategicTurn=day=>Math.floor((day-1)/10)+1;

// Read the order retained in the real battle-start snapshot. A new army alone
// is not evidence of an offensive: it may be a transfer or a temporary defense.
export function observedOffensiveBattle(record,departures=new Map()){
 if(record.banditCampId)return false;
 const attacking=new Set(record.battle.sides[record.attackSide].units.map(u=>u.armyId));
 return record.armies.some(a=>attacking.has(a.id)&&!a.defense&&(
  departures.get(a.id)?.purpose==='offensive'||['出征','择敌出征'].includes(a.task)
 ));
}

export function mergeCampaignWindows(windows){
 const first=windows[0],last=windows.at(-1),departures=new Map(),battles=new Map(),starts=new Map(),hunger=new Map(),joint=new Map(),captures=[],planTrace=[];
 for(const run of windows){
  for(const row of run.departures)if(!departures.has(row.id))departures.set(row.id,row);
  for(const row of run.battles)battles.set(row.id,row);
  for(const row of run.battleStarts){const old=starts.get(row.id);starts.set(row.id,{...old,...row,offensive:!!(old?.offensive||row.offensive)});}
  for(const row of run.hunger)if(row.day>=run.metrics.startDay&&row.day<run.metrics.completedDay)hunger.set(`${row.day}:${row.kind}:${row.id}`,row);
  for(const row of run.jointParticipation||[])joint.set(`${row.day}:${row.battleId}:${row.side}`,row);
  captures.push(...run.captures);planTrace.push(...run.planTrace.map(p=>({id:p.id,day:p.day,faction:p.faction,phase:p.phase,tasks:p.tasks})));
 }
 const merged={metrics:{startDay:first.metrics.startDay,completedDay:last.metrics.completedDay},departures:[...departures.values()],battles:[...battles.values()].map(b=>({...b,offensive:!!(b.offensive||starts.get(b.id)?.offensive)})),battleStarts:[...starts.values()],hunger:[...hunger.values()],jointParticipation:[...joint.values()],captures,planTrace};
 return {finished:last.metrics.finished,completedDay:last.metrics.completedDay,departures:merged.departures.filter(a=>!a.existingAtStart).length,settledBattles:merged.battles.length,captures:captures.length,cityHungerDays:merged.hunger.filter(h=>h.kind==='city').length,armyHungerDays:merged.hunger.filter(h=>h.kind==='army').length,deterministicCheckpoints:windows.reduce((n,r)=>n+r.metrics.deterministicCheckpoints,0),tempo:warTempoReport(merged)};
}

export function observedJointParticipation(record){
 const real=new Set(record.armyIds.filter(id=>/^a\d+$/.test(id)));
 return record.battle.sides.flatMap((side,index)=>{
  const armyIds=[...new Set(side.units.filter(u=>real.has(u.armyId)&&u.hp>0&&['active','reserve'].includes(u.status)&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=record.battle.tick&&!u.withdrawing&&!u.retreatDispatched).map(u=>u.armyId))].sort();
  return armyIds.length>=2?[{battleId:record.id,side:index,faction:side.faction,armyIds}]:[];
 });
}

function battleIntervals(run){
 const records=new Map();
 for(const b of [...(run.battleStarts||[]),...(run.battles||[])]){
  const key=b.id??'start:'+b.startedDay,previous=records.get(key)||{};
  records.set(key,{...previous,...b});
 }
 return [...records.values()];
}
function quietSpan(battles,from,to){
 const spans=battles.map(b=>[Math.max(from,b.startedDay),Math.min(to,b.endedDay===undefined||b.endedDay===null?to:b.endedDay+1)])
  .filter(([a,b])=>Number.isFinite(a)&&b>a).sort((a,b)=>a[0]-b[0]);
 let at=from,longest=0,active=0;
 for(const [start,end]of spans){if(start>at)longest=Math.max(longest,start-at);if(end>at)active+=end-Math.max(at,start);at=Math.max(at,end);}
 return {longestQuietTurns:Math.max(longest,to-at)/10,battleActiveTurns:active/10};
}
export function warTempoReport(run,{earlyLastTurn=20,campaignLastTurn=60,maximumCampaignQuietTurns=12}={}){
 const {startDay,completedDay}=run.metrics,firstTurn=strategicTurn(startDay),lastTurn=strategicTurn(completedDay-1);
 const intervals=battleIntervals(run).filter(b=>!b.banditCampId);
 const ranges=[['early',1,earlyLastTurn],['campaign',earlyLastTurn+1,campaignLastTurn],['joint',campaignLastTurn+1,lastTurn]];
 const phaseForDay=day=>{const turn=strategicTurn(day);return turn<=earlyLastTurn?'early':turn<=campaignLastTurn?'campaign':'joint';};
 const phases=ranges.map(([phase,from,to])=>{
  const first=Math.max(from,firstTurn),last=Math.min(to,lastTurn),within=day=>day>=startDay&&day<completedDay&&phaseForDay(day)===phase;
  const observedDays=Math.max(0,Math.min(completedDay,(to||0)*10+1)-Math.max(startDay,(from-1)*10+1));
  const starts=(run.battleStarts||run.battles).filter(b=>!b.banditCampId&&within(b.startedDay)),settled=run.battles.filter(b=>!b.banditCampId&&within(b.endedDay));
  const banditBattles=run.battles.filter(b=>b.banditCampId&&within(b.endedDay)).length;
  const departures=run.departures.filter(a=>!a.existingAtStart&&within(a.day));
  const trace=run.planTrace.filter(p=>within(p.day)),attacks=trace.filter(p=>p.phase==='attack');
  const armyRefs=p=>(p.tasks.find(t=>t.id==='assault')?.refs||[]).filter(x=>x.startsWith('army:'));
  const fromDay=Math.max(startDay,(from-1)*10+1),toDay=Math.min(completedDay,to*10+1),quiet=observedDays?quietSpan(intervals,fromDay,toDay):{longestQuietTurns:null,battleActiveTurns:0};
  const offensive=settled.filter(b=>b.offensive),wins=offensive.filter(b=>b.report?.winner===b.attackSide).length,draws=offensive.filter(b=>b.report?.winner===null).length;
  const activeAtEnd=intervals.filter(b=>b.startedDay<toDay&&(b.endedDay===undefined||b.endedDay===null||b.endedDay>=toDay)).length;
  return {phase,fromTurn:observedDays?first:null,toTurn:observedDays?last:null,observedTurns:observedDays/10,startedBattles:starts.length,settledBattles:settled.length,battlesPerTenTurns:observedDays?settled.length*100/observedDays:null,
   ...quiet,banditBattles,activeBattlesAtPhaseEnd:observedDays?activeAtEnd:0,offensiveBattles:offensive.length,offensiveWins:wins,offensiveLosses:offensive.length-wins-draws,offensiveDraws:draws,
   neutralOccupations:run.captures.filter(c=>within(c.day)&&c.from==='neutral').length,
   departures:departures.length,captures:run.captures.filter(c=>within(c.day)).length,cityHungerDays:run.hunger.filter(h=>h.kind==='city'&&within(h.day)).length,armyHungerDays:run.hunger.filter(h=>h.kind==='army'&&within(h.day)).length,
   jointOperations:new Set(attacks.filter(p=>armyRefs(p).length>=2).map(p=>p.id)).size,maximumArmiesInOperation:Math.max(0,...attacks.map(p=>armyRefs(p).length)),maximumParallelAttacks:0,
   actualJointBattles:new Set((run.jointParticipation||[]).filter(r=>within(r.day)).map(r=>r.battleId)).size,maximumActualArmiesOnOneSide:Math.max(0,...(run.jointParticipation||[]).filter(r=>within(r.day)).map(r=>r.armyIds.length))};
 });
 const plans=new Map();for(const p of run.planTrace){plans.set(p.id,p);if(p.day<startDay||p.day>=completedDay)continue;const row=phases.find(x=>x.phase===phaseForDay(p.day));
  for(const f of new Set([...plans.values()].map(x=>x.faction)))row.maximumParallelAttacks=Math.max(row.maximumParallelAttacks,[...plans.values()].filter(x=>x.faction===f&&x.phase==='attack').length);
 }
 for(const row of phases){
  const expected=row.phase==='early'?earlyLastTurn:row.phase==='campaign'?campaignLastTurn-earlyLastTurn:null;
  row.observation=row.observedTurns===0?'unobserved':expected!==null&&row.observedTurns<expected?'partial':'observed';
  row.assessment=row.phase==='campaign'?(row.observation!=='observed'?'insufficient_observation':row.longestQuietTurns<=maximumCampaignQuietTurns?'within_quiet_gap_target':'quiet_gap_too_long'):row.phase==='joint'?(row.observedTurns===0?'insufficient_observation':row.actualJointBattles>0?'joint_combat_observed':'joint_combat_not_observed'):'descriptive';
 }
 return {firstTurn,lastTurn,completedTurns:(completedDay-startDay)/10,boundaries:{earlyLastTurn,campaignLastTurn},maximumCampaignQuietTurns,phases};
}
