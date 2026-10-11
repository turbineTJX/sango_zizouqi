import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {newCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {pendingActivityReports} from '../activity-nodes.mjs';
import {trainingCost} from '../troop-training.mjs';
import {foodConsumption} from '../army-supply.mjs';
import {consumptionTrial} from './economy-consumption-lib.mjs';
import {cityPayroll,officerSalary} from '../officer-salaries.mjs';
import {cityRecurringIncome} from '../economy.mjs';

const out='outputs/economic-headroom-20261011';await mkdir(out,{recursive:true});
const sourceFiles=['data/design/economy-rules.mjs','city-resources.mjs','city-budget.mjs','domestic.mjs','strategic-campaign.mjs','data/design/troops.mjs','officer-salaries.mjs','economy.mjs','talent-core.mjs','scripts/economy-consumption-lib.mjs'];
const sources=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const opening=NATIONAL_SCENARIOS.map(spec=>{
 const s=newCampaign(20261011,spec.id);
 return {scenario:spec.id,factions:spec.factions.length,cities:s.cities.map(c=>({id:c.id,name:c.name,owner:c.owner,size:c.citySize,gold:c.gold,grain:c.grain,manpower:c.manpower,troops:c.units.reduce((n,u)=>n+u.troops,0),officers:cityPayroll(s,c).officers.length,salaryPerTurn:cityPayroll(s,c).gold,recurringGold:cityRecurringIncome(s,c).gold}))};
});
let playableOpenings=0;
for(const spec of NATIONAL_SCENARIOS)for(const f of spec.factions){
 const s=newCampaign(20261011,spec.id,f);assert.equal(pendingActivityReports(s).filter(n=>n.phase==='budget-warning').length,0);playableOpenings++;
}
const costRanges=[3,6,10].map(teams=>{
 const troops=teams*3000;
 return {teams,troops,formation:{gold:{min:teams*trainingCost('spear',3000),max:teams*trainingCost('cavalry',3000)},manpower:troops},campaignDays:[30,60],rations:{min:foodConsumption(troops)*30,max:foodConsumption(troops)*60},officialSalaries:{level1:{min:teams*officerSalary({level:1})*3,max:teams*officerSalary({level:1})*6},level10:{min:teams*officerSalary({level:10})*3,max:teams*officerSalary({level:10})*6}},replacement:{assumedPermanentLoss:[.1,.3],gold:{min:teams*trainingCost('spear',300),max:teams*trainingCost('cavalry',900)},manpower:{min:troops*.1,max:troops*.3}}};
});
const pressure=[.05,.18].map(loss=>consumptionTrial({id:loss===.05?'normal':'high-loss',frontTypes:['spear','archer','cavalry'],permanentLoss:loss},{frontTroops:3000,days:120}));
const equipment=consumptionTrial({id:'heavy-equipment',frontTypes:['siege','cavalry','ram'],permanentLoss:.08},{frontTroops:3000,days:120});
const convoy=consumptionTrial({id:'grain-route-loss',frontTypes:['spear','archer','cavalry'],permanentLoss:.05,grainLostPerTurn:1500},{frontTroops:3000,days:120});
const result={sources,openingRules:ECONOMY_RULES.opening,opening,playableOpenings,costRanges,pressure:[...pressure,equipment,convoy],scope:{opening:'Original selectable scenarios with configured opening stores, no replenishment or roster changes.',warPrices:'Current shared formation prices and daily ration rounding. All troops held constant over the full departure, fighting and return period; no garrison, reinforcements or extra equipment in the basic ranges. Existing formations do not pay formation cost again. Salary examples cover the same period at levels 1 and 10; these salaries are also due at peace and are not an incremental expedition fee. Other serving personnel are excluded from the example salaries.',loss:'10% and 30% permanent losses are assumptions for a replacement budget, not observed battle odds. Wounded recovery lowers the amount that needs new reserve soldiers.',pressure:'Prescribed losses and convoy losses are controlled inputs. Shared dailySupply and recruitLocalUnits charge actual grain, money and reserve soldiers. Measurement replenishment is disclosed in each trial; these figures are demand and are not natural economic production or battle outcomes.',late:'Equipment replacement, multiple columns, defenders and disrupted roads increase genuine costs. Mature production and original all-AI campaigns are validated separately.'}};
await writeFile(out+'/costs-and-opening.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({playableOpenings,openingRules:result.openingRules,costRanges,pressure:result.pressure.map(r=>({profile:r.profile,initialFormation:r.initialFormation,perTurn:r.perTurn}))},null,2));
