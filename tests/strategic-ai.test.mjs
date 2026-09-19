import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,roadLength,supplyConnection,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,strategicPower} from '../strategic-ai.mjs';
import {makeOfficer,armyTroops} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
const helpers={roadLength,supplyConnection};
function scene(){
 const s=newCampaign(513,'heroes-251');s.cities.forEach(c=>{c.owner='neutral';c.governor=null;c.project={key:'farm',remaining:1};});s.campaign.idle=[];
 const a=s.armies.find(a=>a.faction==='yuan'),foe=s.armies.find(a=>a.faction==='cao');
 a.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:'ye'}));Object.assign(a,{location:'ye',homeCity:'ye',leader:'shao',advisor:'ju',deputy:'yan',supply:5000,supplyCapacity:6000,stationary:false});
 foe.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:'town-5'}));Object.assign(foe,{location:'town-5',homeCity:'town-5',leader:'cao',advisor:'cao',deputy:'dun',supply:2000,supplyCapacity:3000});
 s.armies=[a,foe];for(const id of ['ye'])s.cities.find(c=>c.id===id).owner='yuan';s.cities.find(c=>c.id==='town-5').owner='cao';
 // Close alternative expansion lanes so each test probes one decision.
 for(const c of s.cities)if(!['ye','town-5'].includes(c.id))c.gateHp=1000000;
 initializeStrategicAI(s);return {s,a,foe};
}
test('advantageous attack retains a real garrison and conserves all men and carried grain',()=>{
 const {s,a}=scene(),men=armyTroops(a),grain=a.supply,capacity=a.supplyCapacity;planStrategicAI(s,helpers);
 assert.equal(a.target,'town-5');const guard=s.armies.find(x=>x.faction==='yuan'&&x!==a);assert.ok(guard?.stationary);assert.ok(armyTroops(guard)>0);assert.equal(armyTroops(a)+armyTroops(guard),men);assert.equal(a.supply+guard.supply,grain);assert.equal(a.supplyCapacity+guard.supplyCapacity,capacity);
 const snapshot=serializeCampaign(s);planStrategicAI(s,helpers);assert.equal(serializeCampaign(s),snapshot,'same-day planning is idempotent');
});
test('AI avoids a superior garrison and strong walls rather than charging the nearest city',()=>{
 const {s,a,foe}=scene();foe.units.forEach(u=>u.troops=7000);s.cities.find(c=>c.id==='town-5').gateHp=27000;planStrategicAI(s,helpers);assert.equal(a.target,null);assert.equal(s.campaign.ai.decisions.find(d=>d.armyId===a.id).kind,'hold');
});
test('a merged city army splits a legal expedition instead of stalling above ten units',()=>{
 const {s,a}=scene(),used=new Set(s.armies.flatMap(a=>a.units.map(u=>u.id)));
 a.units.push(...Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,7).map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:'ye',first:false})));a.supply=10000;a.supplyCapacity=12000;
 const men=armyTroops(a);planStrategicAI(s,helpers);assert.equal(a.target,'town-5');assert.ok(a.units.length<=10);assert.equal(s.armies.filter(a=>a.faction==='yuan').reduce((n,a)=>n+armyTroops(a),0),men);assert.ok(s.armies.some(x=>x!==a&&x.faction==='yuan'&&x.units.length>=3));
});
test('a hostile column approaching home takes priority over expansion',()=>{
 const {s,a,foe}=scene();foe.route=['ye'];foe.target='ye';planStrategicAI(s,helpers);assert.equal(a.target,null);assert.equal(a.task,'守城待援');
});
test('reserve columns reinforce threatened friendly cities through friendly roads',()=>{
 const {s,a,foe}=scene();s.cities.find(c=>c.id==='town-5').owner='yuan';Object.assign(foe,{location:'town-8',route:['town-5'],target:'town-5'});planStrategicAI(s,helpers);assert.equal(a.target,'town-5');assert.equal(s.campaign.ai.decisions.find(d=>d.armyId===a.id).kind,'reinforce');
});

test('columns sharing an AI route consume independent paths before and after JSON reload',()=>{
 const {s,a,foe}=scene(),other={...structuredClone(a),id:`a${s.nextId++}`,units:a.units.splice(3)};
 other.leader=other.units[0].id;other.advisor=other.units[1].id;other.deputy=null;s.armies.push(other);
 s.cities.find(c=>c.id==='town-5').owner='yuan';Object.assign(foe,{location:'town-8',route:['town-5'],target:'town-5'});
 planStrategicAI(s,helpers);assert.equal(a.target,'town-5');assert.equal(other.target,'town-5');
 assert.deepEqual(a.route,other.route);assert.notEqual(a.route,other.route);
 const copy=JSON.parse(serializeCampaign(s)),expected=[...other.route];a.route.shift();copy.armies.find(x=>x.id===a.id).route.shift();
 assert.deepEqual(other.route,expected);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});
