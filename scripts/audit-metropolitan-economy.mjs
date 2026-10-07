import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {newCampaign,cityIncome} from '../strategic-campaign.mjs';
import {constructionSites,localBuildingLimit,localBuildingLevel,buildingLimit,canExpandBuilding,productiveBuildingLevel} from '../metropolitan-areas.mjs';
import {cityWorkLimit,resourceValue} from '../economy.mjs';
import {VALIDATION_SEEDS} from './economy-valuation-lib.mjs';
import {directWorkTrial} from './economy-balance-lib.mjs';
import {consumptionTrial} from './economy-consumption-lib.mjs';

const keys=['gold','grain','manpower'],fields=['commerce','farm','barracks'];
// Analytical mature-city ceiling: friendly and open sites, no temporary effects,
// no governor bonus. Real native small-city facilities occupy their shared slots.
// Construction time/cost is excluded, so this cannot stand in for opening income.
function develop(s,c){
 s.armies=[];s.campaign.battles=[];c.governor=null;c.domestic.effects=[];
 for(const site of constructionSites(s,c))if(site.kind==='city'){site.owner=c.owner;site.domestic.owner=c.owner;}
 for(const key of fields){
  for(const site of constructionSites(s,c))while(canExpandBuilding(s,c,key,site.id)){
   c[key]++;if(site.id!==c.id)c.domestic.buildingSites[key].push(site.id);
  }
  assert.ok(c[key]<=buildingLimit(s,c,key));
  for(const site of constructionSites(s,c))assert.ok(localBuildingLevel(c,key,site.id)<=localBuildingLimit(s,c,key,site.id));
 }
}
function matureCity(id){
 const s=newCampaign(417,'guandu-200'),c=s.cities.find(c=>c.id===id);develop(s,c);
 const income=cityIncome(s,c),workAllowance=Object.fromEntries(keys.map(k=>[k,cityWorkLimit(s,c,k)]));
 return {id,name:c.name,sites:constructionSites(s,c).map(n=>n.name),potentialLevels:Object.fromEntries(fields.map(k=>[k,buildingLimit(s,c,k)])),productiveLevels:Object.fromEntries(fields.map(k=>[k,productiveBuildingLevel(s,c,k)])),income,workAllowance,upperIncome:Object.fromEntries(keys.map(k=>[k,income[k]+workAllowance[k]]))};
}
const cities=['town-1','town-4','xuchang','town-31'].map(matureCity);
const labor=[30,60,90].map(ability=>{
 return {ability,cities:cities.map(c=>{
  const work=Object.fromEntries(['fair','cultivate','recruit'].map((key,i)=>[keys[i],VALIDATION_SEEDS.map(seed=>directWorkTrial(seed,ability,key,{cityId:c.id,prepareCity:develop}).delta[keys[i]])]));
  return {id:c.id,workers:[1,3,8].map(workers=>{
  // Matched actual outcomes in each direction; clipping is applied per sample,
  // not to the mean, so failed workers cannot be invented to fill the allowance.
  const outputs=Object.fromEntries(keys.map(k=>[k,VALIDATION_SEEDS.reduce((n,seed,i)=>n+Math.min(c.workAllowance[k],work[k][i]*workers),0)/VALIDATION_SEEDS.length]));
  const values=keys.map(k=>resourceValue({[k]:outputs[k]}));
  return {workers,outputs,valueSpread:Math.max(...values)/Math.min(...values)-1};
 })};})};
});
for(const row of labor)for(const c of row.cities)for(const r of c.workers)assert.ok(r.valueSpread<.1,JSON.stringify({ability:row.ability,city:c.id,...r}));
const demand=[1,2,3].flatMap(lines=>[.05,.18].map(loss=>consumptionTrial({id:lines+'-lines-'+(loss===.05?'normal':'high'),frontTypes:Array.from({length:lines},()=>['spear','archer','cavalry']).flat(),permanentLoss:loss},{frontTroops:3000,days:120,reserveBuffer:15000})));
const capacity=cities.map(c=>({id:c.id,name:c.name,profiles:demand.map(d=>{
 const coverage=Object.fromEntries(keys.map(k=>[k,c.upperIncome[k]/d.perTurn[k]]));
 return {profile:d.profile,coverage,limitingResource:keys.reduce((a,b)=>coverage[a]<coverage[b]?a:b),sustainableUpperBound:keys.every(k=>coverage[k]>=1),perTurn:d.perTurn};
})}));
const high=c=>capacity.find(r=>r.id===c).profiles.find(r=>r.profile==='1-lines-high');
assert.ok(!high('town-1').sustainableUpperBound,'A poor small city cannot fund even one continuous high-attrition column from its mature recurring income');
assert.ok(high('xuchang').sustainableUpperBound,'A mature rich city supports the same high-attrition column');
assert.ok(capacity.find(r=>r.id==='town-31').profiles.find(r=>r.profile==='3-lines-high').sustainableUpperBound,'A large mature metropolis has greater high-attrition capacity');
const result={createdAt:new Date().toISOString(),cities,labor,capacity,demand,scope:{city:'mature analytical maximum with friendly unblocked physical sites and actual native occupancy; no governor or temporary bonuses; opening stock, construction cost/time and secondary-city income excluded',work:'actual local single-worker outcomes including source recruitment planning and final quota clipping; hypothetical synchronized equal-outcome workers share the final city allowance; not automatic assignment decisions or independent outcome statistics',war:'controlled permanent losses every ten days; actual shared food/replacement costs measured at three 3000-man teams per line and 2500 guards; no live battles or transport loss in this capacity table',capacity:'gross mature ceiling, not guaranteed automatic income; work needs sufficient real people and successful tasks; resources and blocked sites can bind earlier; actual scenario operations and battles audited separately'}};
result.scope.exchange='Local direct production only; aid, trade, transport receipts and loot excluded. Actual exchanges can compensate for a local deficit and must use real resources and delivery.';
await mkdir('outputs/metropolitan-economy',{recursive:true});await writeFile('outputs/metropolitan-economy/results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({cities,labor: labor.map(r=>({ability:r.ability,maxSpread:Math.max(...r.cities.flatMap(c=>c.workers.map(w=>w.valueSpread)))})),capacity},null,2));
