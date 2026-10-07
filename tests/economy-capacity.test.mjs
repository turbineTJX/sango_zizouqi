import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,cityIncome} from '../strategic-campaign.mjs';
import {ACTIONS,actionCandidates,assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay,cityFoodReserve} from '../domestic.mjs';
import {manageStrategicEconomy} from '../strategic-ai.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';

test('income uses the authoritative economy and applies equally to player and AI ownership',()=>{
 const s=newCampaign(417,'heroes-251'),c=s.cities.find(c=>c.id==='ye');c.governor=null;c.domestic.effects=[];
 const actual=cityIncome(s,c),p=ECONOMY_RULES.income;
 assert.deepEqual(actual,{gold:p.gold.base+c.commerce*p.gold.perCommerce,grain:p.grain.base+c.farm*p.grain.perFarm,manpower:p.manpower.base+c.barracks*p.manpower.perBarracks});
 c.owner='cao';assert.deepEqual(cityIncome(s,c),actual);
 const t=structuredClone(DESIGN_TABLES);t.economy.income.grain.base=-1;assert.ok(validateDesignTables(t).some(x=>x.includes('economy.income.grain')));
});

test('AI replenishment keeps food for existing soldiers and the next turn of new recruits',()=>{
 const s=newCampaign(417,'heroes-251'),c=s.cities.find(c=>c.id==='ye');
 c.units.forEach(u=>{u.troops=4000;u.wounded=0;});c.grain=2600;c.manpower=30000;c.drafted=0;
 const before=c.units.reduce((n,u)=>n+u.troops,0);manageStrategicEconomy(s);
 assert.ok(c.grain>=cityFoodReserve(s,c));assert.ok(c.units.reduce((n,u)=>n+u.troops,0)>=before);
});

test('autonomous recruitment rechecks rations at completion after grain is depleted',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao');fundCities(s,50000);c.grain=20000;
 c.units.forEach(u=>{u.troops=1000;u.wounded=0;});for(const [k,d] of Object.entries(ACTIONS))if(d.direction==='military'&&k!=='recruit')c.domestic.cooldowns[k]=1000;
 assert.equal(assignDomestic(s,c.id,'military',o.unit.id),null);beginDomesticTurn(s);const a=assignmentFor(s,o.unit.id);assert.equal(a.action.key,'recruit');
 c.grain=cityFoodReserve(s,c);const before=c.units.reduce((n,u)=>n+u.troops,0),grain=c.grain;
 for(let i=0;i<12&&a.action;i++){finishDomesticDay(s);s.campaign.day++;}
 assert.equal(c.units.reduce((n,u)=>n+u.troops,0),before);assert.equal(c.grain,grain);assert.equal(c.domestic.reserved,0);
});

test('low food stops autonomous troop replenishment but not gathering unformed reserve resources',()=>{
 const s=newCampaign(417),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao');fundCities(s,50000);
 c.grain=cityFoodReserve(s,c);const a={cityId:c.id,direction:'military',officerId:o.unit.id,lastKey:null,failures:0};
 c.manpower=20000;assert.ok(!actionCandidates(s,a).some(x=>x.key==='recruit'||x.key==='urgent'));
 c.manpower=0;assert.ok(actionCandidates(s,a).some(x=>x.key==='recruit'));
});
