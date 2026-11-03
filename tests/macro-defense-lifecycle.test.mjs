import test from 'node:test';
import assert from 'node:assert/strict';
import {macroDefenseScene} from './helpers/macro-defense.mjs';
import {planStrategicAI,validateStrategicAI} from '../strategic-ai.mjs';
import {serializeCampaign,armyPosition} from '../strategic-campaign.mjs';
import {strategicSupportObjectives} from '../strategic-support-ai.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {roadDistance} from '../strategic-movement.mjs';

const fixture=()=>macroDefenseScene({reserves:12000,enemyMen:1000,localMen:4500,junction:true});
const mission=f=>f.s.campaign.ai.supports.find(q=>q.faction==='yuan'&&q.kind==='guard'&&q.target===f.node.id);
const guards=f=>f.s.armies.filter(a=>a.faction==='yuan'&&a.target===f.node.id);
const review=(s,day)=>{s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;s.campaign.phase='planning';updateVision(s);planStrategicAI(s);};
const grain=s=>s.cities.reduce((n,c)=>n+c.grain,0)+s.armies.reduce((n,a)=>n+a.supply,0);
const men=s=>s.cities.reduce((n,c)=>n+c.manpower+c.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.armies.reduce((n,a)=>n+a.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded,0);

test('road defense retains its real sortie without a contradictory same-review return',()=>{
 const f=fixture(),stocks={grain:grain(f.s),men:men(f.s)};planStrategicAI(f.s);
 const q=mission(f),a=guards(f)[0];assert.ok(q);assert.ok(a);assert.equal(a.task,'出击');assert.ok(a.route.length);
 assert.ok(q.officerIds.every(id=>a.units.some(u=>u.id===id)));
 assert.ok(!f.s.campaign.ai.decisions.some(d=>d.armyId===a.id&&d.kind==='retreat'));
 assert.deepEqual({grain:grain(f.s),men:men(f.s)},stocks);validateStrategicAI(f.s);
});

test('road defense survives repeated turn reviews and serialized continuation without duplicate commitments',()=>{
 const f=fixture();planStrategicAI(f.s);const q=mission(f);assert.ok(q);const id=q.id,armyId=guards(f)[0].id,copy=JSON.parse(serializeCampaign(f.s));
 const before=serializeCampaign(f.s);planStrategicAI(f.s);assert.equal(serializeCampaign(f.s),before);
 for(const day of [2,11,21]){review(f.s,day);review(copy,day);assert.equal(serializeCampaign(f.s),serializeCampaign(copy));assert.equal(mission(f)?.id,id);assert.deepEqual(guards(f).map(a=>a.id),[armyId]);assert.equal(new Set(mission(f).officerIds).size,mission(f).officerIds.length);validateStrategicAI(f.s);}
});

test('road defense objectives use the visible threat without needing a convoy or reading future enemy orders',()=>{
 const f=fixture();planStrategicAI(f.s);assert.ok(mission(f));const before=serializeCampaign(f.s),objectives=strategicSupportObjectives(f.s,'yuan');
 assert.ok(objectives.some(q=>q.kind==='guard'&&q.target===f.node.id));assert.equal(serializeCampaign(f.s),before);
 const copy=JSON.parse(before),enemy=copy.armies.find(a=>a.id===f.foe.id);enemy.target=f.rear.id;enemy.route=[f.rear.id];
 assert.deepEqual(strategicSupportObjectives(copy,'yuan'),objectives);
});

test('a vanished road threat waits for the next turn and returns once along the actual road',()=>{
 const f=fixture();planStrategicAI(f.s);assert.ok(mission(f));const a=guards(f)[0],length=roadDistance(f.s,f.home.id,f.node.id);
 a.travel={from:f.home.id,to:f.node.id,road:'main',progress:length*.4};const position=armyPosition(f.s,a);
 f.foe.location=f.enemy.id;f.foe.travel=null;f.foe.route=[];f.foe.target=null;f.enemy.x=800;
 review(f.s,2);assert.equal(a.task,'出击');assert.ok(mission(f));assert.deepEqual(armyPosition(f.s,a),position);
 review(f.s,11);assert.equal(mission(f),undefined);assert.equal(a.task,'回城补给');assert.equal(a.target,f.home.id);assert.ok(a.route.length);assert.deepEqual(armyPosition(f.s,a),position);
 const before=serializeCampaign(f.s);planStrategicAI(f.s);assert.equal(serializeCampaign(f.s),before);validateStrategicAI(f.s);
});

test('an adequate committed sortie prevents another local guard departure when spare troops arrive',()=>{
 const f=fixture();planStrategicAI(f.s);const q=mission(f);assert.ok(q);const id=guards(f)[0].id;
 // Transfer an existing real unit inside this controlled mechanism fixture.
 const spare=f.rear.units.shift();spare.homeCity=f.home.id;f.home.units.push(spare);
 review(f.s,11);assert.equal(mission(f)?.id,q.id);assert.deepEqual(guards(f).map(a=>a.id),[id]);
 assert.ok(!f.s.campaign.ai.decisions.some(d=>d.day===11&&d.kind==='guard'&&d.target===f.node.id));validateStrategicAI(f.s);
});
