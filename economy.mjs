import {cityGoldCommitment} from './city-budget.mjs';
import {cityTroopUnlocked,technologyIncomeBonus} from './city-technology.mjs';
import {cityDailyFood,citySupplyBudgets} from './city-logistics.mjs';
import {plannedOfficer} from './strategic-intent.mjs';
import {ECONOMY_RULES} from './data/design/economy-rules.mjs';
import {battleWounded} from './engine.mjs';
import {cityPersonnel,residentOfficer} from './city-personnel.mjs';
import {troopCapacity} from './troop-capacity.mjs';
import {productiveBuildingLevel} from './metropolitan-areas.mjs';
import {domesticEffects} from './passives.mjs';
import {DOMESTIC_ACTION_DESIGNS} from './data/design/domestic-actions.mjs';

export const resourceValue=resources=>Object.entries(resources).reduce((n,[key,value])=>n+value*(ECONOMY_RULES.value[key]||0),0);
export const economicWorkScale=ability=>ECONOMY_RULES.work.base+ability/ECONOMY_RULES.work.abilityDivisor;
export const resourceBuilding={gold:'commerce',grain:'farm',manpower:'barracks'};
const economicTurn=s=>Math.floor((s.campaign.day-1)/10)+1;
const rawCityBaseIncome=(s,c)=>Object.fromEntries(Object.entries(resourceBuilding).map(([key,field])=>{const p=ECONOMY_RULES.income[key];return [key,(p.base+productiveBuildingLevel(s,c,field)*p[{gold:'perCommerce',grain:'perFarm',manpower:'perBarracks'}[key]])*(1+technologyIncomeBonus(c,key))];}));
// Permanent local production, independent of who currently operates the city.
export const cityBaseIncome=(s,c)=>Object.fromEntries(Object.entries(rawCityBaseIncome(s,c)).map(([key,n])=>[key,Math.floor(n)]));
export function cityIncomeBreakdown(s,c){
 const raw=rawCityBaseIncome(s,c),o=residentOfficer(s,c.governor),u=o?.location===c.id&&o.faction===c.owner?o.unit:null,effects=domesticEffects(u),factor=1+(u?.politics||0)/ECONOMY_RULES.income.governorPoliticsDivisor;
 const base={},governor={},management={},recurring={},work={},operations={},total={};
 for(const key of Object.keys(resourceBuilding)){
  const extra=c.domestic.effects.filter(e=>e.key===key&&e.untilTurn>=economicTurn(s)).reduce((n,e)=>n+e.amount,0),governed=Math.floor(raw[key]*factor*(1+(effects[key]||0)));
  base[key]=Math.floor(raw[key]);recurring[key]=Math.floor(raw[key]*factor*(1+(effects[key]||0)+extra));
  governor[key]=governed-base[key];management[key]=recurring[key]-governed;
  work[key]=c.domestic.production.turn===economicTurn(s)?c.domestic.production[key]:0;
  operations[key]=governor[key]+management[key]+work[key];total[key]=base[key]+operations[key];
 }
 // Direct work was already credited on completion. Total is an informational
 // turn accounting view; only recurring income is credited at settlement.
 return {base,governor,management,recurring,work,operations,total};
}
export const cityRecurringIncome=(s,c)=>cityIncomeBreakdown(s,c).recurring;
// Shared physical work throughput. Extra officers, cooperation and traits can
// fill this allowance sooner, but cannot mint unlimited local resources.
export function cityWorkLimit(s,c,key){const p=ECONOMY_RULES.development;return Math.floor((p.workValueBase+productiveBuildingLevel(s,c,resourceBuilding[key])*p.workValuePerLevel)*(1+technologyIncomeBonus(c,key))/ECONOMY_RULES.value[key]);}
export const cityWorkRemaining=(s,c,key)=>Math.max(0,cityWorkLimit(s,c,key)-(c.domestic.production.turn===economicTurn(s)?c.domestic.production[key]:0));
export function creditCityWork(s,c,key,amount){
 const actual=Math.max(0,Math.floor(Math.min(amount,cityWorkRemaining(s,c,key))));
 if(c.domestic.production.turn!==economicTurn(s))c.domestic.production={turn:economicTurn(s),gold:0,grain:0,manpower:0};
 c.domestic.production[key]+=actual;return actual;
}
export function sustainableRecruitment(s,c){
 const def=DOMESTIC_ACTION_DESIGNS.cultivate,people=cityPersonnel(s,c.id),workers=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.direction==='agriculture').map(a=>people.find(o=>o.unit.id===a.officerId)?.unit).filter(u=>u&&!u.mission);
 const expected=workers.reduce((n,u)=>{const p=Math.max(.12,Math.min(.94,.48+u[def.stat]*.004-(def.risk||0))),factor=p*1.03+Math.max(0,Math.min(.98,p+.15)-p)*.45;return n+def.value*economicWorkScale(u[def.stat])*factor;},0);
 const income=cityRecurringIncome(s,c).grain+Math.min(cityWorkLimit(s,c,'grain'),expected*(1+technologyIncomeBonus(c,'grain')))*ECONOMY_RULES.development.foodForecastSafety,use=cityDailyFood(s,c);
 // A real stockpile may fund a campaign above recurring income. Keep a food
 // reserve and amortize only existing stocks; no arbitrary mobilization timer.
 const stock=Math.max(0,c.grain-use*ECONOMY_RULES.ai.foodReserveDays);
 return Math.max(0,Math.floor(income*10+stock/ECONOMY_RULES.development.stockSupportDays*100-use*100));
}

