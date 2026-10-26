import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const coverage=(available,need)=>need>0?available/need:3;

// A bounded projection of measured own depots, not a world simulation. Stocks
// and started work are inputs; no new workers, buildings, battles or RNG exist.
export function assessRecoveryCapacity({day,returnDays,cities},estimatedLosses){
 const horizonDays=R.recovery.horizonDays,deadline=Math.min(R.recovery.maximumForecastDays,Math.ceil(returnDays)+horizonDays);
 const total=cities.reduce((n,c)=>n+c.men,0),rows=[];let allocated=0;
 for(const [index,c] of cities.entries()){
  const men=index===cities.length-1?estimatedLosses-allocated:Math.floor(estimatedLosses*c.men/Math.max(1,total));allocated+=men;
  const gold=Math.ceil(men*c.trainingRate),currentCoverage=Math.min(coverage(c.gold,gold),coverage(c.manpower,men));
  const stocks={gold:Math.floor(c.gold),manpower:Math.floor(c.manpower),grain:Math.floor(c.grain)};
  function project(initial,{diagnostic=false}={}){
  let cash=initial.gold,reserves=initial.manpower,food=initial.grain,quota=c.quota,harvests=0,readyDay=null,projectedCoverage=0,refilled=0,insolvent=false;
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

export function recoveryFailureReason(recovery){
 if(recovery.feasible)return null;
 if(recovery.rows.some(r=>!r.repairable))return '预计返城后的整补期限或仓储容量不足';
 const keys=[['grain','持续口粮'],['gold','补兵金'],['manpower','预备兵']].filter(([key])=>recovery.rows.some(r=>r.shortfall[key]>0)).map(([,name])=>name);
 return '预计返城整补缺少'+keys.join('、');
}

// Raise the real preparation target by the measured missing stock. Never
// replace existing route, salary or recruitment reservations with a smaller one.
export function addRecoveryRequirements(requirements,recovery,city){
 for(const row of recovery.rows){
  const c=city(row.cityId);let r=requirements.find(r=>r.cityId===row.cityId);
  if(!r){r={cityId:row.cityId,gold:0,grain:0,manpower:0};requirements.push(r);}
  for(const key of ['gold','grain','manpower'])if(row.shortfall[key]>0)r[key]=Math.max(r[key],c[key]+row.shortfall[key]);
 }
}

export function recoveryAdvantageRequirement(base,recovery,intelligence,day){
 // Unknown or old opponents never earn a reduced safety requirement. Economic
 // depth can absorb losses, but does not become extra battlefield power.
 const fresh=intelligence.known&&intelligence.observedDay!==null&&day-intelligence.observedDay<=R.recovery.freshIntelligenceDays;
 const strength=Math.min(recovery.currentCoverage,recovery.projectedCoverage);
 const relief=fresh&&recovery.feasible?R.recovery.maximumAdvantageRelief*clamp((strength-1)/R.recovery.bufferLosses,0,1):0;
 return Math.round(Math.max(R.recovery.minimumAdvantage,base-relief)*1000)/1000;
}

// Committing an affordable operation and continuing it have different costs.
// Keep a bounded margin for daily fluctuations; losses, new observed relief and
// real supply failures still stop the operation through their own checks.
export function continuationAdvantageRequirement(base,recovery,intelligence,day){
 return Math.max(R.tempo.minimumContinuationAdvantage,recoveryAdvantageRequirement(base,recovery,intelligence,day)-R.tempo.continuationMargin);
}

export function validRecoveryEvidence(v,day,city){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,ratio=n=>Number.isFinite(n)&&n>=0;
 const stock=s=>s&&Object.keys(s).length===3&&['gold','grain','manpower'].every(k=>integer(s[k]));
 return v&&Object.keys(v).length===7&&v.version===2&&v.horizonDays===R.recovery.horizonDays&&ratio(v.currentCoverage)&&v.currentCoverage<=3&&ratio(v.projectedCoverage)&&v.projectedCoverage<=3&&typeof v.feasible==='boolean'
  &&(v.readyDay===null?!v.feasible:integer(v.readyDay)&&v.readyDay>0&&v.readyDay<=day+R.recovery.maximumForecastDays)
  &&Array.isArray(v.rows)&&v.rows.length>0&&new Set(v.rows.map(r=>r.cityId)).size===v.rows.length
  &&v.rows.every(r=>r&&Object.keys(r).length===9&&city(r.cityId)&&integer(r.men)&&integer(r.gold)&&ratio(r.currentCoverage)&&ratio(r.projectedCoverage)&&stock(r.required)&&stock(r.shortfall)&&typeof r.repairable==='boolean'&&(r.readyDay===null||r.repairable&&Object.values(r.shortfall).every(n=>n===0)&&integer(r.readyDay)&&r.readyDay>0&&r.readyDay<=day+R.recovery.maximumForecastDays))
  &&v.feasible===v.rows.every(r=>r.readyDay!==null)&&v.currentCoverage===Math.min(3,...v.rows.map(r=>r.currentCoverage))&&v.projectedCoverage===Math.min(3,...v.rows.map(r=>r.projectedCoverage))
  &&(v.readyDay===null||v.readyDay===Math.max(...v.rows.map(r=>r.readyDay)));
}
