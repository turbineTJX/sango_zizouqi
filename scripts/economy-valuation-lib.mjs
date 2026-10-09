import {resourceRecipe} from './resource-recipe.mjs';
import {directWorkTrial} from './economy-balance-lib.mjs';
import {newCampaign,recruitLocalUnits,settleCityEconomy} from '../strategic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {TROOP_DESIGNS} from '../data/design/troops.mjs';
import {trainingCost} from '../troop-training.mjs';

export const DEVELOPMENT_SEEDS=Array.from({length:16},(_,i)=>417+i*83);
export const VALIDATION_SEEDS=Array.from({length:32},(_,i)=>9001+i*137);
export const CORE_COMMANDS=['fair','cultivate','recruit'];
export const RESOURCE_COMMANDS=[...CORE_COMMANDS,'urgent','heal','recover','buy','sell'];
export const collectWorkSamples=(seeds,keys=RESOURCE_COMMANDS)=>[30,60,90].flatMap(ability=>keys.flatMap(key=>seeds.map(seed=>directWorkTrial(seed,ability,key))));
const mean=(rows,get)=>rows.reduce((sum,row)=>sum+get(row),0)/rows.length;
const value=(resources,weights)=>Object.entries(resources).reduce((sum,[key,n])=>sum+n*weights[key],0);
export const workValue=(sample,weights)=>value(sample.delta,weights)+value(sample.avoidedReplacement,weights);
export function summarizeWork(samples,weights){
 return [30,60,90].map(ability=>{
  const selected=samples.filter(row=>row.ability===ability),keys=[...new Set(selected.map(row=>row.key))];
  const commands=keys.map(key=>{
   const rows=selected.filter(row=>row.key===key),netResources=Object.fromEntries(['gold','grain','manpower'].map(k=>[k,mean(rows,r=>r.delta[k])]));
   return {key,runs:rows.length,netResources,healed:mean(rows,r=>r.healed),netValue:mean(rows,r=>workValue(r,weights)),perActiveDay:mean(rows,r=>workValue(r,weights)/r.activeDays),perCalendarDay:mean(rows,r=>workValue(r,weights)/r.cycleDays)};
  });
  const core=commands.filter(row=>CORE_COMMANDS.includes(row.key)).map(row=>row.perCalendarDay);
  return {ability,commands,coreSpread:core.length===CORE_COMMANDS.length?Math.max(...core)/Math.min(...core)-1:null};
 });
}
export function impliedValues(samples){
 return [30,60,90].map(ability=>{
  const rows=key=>samples.filter(row=>row.ability===ability&&row.key===key),cash=mean(rows('fair'),r=>r.delta.gold),food=mean(rows('cultivate'),r=>r.delta.grain),reserves=rows('recruit');
  const grain=cash/food,manpower=(cash-mean(reserves,r=>r.delta.gold)-mean(reserves,r=>r.delta.grain)*grain)/mean(reserves,r=>r.delta.manpower);
  return {ability,grain,manpower};
 });
}
export function scanValues(samples){
 // Raw observed resource deltas are reused. Changing a candidate price never
 // changes the simulated outcome or adjusts commands to manufacture equality.
 const means=[30,60,90].map(ability=>CORE_COMMANDS.map(key=>{
  const rows=samples.filter(r=>r.ability===ability&&r.key===key);
  return Object.fromEntries(['gold','grain','manpower'].map(k=>[k,mean(rows,r=>r.delta[k]/r.cycleDays)]));
 }));
 const candidates=[];
 for(let g=3;g<=100;g++)for(let m=20;m<=200;m++){
  const weights={gold:1,grain:g/100,manpower:m/100};
  const worstSpread=Math.max(...means.map(rows=>{const v=rows.map(r=>value(r,weights));return Math.max(...v)/Math.min(...v)-1;}));
  candidates.push({weights,worstSpread});
 }
 return candidates.sort((a,b)=>a.worstSpread-b.worstSpread||a.weights.grain-b.weights.grain||a.weights.manpower-b.weights.manpower);
}
export function tradeQuoteRange(samples){
 const buy=samples.filter(r=>r.key==='buy'&&r.delta.grain>0),sell=samples.filter(r=>r.key==='sell'&&r.delta.grain<0);
 return {buy:buy.map(r=>({ability:r.ability,seed:r.seed,grain:r.delta.grain,paid:-r.delta.gold,effectivePrice:-r.delta.gold/r.delta.grain})),sell:sell.map(r=>({ability:r.ability,seed:r.seed,grain:-r.delta.grain,received:r.delta.gold,effectivePrice:r.delta.gold/-r.delta.grain}))};
}
export function formationProbes(weights,seed=9001){
 const rows=[],target=2000,grantValue=100;
 for(const type of Object.keys(TROOP_DESIGNS))for(const missing of ['none','gold','grain','manpower'])for(const grant of ['none','gold','grain','manpower']){
  const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang'),u=makeOfficer('person-716',0,0,1);
  s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];
  for(const town of s.cities)town.units=[];
  resourceRecipe(u,type);u.troops=0;u.wounded=0;u.homeCity=c.id;c.units=[u];c.barracks=5;c.domestic.techs=[...new Set(Object.values(TROOP_DESIGNS).map(d=>d.technology).filter(Boolean))];
  const recipe={gold:trainingCost(u,target),grain:0,manpower:target};
  const before=Object.fromEntries(Object.entries(recipe).map(([key,n])=>[key,Math.floor(n*(key===missing?.5:1))]));
  const added={gold:0,grain:0,manpower:0};if(grant!=='none')added[grant]=Math.floor(grantValue/weights[grant]);
  c.water=true;c.gold=before.gold+added.gold;c.grain=before.grain+added.grain;c.manpower=before.manpower+added.manpower;
  const error=recruitLocalUnits(s,c,[u.id],{cap:target});
  rows.push({seed,type,missing,grant,grantValue,recipe,before,added,formed:u.troops,spent:{gold:before.gold+added.gold-c.gold,grain:before.grain+added.grain-c.grain,manpower:before.manpower+added.manpower-c.manpower},error});
 }
 return rows;
}
export function reserveHoldingProbe(seed=9001){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const town of s.cities)town.units=[];
 c.gold=10000;c.grain=10000;c.manpower=1000;
 const rows=[];
 for(let turn=1;turn<=6;turn++){
  const result=settleCityEconomy(s,c,{income:{gold:0,grain:0,manpower:0}});
  rows.push({days:turn*10,remaining:c.manpower,paidGold:result.paidGold,grain:10000-c.grain});
 }
 return rows;
}
