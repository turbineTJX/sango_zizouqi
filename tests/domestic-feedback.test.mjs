import {campaignDate} from '../national-scenarios.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
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
 for(let i=0;i<ACTIONS[key].days*4&&!pendingDomesticAlerts(s).some(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase));i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const events=pendingDomesticAlerts(s);assert.ok(events.some(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase)));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(pendingDomesticAlerts(restored),events);
 acknowledgeDomesticAlerts(restored,events.map(e=>e.id));assert.equal(pendingDomesticAlerts(validateCampaign(JSON.parse(serializeCampaign(restored)))).length,0);
 assert.ok(!restored.campaign.domestic.events.some(e=>e.phase==='start'&&e.day<Math.floor((restored.campaign.day-1)/10)*10-1));
});


test('rescue completion reports remaining potential loss without claiming an immediate grain credit',()=>{
 let reported=0;
 for(const kind of ['disaster','mold'])for(const seed of [1,2,3]){
  const s=peacefulCities(newCampaign(seed)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);
  const u=cityStaffStatus(s,c).idle[0].unit,key=Object.keys(ACTIONS).find(k=>ACTIONS[k].kind==='rescue'&&ACTIONS[k].value===kind);
  c.domestic.opportunities.push({kind,expires:20,amount:601,saved:.25});
  for(const [k,d]of Object.entries(ACTIONS))if(d.direction===ACTIONS[key].direction&&k!==key)c.domestic.cooldowns[k]=1000;
  assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,u.id),null);beginExecution(s);
  assert.equal(s.campaign.domestic.assignments.find(a=>a.officerId===u.id).action.key,key);
  let event;
  for(let i=0;i<8&&!event;i++){advanceCampaignDay(s);event=s.campaign.domestic.events.find(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase));}
  assert.ok(event);
  if(event.result.factor>0){
   const hazard=c.domestic.opportunities.find(e=>e.kind===kind),after=Math.floor(601*(1-hazard.saved));
   assert.ok(event.text.includes(`预计损失上限450→${after}粮`));assert.match(event.text,/结束时按实际库存结算/);
   assert.equal(event.result.actual,0);assert.equal(event.result.resourceCredit,undefined);reported++;
  }else assert.match(event.text,/未挽回额外损失/);
 }
 assert.ok(reported>0);
});


test('replenishment feedback names only actual recipients and reports zero when they leave',()=>{
 let multiple=false;
 for(const departed of [false,true])for(const seed of [1,2,3,4]){
  const s=peacefulCities(newCampaign(seed)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);c.manpower=20000;c.grain=200000;
  c.units.forEach((u,i)=>{u.wounded=0;u.troops=troopCapacity(u)-(i<2?800:0);});
  const u=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao').unit;
  for(const [k,d]of Object.entries(ACTIONS))if(d.direction===ACTIONS.recruit.direction&&k!=='recruit')c.domestic.cooldowns[k]=1000;
  assert.equal(assignDomestic(s,c.id,ACTIONS.recruit.direction,u.id),null);beginExecution(s);
  const a=s.campaign.domestic.assignments.find(a=>a.officerId===u.id);assert.equal(a.action.key,'recruit');assert.equal(a.action.recruitMode,'replenish');
  const recipients=[...c.units],before=new Map(recipients.map(v=>[v.id,v.troops]));
  if(departed){const other=s.cities.find(v=>v.id==='chenliu');other.units.push(...c.units);c.units=[];}
  let event;
  for(let i=0;i<10&&!event;i++){advanceCampaignDay(s);event=s.campaign.domestic.events.find(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase));}
  assert.ok(event);const changed=recipients.filter(v=>v.troops>before.get(v.id));
  assert.equal(event.result.actual,recipients.reduce((sum,v)=>sum+v.troops-before.get(v.id),0));
  if(event.result.actual){
   assert.match(event.text,new RegExp('补入'+event.result.actual+'人'));
   for(const v of changed)assert.ok(event.text.includes(`${v.name}部队+${v.troops-before.get(v.id)}人`));
   for(const v of recipients.filter(v=>!changed.includes(v)))assert.ok(!event.text.includes(v.name+'部队+'));
   multiple||=changed.length>1;
  }else assert.match(event.text,/未补入兵员，预备兵未消耗/);
  if(departed)assert.equal(event.result.actual,0);
  assert.doesNotMatch(event.text,/具体部队/);assert.match(event.text,/退回未使用费用/);
 }
 assert.ok(multiple,'exercise a real result spanning multiple recipients');
});


test('completed construction discounts report the saved amount and actual expiry',()=>{
 let successes=0;
 for(const seed of [7,11,13]){
  const s=peacefulCities(newCampaign(seed)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);c.grain=200000;
  const u=[...c.units,...s.campaign.idle.filter(o=>o.location===c.id).map(o=>o.unit)].filter(u=>u.id!==c.governor).sort((a,b)=>b.leadership-a.leadership)[0];
  for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='military'&&k!=='labor')c.domestic.cooldowns[k]=1000;
  assert.equal(assignDomestic(s,c.id,'military',u.id),null);beginExecution(s);
  assert.equal(s.campaign.domestic.assignments.find(a=>a.officerId===u.id).action.key,'labor');
  let event;
  for(let i=0;i<10&&!event;i++){advanceCampaignDay(s);event=s.campaign.domestic.events.find(e=>e.officerId===u.id&&['complete','failure'].includes(e.phase));}
  assert.ok(event);
  const saved=c.domestic.effects.find(e=>e.key==='discount:military');
  if(saved){successes++;assert.ok(event.text.includes(`优惠${Number((saved.amount*100).toFixed(2))}%`));assert.ok(event.text.includes(campaignDate(s,{day:saved.untilTurn*10})));assert.match(event.text,/限开工抵扣一次/);assert.match(event.text,/逾期失效/);}
  else assert.match(event.text,/未达成合作/);
 }
 assert.ok(successes>0);
});
