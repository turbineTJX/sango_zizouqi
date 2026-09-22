import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,transferOfficer,appointGovernor,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {campaignOfficers,pickerReason} from '../strategic-roster.mjs';
test('personnel census covers every owned officer once and tracks real transfer locations',()=>{
 const s=newCampaign(203,'guandu-200'),rows=campaignOfficers(s);
 const expected=[...s.cities.filter(c=>c.owner==='cao').flatMap(c=>c.units.map(u=>u.id)),...s.armies.filter(a=>a.faction==='cao').flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.filter(o=>o.faction==='cao').map(o=>o.unit.id)];
 assert.equal(rows.length,73);assert.deepEqual(rows.map(r=>r.unit.id).sort(),expected.sort());
 const r=rows.find(r=>r.idle&&r.location==='xuchang'&&r.status==='待命');
 assert.equal(transferOfficer(s,r.unit.id,'chenliu'),null);
 const moved=campaignOfficers(s).find(x=>x.unit.id===r.unit.id);assert.equal(moved.location,null);assert.equal(moved.status,'调任');
 assert.equal(pickerReason(s,moved,{task:'domestic',city:'chenliu',direction:'commerce'}),'调任途中');
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(s))));
});
test('picker allows civil duties alongside prepared units and retains departure restrictions',()=>{
 for(const id of ['guandu-200','heroes-251']){
 const s=newCampaign(5,id),rows=campaignOfficers(s);
 for(const c of s.cities.filter(c=>c.owner==='cao'&&c.kind==='city'))assert.ok(rows.filter(r=>r.idle&&r.location===c.id).length>=3,c.name);
 const p={task:'draft',city:'xuchang'},idle=rows.find(r=>r.idle&&r.location===p.city);
 assert.equal(appointGovernor(s,p.city,idle.unit.id),null);
 assert.equal(pickerReason(s,idle,p),'');
 assert.equal(pickerReason(s,idle,{...p,task:'transfer'}),'须先解除太守');
 const armed=rows.find(r=>r.cityUnit&&r.location===p.city);assert.equal(pickerReason(s,armed,p),'已编制部队');
 assert.equal(pickerReason(s,armed,{...p,task:'domestic',direction:'commerce'}),'');
 assert.equal(pickerReason(s,armed,{...p,task:'governor'}),'');
 s.campaign.phase='executing';assert.equal(pickerReason(s,idle,{...p,task:'domestic'}),'执行期间不可委任');
 }
});
