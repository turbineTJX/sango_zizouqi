import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,dailySupply,serializeCampaign,validateCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {admitCityWounded,receiveResidentWounded,recoverCityWounded,cityWoundedRecovery} from '../city-wounded.mjs';
import {settleCityCaptureResources} from '../city-resources.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {OFFICER_FATE_RULES} from '../data/design/officer-fate-rules.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';
import {cityMilitary} from '../domestic.mjs';
import {cityIntelligence,initializeVision,intelligenceWorld,updateVision} from '../strategic-vision.mjs';
import {siegeMobilizationFixture} from './helpers/siege-mobilization.mjs';
import {advanceCampaignStep,activeBattles} from '../strategic-campaign.mjs';
import {battleWounded} from '../engine.mjs';
import {validWoundedCapture} from '../battle-aftermath.mjs';

for(const attackWins of [false,true])test(`siege ${attackWins?'attacker':'defender'} puts captured and own wounds in one pool exactly once`,()=>{
 const {s,c}=siegeMobilizationFixture();advanceCampaignStep(s);
 const r=activeBattles(s).find(r=>r.cityId===c.id);assert.ok(r);
 const winner=attackWins?r.attackSide:1-r.attackSide;
 for(const side of [0,1])for(const u of r.battle.sides[side].units){
  const loss=side===winner?Math.min(200,u.initial):u.initial;
  u.hp=u.initial-loss;u.battleDamage=loss;u.status=u.hp?'active':'defeated';
 }
 r.battle.result={winner,reason:'击溃'};
 const own=r.battle.sides[winner].units.filter(u=>!u.cityGuard).reduce((n,u)=>n+battleWounded(u),0);
 const expected=r.battle.sides[1-winner].units.filter(u=>!u.cityGuard).reduce((n,u)=>n+Math.floor(battleWounded(u)*OFFICER_FATE_RULES.woundedCaptureRate),0);
 advanceCampaignStep(s);assert.ok(r.settled);assert.ok(expected>0);assert.equal(r.woundedCapture.received,expected);
 assert.equal(r.woundedCapture.poolCityId,c.id);assert.ok(validWoundedCapture(r));
 assert.equal(c.wounded,own+expected);assert.ok(c.units.every(u=>u.wounded===0));
 assert.ok(s.armies.filter(a=>a.location===c.id&&!a.travel&&a.faction===c.owner).every(a=>a.units.every(u=>u.wounded===0)));
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved);
 for(let n=0;n<3;n++){advanceCampaignStep(s);advanceCampaignStep(copy);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(r.woundedCapture.received,expected);
});

test('city admission pools all wounded without healing or keeping a unit claim',()=>{
 const s=newCampaign(17),c=s.cities.find(c=>c.id==='xuchang'),[u,v]=c.units;
 u.wounded=400;v.wounded=600;const troops=[u.troops,v.troops],reserve=c.manpower;
 receiveResidentWounded(s);assert.equal(c.wounded,1000);assert.deepEqual([u.wounded,v.wounded],[0,0]);
 assert.deepEqual([u.troops,v.troops],troops);assert.equal(c.manpower,reserve);
 receiveResidentWounded(s);assert.equal(c.wounded,1000);assert.equal(cityMilitary(s,c).wounded,1000);
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
 for(const bad of [-1,.5,NaN]){const copy=JSON.parse(saved);copy.cities.find(t=>t.id===c.id).wounded=bad;assert.throws(()=>validateCampaign(copy),/伤兵池/);}
 const old=JSON.parse(saved);old.campaign.version=73;assert.throws(()=>validateCampaign(old),/版本不兼容/);
});

test('pooled treatment continues without the original troops and fills reserves only',()=>{
 const s=newCampaign(17),c=s.cities.find(c=>c.id==='xuchang');c.wounded=1000;c.grain=10000;
 c.units=[];const before=c.manpower,rate=cityWoundedRecovery(c);dailySupply(s);
 assert.equal(c.manpower-before,rate);assert.equal(c.wounded,1000-rate);assert.equal(c.units.length,0);
 c.manpower=ECONOMY_RULES.capacity.manpowerMax-1;const wounded=c.wounded;
 assert.equal(recoverCityWounded(c,100),1);assert.equal(c.wounded,wounded-1);
 assert.equal(recoverCityWounded(c,100),0,'a full reserve retains real wounded in the pool');
});

test('starving pools consume real city grain and cannot recover',()=>{
 const s=newCampaign(17),c=s.cities.find(c=>c.id==='xuchang');c.units=[];c.wounded=1000;c.grain=0;
 const reserve=c.manpower;dailySupply(s);assert.equal(c.manpower,reserve);assert.equal(c.wounded,1000);assert.ok(c.hunger>0);
});

test('personnel wounds enter the destination pool once upon actual arrival',()=>{
 const s=newCampaign(17),c=s.cities.find(c=>c.id==='xuchang'),to=s.cities.find(c=>c.id==='chenliu'),u=c.units.find(u=>u.id!=='cao');
 u.wounded=300;assert.equal(transferOfficer(s,u.id,to.id,{scheduled:true,faction:'cao'}),null);
 assert.equal(c.wounded,300,'resident wounds stay in the source city when the officer leaves');
 const o=s.campaign.idle.find(o=>o.unit.id===u.id),before=to.wounded;
 // This fixture represents wounds received on the road, after departure.
 o.unit.wounded=300;
 for(let n=0;n<100&&o.destination;n++)advancePersonnel(s,o,[]);
 assert.equal(o.destination,null);assert.equal(to.wounded,before+300);assert.equal(o.unit.wounded,0);
 receiveResidentWounded(s);assert.equal(to.wounded,before+300);
});

test('occupation transfers the existing city pool by the shared wounded capture rate',()=>{
 const s=newCampaign(17),c=s.cities.find(c=>c.owner==='yuan');c.wounded=1001;
 const receipt=settleCityCaptureResources(c),kept=Math.floor(1001*OFFICER_FATE_RULES.woundedCaptureRate);
 assert.deepEqual(receipt.wounded,{before:1001,retained:kept,lost:1001-kept});assert.equal(c.wounded,kept);
});

test('unseen city wounded stay hidden and reports keep their observation value',()=>{
 const s=newCampaign(17,'guandu-200'),c=s.cities.find(c=>c.owner==='yuan');c.wounded=1000;initializeVision(s);
 c.x=10000;c.y=10000;initializeVision(s);
 assert.equal(cityIntelligence(s,c.id,'cao').visible,false);
 assert.equal(intelligenceWorld(s,'cao').cities.find(t=>t.id===c.id).wounded,null);
 s.campaign.vision.factions.cao.cities[c.id]={day:s.campaign.day,owner:c.owner,data:structuredClone(c)};
 c.wounded=2000;updateVision(s);
 assert.equal(intelligenceWorld(s,'cao').cities.find(t=>t.id===c.id).wounded,1000);
});
