import {fieldCampaign as newCampaign} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignRoads,movementPoints,roadCost,roadDistance,roadPoint,renderRoads} from '../strategic-movement.mjs';
import {orderCampaignArmy,beginExecution,advanceCampaignStep,advanceCampaignDay,activeBattles,serializeCampaign,validateCampaign,armyPosition,supplyConnection} from '../strategic-campaign.mjs';
import {initializeTalent} from '../talent-lifecycle.mjs';

test('each connection has one bidirectional road with terrain costs',()=>{
  const s=newCampaign(1,'guandu-200');
  for(const [a,b] of s.roads){const roads=campaignRoads(s,a,b);assert.equal(roads.length,1);assert.deepEqual(roads,campaignRoads(s,b,a));}
  const gate=s.roads.find(([a,b])=>s.cities.some(c=>[a,b].includes(c.id)&&c.kind==='gate'));
  assert.ok(roadCost(s,...gate)>roadDistance(s,...gate));
  assert.equal((renderRoads(s).match(/<title>/g)||[]).length,s.roads.length);
});
test('movement budget reflects active troops, commander, morale and hunger',()=>{
  const a={leader:'u',morale:80,hunger:0,units:[{id:'u',troops:1000,type:'cavalry',leadership:80}]};
  const fast=movementPoints(a);assert.ok(movementPoints({...a,morale:30})<fast);assert.ok(movementPoints({...a,hunger:3})<fast);
  assert.ok(movementPoints({...a,units:[{...a.units[0],leadership:20}]})<fast);
  assert.ok(movementPoints({...a,units:[...a.units,{id:'slow',type:'siege',troops:1000}]})<fast);
  assert.equal(movementPoints({...a,units:[...a.units,{id:'empty',type:'siege',troops:0}]}),fast);
  assert.equal(movementPoints({...a,units:[]}),0);
});
test('real daily marching spends action points at the selected road cost',()=>{
  const progress=[];
  for(const policy of ['main']){
    const s=newCampaign(),a=s.armies[0];assert.equal(orderCampaignArmy(s,a.id,'guandu',policy),null);
    beginExecution(s);advanceCampaignStep(s);assert.equal(a.travel.road,policy);
    const spent=a.travel.progress/roadDistance(s,a.travel.from,a.travel.to)*roadCost(s,a.travel.from,a.travel.to,policy);
    assert.ok(Math.abs(spent-movementPoints(a))<.01);progress.push(a.travel.progress);
  }
  assert.ok(progress[0]>0);
});
test('removed parallel road cannot be ordered',()=>{
 const s=newCampaign();assert.ok(orderCampaignArmy(s,s.armies[0].id,'guandu','side'));
});
test('a road journey survives validation and resumes deterministically',()=>{
  const s=newCampaign();orderCampaignArmy(s,s.armies[0].id,'guandu','side');beginExecution(s);advanceCampaignStep(s);
  const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
  for(let i=0;i<10;i++){advanceCampaignStep(s);advanceCampaignStep(restored);}
  assert.equal(serializeCampaign(s),serializeCampaign(restored));
  const bad=JSON.parse(serializeCampaign(s));bad.armies[0].travel.road='teleport';assert.throws(()=>validateCampaign(bad));
  const old=JSON.parse(serializeCampaign(s));old.campaign.version=7;assert.throws(()=>validateCampaign(old),/重新开始/);
});
test('both directions of a road have identical positions along a single centerline',()=>{
  const a={id:'a',x:0,y:0},b={id:'b',x:200,y:100};
  for(const road of ['main','side'])assert.deepEqual(roadPoint(a,b,.25,road),roadPoint(b,a,.75,road));
  assert.deepEqual(roadPoint(a,b,.5),{x:100,y:50});
});
test('a detour beyond supply range does not provide free supplies',()=>{
  const s=newCampaign(),a=s.armies[0];s.cities.filter(c=>c.id!=='chenliu').forEach(c=>c.grain=0);
  assert.ok(supplyConnection(s,a));
  const enemy=s.armies.find(a=>a.faction==='yuan');enemy.location='chenliu';enemy.travel={from:'chenliu',to:'xuchang',progress:20,road:'main'};
  assert.equal(supplyConnection(s,a),null);
});
