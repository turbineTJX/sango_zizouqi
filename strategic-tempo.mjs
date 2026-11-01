import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

// Current funded capacity determines the scale at every planning review.
// Pools contain only legally available, present troops after guard/staff checks.
export function assessWarTempo(context,pools){
 const funded=context.ownCities.filter(c=>!c.besieged&&!c.shortages.gold&&!c.shortages.grain&&c.gold>=c.costs.gold+c.reserve.gold&&c.grain>=c.costs.grain+c.reserve.grain);
 const readyUnits=funded.reduce((n,c)=>n+(pools.get(c.id)?.length||0),0);
 const phase=context.critical||readyUnits<R.tempo.campaignUnits?'early':context.ownCities.length>=R.tempo.jointCities&&funded.length>=R.tempo.jointFundedCities&&readyUnits>=R.tempo.jointUnits?'joint':'campaign',stage=phase;
 return {stage,phase,readyUnits,fundedCities:funded.length,operationLimit:phase==='joint'?R.tempo.maxOperations:1,columnUnits:phase==='joint'?R.tempo.columnUnits:10,assemblyDays:phase==='joint'?R.tempo.jointAssemblyDays:phase==='campaign'?R.tempo.campaignAssemblyDays:R.assemblyDays};
}
