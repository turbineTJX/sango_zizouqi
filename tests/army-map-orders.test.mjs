import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldCampaign,approachFieldContact} from './helpers/field-campaign.mjs';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {orderCampaignArmy,holdCampaignArmy,beginExecution,advanceCampaignDay,advanceCampaignStep,armyPosition,armyBattle,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {requestStrategicOrder,requestFactionOrder} from '../strategic-orders.mjs';
import {roadDistance} from '../strategic-movement.mjs';
import {mapObjectMenu} from '../map-object-menu.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {armyObservation} from '../strategic-vision.mjs';

function onRoad(){
 const s=fieldCampaign(),a=s.armies[0];
 assert.equal(orderCampaignArmy(s,a.id,'guandu'),null);
 a.travel={from:a.location,to:a.route[0],road:'main',progress:roadDistance(s,a.location,a.route[0])/3};
 return {s,a};
}

test('holding an army preserves its road position, troops and baggage through save and daily execution',()=>{
 const {s,a}=onRoad(),position=armyPosition(s,a),travel=structuredClone(a.travel),units=structuredClone(a.units),supply=a.supply;
 assert.deepEqual(requestStrategicOrder(s,{kind:'hold',armyId:a.id}),{applied:true});
 assert.deepEqual(a.route,[]);assert.equal(a.target,null);assert.equal(a.task,'驻守');
 assert.deepEqual(a.travel,travel);assert.deepEqual(armyPosition(s,a),position);assert.deepEqual(a.units,units);assert.equal(a.supply,supply);
 const resumed=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const world of [s,resumed]){beginExecution(world);advanceCampaignDay(world);}
 assert.equal(serializeCampaign(s),serializeCampaign(resumed));assert.deepEqual(a.travel,travel);assert.deepEqual(armyPosition(s,a),position);
 assert.ok(a.supplyIn>0||a.supply<supply,'normal rations still settle while holding');
});

test('stationary and marching armies share hold eligibility for both controllers and reject failures atomically',()=>{
 const {s,a}=onRoad(),ai=structuredClone(s);
 assert.deepEqual(requestFactionOrder(ai,a.faction,{kind:'hold',armyId:a.id},'now',true),requestStrategicOrder(s,{kind:'hold',armyId:a.id}));
 assert.deepEqual(ai.armies,s.armies);
 a.travel=null;a.location='xuchang';
 assert.equal(holdCampaignArmy(s,a.id),null);assert.deepEqual(a.route,[]);
 for(const change of [world=>world.campaign.phase='executing',world=>world.finished=true,world=>world.armies[0].disbanded=true,world=>world.armies[0].diplomaticTask='test',world=>world.armies[0].diplomaticWithdrawal={route:[]}]){
  const world=structuredClone(s);change(world);const before=serializeCampaign(world);
  assert.ok(requestStrategicOrder(world,{kind:'hold',armyId:a.id}).error);assert.equal(serializeCampaign(world),before);
 }
 const before=serializeCampaign(s);assert.ok(requestFactionOrder(s,'yuan',{kind:'hold',armyId:a.id},'now',true).error);assert.equal(serializeCampaign(s),before);
 const observer=structuredClone(s);observer.campaign.allAI=true;assert.ok(requestStrategicOrder(observer,{kind:'hold',armyId:a.id}).error);
});

test('an AI faction can hold its own marching army through the same order entry without changing player control',()=>{
 const s=fieldCampaign(),a=s.armies[1],viewer=s.campaign.playerFaction;
 assert.equal(orderCampaignArmy(s,a.id,'xuchang','auto',{scheduled:true,faction:a.faction}),null);
 a.travel={from:a.location,to:a.route[0],road:'main',progress:roadDistance(s,a.location,a.route[0])/3};const travel=structuredClone(a.travel);
 assert.deepEqual(requestFactionOrder(s,a.faction,{kind:'hold',armyId:a.id},'now',true),{applied:true});
 beginExecution(s);advanceCampaignDay(s);assert.deepEqual(a.travel,travel);assert.deepEqual(a.route,[]);assert.equal(s.campaign.playerFaction,viewer);
});

