import {resourceRecipe} from './resource-recipe.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeTalent} from '../talent-lifecycle.mjs';
import {ACTIONS,assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay} from '../domestic.mjs';
import {resourceValue,cityBaseIncome,cityWorkLimit} from '../economy.mjs';
import {trainingRate} from '../troop-training.mjs';
import {addCityGold} from '../talent-core.mjs';

// Matched random outcomes, equal relevant ability, no traits or collaborators.
// Use a developed rich city so its work allowance does not truncate one ordinary
// worker. Binding local capacity is tested separately; costs and completion are real.
export function directWorkTrial(seed,ability,key,{patientType='spear',cityId='xuchang',prepareCity=null}={}){
 const s=newCampaign(seed,prepareCity?'guandu-200':undefined),c=s.cities.find(c=>c.id===cityId),u=makeOfficer('person-715',0,0,1);
 for(const stat of ['politics','leadership','force','intellect','charm'])u[stat]=ability;
 u.homeCity=c.id;s.armies=[];s.campaign.idle=[{unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0}];
 for(const town of s.cities){town.units=[];town.governor=null;}
 initializeTalent(s);c.granary=5;if(prepareCity)prepareCity(s,c);else {c.farm=6;c.commerce=6;c.barracks=6;}c.grain=8000;c.manpower=0;addCityGold(s,c,10000-c.gold);
 let patient=null;
 if(ACTIONS[key].kind==='heal'){patient=makeOfficer('person-716',0,0,1);resourceRecipe(patient,patientType);patient.leadership=100;patient.wounded=5000;patient.homeCity=c.id;c.units=[patient];c.clinic=1;initializeTalent(s);}
 if(key==='buy')c.grain=0;
 for(const [id,def] of Object.entries(ACTIONS))if(def.direction===ACTIONS[key].direction&&id!==key)c.domestic.cooldowns[id]=10000;
 const before={gold:c.gold,grain:c.grain,manpower:c.manpower};
 const error=assignDomestic(s,c.id,ACTIONS[key].direction,u.id,{scheduled:true,faction:c.owner});if(error)throw Error(error);
 beginDomesticTurn(s);const a=assignmentFor(s,u.id);if(a.action?.key!==key)throw Error('Command did not start: '+key);
 for(let i=0;i<ACTIONS[key].days;i++){finishDomesticDay(s);s.campaign.day++;}
 const delta={gold:c.gold-before.gold,grain:c.grain-before.grain,manpower:c.manpower-before.manpower};
 const healed=patient?5000-patient.wounded:0;
 const event=s.campaign.domestic.events.find(e=>e.result.factor!==undefined);
 if(!event||a.action)throw Error('Command did not finish: '+key);
 beginDomesticTurn(s);const sameTurnRestarted=!!a.action;
 // Reference cost of forming the restored troop count; this is not minted
 // inventory or guaranteed savings from every subsequent player decision.
 const avoidedReplacement={manpower:healed,grain:0,gold:healed*(patient?trainingRate(patient):0)};
 return {seed,ability,key,delta,healed,avoidedReplacement,activeDays:ACTIONS[key].days,cycleDays:Math.ceil(ACTIONS[key].days/10)*10,sameTurnRestarted,value:resourceValue(delta)+resourceValue(avoidedReplacement),factor:event.result.factor};
}
export function compareEconomicWork(seeds){
 return [30,60,90].map(ability=>{
  const commands=['fair','cultivate','recruit'].map(key=>{
   const runs=seeds.map(seed=>directWorkTrial(seed,ability,key));
   return {key,runs,meanValue:runs.reduce((n,r)=>n+r.value,0)/runs.length};
  });
  const values=commands.map(c=>c.meanValue);
  return {ability,commands,spread:Math.max(...values)/Math.min(...values)-1};
 });
}

