import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {diplomaticCandidates,diplomaticOfficerCandidates,prepareDiplomaticProposal,lordCity,setDiplomaticGoal} from '../diplomacy.mjs';
import {DIPLOMACY_CITY_EXCHANGE as EXCHANGE,DIPLOMACY_WORK} from '../data/design/diplomacy-rules.mjs';
import {observeFixtureCity} from './helpers/observed-city.mjs';

function borderFixture(faction='cao'){
 const s=newCampaign(81),a=s.cities.find(c=>c.id==='chenliu'),b=s.cities.find(c=>c.id==='ye');
 // Deliberately interleave real neighboring holdings to create an actual
 // connection benefit. Production and ordinary campaign audits stay unmodified.
 [a.owner,b.owner]=[b.owner,a.owner];a.domestic.owner=a.owner;b.domestic.owner=b.owner;
 const other=faction==='cao'?'yuan':'cao';
 for(const c of s.cities.filter(c=>c.owner===other))observeFixtureCity(s,c.id,faction,100);
 const o=diplomaticOfficerCandidates(s,faction,'negotiation')[0];assert.ok(o);
 const assignment={faction,officerId:o.unit.id,homeCity:o.location,direction:'negotiation',waiting:''};
 return {s,assignment,other};
}

test('unrelated diplomatic priorities never generate city exchanges',()=>{
 const {s,assignment,other}=borderFixture();
 assert.equal(setDiplomaticGoal(s,'border',other),null);
 assert.ok(diplomaticCandidates(s,assignment).some(c=>c.goal==='border'),'the fixture can propose a useful exchange');
 for(const goal of ['auto','friendship','buyGrain','trade','funding','intelligence']){
  assert.equal(setDiplomaticGoal(s,goal,other),null);
  const saved=serializeCampaign(s),candidates=diplomaticCandidates(s,assignment);
  assert.ok(candidates.every(c=>!c.clauses.some(x=>x.kind==='city')),goal);
  assert.equal(serializeCampaign(s),saved);
 }
});

test('AI city exchange waits six strategic turns and cannot bypass the departure gate',()=>{
 const {s,assignment,other}=borderFixture('yuan');
 assert.equal(setDiplomaticGoal(s,'border',other,{faction:'yuan',scheduled:true}),null);
 s.turn=EXCHANGE.aiMinimumTurn;s.campaign.day=(s.turn-1)*10+1;
 const candidate=diplomaticCandidates(s,assignment).find(c=>c.goal==='border');assert.ok(candidate);
 assert.equal(DIPLOMACY_WORK.city.days,30);
 s.turn=EXCHANGE.aiMinimumTurn-1;s.campaign.day=(s.turn-1)*10+1;
 assert.ok(diplomaticCandidates(s,assignment).every(c=>c.goal!=='border'));
 const saved=serializeCampaign(s);
 assert.equal(prepareDiplomaticProposal(s,assignment,candidate),null);
 assert.equal(serializeCampaign(s),saved,'no fee, proposal ID or journey is created');
});

test('city exchange requires visible cities and better road connections for both factions',()=>{
 const {s,assignment,other}=borderFixture();setDiplomaticGoal(s,'border',other);
 assert.ok(diplomaticCandidates(s,assignment).some(c=>c.goal==='border'));
 s.campaign.vision.factions.cao.scouted=[];
 assert.ok(diplomaticCandidates(s,assignment).every(c=>c.goal!=='border'),'hidden cities cannot be offered using stale observation');
 const q=newCampaign(81),o=diplomaticOfficerCandidates(q,'cao','negotiation')[0];setDiplomaticGoal(q,'border','yuan');
 for(const c of q.cities.filter(c=>c.owner==='yuan'))observeFixtureCity(q,c.id,'cao');
 assert.ok(diplomaticCandidates(q,{faction:'cao',officerId:o.unit.id,homeCity:lordCity(q,'cao').id,direction:'negotiation'}).every(c=>c.goal!=='border'),'ordinary connected territories have no exchange need');
});
