import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldCampaign} from './helpers/field-campaign.mjs';
import {orderCampaignArmy,beginExecution,advanceCampaignStep,armyPosition,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {newCommand,setCommandReverse,selectCommandPoint,commandRoute,commandMarkup,commandMarchPreview} from '../strategic-command.mjs';
import {requestFactionOrder} from '../strategic-orders.mjs';
import {remainingMarchDays} from '../strategic-movement.mjs';

function marching(){
 const s=fieldCampaign(),a=s.armies[0];
 assert.equal(orderCampaignArmy(s,a.id,'guandu','main'),null);
 beginExecution(s);advanceCampaignStep(s);assert.ok(a.travel);
 return {s,a};
}
test('player reversal preview and ordinary order use the same physical road position as AI reversal',()=>{
 const {s,a}=marching(),p=newCommand(s,'march',a.location,{armyId:a.id}),before=serializeCampaign(s),old=structuredClone(a.travel),position=armyPosition(s,a);
 p.destination='guandu';p.route=['guandu'];
 assert.equal(setCommandReverse(s,p,true),true);assert.equal(p.destination,null);assert.equal(p.route,null);
 assert.equal(selectCommandPoint(s,p,old.from),null);
 const route=commandRoute(s,p);assert.equal(route.from,old.from);assert.deepEqual(route.route,[]);
 const preview=commandMarchPreview(s,a,p),days=remainingMarchDays(s,preview);
 for(const step of ['target','review']){
  p.step=step;const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
  assert.ok(html.includes(`预计 ${days} 天抵达`));
 }
 assert.equal(serializeCampaign(s),before);
 const ai=structuredClone(s),other=ai.armies.find(x=>x.id===a.id);
 assert.equal(orderCampaignArmy(ai,a.id,old.from,'auto',{scheduled:true,reverse:true}),null);
 assert.deepEqual(requestFactionOrder(s,a.faction,{kind:'march',armyId:a.id,target:old.from,reverse:true},'now',true),{applied:true});
 assert.deepEqual(a.travel,other.travel);assert.deepEqual(a.route,other.route);
 const after=armyPosition(s,a);assert.ok(Math.abs(position.x-after.x)<1e-9);assert.ok(Math.abs(position.y-after.y)<1e-9);
 assert.equal(a.supply,other.supply);assert.deepEqual(a.units,other.units);
 assert.ok(validateCampaign(JSON.parse(serializeCampaign(s))));
});
test('reversal selection clears stale route and cannot be used by a stationary army',()=>{
 const {s,a}=marching(),p=newCommand(s,'march',a.location,{armyId:a.id});
 setCommandReverse(s,p,true);selectCommandPoint(s,p,a.travel.from);
 assert.equal(setCommandReverse(s,p,false),true);assert.equal(p.destination,null);assert.equal(p.route,null);
 a.travel=null;a.route=[];const before=serializeCampaign(s);
 assert.equal(setCommandReverse(s,p,true),false);
 assert.match(requestFactionOrder(s,a.faction,{kind:'march',armyId:a.id,target:'guandu',reverse:true},'now',true).error,/已不在行军路段/);
 assert.equal(serializeCampaign(s),before);
});
