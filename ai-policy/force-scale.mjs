import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';

// Current funded capacity determines the scale at every planning review.
// Pools contain only legally available, present troops after guard/staff checks.
export function assessWarTempo(context,pools){
 const funded=context.ownCities.filter(c=>!c.besieged&&!c.shortages.gold&&!c.shortages.grain&&c.gold>=c.costs.gold+c.reserve.gold&&c.grain>=c.costs.grain+c.reserve.grain);
 const readyUnits=funded.reduce((n,c)=>n+(pools.get(c.id)?.length||0),0);
 const phase=context.critical||readyUnits<R.tempo.campaignUnits?'early':funded.length>0&&readyUnits>=R.tempo.jointUnits?'joint':'campaign',stage=phase;
 // A single real depot may fund multiple complete legions in one operation.
 // Separate concurrent operations still need separate funded source cities.
 // Keep normal six-unit joint columns. The operation planner checks a legal
 // ten-unit packing only when the normal formation cannot feed every column;
 // each alternative must pass the same real road and warehouse forecast.
 return {stage,phase,readyUnits,fundedCities:funded.length,operationLimit:phase==='joint'&&funded.length>1?R.tempo.maxOperations:1,columnUnits:phase==='joint'?R.tempo.columnUnits:10,assemblyDays:phase==='joint'?R.tempo.jointAssemblyDays:phase==='campaign'?R.tempo.campaignAssemblyDays:R.assemblyDays};
}
