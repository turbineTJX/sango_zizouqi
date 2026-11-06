
import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {factionDirectoryRows,factionDirectoryMarkup,FACTION_DIRECTORIES} from '../faction-directory.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {strategicView} from '../strategic-view.mjs';
import {assignDomestic,assignmentFor} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {pickerReason} from '../strategic-roster.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {factionLord} from '../talent-core.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
test('owned directories restrict scope, search without mutations and expose all fixed entrances',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s);
 assert.deepEqual(factionDirectoryRows(s,'city').map(r=>r.id),s.cities.filter(c=>c.owner==='cao').map(c=>c.id));
 assert.deepEqual(factionDirectoryRows(s,'officer').map(r=>r.id),campaignOfficers(s).map(r=>r.unit.id));
 assert.deepEqual(factionDirectoryRows(s,'army'),[]);
 assert.ok(factionDirectoryMarkup(s,'city',{query:'许昌'}).includes('1 / '));
 const html=strategicView(s,{city:'xuchang'});for(const kind of Object.keys(FACTION_DIRECTORIES))assert.ok(html.includes('data-kind="'+kind+'"'));
 assert.equal(JSON.stringify(s),before);
});
test('battle directory excludes finished and foreign-only battles',()=>{
 const s=newCampaign(203,'guandu-200');s.campaign.battles=[{id:1,name:'己方战场',startedDay:1,battle:{sides:[{faction:'cao'},{faction:'yuan'}]}},{id:2,name:'敌方战场',battle:{sides:[{faction:'liu'},{faction:'yuan'}]}},{id:3,name:'结束',settled:true,battle:{sides:[{faction:'cao'}]}}];
 assert.deepEqual(factionDirectoryRows(s,'battle').map(r=>r.id),[1]);
});

test('appointments distinguish free prepared officers from real work and keep viewing read-only',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang');
 assert.equal(c.governor,'cao');
 const free=cityStaffStatus(s,c).idle.find(o=>o.cityUnit),busy=cityStaffStatus(s,c).idle.find(o=>o.unit.id!==free.unit.id);
 assert.ok(free);assert.ok(busy);assert.equal(assignDomestic(s,c.id,'commerce',busy.unit.id),null);
 const a=assignmentFor(s,busy.unit.id);a.action={key:'build_commerce',remaining:2.5,paused:true,cost:0};
 const before=JSON.stringify(s),rows=campaignOfficers(s);
 assert.equal(rows.find(r=>r.unit.id===free.unit.id).duty,'空闲');
 assert.equal(pickerReason(s,rows.find(r=>r.unit.id===free.unit.id),{task:'domestic',city:c.id,direction:'commerce'}),'');
 assert.match(rows.find(r=>r.unit.id===busy.unit.id).duty,/商业负责人/);
 const html=factionDirectoryMarkup(s,'officer');
 assert.doesNotMatch(html,/data-sort-key="status"|驻城部队/);
 assert.match(html,/data-sort-key="duty"/);assert.match(html,/还需 3 天 · 暂停/);
 assert.match(factionDirectoryMarkup(s,'officer',{query:'空闲'}),new RegExp('data-id="'+free.unit.id+'"'));
 assert.doesNotMatch(factionDirectoryMarkup(s,'officer',{query:'空闲'}),new RegExp('data-id="'+busy.unit.id+'"'));
 assert.equal(JSON.stringify(s),before);
});

test('every scenario starts resident rulers in the actual governor office without changing the local roster',()=>{
 for(const spec of NATIONAL_SCENARIOS){
  const s=newCampaign(203,spec.id);
  for(const c of s.cities.filter(c=>c.owner!=='neutral')){
   const lord=factionLord(s,c.owner),residents=cityPersonnel(s,c.id);
   if(!residents.some(o=>o.unit.id===lord))continue;
   assert.equal(c.governor,lord,spec.name+' '+c.name);
   assert.equal(residents.filter(o=>o.unit.id===lord).length,1);
   assert.ok(!cityStaffStatus(s,c).idle.some(o=>o.unit.id===lord));
  }
 }
});


test('unit directory separates stationed soldiers from an absent commander',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.owner==='cao'&&c.units.length),u=home.units[0];
 u.mission={homeCity:home.id,faction:home.owner,targetCity:'town-26',location:'town-26',route:[],progress:0,phase:'work'};
 const before=JSON.stringify(s),row=factionDirectoryRows(s,'unit').find(r=>r.id===u.id);
 assert.equal(row.place,home.name);assert.match(row.army,/主将外出/);assert.equal(row.troops,u.troops);
 assert.equal(JSON.stringify(s),before);
});
