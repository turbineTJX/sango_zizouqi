import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,dailySupply,dailyConsumption,splitCampaignArmy,setArmyMarchMode,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {localFoodUse,forecastArmySupply} from '../city-logistics.mjs';
import {allocateSupply} from '../army-supply.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {makeOfficer} from '../engine.mjs';

test('actual city and army rations are whole units and forecasts settle the same grain',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='xuchang');
 c.units[0].troops=1234;c.units[0].wounded=3;
 const need=localFoodUse(c),expected=Math.ceil(c.units.reduce((n,u)=>n+u.troops/100+u.wounded/200,0)),before=c.grain;
 assert.equal(need,expected);dailySupply(s);assert.equal(before-c.grain,expected);
 const a=fieldFromCity(s,'ye');a.units[0].troops=1234;a.units[0].wounded=3;
 assert.ok(Number.isSafeInteger(dailyConsumption(s,a)));
 const forecast=forecastArmySupply(s),stock=new Map(s.cities.map(c=>[c.id,c.grain]));dailySupply(s);
 assert.equal(s.armies.find(x=>x.id===a.id).supply,forecast.armies.find(x=>x.army.id===a.id).stocks[0]);
 for(const city of s.cities){assert.ok(Number.isSafeInteger(city.grain));assert.ok(stock.get(city.id)>=city.grain);}
 validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('fractional supply rates move only whole grain without inventing stock or road capacity',()=>{
 const a={supply:0,supplyCapacity:20},link={source:'home',path:['home','front'],roads:['main'],rate:7.9},budgets=new Map([['home',20]]),edges=new Map();
 assert.equal(allocateSupply(a,link,20,budgets,edges),7);assert.equal(budgets.get('home'),13);assert.equal([...edges.values()][0],7);
});
test('splitting an odd food stock preserves integer shares and their exact total',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),a=fieldFromCity(s,'ye');assert.ok(a.units.length>=3);a.supply=1000;
 assert.equal(splitCampaignArmy(s,a.id,[a.units[0].id],{faction:'yuan',scheduled:true}),null);
 const armies=s.armies.filter(x=>x.faction==='yuan');assert.equal(armies.reduce((n,a)=>n+a.supply,0),1000);assert.ok(armies.every(a=>Number.isSafeInteger(a.supply)));
 validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('light baggage floors odd capacity and returns whole grain while conserving the warehouse total',()=>{
 const s=newCampaign(343,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.id==='xuchang'),id='person-482';
 for(const city of s.cities)city.units=city.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
 c.units.push({...makeOfficer(id,2000),homeCity:c.id});const a=fieldFromCity(s,c.id,{ids:[id]});a.supplyCapacity=901;a.supply=700;
 const total=c.grain+a.supply;assert.equal(setArmyMarchMode(s,a.id,'light',{faction:'cao',scheduled:true}),null);
 assert.equal(a.supplyCapacity,450);assert.equal(a.supply,450);assert.equal(c.grain+a.supply,total);validateCampaign(JSON.parse(serializeCampaign(s)));
 assert.equal(setArmyMarchMode(s,a.id,'normal',{faction:'cao',scheduled:true}),null);assert.equal(a.supplyCapacity,901);assert.equal(c.grain+a.supply,total);
});
test('save validation rejects fractional physical stocks instead of silently rounding the save',()=>{
 const base=newCampaign(343,'guandu-200','cao',{allAI:true});
 for(const key of ['gold','grain','manpower']){const s=structuredClone(base);s.cities[0][key]+=.5;assert.throws(()=>validateCampaign(JSON.parse(serializeCampaign(s))),/资源须为非负整数/);}
 const s=structuredClone(base),a=fieldFromCity(s,'ye');a.supply+=.5;assert.throws(()=>validateCampaign(JSON.parse(serializeCampaign(s))),/粮草无效/);
});
