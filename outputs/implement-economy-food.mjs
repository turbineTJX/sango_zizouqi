import fs from 'node:fs';const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('domestic.mjs',s=>s.replace('export const reservedMen=c=>c.domestic.reserved;',`// Recruiters reserve food for existing soldiers and the new recruits, on both sides.
export const cityFoodReserve=(s,c,days=ECONOMY_RULES.ai.recruitReserveDays)=>{
 const m=cityMilitary(s,c);return Math.ceil((m.troops/100+m.wounded/200)*days);
};
const recruitGrainBudget=(s,c,reserved=0)=>Math.max(0,Math.floor((c.grain-cityFoodReserve(s,c)-plannedGrain(s,c.id)-reserved)/(1+ECONOMY_RULES.ai.recruitReserveDays/100)));
export const reservedMen=c=>c.domestic.reserved;`).replace('recruitmentLimit(c)-c.drafted-c.domestic.reserved));if(amount<=0||c.grain-c.domestic.reserved-plannedGrain(s,c.id)<amount)continue;', 'recruitmentLimit(c)-c.drafted-c.domestic.reserved,recruitGrainBudget(s,c,c.domestic.reserved)));if(amount<=0)continue;').replace('Math.floor(c.grain)),Math.floor);','recruitGrainBudget(s,c)),Math.floor);'));
edit('strategic-ai.mjs',s=>"import {ECONOMY_RULES} from './data/design/economy-rules.mjs';\n"+s.replace('reservedMen,DIRECTIONS','reservedMen,cityFoodReserve,DIRECTIONS').replace('grainReserve:Math.max(2500,plannedGrain(s,c.id))','grainReserve:Math.max(2500,cityFoodReserve(s,c)+300)+plannedGrain(s,c.id)').replace('foodUse(c.units)*10,plannedGrain(s,c.id)','foodUse(c.units)*ECONOMY_RULES.ai.foodReserveDays,plannedGrain(s,c.id)'));
edit('talent-lifecycle.mjs',s=>"import {ECONOMY_RULES} from './data/design/economy-rules.mjs';\n"+s.replace('  const filled=new Set();for(const x of pairs){if(assigned.has(x.unit.id)||filled.has(x.direction))continue;assigned.add(x.unit.id);filled.add(x.direction);assignDomestic(s,c.id,x.direction,x.unit.id,{scheduled:true,faction:c.owner});}',`  const filled=new Set();for(const x of pairs){if(assigned.has(x.unit.id)||filled.has(x.direction))continue;assigned.add(x.unit.id);filled.add(x.direction);assignDomestic(s,c.id,x.direction,x.unit.id,{scheduled:true,faction:c.owner});}
  // Additional civil officers perform real autonomous work, using the same
  // recommendation scores and costs as player appointments. Never reassign work.
  for(let slot=1;slot<ECONOMY_RULES.ai.economicWorkersPerDirection;slot++)for(const direction of ['agriculture','commerce']){
   if(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction===direction).length>slot)continue;
   const best=rankOfficerCandidates(s,units.filter(u=>!assigned.has(u.id)),{task:'domestic',city:c.id,direction}).find(x=>x.recommendation.available);
   if(best){assignDomestic(s,c.id,direction,best.unit.id,{scheduled:true,faction:c.owner});assigned.add(best.unit.id);}
  }`));
// All consumers of economy capacities read the same table via the existing functions.
edit('strategic-campaign.mjs',s=>s.replace('BUILDINGS,initializeDomestic','BUILDINGS,grainCapacity,recruitmentLimit,initializeDomestic').replaceAll('10000+c.granary*10000','grainCapacity(c)').replaceAll('2000+c.barracks*1000','recruitmentLimit(c)'));
edit('strategic-view.mjs',s=>"import {grainCapacity} from './domestic.mjs';\n"+s.replaceAll('10000+c.granary*10000','grainCapacity(c)'));
