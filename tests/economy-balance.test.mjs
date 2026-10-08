import {fundCities} from './resource-fixtures.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,cityIncome,settleCityEconomy,serializeCampaign,validateCampaign,recruitLocalUnits,dailySupply} from './helpers/auto-domestic-campaign.mjs';
import {allocateUnitTroops} from '../troop-allocation.mjs';
import {trainingCost} from '../troop-training.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,beginDomesticTurn,finishDomesticDay,cityFoodReserve} from '../domestic.mjs';
import {economicWorkScale,cityMaintenance,supportedSoldiers,resourceValue} from '../economy.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {compareEconomicWork,directWorkTrial} from '../scripts/economy-balance-lib.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';

function fixture(key,seed=31){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.faction===c.owner&&o.location===c.id);
 fundCities(s,20000);c.grain=18000;c.manpower=0;setBuildingLevel(c,'granary',5);s.grain=Math.floor(s.cities.filter(t=>t.owner==='cao').reduce((n,t)=>n+t.grain,0));
 for(const [id,def] of Object.entries(ACTIONS))if(def.direction===ACTIONS[key].direction&&id!==key)c.domestic.cooldowns[id]=10000;
 assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,o.unit.id),null);
 return {s,c,o,a:assignmentFor(s,o.unit.id)};
}
function days(s,n){for(let i=0;i<n;i++){finishDomesticDay(s);s.campaign.day++;}}

