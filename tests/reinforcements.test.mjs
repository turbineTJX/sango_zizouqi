import test from 'node:test';
import assert from 'node:assert/strict';
import {reinforcementCampaign} from './helpers/reinforcement-campaign.mjs';
import {advanceCampaignDay,advanceCampaignStep,takeOverBattle,serializeCampaign,validateCampaign,viewCampaignMap} from '../strategic-campaign.mjs';
import {activeUnits,confirmReinforcementCouncil,stepBattle,deployUnit,reserveDeploymentUnit,resetDeployment,configureBattleIntent,configureBattleTerrain} from '../engine.mjs';
import {changeBattleCouncil,configureCouncilRetreat,battleCouncilMarkup} from '../battle-council.mjs';
import {configureRetreatDestination,retreatDestinations} from '../strategic-retreat.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function arrive(s,r){
 for(let i=0;i<10&&!r.battle.reinforcementCouncil;i++)advanceCampaignDay(s);
 assert.equal(r.battle.reinforcementCouncil,'pending');
}

test('multiple real columns join one road battle with more than four reserves and no extra front-line slots',()=>{
 const {s,r,reinforcements}=reinforcementCampaign();
 for(const a of reinforcements){
  arrive(s,r);assert.ok(r.armyIds.includes(a.id));
  const arrived=r.battle.sides[0].units.filter(u=>u.armyId===a.id);
  assert.equal(arrived.length,a.units.length);assert.ok(arrived.every(u=>u.status==='reserve'&&u.arrivalTick===r.battle.tick));
  assert.equal(activeUnits(r.battle,0).length,6);assert.ok(s.armies.every(a=>a.units.length<=10));
  const before=serializeCampaign(s);assert.deepEqual(advanceCampaignStep(s),{reinforcement:true});assert.equal(serializeCampaign(s),before);
  restore(s);assert.equal(confirmReinforcementCouncil(r.battle),null);
 }
 assert.equal(r.battle.sides[0].units.length,11);
 assert.equal(r.battle.sides[0].units.filter(u=>u.status==='reserve').length,5);
 assert.equal(new Set(r.battle.sides[0].units.map(u=>u.id)).size,11);restore(s);
});

test('reinforcement council edits reserves and withdrawal while preserving all live battle state',()=>{
 const {s,r}=reinforcementCampaign();arrive(s,r);const b=r.battle;
 const fronts=activeUnits(b,0).map(u=>structuredClone(u)),time={day:s.campaign.day,tick:b.tick,seed:b.seed,progress:b.commandProgress};
 assert.equal(takeOverBattle(s,r.id),null);assert.equal(b.reinforcementCouncil,'open');assert.equal(b.deploymentLocked,true);
 const queue=b.sides[0].units.filter(u=>u.status==='reserve'),last=queue.at(-1);
 assert.equal(reserveDeploymentUnit(b,last.id,queue[0].id),null);
 assert.equal(b.sides[0].units.filter(u=>u.status==='reserve')[0].id,last.id);
 assert.match(reserveDeploymentUnit(b,fronts[0].id),/在场/);assert.match(changeBattleCouncil(b,{id:fronts[0].id,offset:1}),/在场/);
 assert.ok(deployUnit(b,last.id,0,0));assert.ok(resetDeployment(b));assert.ok(configureBattleIntent(b,'hold'));assert.ok(configureBattleTerrain(b,'forest'));
 stepBattle(b);assert.deepEqual(advanceCampaignStep(s),{reinforcement:true});
 assert.deepEqual(activeUnits(b,0),fronts);assert.deepEqual({day:s.campaign.day,tick:b.tick,seed:b.seed,progress:b.commandProgress},time);
 assert.equal(configureCouncilRetreat(b,[last.id],100),null);
 const destination=retreatDestinations(s,b)[0];assert.ok(destination);assert.equal(configureRetreatDestination(s,b,destination.id),null);
 assert.match(battleCouncilMarkup(b),/援军军议/);assert.doesNotMatch(battleCouncilMarkup(b),/拖回此处/);
 const loaded=restore(s);assert.equal(loaded.battle.reinforcementCouncil,'open');assert.equal(confirmReinforcementCouncil(b),null);confirmReinforcementCouncil(loaded.battle);
 for(let i=0;i<8;i++){advanceCampaignStep(s);advanceCampaignStep(loaded);}
 assert.equal(serializeCampaign(s),serializeCampaign(loaded));restore(s);
});

test('delegated battles can open reinforcement council, delegate again and reject malformed council saves',()=>{
 const {s,r}=reinforcementCampaign({manual:false});arrive(s,r);assert.equal(r.control,'auto');
 const loaded=restore(s);assert.equal(loaded.battle,null);assert.equal(loaded.campaign.battles[0].battle.reinforcementCouncil,'pending');
 const corrupt=JSON.parse(serializeCampaign(s));corrupt.campaign.battles[0].battle.reinforcementCouncil='open';assert.throws(()=>validateCampaign(corrupt),/接管/);
 assert.equal(takeOverBattle(s,r.id),null);assert.equal(r.battle.reinforcementCouncil,'open');
 viewCampaignMap(s);assert.equal(r.battle.reinforcementCouncil,null);assert.equal(r.control,'auto');restore(s);
 assert.ok(configureCouncilRetreat(r.battle,[r.battle.sides[0].units[0].id],1));
});