test('a hungry army reverses its actual road progress without teleporting home',()=>{
 const {s,a}=scene(),length=roadLength(s,'ye','town-5');Object.assign(a,{hunger:1,supply:0,route:['town-5'],target:'town-5',travel:{from:'ye',to:'town-5',progress:20}});planStrategicAI(s,helpers);
 assert.equal(a.location,'town-5');assert.deepEqual(a.travel,{from:'town-5',to:'ye',progress:length-20});assert.deepEqual(a.route,['ye']);assert.equal(a.target,'ye');
 const returning=structuredClone(a.travel);s.campaign.day++;planStrategicAI(s,helpers);assert.deepEqual(a.travel,returning,'a hungry column must keep retreating, not reverse direction every day');assert.deepEqual(a.route,['ye']);
});
test('a starving merged army splits its retreat into legal marching columns',()=>{
 const {s,a}=scene(),used=new Set(s.armies.flatMap(a=>a.units.map(u=>u.id)));
 a.units.push(...Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,8).map(id=>({...makeOfficer(id,1200,9,3),homeCity:'ye',first:false})));a.location='town-5';a.hunger=2;a.supply=0;
 planStrategicAI(s,helpers);assert.ok(a.route.length);assert.ok(a.units.length<=10);assert.ok(s.armies.filter(x=>x.faction==='yuan').every(x=>!x.route.length||x.units.length<=10));
});
test('a merged wounded roster sends only its live companies as reinforcements',()=>{
 const {s,a,foe}=scene(),used=new Set(s.armies.flatMap(a=>a.units.map(u=>u.id)));
 a.units.slice(2).forEach(u=>{u.troops=0;u.wounded=600;});a.units.push(...Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,23).map(id=>({...makeOfficer(id,0,9,3),homeCity:'ye',first:false,wounded:300})));
 s.cities.find(c=>c.id==='town-5').owner='yuan';Object.assign(foe,{location:'town-8',route:['town-5'],target:'town-5'});planStrategicAI(s,helpers);
 assert.equal(a.units.length,2);assert.equal(a.target,'town-5');assert.ok(s.armies.some(x=>x!==a&&x.faction==='yuan'&&x.units.length===27&&!x.route.length));
});
test('insufficient food or morale causes recovery, and recruitment spends finite local resources once',()=>{
 const {s,a,foe}=scene();a.morale=30;planStrategicAI(s,helpers);assert.equal(a.target,null);assert.equal(s.campaign.ai.decisions.find(d=>d.armyId===a.id).kind,'recover');
 foe.faction='yuan';foe.location='ye';a.units.forEach(u=>u.troops=1000);foe.units.forEach(u=>u.troops=1000);
 const c=s.cities.find(c=>c.id==='ye'),initial={men:s.armies.reduce((n,a)=>n+armyTroops(a),0),gold:s.campaign.ai.treasuries.yuan,grain:c.grain,pop:c.manpower};manageStrategicEconomy(s);
 assert.equal(s.armies.reduce((n,a)=>n+armyTroops(a),0)-initial.men,3000);assert.equal(c.drafted,3000);assert.equal(c.grain,initial.grain-3000);assert.equal(c.manpower,initial.pop-3000);assert.equal(s.campaign.ai.treasuries.yuan,initial.gold-750);
 const snapshot=serializeCampaign(s);manageStrategicEconomy(s);assert.equal(serializeCampaign(s),snapshot);
});
test('both four-faction scenarios use real marching and combat, and AI decisions survive reload',()=>{
 for(const id of ['guandu-200','heroes-251']){const s=newCampaign(643,id);assert.equal(new Set(s.cities.filter(c=>c.owner!=='neutral').map(c=>c.owner)).size,4);beginExecution(s);
  for(let i=0;s.campaign.day<5&&i<30;i++){advanceCampaignDay(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}
  const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(copy.campaign.ai,s.campaign.ai);assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='attack'||d.kind==='stage'));
  for(let i=0;i<2;i++){for(const state of [s,copy]){advanceCampaignDay(state);for(const b of activeBattles(state).filter(b=>b.awaiting))chooseEncounter(state,b.id,false);}}assert.equal(serializeCampaign(copy),serializeCampaign(s));
 }
});
