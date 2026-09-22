import {issueCommand,lockDeployment} from '../engine.mjs';
import {armyPosition} from '../strategic-campaign.mjs';
import {cityForce} from '../city-units.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {assignDomestic,ACTIONS,assignmentFor} from '../domestic.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {peacefulCities,fieldFromCity} from './helpers/field-campaign.mjs';
import {personnelSpeed,TRANSPORT_SPEED,advancePersonnel,transportEnemy} from '../personnel-movement.mjs';
import {fateRoll,resolveOfficerLoss,releaseCaptive,updateCaptives,ransomCost} from '../officer-fates.mjs';
import {residentOfficer} from '../city-personnel.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {campaignInfoDetail} from '../campaign-info.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function advance(s,target){for(let i=0;i<500&&s.campaign.day<target;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
function mission(){const s=newCampaign(15);peacefulCities(s);s.gold=100000;const c=s.cities.find(c=>c.id==='xuchang'),p=readyTalent(s,'chenliu'),o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao'&&o.unit.id!==c.governor);for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='talent'&&k!=='hire')c.domestic.cooldowns[k]=100000;assert.equal(assignDomestic(s,c.id,'talent',o.unit.id),null);beginExecution(s);assert.ok(o.unit.mission);return {s,o,p,a:assignmentFor(s,o.unit.id)};}
test('talent recruiters really travel, cannot act locally, and return after their paid task; save continuation is exact',()=>{
 const {s,o,a}=mission(),remaining=a.action.remaining;assert.equal(residentOfficer(s,o.unit.id),undefined);advanceCampaignDay(s);assert.equal(a.action.remaining,remaining);assert.ok(o.unit.mission.progress>0);const copy=restore(s);advance(s,11);advance(copy,11);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.ok(o.unit.mission);assert.match(campaignInfoDetail(s,'officer',o.unit.id).sections[0].html,/当前|赴访|接洽|返城/);
 advance(s,21);assert.equal(o.unit.mission,undefined);assert.ok(residentOfficer(s,o.unit.id));restore(s);
});
test('an immediate new order recalls the recruiter physically before execution',()=>{
 const {s,o}=mission();advance(s,11);const command={kind:'transfer',cityId:'xuchang',officerIds:[o.unit.id],target:'chenliu',cargo:{grain:0,manpower:0}};assert.ok(requestStrategicOrder(s,command).confirmation);assert.ok(requestStrategicOrder(s,command,'now').queued);assert.equal(o.unit.mission.phase,'return');assert.equal(o.destination,null);const copy=restore(s);advance(s,21);advance(copy,21);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(o.location,'chenliu');restore(s);
});
test('express transports outrun armies but swept enemy crossings cause total loss without a battle',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),id=c.units.find(u=>u.id!==c.governor).id;
 assert.equal(transferOfficer(s,id,'chenliu',{cargo:{grain:500,manpower:200}}),null);const o=s.campaign.idle.find(o=>o.unit.id===id);assert.equal(personnelSpeed(o),100);assert.equal(TRANSPORT_SPEED,100);
 const next=o.journey.route[0],traffic=[{faction:'yuan',edge:{from:next,to:c.id,p0:0,p1:1,until:1}}];assert.ok(transportEnemy(s,o,next,0,1,0,1,traffic));assert.equal(transportEnemy(s,o,next,0,.2,.5,1,[{faction:'yuan',edge:{from:c.id,to:next,p0:.3,p1:1,until:.4}}]),undefined);
 const before=s.campaign.battles.length;advancePersonnel(s,o,traffic);assert.equal(s.campaign.battles.length,before);assert.ok(!s.campaign.idle.includes(o));assert.ok(s.campaign.personnelEvents.some(e=>e.type==='TRANSPORT_LOST'));assert.ok(!s.cities.some(c=>c.units.some(u=>u.id===id)));restore(s);
});
test('death, captivity and escape preserve exactly one person; ransom is paid once and return takes time',()=>{
 for(const kind of ['DEAD','CAPTIVE','ESCAPED']){const s=newCampaign(23),c=s.cities.find(c=>c.id==='xuchang'),unit=c.units[0];let key;for(let i=0;i<10000;i++){const k='case:'+i,r=fateRoll(s,k);if(kind==='DEAD'?r<.02:kind==='CAPTIVE'?r>=.02&&r<.35:r>=.35){key=k;break;}}assert.ok(key);
  assert.equal(resolveOfficerLoss(s,{unit,faction:'cao',location:c.id,enemy:'yuan',eventId:key}),kind);restore(s);assert.equal(resolveOfficerLoss(s,{unit,faction:'cao',location:c.id,enemy:'yuan',eventId:key}),null);
  if(kind==='CAPTIVE'){let p=s.campaign.domestic.people.find(p=>p.id===unit.id);assert.ok(p.custody);assert.ok(releaseCaptive(s,unit.id,{ransom:true}));for(let i=0;i<30&&p.custody;i++)updateCaptives(s);assert.equal(p.custody,undefined);const gold=s.gold,cost=ransomCost(p);assert.equal(releaseCaptive(s,unit.id,{ransom:true}),null);assert.equal(s.gold,gold-cost);assert.ok(releaseCaptive(s,unit.id,{ransom:true}));const traveler=s.campaign.idle.find(o=>o.unit.id===unit.id);assert.ok(traveler.destination);assert.equal(residentOfficer(s,unit.id),undefined);restore(s);}
 }
});
test('real battles assign fates to annihilated units and saves preserve their learned abilities',()=>{
 const s=newCampaign(17),a=fieldFromCity(s,'xuchang',{target:'guandu'}),d=fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);
 for(let i=0;i<200&&!s.campaign.battles.some(b=>b.settled);i++){for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const r=s.campaign.battles.find(b=>b.settled);assert.ok(r);const destroyed=r.battle.sides.flatMap(x=>x.units).filter(u=>u.status==='defeated');assert.ok(destroyed.length);for(const u of destroyed)assert.ok(s.campaign.personnelEvents.some(e=>e.id===r.id+':'+u.id));restore(s);
});
test('surviving retreating officers stay with their army and reverse the actual road position',()=>{
 const s=newCampaign(11),a=fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);
 for(let i=0;i<20&&!activeBattles(s).length;i++)advanceCampaignDay(s);const r=activeBattles(s)[0];assert.ok(r);chooseEncounter(s,r.id,true);lockDeployment(r.battle);const point=armyPosition(s,a);assert.equal(issueCommand(r.battle,'retreat'),null);
 for(let i=0;i<100&&!r.settled;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}assert.ok(r.settled);const withdrawn=r.battle.sides[0].units.filter(u=>u.status==='withdrawn'&&u.hp>0);assert.ok(withdrawn.length);for(const u of withdrawn)assert.ok(!s.campaign.personnelEvents.some(e=>e.id===r.id+':'+u.id));assert.ok(a.units.length);const after=armyPosition(s,a);assert.ok(Math.hypot(point.x-after.x,point.y-after.y)<1);assert.ok(a.route.length||a.location==='xuchang');restore(s);
});
test('a prepared commander visiting talent cannot also defend or depart before returning',()=>{
 const s=newCampaign(15);peacefulCities(s);s.gold=100000;readyTalent(s,'chenliu');const c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='talent'&&k!=='hire')c.domestic.cooldowns[k]=100000;
 assert.equal(assignDomestic(s,c.id,'talent',u.id),null);beginExecution(s);assert.ok(u.mission);assert.ok(!cityForce(c).units.includes(u));advance(s,11);
 const command={kind:'expedition',cityId:c.id,officerIds:[u.id],leader:u.id,advisor:u.id,deputy:null,target:'chenliu',policy:'auto',formation:{types:{},reinforce:false}};
 assert.ok(requestStrategicOrder(s,command).confirmation);assert.ok(requestStrategicOrder(s,command,'after').queued);assert.equal(s.armies.filter(a=>a.units.some(x=>x.id===u.id)).length,0);restore(s);advance(s,31);const arrived=s.cities.find(c=>c.id==='chenliu').units.find(x=>x.id===u.id);assert.ok(arrived);assert.equal(arrived.mission,undefined);restore(s);
});
