import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,transferOfficer} from './helpers/auto-domestic-campaign.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {commandRoute} from '../strategic-command.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {sendOfficerHome,officerReturnCity,removeOfficer,resolveOfficerLoss,officerLossResult,fateRoll} from '../officer-fates.mjs';
import {advancePersonnel,transportProxy,isTransport,personnelSpeed,PERSONNEL_SPEED} from '../personnel-movement.mjs';
import {armyPosition} from '../strategic-campaign.mjs';
import {processTalentDefeats,noteTalentCityCapture} from '../talent-lifecycle.mjs';
import {cancelDomestic,reconcileDomestic} from '../domestic.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(){const s=newCampaign(23),a=fieldFromCity(s,'baima'),unit=a.units.find(u=>u.id!=='shao');assert.ok(unit);unit.homeCity='baima';return {s,a,unit};}
function detach(s,unit){removeOfficer(s,unit.id);unit.troops=0;unit.wounded=0;}

test('defeated officers return to their own city even with a different friendly city at their current position',()=>{
 const {s,unit}=fixture();detach(s,unit);const o=sendOfficerHome(s,unit,'yuan','ye');assert.equal(o.destination,'baima');assert.equal(unit.homeCity,'baima');assert.equal(o.returningHome,true);assert.ok(o.journey.route.length);restore(s);
});
test('a fallen home sends the officer to the ruler current city, while the ruler away uses their real base',()=>{
 const {s,unit}=fixture(),home=s.cities.find(c=>c.id==='baima');home.owner='cao';
 assert.equal(officerReturnCity(s,unit,'yuan').id,'guandu');
 const lordArmy=fieldFromCity(s,'guandu',{ids:['shao']});lordArmy.location='xuchang';
 assert.equal(officerReturnCity(s,unit,'yuan').id,'guandu');
});
test('an unreachable owned home blocks the journey rather than making a living officer free',()=>{
 const {s,unit}=fixture();detach(s,unit);s.roads=[];
 const o=sendOfficerHome(s,unit,'yuan','ye');assert.equal(o.destination,'baima');assert.match(o.journey.blocked,/道路不通/);assert.ok(s.campaign.idle.includes(o));assert.ok(!s.campaign.domestic.people.some(p=>p.id===unit.id));
});
test('a home falls during travel: redirect from the exact road position, preserve wounds, and resume identically',()=>{
 const {s,unit}=fixture();detach(s,unit);unit.wounded=100;
 const o=sendOfficerHome(s,unit,'yuan','ye');advancePersonnel(s,o,[],.01);assert.ok(o.journey.progress>0);assert.equal(o.meritTransport,undefined);
 const point=armyPosition(s,transportProxy(s,o)),home=s.cities.find(c=>c.id==='baima');home.owner='cao';home.governor=null;reconcileDomestic(s);syncResourceTotals(s);
 advancePersonnel(s,o,[],.01);const redirected=s.campaign.idle.find(p=>p.unit.id===unit.id);assert.equal(redirected.destination,'guandu');assert.equal(unit.homeCity,'baima');assert.equal(unit.wounded,100);
 const after=armyPosition(s,transportProxy(s,redirected));assert.ok(Math.hypot(point.x-after.x,point.y-after.y)<1e-8);
 const copy=restore(s),other=copy.campaign.idle.find(p=>p.unit.id===unit.id);
 for(let i=0;i<200&&redirected.destination;i++){advancePersonnel(s,redirected,[],.1);advancePersonnel(copy,other,[],.1);}
 assert.equal(redirected.destination,null);assert.equal(unit.homeCity,'guandu');assert.equal(unit.wounded,100);assert.equal(redirected.returningHome,undefined);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
test('a returning officer follows personnel rules through hostile cities and troops even with surviving own wounds',()=>{
 const {s,unit}=fixture();detach(s,unit);unit.wounded=100;
 s.roads=[['xuchang','guandu'],['guandu','baima']];s.cities.find(c=>c.id==='guandu').owner='cao';
 const o=sendOfficerHome(s,unit,'yuan','xuchang');assert.deepEqual(o.journey.route,['guandu','baima']);assert.equal(isTransport(o),false);assert.equal(personnelSpeed(o),PERSONNEL_SPEED);
 const hostile={faction:'cao',location:'guandu'};
 for(let i=0;i<100&&o.destination;i++)advancePersonnel(s,o,[hostile]);
 assert.equal(o.destination,null);assert.equal(o.unit.homeCity,'baima');assert.equal(o.unit.wounded,100);assert.ok(!s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'));
});
test('light transfer previews, direct orders and scheduled orders can all cross a hostile city',()=>{
 for(const mode of ['direct','scheduled']){
  const s=newCampaign(23),o=s.campaign.idle.find(o=>o.faction==='cao'&&o.location==='xuchang'&&o.unit.id!=='cao'),id=o.unit.id;
  s.roads=[['xuchang','guandu'],['guandu','chenliu']];const path=['guandu','chenliu'];
  const p={task:'transfer',city:'xuchang',selected:[id],destination:'chenliu',cargo:{gold:0,grain:0,manpower:0}};
  assert.deepEqual(commandRoute(s,p).route,path);
  if(mode==='direct')assert.equal(transferOfficer(s,id,'chenliu',{route:path}),null);
  else assert.ok(!requestStrategicOrder(s,{kind:'transfer',cityId:'xuchang',officerIds:[id],target:'chenliu',cargo:p.cargo,route:path,safeOnly:true},'now').error);
  const moving=s.campaign.idle.find(o=>o.unit.id===id);assert.deepEqual(moving.journey.route,path);
  for(let i=0;i<100&&moving.destination;i++)advancePersonnel(s,moving,[{faction:'yuan',location:'guandu'}]);
  assert.equal(moving.location,'chenliu');assert.equal(moving.destination,null);
 }
});
test('with no cities an uncaptured officer becomes free once, while captives remain captives',()=>{
 const {s,unit}=fixture();detach(s,unit);for(const c of s.cities)if(c.owner==='yuan')c.owner='cao';
 assert.equal(sendOfficerHome(s,unit,'yuan','ye'),null);assert.equal(s.campaign.domestic.people.filter(p=>p.id===unit.id&&p.status==='FREE').length,1);
 assert.ok(!s.campaign.idle.some(o=>o.unit.id===unit.id));
});
test('losing the final city disperses remote surviving formations and frees their officers without a second capture roll',()=>{
 const {s,a,unit}=fixture(),ids=a.units.map(u=>u.id),events=s.campaign.personnelEvents.length;
 for(const c of s.cities)if(c.owner==='yuan')c.owner='cao';
 noteTalentCityCapture(s,'yuan','cao','final-city');processTalentDefeats(s,cancelDomestic);
 assert.ok(!s.armies.some(army=>army.faction==='yuan'));for(const id of ids)assert.equal(s.campaign.domestic.people.filter(p=>p.id===id&&p.status==='FREE').length,1);
 assert.equal(unit.troops,0);assert.equal(unit.wounded,0);assert.equal(s.campaign.personnelEvents.length,events);
 processTalentDefeats(s,cancelDomestic);for(const id of ids)assert.equal(s.campaign.domestic.people.filter(p=>p.id===id).length,1);
});
test('escape always releases the old army appointment and preserves the original learned officer and own wounds',()=>{
 const {s,a,unit}=fixture();unit.wounded=100;
 const eventId=Array.from({length:10000},(_,i)=>'return-fixture:'+i).find(key=>officerLossResult(fateRoll(s,key),'cao')==='ESCAPED'),learning=structuredClone(unit.tacticLearning);
 assert.equal(resolveOfficerLoss(s,{unit,faction:'yuan',location:a.location,enemy:'cao',eventId,survivingArmy:a}),'ESCAPED');
 assert.ok(!a.units.includes(unit));assert.notEqual(a.leader,unit.id);const o=s.campaign.idle.find(o=>o.unit.id===unit.id);assert.equal(o.destination,'baima');assert.equal(o.unit,unit);assert.equal(o.unit.wounded,100);assert.deepEqual(o.unit.tacticLearning,learning);restore(s);
});
