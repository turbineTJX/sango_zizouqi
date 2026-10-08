import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,cityIncome,settleCityEconomy,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {cityBaseIncome,cityIncomeBreakdown} from '../economy.mjs';
import {assignDomestic,ACTIONS,finishDomesticDay} from '../domestic.mjs';
import {compareConstruction} from '../scripts/economy-balance-lib.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';
import {cityPersonnel} from '../city-personnel.mjs';

test('built facilities retain their base production while a governor only adds operating income',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),base=cityBaseIncome(s,c);c.governor=cityPersonnel(s,c.id).sort((a,b)=>b.unit.politics-a.unit.politics)[0].unit.id;const withGovernor=cityIncomeBreakdown(s,c);
 assert.ok(withGovernor.governor.gold>0);
 assert.deepEqual(withGovernor.base,base);assert.deepEqual(withGovernor.recurring,cityIncome(s,c));
 c.governor=null;const vacant=cityIncomeBreakdown(s,c);
 assert.deepEqual(cityBaseIncome(s,c),base);assert.deepEqual(vacant.operations,{gold:0,grain:0,manpower:0});assert.deepEqual(vacant.total,base);
 c.domestic.effects.push({key:'grain',amount:.3,untilTurn:3});const managed=cityIncomeBreakdown(s,c);
 assert.deepEqual(managed.base,base);assert.ok(managed.management.grain>0);assert.equal(managed.management.gold,0);
 s.campaign.day=31;assert.equal(cityIncomeBreakdown(s,c).management.grain,0);assert.deepEqual(cityBaseIncome(s,c),base);
});

test('actual operation is accounted separately and monthly settlement never pays its result twice',()=>{
 const s=newCampaign(31),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.faction===c.owner&&o.location===c.id);fundCities(s,30000);c.governor=null;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=10000;
 const base=cityBaseIncome(s,c);assert.equal(assignDomestic(s,c.id,'commerce',o.unit.id),null);assert.equal(beginExecution(s),null);
 for(let day=1;day<10;day++)advanceCampaignDay(s);
 assert.equal(s.campaign.day,10);finishDomesticDay(s);
 const result=cityIncomeBreakdown(s,c);assert.ok(result.work.gold>0);assert.deepEqual(result.base,base);
 assert.equal(result.operations.gold,result.work.gold);assert.equal(result.total.gold,base.gold+result.work.gold);
 const paid=structuredClone(s),paidCity=paid.cities.find(t=>t.id===c.id),gold=paid.gold;settleCityEconomy(paid,paidCity);assert.equal(paid.gold-gold,base.gold);
 const saved=serializeCampaign(s);assert.match(cityDomesticMarkup(s,c.id),/城市建设基础／旬/);assert.match(cityDomesticMarkup(s,c.id),/本旬直接运营已入库/);assert.equal(serializeCampaign(s),saved);
 const beforeSettlement=s.gold,expected=s.cities.filter(t=>t.owner===s.campaign.playerFaction).reduce((n,t)=>n+cityIncome(s,t).gold,0);advanceCampaignDay(s);
 assert.equal(s.gold-beforeSettlement,expected);assert.equal(s.campaign.day,11);assert.equal(cityIncomeBreakdown(s,c).work.gold,0);assert.deepEqual(cityBaseIncome(s,c),base);
 const completed=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(completed))),completed);
});

test('economic construction efficiency includes actual delays, labor, net cost and permanent base gain',()=>{
 const result=compareConstruction(Array.from({length:32},(_,i)=>9001+i*137));
 for(const row of result){
  assert.ok(row.efficiencySpread<.1,JSON.stringify(row));assert.ok(row.costEfficiencySpread<.1,JSON.stringify(row));
  for(const c of row.commands)for(const r of c.runs){
   assert.ok(r.days>=r.nominalDays);assert.equal(r.charged,500);assert.equal(r.spent+r.refund,r.charged);
   assert.ok(r.baseValue>99&&r.baseValue<101);assert.ok(r.spent>0);
  }
 }
 assert.ok(result.flatMap(r=>r.commands.flatMap(c=>c.runs)).some(r=>r.days>r.nominalDays),'include real construction setbacks');
 assert.ok(result[2].commands[0].meanValuePerOfficerDay>result[0].commands[0].meanValuePerOfficerDay);
});

test('all twelve building types have comparable engineering speed under equal relevant ability and real demand',()=>{
 const seeds=[...Array.from({length:16},(_,i)=>417+i*83),...Array.from({length:32},(_,i)=>9001+i*137)],result=compareConstruction(seeds,{allBuildings:true});
 for(const row of result){assert.equal(row.commands.length,12);assert.ok(row.engineeringSpread<.1,JSON.stringify(row));}
});
