import {resourceRecipe} from './resource-recipe.mjs';
import assert from 'node:assert/strict';
import {newCampaign,recruitLocalUnits,settleCityEconomy,dailySupply} from '../strategic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {TROOP_DESIGNS} from '../data/design/troops.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';

// Prescribed permanent losses are controlled demand inputs, not battle results.
// Food, military upkeep, quotas and replacement expenses are
// all charged through the actual controller-shared game functions.
export const CONSUMPTION_PROFILES=[
 {id:'peace',frontTypes:[],permanentLoss:0},
 {id:'normal',frontTypes:['spear','archer','cavalry'],permanentLoss:.05},
 {id:'attrition',frontTypes:['spear','archer','cavalry'],permanentLoss:.18},
 {id:'equipment',frontTypes:['siege','cavalry','ram'],permanentLoss:.08},
 {id:'supply',frontTypes:['spear','archer','cavalry'],permanentLoss:.05,grainLostPerTurn:1500}
];
const empty=()=>({gold:0,grain:0,manpower:0});
const accumulate=(sum,part)=>{for(const key of Object.keys(sum))sum[key]+=part[key]||0;};
export function consumptionTrial(profile,{seed=9001,days=120,reserveBuffer=10000,frontTroops=2500}={}){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];
 for(const town of s.cities)town.units=[];
 c.barracks=5;c.granary=5;c.water=true;c.domestic.techs=[...new Set(profile.frontTypes.map(type=>TROOP_DESIGNS[type].technology).filter(Boolean))];c.manpower=30000;c.grain=60000;c.gold=30000;
 c.units=['spear',...profile.frontTypes].map((type,i)=>{const u=makeOfficer('person-'+(715+i),0,0,1);resourceRecipe(u,type);u.troops=0;u.wounded=0;u.homeCity=c.id;return u;});
 const formationBefore={gold:c.gold,grain:c.grain,manpower:c.manpower};
 // Respect the same per-turn quota when initially raising more than 7000 men.
 const targets=c.units.map((u,i)=>i?frontTroops:2500);
 for(let i=0;i<6&&c.units.some((u,j)=>u.troops<targets[j]);i++){
  if(c.units[0].troops<2500)assert.equal(recruitLocalUnits(s,c,[c.units[0].id],{cap:2500}),null);
  if(c.units.slice(1).some(u=>u.troops<frontTroops))assert.equal(recruitLocalUnits(s,c,c.units.slice(1).map(u=>u.id),{cap:frontTroops}),null);
  c.drafted=0;
 }
 assert.ok(c.units.every((u,i)=>u.troops===targets[i]));
 const initialFormation={gold:formationBefore.gold-c.gold,grain:formationBefore.grain-c.grain,manpower:formationBefore.manpower-c.manpower};
 c.manpower=reserveBuffer;
 const parts={rations:empty(),militaryUpkeep:empty(),replacement:empty(),transportLoss:empty()},samples=[];
 for(let day=1;day<=days;day++){
  s.campaign.day=day;s.turn=Math.ceil(day/10);
  if(day%10===1)for(const u of c.units.slice(1))u.troops-=Math.round(frontTroops*profile.permanentLoss);
  const beforeFood=c.grain;dailySupply(s);parts.rations.grain+=beforeFood-c.grain;assert.equal(c.hunger,0,'Measurement must remain fully fed');
  if(day%10)continue;
  const before={gold:c.gold,grain:c.grain,manpower:c.manpower};
  const settlement=settleCityEconomy(s,c,{income:empty()});
  assert.equal(settlement.paidGold,settlement.upkeep.gold,'Measurement must fully fund upkeep');
  parts.militaryUpkeep.gold+=settlement.paidGold;
  c.drafted=0;const preRecruit={gold:c.gold,grain:c.grain,manpower:c.manpower};
  if(profile.permanentLoss)assert.equal(recruitLocalUnits(s,c,c.units.slice(1).map(u=>u.id),{cap:frontTroops}),null);
  assert.ok(c.units.every((u,i)=>u.troops===targets[i]),'Measurement must restore the prescribed troop load');
  const replacement={gold:preRecruit.gold-c.gold,grain:preRecruit.grain-c.grain,manpower:preRecruit.manpower-c.manpower};accumulate(parts.replacement,replacement);
  const transportLoss=Math.min(c.grain,profile.grainLostPerTurn||0);assert.equal(transportLoss,profile.grainLostPerTurn||0);c.grain-=transportLoss;parts.transportLoss.grain+=transportLoss;
  const reserveReplacement=reserveBuffer-c.manpower;
  samples.push({day,before,after:{gold:c.gold,grain:c.grain,manpower:c.manpower},replacement,reserveReplacement,transportLoss});
  // External measurement replenishment keeps the prescribed load constant; it
  // is explicitly recorded, not claimed as actual domestic production.
  c.manpower=reserveBuffer;
 }
 const total=empty();for(const part of Object.values(parts))accumulate(total,part);
 const perTurn=Object.fromEntries(Object.entries(total).map(([key,n])=>[key,n/(days/10)]));
 const weights={gold:1,grain:perTurn.gold/perTurn.grain,manpower:perTurn.manpower?perTurn.gold/perTurn.manpower:null};
 const lifecycle=Object.fromEntries(Object.entries(total).map(([key,n])=>[key,n+initialFormation[key]]));
 const lifecycleWeights={gold:1,grain:lifecycle.gold/lifecycle.grain,manpower:lifecycle.gold/lifecycle.manpower};
 return {profile:profile.id,seed,days,reserveBuffer,guard:{units:1,troops:2500},front:{units:profile.frontTypes.length,types:profile.frontTypes,troops:profile.frontTypes.map(()=>frontTroops)},assumptions:{permanentLossPerTurn:profile.permanentLoss,transportLossPerTurn:profile.grainLostPerTurn||0,station:'all units resident for controlled shared formation and supply costs; not a live expedition',reserveReplenishment:'measurement input restores the same reserve buffer after each turn; domestic acquisition costs are excluded to avoid deriving values from production'},initialFormation,parts,total,perTurn,weights,lifecycleWeights,samples};
}
export function consumptionMatrix(){
 return CONSUMPTION_PROFILES.flatMap(profile=>[30,60,120].flatMap(days=>[5000,10000,15000].map(reserveBuffer=>consumptionTrial(profile,{days,reserveBuffer}))));
}
