// Only a witnessed change of front broadens the possibilities to inspect.
// This authorizes paying for observation, never authorizes an attack or edits
// a report. The same facts cannot repeatedly consume a new scout.
export function operationObservationContext(s,faction,target,observedDay){
 const latestBattle=Math.max(0,...s.campaign.battles.filter(b=>b.settled&&b.kind==='siege'&&b.cityId&&b.battle.sides.some(x=>x.faction===faction)).map(b=>b.endedDay||0));
 const latestCapture=Math.max(0,...s.campaign.ai.plans.filter(p=>p.faction===faction&&['complete','consolidate'].includes(p.phase)).map(p=>p.updatedDay));
 const changedDay=Math.max(latestBattle,latestCapture);
 const signature=JSON.stringify([s.cities.filter(c=>c.owner===faction).map(c=>c.id).sort(),changedDay]);
 const key=faction+'>'+target,previous=s.campaign.ai.coordination.observations?.[key];
 return {key,signature,changedFront:changedDay>observedDay,repeated:previous?.signature===signature};
}
export function rememberOperationObservation(s,method){
 const ledger=s.campaign.ai.coordination.observations??={};
 ledger[method.observationKey]={day:s.campaign.day,signature:method.observationSignature};
}
