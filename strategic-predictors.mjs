import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {STRATEGIC_PLANNING_RULES as R} from './data/design/strategic-planning-rules.mjs';

// Bounded forward projection for preparation, not a second world simulation.
// Receipts and recurring production are hypothetical until the shared engine
// actually credits them. No random rolls or foreign inventories are inputs.
export function forecastPreparationV2({context,requirements}){
 const rows=requirements.map(r=>({required:r,city:context.ownCities.find(c=>c.id===r.cityId)}));
 if(rows.some(r=>!r.city||r.city.besieged))return {feasible:false,readyDay:null,reason:'来源城不可用或正在围城'};
 const stocks=new Map(rows.map(r=>[r.required.cityId,{gold:r.city.gold,grain:r.city.grain,manpower:r.city.manpower}]));
 const ready=()=>rows.every(({required:r})=>['gold','grain','manpower'].every(k=>stocks.get(r.cityId)[k]>=r[k]));
 if(ready())return {feasible:true,readyDay:context.day,reason:'实际库存已满足准备要求'};
 const horizon=R.preparationTurns*ECONOMY_RULES.budget.days;
 const allowances=new Map(rows.map(({required:r,city:c})=>[r.cityId,{...(c.workRemaining||{})}]));
 let harvests=0;
 for(let offset=1;offset<=horizon;offset++){
  const harvest=(context.day+offset-1)%ECONOMY_RULES.budget.days===0;
  for(const {required:r,city:c}of rows){const b=stocks.get(r.cityId),allowance=allowances.get(r.cityId);
   // Loaded cargo is counted only on its estimated arrival day. Do not count
   // unshipped convoy cycles, blocked routes or speculative donor resources.
   for(const receipt of c.incoming||[])if(receipt.afterDays===offset)for(const key of ['gold','grain','manpower'])b[key]+=receipt.resources[key];
   b.grain=Math.min(c.grainCapacity,b.grain);b.manpower=Math.min(ECONOMY_RULES.capacity.manpowerMax,b.manpower);
   b.grain-=c.costs.grain/ECONOMY_RULES.budget.days;
   if(b.grain<0)return {feasible:false,readyDay:null,reason:'预计旬末入库前无法维持口粮'};
   for(const op of c.operations||[])if(op.afterDays===offset){const n=Math.max(0,Math.min(op.amount,allowance[op.key]??0));b[op.key]+=n;allowance[op.key]-=n;}
   b.grain=Math.min(c.grainCapacity,b.grain);b.manpower=Math.min(ECONOMY_RULES.capacity.manpowerMax,b.manpower);
   if(harvest){
    b.gold+=c.income.gold-c.costs.gold+(harvests?c.oneTimeGold||0:0);
    b.grain=Math.min(c.grainCapacity,b.grain+c.income.grain);
    b.manpower=Math.min(ECONOMY_RULES.capacity.manpowerMax,b.manpower+c.income.manpower);
    Object.assign(allowance,c.workLimit||{});
   }
  }
  if(harvest)harvests++;
  if(ready())return {feasible:true,readyDay:context.day+offset,reason:'按现有产能、在办运营预期及实际在途物资可在两旬内完成准备'};
 }
 return {feasible:false,readyDay:null,reason:'现有产能与预算无法在预测窗口内完成准备'};
}
