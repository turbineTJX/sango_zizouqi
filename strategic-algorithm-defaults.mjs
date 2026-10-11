import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';
// Pure algorithms. Inputs are observations and measurements, never game state.
export function predictAttritionV1({facts:f,rules:r}){
 const estimatedLosses=Math.ceil(f.men*Math.min(.8,f.defense/Math.max(1,f.fieldPower)*r.lossFactor));
 return {estimatedLosses,consumedGrain:f.foodUse*f.assaultSupplyDays+f.assemblyGrain,
  replacementGold:Math.ceil(f.refillGoldWeight*estimatedLosses/Math.max(1,f.men)),
  militaryGold:Math.ceil(f.men/1000*f.maintenanceGold*f.duration/10),counterPower:f.counterEstimate*r.counterattackWeight};
}
export function evaluateCostBenefitV1({facts:f,prediction:p,profile,rules:r}){
 const workCost=f.work.reduce((n,w)=>n+w.ability*f.duration/r.workPerPoint+w.cost/r.goldPerPoint,0)*profile.developmentWeight;
 const borderRelief=f.relieveBorder?Math.min(r.securityValueCap,f.defense/r.securityPowerPerPoint):0;
 const benefit=(r.objectiveValues[f.target.kind]||50)+f.target.commerce*6+(f.target.grain>6000?15:0)+borderRelief;
 const cost=p.estimatedLosses/r.lossPerPoint+p.consumedGrain/r.grainPerPoint+(p.replacementGold+p.militaryGold)/r.goldPerPoint+f.duration*r.dayCost+workCost;
 return {score:benefit-cost,benefit,cost,workCost};
}
export function predictAttritionV2(input){
 return predictAttritionV1({...input,rules:{...input.rules,lossFactor:input.facts.oppositionLossFactor}});
}
export function predictAttritionV3(input){
 const f=input.facts;
 return predictAttritionV1({...input,facts:{...f,defense:f.fieldPower*f.combatLossFraction},rules:{...input.rules,lossFactor:1}});
}
export function evaluateCostBenefitV2(input){
 const local=evaluateCostBenefitV1(input),value=input.facts.victoryValue?.score||0;
 return {...local,score:local.score+value,benefit:local.benefit+value};
}
export function evaluateCostBenefitV3(input){
 const local=evaluateCostBenefitV2(input),f=input.facts,r=input.rules,p=input.prediction;
 const workCost=f.work.reduce((n,w)=>n+w.ability*Math.min(f.duration,w.remaining)/r.workPerPoint+w.cost/r.goldPerPoint,0)*input.profile.developmentWeight;
 // Account for the burden on actual refill capacity. Extra economic depth
 // reduces that burden within a bound, without changing damage or losses.
 const depth=Math.max(1,Math.min(f.recovery.projectedCoverage,R.recovery.maximumCostRelief));
 const refill=p.estimatedLosses/r.lossPerPoint+(p.replacementGold+p.militaryGold)/r.goldPerPoint;
 const time=f.duration*r.dayCost;
 const cost=local.cost-local.workCost-refill-time+workCost+(refill+time)/depth;
 const benefit=local.benefit+Math.min(R.victory.maxObservedStockBonus,Math.max(0,f.observedStockValue||0));
 return {score:benefit-cost,benefit,cost,workCost};
}
export function evaluateGoalUtilityV1({candidate:c,context,rules:r}){
 const ownPower=context.ownCities.reduce((n,c)=>n+(c.power??c.troops),0),pressure=context.enemies.reduce((n,a)=>n+a.power,0);
 const score=c.kind==='capture'?c.score-(c.ready?0:r.preparationPenalty)
  :c.kind==='defend'?r.defensePriority+pressure/Math.max(1,ownPower)*100
  :c.kind==='peace'?r.defensePriority+pressure/Math.max(1,ownPower)*100-1:0;
 return {score};
}
export function selectUtilityV1({candidates}){return candidates[0].id;}
