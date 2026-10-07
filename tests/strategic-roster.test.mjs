import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,transferOfficer,appointGovernor,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {campaignOfficers,pickerReason,cityRosterMarkup,campaignRosterMarkup} from '../strategic-roster.mjs';
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


test('city roster has a fixed local population and independent city context',()=>{
 const s=newCampaign(203,'guandu-200'),all=campaignOfficers(s),local=all.filter(r=>r.location==='xuchang');
 const html=cityRosterMarkup(s,{personnel:{city:'chenliu'}},'xuchang');
 assert.ok(html.includes('许昌 · 武将 '+local.length+' 人'));
 assert.ok(!html.includes('全部据点'));assert.ok(!html.includes('麾下武将'));
 for(const r of all)assert.equal(html.includes('data-officer="'+r.unit.id+'"'),r.location==='xuchang');
 const empty=cityRosterMarkup(s,{personnel:{}},'missing');assert.ok(empty.includes('显示 0 / 0 人'));
 const global=campaignRosterMarkup(s,{personnel:{}});assert.ok(global.includes('麾下武将 '+all.length+' 人'));assert.ok(global.includes('全部据点'));
});

 test('siege preparation is optional and hidden when all residents are compiled',async()=>{
 const {canPrepareSiegeDefense}=await import('../strategic-roster.mjs');
 const s=newCampaign(203,'guandu-200'),r={id:'pending-defense',kind:'siege',cityId:'xuchang',awaiting:true,settled:false};
 assert.equal(canPrepareSiegeDefense(s,r),true);
 const before=serializeCampaign(s);canPrepareSiegeDefense(s,r);assert.equal(serializeCampaign(s),before);
 s.campaign.idle=s.campaign.idle.filter(o=>o.location!=='xuchang');
 assert.equal(canPrepareSiegeDefense(s,r),false);
 r.awaiting=false;assert.equal(canPrepareSiegeDefense(s,r),false);
 });
