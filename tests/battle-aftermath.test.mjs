import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_FATE_RULES as RULES} from '../data/design/officer-fate-rules.mjs';
import {officerLossResult,cityCaptureContext,displaceCityOfficers,fateRoll} from '../officer-fates.mjs';
import {settleCapturedWounded,validWoundedCapture,woundedCaptureMarkup} from '../battle-aftermath.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {makeOfficer,battleWounded} from '../engine.mjs';
import {newCampaign,beginExecution,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,approachFieldContact} from './helpers/field-campaign.mjs';
import {pendingArmyAppointments,confirmPostbattleAppointments} from '../postbattle-appointments.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';

test('field, siege and elimination use the confirmed unconditional capture rates with a separate death share',()=>{
 for(const context of ['field','siege','elimination','transport']){
  const count={DEAD:0,CAPTIVE:0,ESCAPED:0};
  for(let i=0;i<10000;i++)count[officerLossResult((i+.5)/10000,'yuan',context)]++;
  assert.equal(count.DEAD,10000*RULES.deathChance);
  assert.equal(count.CAPTIVE,10000*RULES.captureChance[context]);
 }
 assert.equal(officerLossResult(.025,null,'elimination'),'ESCAPED');
});

test('only losing the last city raises the local resident capture chance; remote officers are untouched',()=>{
 for(const lastCity of [false,true]){
  const s=newCampaign(23),c=s.cities.find(c=>c.id==='guandu'),faction=c.owner;
  const resident={unit:c.units[0]},remote=fieldFromCity(s,'baima');
  assert.ok(resident);
  if(lastCity)for(const town of s.cities)if(town!==c&&town.owner===faction)town.owner='cao';
  c.owner='cao';assert.equal(cityCaptureContext(s,faction),lastCity?'elimination':'siege');
  let eventId;
  for(let i=0;i<10000;i++){const key='occupation-probe:'+i,roll=fateRoll(s,key+':resident:'+resident.unit.id);if(roll>.08&&roll<.30){eventId=key;break;}}
  assert.ok(eventId);displaceCityOfficers(s,c.id,faction,eventId);
  const prisoner=s.campaign.domestic.people.find(p=>p.id===resident.unit.id&&p.status==='CAPTIVE');
  assert.equal(!!prisoner,lastCity);assert.ok(s.armies.includes(remote));
  assert.ok(remote.units.every(u=>!s.campaign.personnelEvents.some(e=>e.officerId===u.id)));
 }
});

function woundFixture(winner=0){
 const target=makeOfficer('cao',3000),donor=makeOfficer('shao',0);target.wounded=200;donor.wounded=450;
 const friend={id:target.id,armyId:'winner',hp:target.troops,initial:4000,battleDamage:1000,healed:0,status:'active'},enemy={id:donor.id,armyId:'loser',hp:0,initial:1000,battleDamage:1000,healed:0,status:'defeated'};
 const sides=[{units:[friend]},{units:[enemy]}];if(winner===1)sides.reverse();
 return {s:{armies:[{id:'winner',units:[target]},{id:'loser',units:[donor]}]},r:{battle:{tick:10,result:{winner},sides}},target,donor,friend,enemy};
}
for(const winner of [0,1])test(`winner on side ${winner} transfers only actual new wounds, preserving preexisting wounds and total men`,()=>{
 const {s,r,target,donor}=woundFixture(winner),before=target.wounded+donor.wounded;
 const receipt=settleCapturedWounded(s,r);assert.equal(receipt.available,350);assert.equal(receipt.received,87);
 assert.equal(target.troops,3000);assert.equal(target.wounded,287);assert.equal(donor.wounded,363);assert.equal(target.wounded+donor.wounded,before);
 assert.ok(validWoundedCapture(r));assert.match(woundedCaptureMarkup(receipt),/87.*仍须休养/);
 const resumed=structuredClone({s,r});assert.deepEqual(settleCapturedWounded(resumed.s,resumed.r),receipt);assert.equal(resumed.s.armies[0].units[0].wounded,287);
 assert.equal(settleCapturedWounded(s,r),receipt);assert.equal(target.wounded,287);
 const bad=structuredClone(r);bad.woundedCapture.transfers[0].amount++;assert.equal(validWoundedCapture(bad),false);
});

test('captured wounds respect troop capacity, exclude successful withdrawals, missing and unarrived units, and never reward a draw or ceasefire',()=>{
 const capped=woundFixture();capped.target.troops=troopCapacity(capped.target)-capped.target.wounded-7;
 assert.equal(settleCapturedWounded(capped.s,capped.r).received,7);assert.equal(capped.target.troops+capped.target.wounded,troopCapacity(capped.target));
 for(const change of [f=>f.enemy.status='withdrawn',f=>f.enemy.retreatDispatched=true,f=>f.enemy.arrivalConfirmed=false,f=>f.enemy.arrivalTick=11,f=>f.enemy.isDecoy=true,f=>f.enemy.cityGuard=true,f=>f.s.armies.pop(),f=>f.friend.hp=0,f=>f.friend.status='withdrawn',f=>f.r.battle.result.winner=null,f=>f.r.diplomaticCeasefire=true]){
  const f=woundFixture();change(f);assert.equal(settleCapturedWounded(f.s,f.r).received,0);assert.ok(validWoundedCapture(f.r));
 }
 const early=woundFixture();delete early.r.battle.result;assert.equal(settleCapturedWounded(early.s,early.r),null);assert.equal(early.r.woundedCapture,undefined);
});

test('a real field battle persists its wound receipt, resumes identically and rejects a forged reward',()=>{
 const s=newCampaign(17),a=fieldFromCity(s,'xuchang',{target:'guandu'}),enemy=fieldFromCity(s,'guandu',{target:'xuchang'});
 for(const u of [...a.units,...enemy.units])u.retreatAt=null;
 approachFieldContact(s,a,enemy);beginExecution(s);
 for(let i=0;i<100&&!activeBattles(s).length;i++)advanceCampaignStep(s);
 const r=activeBattles(s)[0];assert.ok(r);chooseEncounter(s,r.id,false);
 const resumed=validateCampaign(JSON.parse(serializeCampaign(s))),copy=resumed.campaign.battles.find(b=>b.id===r.id);
 function finish(state,record){for(let i=0;i<3000&&!record.settled;i++){
  for(const p of [...pendingArmyAppointments(state)])confirmPostbattleAppointments(state,p.armyId,recommendArmyAppointments(state.armies.find(a=>a.id===p.armyId)));
  if(state.campaign.phase==='planning')beginExecution(state);advanceCampaignStep(state);
 }assert.ok(record.settled);}
 finish(s,r);finish(resumed,copy);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
 assert.ok(r.report.woundedCapture.received>0);assert.ok(validWoundedCapture(r));
 assert.equal(r.report.stats[1-r.battle.result.winner].wounded,r.battle.sides[1-r.battle.result.winner].units.reduce((n,u)=>n+battleWounded(u),0));
 validateCampaign(JSON.parse(serializeCampaign(s)));
 const bad=JSON.parse(serializeCampaign(s)),record=bad.campaign.battles.find(b=>b.id===r.id);record.report.woundedCapture.received++;
 assert.throws(()=>validateCampaign(bad),/伤兵接收记录/);
});