test('holding cancels a saved march and a later destination resumes from the same physical position',()=>{
 const {s,a}=onRoad(),from=a.travel.from,to=a.travel.to,travel=structuredClone(a.travel);
 s.campaign.domestic.orders.push({kind:'march',id:s.campaign.domestic.nextId++,faction:a.faction,armyId:a.id,cityId:a.location,officerIds:a.units.map(u=>u.id),target:'guandu',policy:'auto',requestedDay:s.campaign.day,waits:[]});
 assert.deepEqual(requestStrategicOrder(s,{kind:'hold',armyId:a.id}),{applied:true});assert.equal(s.campaign.domestic.orders.length,0);
 const before=serializeCampaign(s);assert.ok(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:'missing'}).error);assert.equal(serializeCampaign(s),before);
 assert.deepEqual(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:to},'now'),{applied:true});assert.deepEqual(a.travel,travel);assert.deepEqual(a.route,[to]);
 assert.deepEqual(requestStrategicOrder(s,{kind:'hold',armyId:a.id}),{applied:true});
 const position=armyPosition(s,a);assert.deepEqual(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:from,reverse:true},'now'),{applied:true});
 const after=armyPosition(s,a);assert.ok(Math.abs(position.x-after.x)<1e-8&&Math.abs(position.y-after.y)<1e-8);assert.deepEqual(a.route,[from]);
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(s))));
});

test('holding on a waterway preserves both ports and cannot turn into a landing shortcut',()=>{
 const s=newCampaign(617,'guandu-200'),a=fieldFromCity(s,'xuchang');
 a.location='town-60';a.units.forEach(u=>u.equipment.ship='ship');
 assert.equal(orderCampaignArmy(s,a.id,'town-71'),null);
 a.travel={from:'town-60',to:'town-71',progress:5,road:'main',terrain:'water'};const travel=structuredClone(a.travel);
 assert.deepEqual(requestStrategicOrder(s,{kind:'hold',armyId:a.id}),{applied:true});assert.deepEqual(a.travel,travel);
 assert.deepEqual(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:'town-24'},'now'),{applied:true});assert.deepEqual(a.travel,travel);assert.equal(a.route[0],'town-71');
 assert.equal(holdCampaignArmy(s,a.id),null);const before=serializeCampaign(s);
 assert.ok(requestStrategicOrder(s,{kind:'march',armyId:a.id,target:'town-23',route:['town-23']},'now').error);assert.equal(serializeCampaign(s),before);
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(s))));
});

test('a holding road army still intercepts a moving enemy and cannot receive new orders during battle',()=>{
 const s=fieldCampaign(),a=s.armies[0],enemy=s.armies[1];
 assert.equal(orderCampaignArmy(s,a.id,enemy.location),null);assert.equal(orderCampaignArmy(s,enemy.id,a.location,'auto',{faction:enemy.faction,scheduled:true}),null);
 approachFieldContact(s,a,enemy);
 enemy.travel.progress+=roadDistance(s,enemy.travel.from,enemy.travel.to)/100;
 assert.equal(holdCampaignArmy(s,a.id),null);beginExecution(s);advanceCampaignStep(s);
 assert.ok(armyBattle(s,a.id));const before=serializeCampaign(s);
 assert.ok(holdCampaignArmy(s,a.id,{scheduled:true}));assert.ok(orderCampaignArmy(s,a.id,'xuchang','auto',{scheduled:true}));assert.equal(serializeCampaign(s),before);
 const planning=structuredClone(s);planning.campaign.phase='planning';
 const html=mapObjectMenu(planning,{kind:'army',id:a.id});
 for(const action of ['campaign-order-hold','campaign-order'])assert.match(html,new RegExp(`<button[^>]*data-action="${action}"[^>]*disabled`));
});

test('map army commands are available only for own noncombat armies during planning',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang'),menu=()=>mapObjectMenu(s,{kind:'army',id:a.id});
 const buttons=html=>[...html.matchAll(/<button[^>]*data-action="(campaign-order(?:-hold)?)"[^>]*>/g)];
 let before=serializeCampaign(s),commands=buttons(menu());assert.equal(commands.length,2);assert.ok(commands.every(b=>!b[0].includes('disabled')));assert.equal(serializeCampaign(s),before);
 s.campaign.phase='executing';commands=buttons(menu());assert.equal(commands.length,2);assert.ok(commands.every(b=>b[0].includes('disabled')));
 a.faction='yuan';assert.equal(buttons(menu()).length,0);
});

test('map markers show held road armies as stationary while visible moving enemies keep their orders hidden',()=>{
 const {s,a}=onRoad(),marker=()=>armyMapMarkers(s,{}).match(new RegExp(`<g[^>]*data-campaign-army="${a.id}"[^>]*>`))[0];
 assert.match(marker(),/data-army-state="marching"/);
 const observed=armyObservation(s,a);assert.deepEqual(observed.route,[]);assert.equal(observed.target,null);assert.equal(observed.task,'行军中');
 assert.equal(holdCampaignArmy(s,a.id),null);assert.match(marker(),/data-army-state="stationed"/);assert.doesNotMatch(marker(),/is-marching/);assert.equal(armyObservation(s,a).task,'驻扎');
});
