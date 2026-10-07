import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts,cityStaffBadge} from '../domestic-feedback.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
test('staff counts prepared residents, distinct directions, and excludes actual duties and travel',()=>{
 const s=newCampaign(81),c=s.cities.find(c=>c.id==='xuchang'),people=cityPersonnel(s,c.id),before=cityStaffStatus(s,c);
 const chosen=before.idle[0];assert.ok(chosen);assert.ok(before.idle.some(o=>c.units.includes(o.unit)));
 assert.equal(assignDomestic(s,c.id,'commerce',chosen.unit.id),null);
 assert.equal(cityStaffStatus(s,c).filled,1);assert.equal(cityStaffStatus(s,c).idle.length,before.idle.length-1);
 const second=cityStaffStatus(s,c).idle[0];assignDomestic(s,c.id,'commerce',second.unit.id);assert.equal(cityStaffStatus(s,c).filled,1);
 const third=cityStaffStatus(s,c).idle[0];c.governor=third.unit.id;assert.ok(!cityStaffStatus(s,c).idle.includes(third));
 const fourth=cityStaffStatus(s,c).idle[0];fourth.unit.mission={};assert.ok(!cityStaffStatus(s,c).idle.some(o=>o.unit.id===fourth.unit.id));
 assert.equal(cityStaffBadge(s,s.cities.find(c=>c.owner!=='cao')),'');assert.ok(people.length>0);
});
test('real domestic completion produces a persistent report, acknowledgement prevents replay',()=>{
 const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);
 const u=cityStaffStatus(s,c).idle[0].unit;
 const key=Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='build'&&ACTIONS[k].direction==='commerce');
 for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='commerce'&&k!==key)c.domestic.cooldowns[k]=1000;
 assignDomestic(s,c.id,'commerce',u.id);beginExecution(s);
 for(let i=0;i<35&&!pendingDomesticAlerts(s).some(e=>e.officerId===u.id);i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const events=pendingDomesticAlerts(s);assert.ok(events.some(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase)));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(pendingDomesticAlerts(restored),events);
 acknowledgeDomesticAlerts(restored,events.map(e=>e.id));assert.equal(pendingDomesticAlerts(validateCampaign(JSON.parse(serializeCampaign(restored)))).length,0);
 assert.ok(restored.campaign.domestic.events.some(e=>e.phase==='start'&&!e.important));
});
