import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {compareConstruction,compareEconomicWork} from './economy-balance-lib.mjs';
import {DEVELOPMENT_SEEDS,VALIDATION_SEEDS} from './economy-valuation-lib.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {cityRecurringIncome,cityNeedsAgriculture,sustainableRecruitment,cityIncomeBreakdown} from '../economy.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {assignDomestic} from '../domestic.mjs';
import {availableConstructionSites} from '../metropolitan-areas.mjs';

const phase=seeds=>({construction:compareConstruction(seeds,{allBuildings:true}),operations:compareEconomicWork(seeds)});
const development=phase(DEVELOPMENT_SEEDS),validation=phase(VALIDATION_SEEDS);
for(const data of [development,validation]){
 for(const r of data.construction){assert.ok(r.engineeringSpread<.1);assert.ok(r.efficiencySpread<.1);assert.ok(r.costEfficiencySpread<.1);}
 for(const r of data.operations)assert.ok(r.spread<.1);
}
// Optional read-only comparison to the previously audited economy functions.
// This neither loads old saves nor installs an old-version runtime into the game.
const reference=process.argv.find(a=>a.startsWith('--reference-runtime='))?.split('=')[1],preservation={reference:reference||null,cases:0,differences:[]};
if(reference){
 const prior=await import(pathToFileURL(resolve(reference,'economy.mjs')).href);
 for(const spec of NATIONAL_SCENARIOS){
  const s=newCampaign(1709,spec.id);
  for(const mode of ['opening','staffed','developed','blocked']){
   if(mode==='staffed')for(const c of s.cities){
    const people=cityPersonnel(s,c.id);if(!people.length)continue;
    c.governor=people.toSorted((a,b)=>b.unit.politics-a.unit.politics)[0].unit.id;
    assert.equal(assignDomestic(s,c.id,'agriculture',people[0].unit.id,{scheduled:true,faction:c.owner}),null);
    c.domestic.effects.push({key:'grain',amount:.3,untilTurn:3});
   }
   if(mode==='developed')for(const c of s.cities)for(const key of ['commerce','farm','barracks']){
    let options;while((options=availableConstructionSites(s,c,key)).length){const site=options[0].node.id;c[key]++;if(site!==c.id)c.domestic.buildingSites[key].push(site);}
   }
   if(mode==='blocked')for(const c of s.cities.filter(c=>c.citySize==='small')){c.owner='neutral';c.domestic.owner='neutral';}
   for(const c of s.cities){
    const before={income:prior.cityBaseIncome(s,c),foodNeed:prior.cityNeedsAgriculture(s,c),recruitment:prior.sustainableRecruitment(s,c)},after={income:cityRecurringIncome(s,c),foodNeed:cityNeedsAgriculture(s,c),recruitment:sustainableRecruitment(s,c)};
    preservation.cases++;if(JSON.stringify(before)!==JSON.stringify(after))preservation.differences.push({scenario:spec.id,mode,city:c.id,before,after});
    const r=cityIncomeBreakdown(s,c);for(const k of ['gold','grain','manpower'])assert.equal(r.total[k],r.base[k]+r.operations[k]);
   }
  }
 }
 assert.deepEqual(preservation.differences,[],'Splitting income must preserve actual recurring income and supply decisions');
}
const files=['economy.mjs','strategic-campaign.mjs','domestic.mjs','data/design/economy-rules.mjs','data/design/buildings.mjs','data/design/domestic-actions.mjs','scripts/economy-balance-lib.mjs','scripts/audit-economy-income-parts.mjs'];
const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const result={createdAt:new Date().toISOString(),developmentSeeds:DEVELOPMENT_SEEDS,validationSeeds:VALIDATION_SEEDS,development,validation,preservation,hashes,scope:{construction:'same starting facilities, funds and relevant abilities; no traits or governor; complete one real level of each of nine building types, including delays and refunds; engineering effort divided by total occupied officer-days; economic buildings additionally compare permanent base value per occupied officer-day and actual net money cost',operations:'same facility conditions and relevant abilities; direct operating commands only; net resource changes over calendar time exclude city base income; no traits or governor; constrained local capacity covered separately by metropolitan audit',capacity:'construction also increases potential operating capacity; that capacity is reported separately and never counted as completed operating income',functional:'non-economic buildings, research, recruitment of officers and medical work require actual functional targets, and are not assigned fabricated recurring cash yields',preservation:'pure function comparison on controlled current-scenario states, not a new annual audit or old-save compatibility; constructed and blocked inputs are explicit fixtures'}};
await mkdir('outputs/economy-income-parts',{recursive:true});await writeFile('outputs/economy-income-parts/results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({construction:validation.construction.map(r=>({ability:r.ability,engineeringSpread:r.engineeringSpread,efficiencySpread:r.efficiencySpread,costEfficiencySpread:r.costEfficiencySpread,commands:r.commands.map(({key,meanDays,meanSpent,engineeringEfficiency,meanBaseValue,meanValuePerOfficerDay})=>({key,meanDays,meanSpent,engineeringEfficiency,meanBaseValue,meanValuePerOfficerDay}))})),operations:validation.operations.map(r=>({ability:r.ability,spread:r.spread,commands:r.commands.map(({key,meanValue})=>({key,meanValue}))})),preservation,constructionTrials:development.construction.reduce((n,r)=>n+r.commands.reduce((n,c)=>n+c.runs.length,0),0)+validation.construction.reduce((n,r)=>n+r.commands.reduce((n,c)=>n+c.runs.length,0),0),operatingTrials:(DEVELOPMENT_SEEDS.length+VALIDATION_SEEDS.length)*9},null,2));
