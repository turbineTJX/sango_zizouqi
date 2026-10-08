import {beginDomesticTurn,assignmentFor} from '../domestic.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,assignDomestic} from './helpers/auto-domestic-campaign.mjs';
import {campaignOfficers,pickerReason} from '../strategic-roster.mjs';
import {changeCommandUnit,removeCommandUnit,newCommand,prepareCommandFormation,commandCanAdvance,commandRoute,commandMarkup,commandSteps} from '../strategic-command.mjs';
test('inline city roster edits enlist existing units and validate the same allocation on a copy',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0],p=newCommand(s,'draft',c.id),before=serializeCampaign(s);
 assert.equal(changeCommandUnit(s,p,u.id,'troops',1000),null);
 assert.equal(changeCommandUnit(s,p,u.id,'type','spear'),null);
 assert.deepEqual(p.selected,[u.id]);assert.deepEqual(p.formationPool,[u.id]);
 const result=prepareCommandFormation(s,p);assert.equal(result.error,undefined);
 const after=result.state.cities.find(c=>c.id===p.city).units.find(x=>x.id===u.id);
 assert.equal(after.troops,1000);assert.equal(after.type,'spear');assert.equal(result.state.cities.find(x=>x.id===p.city).manpower,c.manpower+u.troops-1000);
 assert.equal(serializeCampaign(s),before);assert.ok(commandCanAdvance(s,p));
 for(const troops of [999,1000.5,999999]){changeCommandUnit(s,p,u.id,'troops',troops);assert.ok(prepareCommandFormation(s,p).error);assert.ok(!commandCanAdvance(s,p));assert.equal(serializeCampaign(s),before);}
});
test('formation preview preserves source, learning and domestic appointments; final copy is a valid save',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang');
 const row=campaignOfficers(s).find(r=>!pickerReason(s,r,p));p.selected=[row.unit.id];
 assert.equal(assignDomestic(s,p.city,'commerce',row.unit.id),null);
 const original=serializeCampaign(s),learning=structuredClone(row.unit.tacticLearning);
 p.types[row.unit.id]='spear';p.reinforce=true;
 const result=prepareCommandFormation(s,p);assert.equal(result.error,undefined);
 assert.equal(serializeCampaign(s),original);assert.ok(result.men>0);assert.ok(result.gold>0);
 const unit=result.state.cities.find(c=>c.id===p.city).units.find(u=>u.id===row.unit.id);
 assert.deepEqual(unit.tacticLearning,learning);
 assert.ok(result.state.campaign.domestic.assignments.some(a=>a.officerId===unit.id));
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(result.state))));
 p.types[row.unit.id]='invalid';assert.ok(prepareCommandFormation(s,p).error);assert.equal(serializeCampaign(s),original);
});
test('a changed officer state blocks final formation without partial changes',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang');
 p.selected=campaignOfficers(s).filter(r=>!pickerReason(s,r,p)).slice(0,2).map(r=>r.unit.id);
 s.campaign.idle.find(o=>o.unit.id===p.selected[1]).destination='chenliu';
 const original=structuredClone(s);assert.ok(prepareCommandFormation(s,p).error);assert.deepEqual(s,original);
});
test('target is an explicit decision and routes follow transfer ownership rules',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'transfer','xuchang');p.step='target';
 assert.equal(commandCanAdvance(s,p),false);p.destination='xuchang';assert.equal(commandCanAdvance(s,p),false);
 p.destination='chenliu';assert.ok(commandRoute(s,p));assert.equal(commandCanAdvance(s,p),true);
});

test('ordinary formation owns officer selection and army selection lists compiled units',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'expedition','xuchang');
 assert.equal(p.step,'unit-review');assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/campaign-unit-new/);p.step='formation';assert.ok(!commandSteps(p).includes('officers'));
 const row=campaignOfficers(s).find(r=>!pickerReason(s,r,p));p.selected=[row.unit.id];p.unitOfficer=row.unit.id;
 let html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.doesNotMatch(html,/data-personnel-choice/);assert.match(html,/data-command-type/);p.choosingMain=true;assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/type="radio"/);p.choosingMain=false;
 p.formationPool=[...p.selected];p.step='unit-select';html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/data-command-army-unit/);assert.doesNotMatch(html,/data-personnel-choice|data-command-type/);
});

test('domestic appointment exposes six simple directions and keeps commerce and agriculture separate',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'domestic','xuchang');
 assert.equal(p.step,'direction');
 const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 for(const [id,name,stat] of [['commerce','商业','政治'],['agriculture','农业','政治'],['military','军务','统率'],['martial','武备','武力'],['technology','技术','智力'],['talent','人才','魅力']]){
  assert.equal((html.match(new RegExp('data-direction="'+id+'"','g'))||[]).length,1);
  assert.ok(html.includes('<b>'+name+'</b><small>'+stat+'＋适用特性</small>'));
 }
 assert.doesNotMatch(html,/当前重点|参考需求|成功把握|请选择具体事务/);
});

test('army composition displays current work and puts idle units first without changing their jobs',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 assignDomestic(s,c.id,'commerce',u.id);beginDomesticTurn(s);assert.ok(assignmentFor(s,u.id).action);
 const p=newCommand(s,'expedition',c.id);p.step='unit-select';p.selected=[];p.formationPool=[];
 const before=serializeCampaign(s),html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/事务尚余/);assert.match(html,/当前空闲，优先出征/);assert.equal(serializeCampaign(s),before);
 const ids=[...html.matchAll(/data-command-army-unit="([^"]+)"/g)].map(m=>m[1]);assert.notEqual(ids[0],u.id);assert.ok(ids.includes(u.id));
});

test('disband drafts return soldiers without refund or lost appointments and remain cancellable',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 assert.ok(u);u.wounded=120;assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);
 const p=newCommand(s,'draft',c.id),before=serializeCampaign(s),gold=s.gold,men=c.manpower,count=u.troops+u.wounded;
 p.selected=[u.id];p.formationPool=[u.id];p.armySelection=[u.id];p.leader=u.id;
 assert.equal(removeCommandUnit(s,p,u.id),'');assert.deepEqual(p.selected,[]);assert.equal(p.leader,null);
 assert.equal(serializeCampaign(s),before);assert.ok(commandCanAdvance(s,p));
 const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;assert.match(html,new RegExp('预备兵：'+men));assert.match(html,/编制金不返还/);
 const result=prepareCommandFormation(s,p);assert.equal(result.error,undefined);
 assert.equal(result.state.gold,gold);assert.equal(result.state.cities.find(x=>x.id===c.id).manpower,men+count);
 assert.ok(!result.state.cities.find(x=>x.id===c.id).units.some(x=>x.id===u.id));
 const officer=result.state.campaign.idle.find(x=>x.unit.id===u.id);assert.equal(officer.unit.troops,0);assert.equal(officer.unit.wounded,0);assert.equal(officer.location,c.id);
 assert.deepEqual(officer.unit.tacticLearning,u.tacticLearning);assert.ok(assignmentFor(result.state,u.id));
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(result.state))));assert.equal(serializeCampaign(s),before);
 assert.ok(prepareCommandFormation(result.state,p).error);
});
test('removing an uncommitted new unit does not create a reserve refund',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang');const row=campaignOfficers(s).find(r=>!pickerReason(s,r,p));
 p.selected=[row.unit.id];p.troops[row.unit.id]=1000;const before=serializeCampaign(s);
 assert.equal(removeCommandUnit(s,p,row.unit.id),'');assert.deepEqual(p.selected,[]);assert.equal(p.disbandIds,undefined);assert.equal(serializeCampaign(s),before);
});
