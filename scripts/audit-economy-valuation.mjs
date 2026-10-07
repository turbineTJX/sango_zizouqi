import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {DEVELOPMENT_SEEDS,VALIDATION_SEEDS,collectWorkSamples,scanValues,summarizeWork,impliedValues,tradeQuoteRange,formationProbes,reserveHoldingProbe} from './economy-valuation-lib.mjs';
import {consumptionMatrix} from './economy-consumption-lib.mjs';

// First observe demand without domestic production or resource-value weights.
const consumption=consumptionMatrix(),normal=consumption.find(r=>r.profile==='normal'&&r.days===120&&r.reserveBuffer===10000);
const chosen={gold:1,grain:Math.round(normal.weights.grain*100)/100,manpower:Math.round(normal.weights.manpower*100)/100};
const development=collectWorkSamples(DEVELOPMENT_SEEDS),validation=collectWorkSamples(VALIDATION_SEEDS),candidates=scanValues(development);
const current=ECONOMY_RULES.value;
const alternatives=[{gold:1,grain:.18,manpower:.6},{gold:1,grain:.2,manpower:.7},{gold:1,grain:.25,manpower:.8},current,chosen,{gold:1,grain:.25,manpower:1},{gold:1,grain:.3,manpower:.8}].filter((r,i,rows)=>rows.findIndex(x=>x.grain===r.grain&&x.manpower===r.manpower)===i);
const comparisons=alternatives.map(weights=>({weights,development:summarizeWork(development,weights),validation:summarizeWork(validation,weights)}));
const probes=VALIDATION_SEEDS.slice(0,4).flatMap(seed=>formationProbes(current,seed));
for(const row of probes){
 assert.equal(row.error,null);
 const base=probes.find(r=>r.seed===row.seed&&r.type===row.type&&r.missing===row.missing&&r.grant==='none');
 if(row.missing==='none'||row.missing==='grain'||row.grant==='none'||row.grant!==row.missing)assert.equal(row.formed,base.formed);
 else assert.ok(row.formed>base.formed,JSON.stringify(row));
 assert.equal(row.spent.manpower,row.formed);assert.equal(row.spent.grain,0);
}
const diagnose=process.argv.includes('--diagnose');
if(!diagnose)for(const row of summarizeWork(validation,chosen))assert.ok(row.coreSpread<=.1,JSON.stringify(row));
const quotes=tradeQuoteRange(validation);
// A procurement price and a demand-coverage value have different purposes.
// Check the actual cash spread, rather than calling useful purchases negative.
assert.ok(Math.max(...quotes.sell.map(r=>r.effectivePrice))<Math.min(...quotes.buy.map(r=>r.effectivePrice)));
const files=['data/design/economy-rules.mjs','data/design/domestic-actions.mjs','data/design/troops.mjs','domestic.mjs','strategic-campaign.mjs','talent-lifecycle.mjs','scripts/economy-balance-lib.mjs','scripts/economy-valuation-lib.mjs','scripts/economy-consumption-lib.mjs'];
const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const scenarioReturns=consumption.filter(r=>r.days===120&&r.reserveBuffer===10000&&r.weights.manpower!==null).map(r=>({profile:r.profile,weights:r.weights,work:summarizeWork(validation,r.weights)}));
const result={developmentSeeds:DEVELOPMENT_SEEDS,validationSeeds:VALIDATION_SEEDS,sampleCount:development.length+validation.length,candidateCount:candidates.length,current,chosen,consumption,scenarioReturns,implied:impliedValues(development),comparisons,bestCandidates:candidates.slice(0,20),acceptableCandidateCount:candidates.filter(r=>r.worstSpread<=.1).length,quotes,formation:probes,reserveHolding:reserveHoldingProbe(),raw:{development,validation},hashes,scope:{valuation:'baseline comes first from normal sustained demand (gold consumption / other consumption); labor price fitting is only a consistency diagnostic, not its justification; no universal exchange rate is inferred',timing:'one ordinary action per 10-day turn; active-day and calendar-day returns both reported; 5-day tasks normally wait for the next turn',medical:'conditional reference at the money/manpower cost of forming the restored troop count with sufficient real wounds; not guaranteed actual savings or newly produced reserves; formation uses no grain',formation:'actual controller-shared recruitment, all current troop recipes; equal nominal gifts applied separately to expose real bottlenecks',consumption:'actual formation money/manpower and formed-soldier rations; prescribed attrition and transport losses plus reserve replenishment are explicit controlled inputs, not fabricated battle/convoy outcomes; restoring used reserve inventory excludes domestic acquisition to avoid circular valuation',unpriced:'research, recruiting officers, fortification and tactical preparation require goal-specific outcomes; not treated as zero or invented resource production'}};
await mkdir('outputs/economy-valuation',{recursive:true});
await writeFile(`outputs/economy-valuation/${diagnose?'diagnosis':'results'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({consumption:consumption.filter(r=>r.days===120&&r.reserveBuffer===10000).map(({profile,perTurn,weights})=>({profile,perTurn,weights})),sampleCount:result.sampleCount,candidateCount:result.candidateCount,current,chosen,implied:result.implied,comparisons:comparisons.map(r=>({weights:r.weights,validationSpread:r.validation.map(a=>({ability:a.ability,spread:a.coreSpread}))})),formationChecks:probes.length,quotes:{minSell:Math.min(...quotes.sell.map(r=>r.effectivePrice)),maxSell:Math.max(...quotes.sell.map(r=>r.effectivePrice)),minBuy:Math.min(...quotes.buy.map(r=>r.effectivePrice)),maxBuy:Math.max(...quotes.buy.map(r=>r.effectivePrice))},reserveHolding:result.reserveHolding},null,2));