// One real construction, including every setback, refund and occupied day.
// Permanent resource output and potential operating capacity are separate;
// functional buildings are compared by engineering effort, not invented cash.
export function constructionTrial(seed,ability,key){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang'),u=makeOfficer('person-715',0,0,1);
 if(ACTIONS[key]?.kind!=='build')throw Error('Not a construction: '+key);
 for(const stat of ['politics','leadership','force','intellect','charm'])u[stat]=ability;
 u.homeCity=c.id;s.armies=[];s.campaign.idle=[{unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0}];
 for(const town of s.cities){town.units=[];town.governor=null;}
 initializeTalent(s);c.commerce=c.farm=c.barracks=1;c.granary=1;c.grain=8000;c.gold=10000;
 // A real available candidate supplies the common demand condition for a hall.
 if(key==='build_hall'){const candidate=s.campaign.domestic.people.find(p=>p.status==='FREE'&&!p.travel&&p.id!==u.id);if(!candidate)throw Error('No available hall candidate');candidate.cityId=c.id;}
 for(const [id,def] of Object.entries(ACTIONS))if(def.direction===ACTIONS[key].direction&&id!==key)c.domestic.cooldowns[id]=10000;
 const before={gold:c.gold,level:c[ACTIONS[key].value],base:cityBaseIncome(s,c),allowance:Object.fromEntries(['gold','grain','manpower'].map(k=>[k,cityWorkLimit(s,c,k)]))};
 const error=assignDomestic(s,c.id,ACTIONS[key].direction,u.id);if(error)throw Error(error);
 beginDomesticTurn(s);const a=assignmentFor(s,u.id);if(a.action?.key!==key)throw Error('Construction did not start: '+key);
 const nominalDays=a.action.remaining,charged=a.action.cost;let days=0;
 while(a.action&&days<160){s.campaign.day=++days;finishDomesticDay(s);}
 if(a.action||c[ACTIONS[key].value]!==before.level+1)throw Error('Construction did not complete: '+key);
 const gain=Object.fromEntries(Object.entries(cityBaseIncome(s,c)).map(([k,n])=>[k,n-before.base[k]])),baseValue=resourceValue(gain),spent=before.gold-c.gold;
 const allowanceGain=Object.fromEntries(['gold','grain','manpower'].map(k=>[k,cityWorkLimit(s,c,k)-before.allowance[k]]));
 return {seed,ability,key,nominalDays,days,engineeringEfficiency:nominalDays/days,charged,spent,refund:charged-spent,gain,baseValue,valuePerOfficerDay:baseValue/days,valuePerGold:baseValue/spent,allowanceGain,scope:'one completed level; engineering effort divided by real occupied officer-days; permanent additional resource income is measured separately; potential operation allowance is never counted as earned income; a real free candidate is explicitly stationed locally for the hall demand fixture'};
}
export function compareConstruction(seeds,{allBuildings=false}={}){
 return [30,60,90].map(ability=>{
  const keys=allBuildings?Object.keys(ACTIONS).filter(k=>ACTIONS[k].kind==='build'):['build_commerce','build_farm','build_barracks'];
  const commands=keys.map(key=>{
   const runs=seeds.map(seed=>constructionTrial(seed,ability,key)),mean=f=>runs.reduce((n,r)=>n+r[f],0)/runs.length;
   return {key,runs,meanDays:mean('days'),meanSpent:mean('spent'),engineeringEfficiency:runs.reduce((n,r)=>n+r.nominalDays,0)/runs.reduce((n,r)=>n+r.days,0),meanBaseValue:mean('baseValue'),meanValuePerOfficerDay:mean('baseValue')/mean('days'),meanValuePerGold:mean('baseValue')/mean('spent')};
  });
  const economic=commands.filter(c=>c.meanBaseValue>0),spread=(rows,f)=>Math.max(...rows.map(c=>c[f]))/Math.min(...rows.map(c=>c[f]))-1;
  return {ability,commands,engineeringSpread:spread(commands,'engineeringEfficiency'),efficiencySpread:spread(economic,'meanValuePerOfficerDay'),costEfficiencySpread:spread(economic,'meanValuePerGold')};
 });
}