// Read live battle soldiers, and attribute an away unit to one surviving home city.
// Temporary siege armies replace city units; they must never be billed twice.
export function supportedSoldiers(s,c){
 const rows=c.units.map(u=>({troops:u.troops,wounded:u.wounded}));
 for(const a of s.armies.filter(a=>!a.disbanded&&a.faction===c.owner)){
  const battle=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));
  for(const u of a.units){
   const home=s.cities.find(t=>t.id===(u.homeCity||a.homeCity)&&t.owner===a.faction)||s.cities.find(t=>t.owner===a.faction);
   if(home?.id!==c.id)continue;
   const live=battle?.battle.sides.flatMap(side=>side.units).find(v=>v.id===u.id&&v.armyId===a.id&&!v.retreatDispatched);
   if(battle&&!live)continue;
   rows.push({troops:live?.hp??u.troops,wounded:live?u.wounded+battleWounded(live):u.wounded});
  }
 }
 for(const o of s.campaign.idle.filter(o=>o.faction===c.owner)){
  const home=s.cities.find(t=>t.id===(o.unit.homeCity||o.location)&&t.owner===o.faction)||s.cities.find(t=>t.owner===o.faction);
  if(home?.id===c.id)rows.push({troops:o.unit.troops,wounded:o.unit.wounded});
 }
 return rows.reduce((sum,u)=>({troops:sum.troops+u.troops,wounded:sum.wounded+u.wounded}),{troops:0,wounded:0});
}
export function cityMaintenance(s,c){
 const p=ECONOMY_RULES.maintenance,men=supportedSoldiers(s,c);
 return {gold:Math.ceil((men.troops+men.wounded*p.woundedGoldFactor)*p.goldPerThousandTroops/1000)};
}
export const reserveRecruitmentTarget=(s,c)=>Math.min(ECONOMY_RULES.capacity.manpowerMax,Math.max(ECONOMY_RULES.recruitment.reserveTargetBase,Math.ceil(supportedSoldiers(s,c).troops*ECONOMY_RULES.recruitment.reserveTargetTroopShare)));

// Plan civil staffing against the garrison real military work can replenish,
// rather than assuming opening stocks or temporarily unfilled units last forever.
// Temporary income effects cannot replace a resident food producer.
export function cityNeedsAgriculture(s,c){
 const people=cityPersonnel(s,c.id),supplies=citySupplyBudgets(s);
 // Strategic recruiting initially aims at 4500, but domestic replenishment
 // legally fills the officer's true capacity. Forecast both actual paths.
 const gap=u=>Math.max(0,troopCapacity(u)-u.troops-u.wounded);
 const idle=people.filter(o=>!o.cityUnit&&!o.army&&cityTroopUnlocked(c,o.unit.type)).slice(0,Math.max(0,6-c.units.length));
 const prepared=people.filter(o=>o.cityUnit||o.army).map(o=>o.unit);
 const added=prepared.reduce((n,u)=>n+gap(u),0)+idle.reduce((n,o)=>n+gap(o.unit),0);
 const grain=cityRecurringIncome(s,c).grain;
 return c.hunger>0||(cityDailyFood(s,c,{supplies})+added/100)*10>grain||c.grain<cityDailyFood(s,c,{supplies})*ECONOMY_RULES.ai.foodReserveDays;
}

export function cityNeedsCommerce(s,c){
 const b=cityGoldCommitment(s,c);
 return c.gold<b.total+cityRecurringIncome(s,c).gold;
}
// Voluntary military, diplomacy and transport choices must not take the final
// actually resident economic worker out of a city whose budget needs them.
export function economicStaffingError(s,c,leavingIds){
 const leaving=new Set(leavingIds),jobs=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id);
 if(!jobs.some(a=>leaving.has(a.officerId)&&['agriculture','commerce'].includes(a.direction)))return null;
 const people=cityPersonnel(s,c.id).filter(o=>!o.unit.mission&&!o.unit.scouting);
 for(const [direction,needed,label] of [['agriculture',cityNeedsAgriculture(s,c),'农业'],['commerce',cityNeedsCommerce(s,c),'商业']]){
  if(!needed||!jobs.some(a=>a.direction===direction&&leaving.has(a.officerId)))continue;
  const staying=jobs.some(a=>a.direction===direction&&!leaving.has(a.officerId)&&!plannedOfficer(s,a.officerId)&&!s.campaign.domestic.orders.some(q=>q.officerIds.includes(a.officerId))&&!s.campaign.diplomacy?.assignments.some(q=>q.officerId===a.officerId&&!q.dismissed)&&people.some(o=>o.unit.id===a.officerId));
  if(!staying)return '钱粮预算紧张，保留本城最后一名'+label+'负责人';
 }
 return null;
}
