import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseArmyManagement,chooseArmyMarchMode,armyManagementFacts,manageArmyManagementAI} from '../strategic-management-ai.mjs';
import {newCampaign,setArmyMarchMode,serializeCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {makeOfficer} from '../engine.mjs';

const march=(overrides={})=>({id:'a',mode:'normal',modeEditable:true,moving:true,home:true,safe:true,modes:['normal','light','forced'],days:4,forcedDays:3,forcedAvailableDays:7,food:20,supply:100,capacity:200,hunger:0,morale:70,forcedMinimum:40,restUntil:0,lightCapacity:.5,...overrides});
const facts={day:10,maxUnits:10};
test('management capacity counts zero-strength officers so it skips impossible remnant merges',()=>{
 const army=(id,n,live)=>({id,location:'home',editable:true,mode:'normal',unitIds:Array.from({length:n},(_,i)=>id+i),liveIds:Array.from({length:live},(_,i)=>id+i),roles:{},currentRoles:{}});
 const a=army('a',6,1),b=army('b',5,1),c=army('c',2,2);
 const choice=chooseArmyManagement({...facts,armies:[a,b,c]});
 assert.ok(choice);const into=[a,b,c].find(a=>a.id===choice.armyId),from=[a,b,c].find(a=>a.id===choice.target);
 assert.ok(into.unitIds.length+from.unitIds.length<=10);
 assert.equal(chooseArmyManagement({...facts,armies:[a,b]}),null);
});
test('march AI restores full baggage at home after arrival or a changed unsafe route',()=>{
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',moving:false})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',safe:false})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',supply:30})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',modes:['normal']})), 'normal');
});
test('march AI never attempts baggage exchange in transit and respects battle locks',()=>{
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',home:false,safe:false})), 'light');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'light',moving:false,modeEditable:false})), 'light');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'normal',home:false,modes:['normal','light']})), 'normal');
});
test('forced march needs a real arrival improvement and enough food for the shorter journey',()=>{
 assert.equal(chooseArmyMarchMode(facts,march({modes:['normal','forced'],days:1,forcedDays:1,supply:40})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({modes:['normal','forced'],supply:20})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({modes:['normal','forced'],forcedAvailableDays:2})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({modes:['normal','forced']})), 'forced');
});
test('forced march cannot bypass hunger morale recovery or commander qualifications',()=>{
 for(const override of [{hunger:1},{morale:39},{restUntil:11},{modes:['normal']}])assert.equal(chooseArmyMarchMode(facts,march(override)), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'forced',moving:false})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({mode:'forced',hunger:1})), 'normal');
});
test('light march uses only friendly routes whose reduced baggage covers food and reserve',()=>{
 assert.equal(chooseArmyMarchMode(facts,march({supply:120,capacity:240})), 'light');
 assert.equal(chooseArmyMarchMode(facts,march({safe:false,modes:['normal','light']})), 'normal');
 assert.equal(chooseArmyMarchMode(facts,march({capacity:160,modes:['normal','light']})), 'normal');
});
test('background AI restores a real arrived light column through the paid shared baggage handler',()=>{
 const s=newCampaign(341,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='xuchang');
 // A valid trait holder placed here is a mechanism fixture, not a campaign edit.
 const id='person-482';for(const city of s.cities)city.units=city.units.filter(u=>u.id!==id);
 s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
 c.units.push({...makeOfficer(id,2000),homeCity:c.id});const a=fieldFromCity(s,c.id,{ids:[id]});
 assert.equal(setArmyMarchMode(s,a.id,'light',{faction:'cao',scheduled:true}),null);
 const food=c.grain+a.supply,capacity=a.fullSupplyCapacity,men=a.units.reduce((n,u)=>n+u.troops+u.wounded,0),rng=s.seed;
 manageArmyManagementAI(s);assert.equal(a.marchMode,'normal');assert.equal(a.supplyCapacity,capacity);
 assert.equal(c.grain+a.supply,food);assert.equal(a.units.reduce((n,u)=>n+u.troops+u.wounded,0),men);assert.equal(s.seed,rng);
});
test('march measurements are read only and expose actual shorter journey and morale limits',()=>{
 const s=newCampaign(341,'guandu-200','cao',{allAI:true}),a=fieldFromCity(s,'xuchang');a.route=[s.roads.find(e=>e.includes(a.location)).find(id=>id!==a.location)];
 const before=serializeCampaign(s),input=armyManagementFacts(s,'cao'),row=input.armies.find(x=>x.id===a.id);
 assert.equal(serializeCampaign(s),before);assert.ok(Object.isFrozen(row));assert.ok(Number.isFinite(row.days));
 assert.ok(Object.hasOwn(row,'forcedDays'));assert.ok(Object.hasOwn(row,'forcedAvailableDays'));
 assert.equal(Object.hasOwn(input,'seed'),false);
});