test('equal-ability commercial, agricultural and source recruitment returns remain within 10% over independent seeds',()=>{
 const result=compareEconomicWork(Array.from({length:32},(_,i)=>1709+i*97));
 for(const row of result)assert.ok(row.spread<.1,JSON.stringify(row));
 for(const key of ['fair','cultivate','recruit'])assert.ok(result[2].commands.find(c=>c.key===key).meanValue>result[0].commands.find(c=>c.key===key).meanValue);
});
test('equal-cost economic buildings add equal resource value per turn',()=>{
 const p=ECONOMY_RULES.income;
 assert.ok(Math.abs(resourceValue({gold:p.gold.perCommerce})-resourceValue({grain:p.grain.perFarm}))<1);
 assert.ok(Math.abs(resourceValue({gold:p.gold.perCommerce})-resourceValue({manpower:p.manpower.perBarracks}))<1);
 assert.equal(ACTIONS.build_commerce.cost,ACTIONS.build_farm.cost);assert.equal(ACTIONS.build_commerce.cost,ACTIONS.build_barracks.cost);
});
test('medical net savings stay near equal-ability commerce with sufficient actual wounds',()=>{
 const seeds=Array.from({length:32},(_,i)=>1709+i*97);
 for(const ability of [30,60,90]){
  const mean=key=>seeds.reduce((n,seed)=>n+directWorkTrial(seed,ability,key).value,0)/seeds.length,commercial=mean('fair');
  for(const key of ['heal','recover'])assert.ok(Math.abs(mean(key)/commercial-1)<.2,key+' '+ability);
 }
});
test('an empty treasury and undeveloped economy still allow real recovery work',()=>{
 for(const key of ['fair','cultivate','recruit']){
  const {s,c,o,a}=fixture(key);fundCities(s,0);c.commerce=0;c.farm=0;
  assert.ok(actionCandidates(s,a).some(p=>p.key===key));beginDomesticTurn(s);assert.equal(a.action.key,key);
  days(s,10);assert.equal(s.gold>=0,true);assert.ok(s.campaign.domestic.events.some(e=>e.actionId&&e.result.actual>0),key);
 }
});
test('source recruitment adds only reserves without consuming food or changing existing troop formations',()=>{
 const {s,c,a}=fixture('recruit');beginDomesticTurn(s);assert.equal(a.action.recruitMode,'reserve');assert.equal(c.domestic.reserved,0);
 const before=c.units.map(u=>u.troops);c.grain=cityFoodReserve(s,c);const food=c.grain;days(s,10);
 assert.ok(c.manpower>0);assert.equal(c.grain,food);assert.deepEqual(c.units.map(u=>u.troops),before);assert.equal(c.domestic.reserved,0);
});
test('parallel source recruitment clips to shared storage and cannot double charge or double settle',()=>{
 const {s,c,o,a}=fixture('recruit');const other=s.campaign.idle.find(p=>p.faction===c.owner&&p.location===c.id&&p.unit.id!==o.unit.id)?.unit||c.units[0];assert.equal(assignDomestic(s,c.id,'military',other.id),null);beginDomesticTurn(s);c.manpower=ECONOMY_RULES.capacity.manpowerMax-3;
 const before=c.grain;days(s,9);finishDomesticDay(s);assert.ok(c.manpower<=ECONOMY_RULES.capacity.manpowerMax);assert.ok(before-c.grain<=1);
 const snapshot=JSON.stringify(s);finishDomesticDay(s);assert.equal(JSON.stringify(s),snapshot);
});
test('source recruitment and its current version save continue deterministically',()=>{
 const {s,c,a}=fixture('recruit');beginDomesticTurn(s);assert.equal(a.action.recruitMode,'reserve');
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));days(s,10);days(copy,10);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 const bad=JSON.parse(serializeCampaign(copy));bad.campaign.version--;assert.throws(()=>validateCampaign(bad),/不兼容/);
});
test('military maintenance follows actual soldiers once across city, expedition and transit',()=>{
 const s=newCampaign(31),c=s.cities.find(c=>c.id==='xuchang'),before=supportedSoldiers(s,c),bill=cityMaintenance(s,c);
 const a=fieldFromCity(s,c.id);assert.deepEqual(supportedSoldiers(s,c),before);assert.deepEqual(cityMaintenance(s,c),bill);
 a.location='guandu';assert.deepEqual(cityMaintenance(s,c),bill);
 const unit=a.units.pop();s.campaign.idle.push({unit,faction:c.owner,location:'guandu',destination:c.id,remainingDays:2});assert.deepEqual(cityMaintenance(s,c),bill);
});
test('shared income settlement preserves reserve stock and never charges it food or rotation',()=>{
 const {s,c}=fixture('recruit');c.manpower=20000;beginDomesticTurn(s);assert.equal(c.domestic.reserved,assignmentFor(s,s.campaign.domestic.assignments[0].officerId).action.amount);
 const start={gold:s.gold,grain:c.grain,manpower:c.manpower},income=cityIncome(s,c),bill=cityMaintenance(s,c),result=settleCityEconomy(s,c);
 assert.equal(s.gold-start.gold,income.gold-bill.gold);assert.equal(c.grain-start.grain,income.grain);
 assert.equal(c.manpower,start.manpower+income.manpower);assert.ok(c.manpower>=c.domestic.reserved);assert.equal(result.paidGold,bill.gold);
 const ui=cityDomesticMarkup(s,c.id);assert.match(ui,/编制消耗金与预备兵/);assert.doesNotMatch(ui,/轮换归乡|预备兵口粮/);
});
test('player formation spends money and reserve manpower, including with zero grain; only actual soldiers eat',()=>{
 for(const kind of ['allocate','recruit']){
  const {s,c}=fixture('recruit'),u=c.units[0];for(const v of c.units){v.troops=0;v.wounded=0;}
  c.grain=0;c.manpower=3000;const money=s.gold;
  const error=kind==='allocate'?allocateUnitTroops(s,c,[u.id],{[u.id]:2000}):recruitLocalUnits(s,c,[u.id],{cap:2000});
  assert.equal(error,null);assert.equal(u.troops,2000);assert.equal(c.manpower,1000);assert.equal(c.grain,0);assert.equal(money-s.gold,trainingCost(u.type,2000));
  c.grain=1000;dailySupply(s);assert.equal(c.grain,980);assert.equal(c.manpower,1000);assert.equal(u.troops,2000);
 }
});
test('safe-city source work prefers the routine order instead of a random emergency surcharge',()=>{
 const {s,c,a}=fixture('recruit');c.domestic.cooldowns.urgent=0;const options=actionCandidates(s,a),regular=options.find(p=>p.key==='recruit'),urgent=options.find(p=>p.key==='urgent');
 assert.ok(regular&&urgent);assert.ok(regular.score-urgent.score>14);beginDomesticTurn(s);assert.equal(a.action.key,'recruit');
});
test('one medical assignment has one shared wound budget regardless of number of units',()=>{
 const {s,c,o,a}=fixture('heal');c.clinic=1;for(const u of c.units){u.troops-=1000;u.wounded+=1000;}
 beginDomesticTurn(s);assert.equal(a.action.key,'heal');days(s,5);
 const result=s.campaign.domestic.events.find(e=>e.actionId&&e.result.factor!==undefined);
 assert.ok(result.result.actual>0);assert.ok(result.result.actual<=Math.ceil(ACTIONS.heal.value*1.2*economicWorkScale(o.unit.intellect)*1.5));
 assert.equal(c.units.reduce((n,u)=>n+u.wounded,0),c.units.length*1000-result.result.actual);
});
