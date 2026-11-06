import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';

// A completed, solvent recovery ledger is a budget for attrition. The existing
// combat estimate already includes stale reports, relief and emergency muster;
// avoid charging the same uncertainty again as an unconditional force ratio.
// This only changes risk appetite, never the predictor or action admission.
export function fundedOperationAdvantage(base,{facts,recovery,prediction}){
 if(!facts.intelligence.known||!recovery.feasible||recovery.currentCoverage<=0||!facts.supply.feasible||!facts.sourcesSupplied
  ||prediction.estimatedLosses/Math.max(1,facts.men)>R.temperament.maximumLossShare)return base;
 return Math.min(base,Math.max(R.recovery.minimumAdvantage,base-R.recovery.maximumAdvantageRelief));
}
