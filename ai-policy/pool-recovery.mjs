import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';

import {recoveryCityFacts as baseCityFacts} from '../strategic-context.mjs';
import {cityWoundedRecovery} from '../city-wounded.mjs';
import {battleWounded} from '../engine.mjs';
import {validRecoveryEvidence as validLegacyRecovery} from '../strategic-recovery.mjs';
export function recoveryCityFacts(s,c,units,budget,context){
 return {...baseCityFacts(s,c,units,budget,context),poolWounded:c.wounded||0,
  treatmentPerDay:s.campaign.battles.some(b=>!b.settled&&b.kind==='siege'&&b.cityId===c.id)?0:cityWoundedRecovery(c)};
}
const coverage=(available,need)=>need>0?available/need:3;

// A bounded projection of measured own depots, not a world simulation. Stocks
// and started work are inputs; no new workers, buildings, battles or RNG exist.
export function assessRecoveryCapacity({day,returnDays,cities},estimatedLosses){
 // Size the recovery interval from the real shared recruitment throughput.
 // Large armies need more than two turns; every extra day still incurs food,
 // payroll and existing commitments, with the same finite forecast limit.
 const totalMen=cities.reduce((n,c)=>n+c.men,0);
 const quotaDays=Math.max(0,...cities.map(c=>c.nextQuota>0?Math.ceil(estimatedLosses*c.men/Math.max(1,totalMen)/c.nextQuota)*10:R.recovery.horizonDays));
 const horizonDays=Math.max(R.recovery.horizonDays,Math.min(R.recovery.maximumForecastDays,quotaDays));
 const deadline=Math.min(R.recovery.maximumForecastDays,Math.ceil(returnDays)+horizonDays);
 const total=cities.reduce((n,c)=>n+c.men,0),rows=[];let allocated=0;
 for(const [index,c] of cities.entries()){
  const men=index===cities.length-1?estimatedLosses-allocated:Math.floor(estimatedLosses*c.men/Math.max(1,total));allocated+=men;
  const gold=Math.ceil(men*c.trainingRate),currentCoverage=Math.min(coverage(c.gold,gold),coverage(c.manpower,men));
  const stocks={gold:Math.floor(c.gold),manpower:Math.floor(c.manpower),grain:Math.floor(c.grain)};
  function project(initial,{diagnostic=false}={}){
  let cash=initial.gold,reserves=initial.manpower,food=initial.grain,quota=c.quota,harvests=0,readyDay=null,projectedCoverage=0,refilled=0,insolvent=false;
  let pool=c.poolWounded||0;
  const minimum={...initial};
  const measure=()=>{minimum.gold=Math.min(minimum.gold,cash);minimum.grain=Math.min(minimum.grain,food);minimum.manpower=Math.min(minimum.manpower,reserves);if(food<0||cash<0||reserves<0)insolvent=true;};
  const allowances={...c.workRemaining};
  for(let offset=0;offset<=deadline;offset++){
   if(offset){
    food-=c.dailyFood;
    for(const payment of c.payments||[])if(payment.afterDays===offset)cash-=payment.gold;
    for(const receipt of c.incoming)if(receipt.afterDays===offset){cash+=receipt.resources.gold;reserves+=receipt.resources.manpower;food+=receipt.resources.grain;}
    for(const op of c.operations)if(op.afterDays===offset){const amount=Math.max(0,Math.floor(Math.min(op.amount,allowances[op.key]||0)));allowances[op.key]-=amount;if(op.key==='gold')cash+=amount;else if(op.key==='manpower')reserves+=amount;else food+=amount;}
    if((day+offset-1)%10===0){
     // The current turn's bills were already retained in the initial free gold.
     cash+=c.income.gold-(harvests?c.recurringGold:0);food+=c.income.grain;reserves+=c.income.manpower;
     quota=c.nextQuota;Object.assign(allowances,c.workLimit);harvests++;
    }
    reserves=Math.min(Math.max(c.manpower,c.manpowerCapacity),reserves);food=Math.min(c.grainCapacity,food);
   }
   // Returning casualties are unavailable before physical arrival. Existing
   // patients share the same finite beds and reserve space. Recruitment below
   // still pays the real gold cost and consumes the city's shared quota.
   if(offset===Math.ceil(returnDays))pool+=battleWounded({initial:men,hp:0});
   if(offset&&food>=0&&c.treatmentPerDay){
    const recovered=Math.max(0,Math.floor(Math.min(pool,c.treatmentPerDay,c.manpowerCapacity-reserves)));
    reserves+=recovered;pool-=recovered;
   }
   measure();
   if(offset>=Math.ceil(returnDays)){
    // A diagnostic ledger records the stock needed to use real recruitment
    // quotas. It never declares those hypothetical resources available.
    const amount=Math.max(0,Math.min(men-refilled,quota,...(diagnostic?[]:[reserves,c.trainingRate?Math.floor(cash/c.trainingRate):men-refilled])));
    cash-=Math.ceil(amount*c.trainingRate);reserves-=amount;quota-=amount;refilled+=amount;
    const ratio=Math.min(coverage(cash+Math.ceil(refilled*c.trainingRate),gold),coverage(reserves+refilled,men),coverage(quota+refilled,men));
    projectedCoverage=Math.max(projectedCoverage,ratio);
    if(readyDay===null&&refilled>=men)readyDay=day+offset;
    measure();
   }
  }
  return {readyDay:insolvent?null:readyDay,projectedCoverage:insolvent?0:Math.max(0,projectedCoverage),refilled,
   required:Object.fromEntries(Object.keys(initial).map(k=>[k,Math.max(0,initial[k]-minimum[k])]))};
  }
  const actual=project(stocks),needed=actual.readyDay===null?project(stocks,{diagnostic:true}):actual;
  const required=needed.required,shortfall=Object.fromEntries(Object.keys(stocks).map(k=>[k,Math.max(0,required[k]-stocks[k])]));
  // Capacity truncation and recruitment quotas cannot be fixed by promising
  // more stock. Recheck the proposed budget through the same capped ledger.
  const repairable=actual.readyDay!==null||needed.refilled>=men&&project(Object.fromEntries(Object.keys(stocks).map(k=>[k,stocks[k]+shortfall[k]]))).readyDay!==null;
  rows.push({cityId:c.cityId,men,gold,currentCoverage:Math.max(0,currentCoverage),projectedCoverage:actual.projectedCoverage,readyDay:actual.readyDay,required,shortfall,repairable});
 }
 const currentCoverage=Math.min(3,...rows.map(r=>r.currentCoverage)),projectedCoverage=Math.min(3,...rows.map(r=>r.projectedCoverage));
 return {version:2,horizonDays,currentCoverage,projectedCoverage,feasible:rows.every(r=>r.readyDay!==null),readyDay:rows.every(r=>r.readyDay!==null)?Math.max(day,...rows.map(r=>r.readyDay)):null,rows};
}

export function validRecoveryEvidence(v,day,city){
 return Number.isSafeInteger(v?.horizonDays)&&v.horizonDays>=R.recovery.horizonDays&&v.horizonDays<=R.recovery.maximumForecastDays
  &&validLegacyRecovery({...v,horizonDays:R.recovery.horizonDays},day,city);
}
