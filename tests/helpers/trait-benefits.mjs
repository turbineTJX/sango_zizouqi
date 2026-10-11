import {DOMESTIC_OUTCOME_RULES as R} from '../../data/design/domestic-actions.mjs';
import {workChance,workFactor,workQuantity} from '../../work-traits.mjs';
const chance=(ability,d,w)=>Math.max(R.minChance,Math.min(R.maxChance,R.baseChance+ability*R.abilityFactor-(d.risk||0)+workChance(w,d)));
function outcomes(p){const partial=Math.min(R.partialChance,R.partialCeiling-p);return [[R.criticalFactor,p*R.criticalShare],[1,p*(1-R.criticalShare)],[R.partialFactor,partial],[0,1-p-partial]];}
// Requirement oracle: expectation at equal opportunity and real command cost,
// using actual outcome tiers, production rounding, bounded capacity and time.
export function commandBenefit(ability,d,w,{level=3}={}){
 const p=chance(ability,d,w),speed=1/(w.durationFactor||1),scale=.7+ability/150;
 if(d.kind==='build')return 1/(d.days+(1-p)/p*(w.setbackDays??Math.ceil(d.days*.5)))/(1-(w.completionRefund||0)*(1-R.criticalShare)-(w.criticalRefund??.15)*R.criticalShare);
 return outcomes(p).reduce((n,[raw,prob])=>{
  const f=workFactor(raw,w),q=workQuantity(f,w);let value=f*q;
  if(['cash','grain','recruit'].includes(d.kind)){
   const resource=d.kind==='cash'?'gold':d.kind==='grain'?'grain':'manpower',unit={gold:1,grain:.13,manpower:.34}[resource],cap=Math.floor((100+level*50)/unit*(w.capacityMultiplier||1));
   const base=(d.kind==='recruit'?d.reserveValue:d.value)*f*scale;
   const production=d.kind==='cash'?(Math.round(base)>d.cost?Math.round(Math.round(base)*q):Math.round(base)):Math[d.kind==='recruit'?'floor':'round'](base*q);
   value=Math.min(cap,production)-(d.kind==='cash'?d.cost:0);
  }else if(d.kind==='research')value*= (.75+ability/200)*(w.teamMultiplier||1)*speed;
  else if(d.kind==='heal')value*=scale;
  else if(d.kind==='effect')value=Math.min(1,d.power*f*q)*(3+(w.duration||0));
  else if(d.kind==='discount')value=f?Math.min(.5,.2*f+(w.discount||0)):0;
  else if(d.kind==='trade')value=(d.value==='sell'?(f?(f>1?1.1:1)*(1+(w.price||0)):0):Math.min(1,f)/(1-(w.purchaseDiscount||0)))*speed;
  else if(d.kind==='rescue')value=Math.min(1,f)*speed;
  else if(['hire','persuade'].includes(d.kind))value=Math.floor((f>1?20:f===1?12:f>0?6:0)*q);
  else if(d.kind==='prepare')value=Math.min(1,f)*q;
  return n+prob*value;
 },0);
}
