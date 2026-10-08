import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,settleCityEconomy,changeCityTroop,equipCityUnit,recruitLocalUnits,transferOfficer,validateCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {cityBudget,updateCityBudgetAlerts,setCityBudget,citySoldierCounts,citySoldierLabel} from '../city-budget.mjs';
import {addCityGold,syncResourceTotals,factionGold} from '../city-resources.mjs';
import {advancePersonnel,isTransport} from '../personnel-movement.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';
import {prepareCommandFormation,newCommand} from '../strategic-command.mjs';
import {diplomaticResources,lordCity} from '../diplomacy.mjs';
import {trainingCost} from '../troop-training.mjs';
import {cityReserve} from '../talent-core.mjs';
const town=(s,id)=>s.cities.find(c=>c.id===id);
const setup=()=>{const s=newCampaign(41),c=town(s,'xuchang'),other=town(s,'chenliu');return {s,c,other};};

test('income credits its own city; faction totals are only a projection',()=>{
 const {s,c,other}=setup(),before=c.gold,untouched=other.gold,total=s.gold;
 settleCityEconomy(s,c,{income:{gold:370,grain:420,manpower:35}});
 assert.equal(c.gold,before+370);assert.equal(other.gold,untouched);assert.equal(s.gold,total+370);assert.equal(factionGold(s,'cao'),s.gold);
});
test('a wealthy friendly city cannot pay local training, troop or equipment fees',()=>{
 const {s,c,other}=setup();c.gold=0;other.gold=100000;syncResourceTotals(s);
 const u=c.units[0];c.domestic.techs.push('militaryRegistry','baier');
 assert.match(changeCityTroop(s,c.id,u.id,'baier'),/费用不足/);
 assert.match(equipCityUnit(s,c.id,u.id,{siege:'ram',ship:null}),/费用不足/);
 u.troops=1000;c.manpower=9000;c.drafted=0;
 assert.match(recruitLocalUnits(s,c,[u.id],{cap:2000}),/金|费用|补充/);assert.equal(u.troops,1000);assert.equal(other.gold,100000);
});
test('city gold transfers leave the source now and reach the target along real roads',()=>{
 const {s,c,other}=setup(),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner),from=c.gold,to=other.gold;
 s.armies=[];assert.equal(transferOfficer(s,o.unit.id,other.id,{cargo:{gold:800,grain:0,manpower:0}}),null);
 assert.equal(c.gold,from-800);assert.equal(other.gold,to);assert.equal(o.cargo.gold,800);assert.equal(isTransport(o),true);
 for(let i=0;i<20&&o.destination;i++)advancePersonnel(s,o);
 assert.equal(o.destination,null);assert.equal(other.gold,to+800);assert.equal(c.gold,from-800);assert.equal(s.gold,from+to);
 assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
});
test('insufficient gold transport is atomic',()=>{
 const {s,c,other}=setup(),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner),before=serializeCampaign(s);
 assert.match(transferOfficer(s,o.unit.id,other.id,{cargo:{gold:c.gold+1,grain:0,manpower:0}}),/不足/);
 assert.equal(serializeCampaign(s),before);
});
test('money cargo intercepted in transit is lost without crediting another city',()=>{
 const {s,c,other}=setup(),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner),to=other.gold;
 assert.equal(transferOfficer(s,o.unit.id,other.id,{cargo:{gold:500,grain:0,manpower:0}}),null);
 const enemy={id:'enemy',faction:'yuan',units:town(s,'ye').units.slice(0,1),disbanded:false,route:[],cooldownDay:0};enemy.location=c.id;enemy.faction='yuan';enemy.travel=null;s.armies=[enemy];
 advancePersonnel(s,o);assert.equal(other.gold,to);assert.ok(s.campaign.personnelEvents.some(e=>e.kind==='TRANSPORT_LOST'||e.type==='TRANSPORT_LOST'));
});
test('a positive end-of-turn forecast still warns of food exhaustion before harvest',()=>{
 const {s,c}=setup();c.units=c.units.slice(0,1);c.units[0].troops=1000;c.units[0].wounded=0;c.grain=50;c.budget.grainReserve=0;s.armies=[];
 const b=cityBudget(s,c);assert.ok(b.projected.grain>0);assert.equal(b.beforeHarvest.grain,-50);assert.equal(b.shortages.grain,50);assert.equal(b.daysSupply,5);
});
test('forecasts exclude cargo in transit and already paid domestic costs',()=>{
 const {s,c}=setup();s.campaign.idle[0].cargo={gold:5000,grain:5000,manpower:0};s.campaign.idle[0].destination=c.id;
 const b=cityBudget(s,c);assert.equal(b.stocks.gold,c.gold);assert.equal(b.stocks.grain,c.grain);assert.equal(b.costs.gold,0);
});
test('local reserves produce reports once, persist across saves, and warn again after recovery',()=>{
 const {s,c}=setup();c.gold=0;syncResourceTotals(s);updateCityBudgetAlerts(s);
 const alerts=()=>pendingActivityReports(s).filter(n=>n.phase==='budget-warning');assert.equal(alerts().length,1);
 updateCityBudgetAlerts(s);assert.equal(alerts().length,1);acknowledgeActivityReports(s,alerts().map(n=>n.id));
 const raw=serializeCampaign(s),restored=validateCampaign(JSON.parse(raw));updateCityBudgetAlerts(restored);assert.equal(pendingActivityReports(restored).filter(n=>n.phase==='budget-warning').length,0);
 addCityGold(s,c,5000);updateCityBudgetAlerts(s);assert.equal(c.budget.warning,'');addCityGold(s,c,-5000);updateCityBudgetAlerts(s);assert.equal(alerts().length,1);assert.equal(c.budget.warningSequence,2);
});
test('deferred debts use their bound city and subtract only the unpaid, unfunded remainder',()=>{
 const {s,c,other}=setup();s.campaign.day=10;c.gold=1200;
 s.campaign.diplomacy.contracts.push({status:'signed',sites:{cao:c.id},clauses:[{id:1,kind:'gold',deferred:true,from:'cao',status:'waiting',dueDay:12,amount:1000,delivered:100}],escrow:[{clauseId:1,amount:200}]});
 const b=cityBudget(s,c);assert.equal(b.debt,700);assert.equal(b.costs.gold,700);assert.equal(b.beforeHarvest.gold,700);assert.equal(cityBudget(s,other).debt,0);
});
test('queued local shipments and diplomatic promises reserve distinct stocks without a debit',()=>{
 const {s,c}=setup(),gold=c.gold,grain=c.grain;
 s.campaign.domestic.orders.push({kind:'transfer',faction:'cao',cityId:c.id,officerIds:[],cargo:{gold:400,grain:600,manpower:0}});
 s.campaign.diplomacy.proposals.push({id:1,status:'outbound',sites:{cao:c.id},clauses:[{kind:'grain',from:'cao',amount:900}]});
 const b=cityBudget(s,c);assert.equal(b.reserve.grain,1500);assert.equal(b.cargo,400);assert.equal(cityReserve(s,c),900);assert.equal(c.gold,gold);assert.equal(c.grain,grain);
});
test('exactly funded equipment training does not lose a soldier to decimal rounding',()=>{
 const {s,c}=setup(),u=c.units[0];assert.equal(changeCityTroop(s,c.id,u.id,'halberd'),null);s.armies=[];u.troops=0;u.wounded=0;u.equipment={siege:'tower',ship:'ship'};c.water=true;c.domestic.techs.push('efficientConstruction','siegeEngineering');c.manpower=5000;c.drafted=0;c.gold=trainingCost(u,2000);syncResourceTotals(s);
 assert.equal(recruitLocalUnits(s,c,[u.id],{cap:2000}),null);assert.equal(u.troops,2000);assert.equal(c.gold,0);
});
test('food warnings escalate at three days without daily repeated alerts',()=>{
 const {s,c}=setup();s.armies=[];c.grain=1000;updateCityBudgetAlerts(s);const seq=c.budget.warningSequence;
 updateCityBudgetAlerts(s);assert.equal(c.budget.warningSequence,seq);c.grain=10;updateCityBudgetAlerts(s);assert.equal(c.budget.warning,'grain-critical');assert.equal(c.budget.warningSequence,seq+1);
});
test('budget settings are local, validated and do not spend resources',()=>{
 const {s,c,other}=setup(),gold=c.gold;
 assert.equal(setCityBudget(s,c.id,'goldReserve',1800),null);assert.equal(c.budget.goldReserve,1800);assert.equal(other.budget.goldReserve,500);assert.equal(c.gold,gold);
 assert.ok(setCityBudget(s,c.id,'grainReserve',-1));assert.ok(setCityBudget(s,town(s,'ye').id,'goldReserve',100));
 const before=serializeCampaign(s);assert.match(cityDomesticMarkup(s,c.id),/钱粮预算/);assert.equal(serializeCampaign(s),before);
});
test('city soldier labels count live garrison plus reserve soldiers and omit unknown intelligence',()=>{
 const {s,c}=setup();c.units=c.units.slice(0,1);c.units[0].troops=3000;c.units[0].wounded=500;c.manpower=7000;s.armies=[];
 assert.deepEqual(citySoldierCounts(s,c),{troops:3000,total:10000});assert.match(citySoldierLabel(s,c),/3,000 \/ 10,000/);assert.equal(citySoldierLabel(s,{...c,manpower:null}),'');
});
test('city formation preview charges only local gold and leaves the live world untouched',()=>{
 const {s,c,other}=setup();c.gold=10000;syncResourceTotals(s);const p=newCommand(s,'draft',c.id);const u=c.units[0];
 p.selected=[u.id];p.types[u.id]=u.type;p.equipment[u.id]=structuredClone(u.equipment);p.troops[u.id]=u.troops+100;
 const before=serializeCampaign(s),preview=prepareCommandFormation(s,p);assert.equal(preview.error,undefined);assert.equal(preview.gold,trainingCost(u,100));assert.equal(town(preview.state,other.id).gold,other.gold);assert.equal(serializeCampaign(s),before);
});
test('diplomatic offers cannot pledge money stored outside the bound ruler city',()=>{
 const s=newCampaign(281,'guandu-200'),c=lordCity(s,'cao'),other=s.cities.find(t=>t.owner==='cao'&&t.id!==c.id);
 c.gold=0;other.gold=100000;syncResourceTotals(s);assert.equal(diplomaticResources(s,'cao').gold,0);assert.equal(diplomaticResources(s,'cao',other.id).city.id,other.id);
});
