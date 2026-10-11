import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign} from '../strategic-campaign.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {cityIncomeBreakdown,resourceValue} from '../economy.mjs';
import {officerSalary} from '../officer-salaries.mjs';
import {ACTIONS,domesticManagementEstimate} from '../domestic.mjs';
import {directWorkTrial,commercialCalendarTrial} from './economy-balance-lib.mjs';
import {setBuildingLevel} from '../tests/building-fixtures.mjs';
const out='outputs/talent-economy-20261011';await mkdir(out,{recursive:true});
const seeds=Array.from({length:32},(_,i)=>9001+i*137),salary=officerSalary({level:10}),direct=[];
for(const ability of [50,80,90])for(const key of ['fair','cultivate','recruit']){
 const runs=seeds.map(seed=>directWorkTrial(seed,ability,key,{level:10,prepareCity:(s,c)=>{for(const k of ['commerce','farm','barracks'])setBuildingLevel(c,k,1);}}));
 const mean=runs.reduce((n,r)=>n+r.value,0)/runs.length;
 direct.push({ability,level:10,key,meanResourceValue:mean,salary,afterSalary:mean-salary,runs});
 if(ability>=80)assert.ok(mean>salary*1.7);
}
const governors=[],management=[];
for(const ability of [50,80,90]){
 const s=newCampaign(417,'guandu-200','cao'),c=s.cities.find(c=>c.id==='xuchang'),u=cityPersonnel(s,c.id).at(-1).unit;
 u.politics=ability;u.level=10;c.governor=null;c.domestic.effects=[];c.grain=0;
 for(const key of ['commerce','farm','barracks'])setBuildingLevel(c,key,1);setBuildingLevel(c,'granary',5);
 for(const key of ['merchants','tax','irrigate','partnership'])management.push({ability,level:10,key,...domesticManagementEstimate(s,c,u,ACTIONS[key])});
 c.governor=u.id;const {base,governor}=cityIncomeBreakdown(s,c),value=resourceValue(governor);
 governors.push({ability,level:10,base,added:governor,value,salary,afterSalary:value-salary});
 if(ability>=80)assert.ok(value>salary*1.4);
}
const scope={controlled:'Deliberate equal-rank and equal-ability mechanism fixtures with completed level-1 local economic facilities, adequate measurement stock and actual normal work completion. This is not a natural campaign or an injected AI victory. Raw direct-work outcomes include failures and partial results; city base income is excluded from personal value.',
 value:'Gold 1, grain 0.13 and reserves 0.34 are military-demand reference values, not executable market prices. Agricultural and military staff produce food and reserves rather than spendable gold. Governor increments assume the output can enter local stores and are charged one actual rank-10 salary per turn.',
 management:'Public probability estimates for the whole temporary effect or one usable construction discount, minus the task fee and salary for its occupied ten-day cycle. Later effect duration does not occupy the worker; no future proceeds are credited. Discount saving requires actually using a valid next construction before expiry. Routine estimates exclude uncertain cooperation and incidental gifts.'};
const calendars=[50,80,90].flatMap(ability=>seeds.slice(0,3).map(seed=>commercialCalendarTrial(seed,ability)));
for(const r of calendars){assert.equal(r.arrears,0);for(const b of r.bills)assert.equal(b.paid,b.due);if(r.ability>=80)assert.ok(r.afterMaxSalaryReference>1000);}
scope.calendar='One employed rank-10 commercial worker, level-1 economic facilities and 10000 initial measurement gold; construction/trading/diplomacy disabled to isolate cash work and temporary commerce management. Eighteen actual turns of shared task selection, outcome settlement and wages. Initial stock and all city base income are subtracted; no natural-war claim.';
const result={seeds,direct,governors,management,calendars,scope};
await writeFile(`${out}/talent-value.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({direct:direct.map(({runs,...r})=>r),governors,management,scope},null,2));
