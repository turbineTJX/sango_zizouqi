import test from 'node:test';
import assert from 'node:assert/strict';
import {macroDefenseScene} from './helpers/macro-defense.mjs';
import {beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {planStrategicAI,validateStrategicAI} from '../strategic-ai.mjs';
import {macroDefenseThreats} from '../ai-policy/macro-defense.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';

test('a completed road sortie returns through the shared support lifecycle and preserves saved commitments',()=>{
 const f=macroDefenseScene({reserves:12000,enemyMen:1000,localMen:4500,junction:true});planStrategicAI(f.s);
 const mission=f.s.campaign.ai.supports.find(q=>q.kind==='guard'),army=f.s.armies.find(a=>a.faction==='yuan'&&a.target===f.node.id);
 assert.ok(mission);assert.equal(army.task,'出击');validateStrategicAI(f.s);
 assert.ok(JSON.parse(serializeCampaign(f.s)).campaign.ai.supports.some(q=>q.id===mission.id));
 // Explicit already-arrived mechanism situation, separate from natural travel evidence.
 Object.assign(army,{location:f.node.id,travel:null,route:[],target:null});
 Object.assign(f.foe,{location:f.enemy.id,travel:null,route:[],target:null});f.enemy.x=800;
 f.s.campaign.day=11;f.s.turn=2;updateVision(f.s);planStrategicAI(f.s);
 assert.equal(army.task,'回城补给');assert.equal(army.target,f.home.id);assert.ok(army.route.length);
 assert.ok(!f.s.campaign.ai.supports.some(q=>q.id===mission.id));
});

test('hidden enemy strength and secret destination cannot trigger local defense',()=>{
 const f=macroDefenseScene();f.enemy.x=800;f.foe.location=f.enemy.id;f.foe.travel=null;initializeVision(f.s);
 assert.equal(macroDefenseThreats(f.s,f.home).length,0);
 f.foe.units.forEach(u=>u.troops=1000);f.foe.target=f.home.id;
 assert.equal(macroDefenseThreats(f.s,f.home).length,0);
});

test('a real defending battle does not withdraw to preserve strength after heavy losses',()=>{
 const f=macroDefenseScene({enemyMen:18000,localMen:4500});f.rear.units=[];beginExecution(f.s);let record;
 for(let i=0;i<4&&!record;i++){
  advanceCampaignDay(f.s);record=activeBattles(f.s).find(r=>r.cityId===f.home.id);
  if(record?.awaiting)chooseEncounter(f.s,record.id,false);
 }
 assert.ok(record,'actual arrival creates a shared siege battle');
 const own=record.battle.sides.find(side=>side.faction==='yuan');assert.equal(own.retreat,false);
 // A controlled loss state exercises the policy boundary, not a balance result.
 for(const u of own.units.filter(u=>u.hp>0))u.hp=Math.min(u.hp,Math.max(1,u.initial*.1));
 f.s.campaign.day=11;f.s.turn=2;f.s.campaign.phase='planning';planStrategicAI(f.s);
 assert.equal(own.retreat,false);assert.ok(own.units.every(u=>u.retreatAt===null||u.retreatAt===undefined));
});
