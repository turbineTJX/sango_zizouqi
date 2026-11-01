import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {proposeDiplomatic,untilDiplomatic} from './helpers/diplomacy-campaign.mjs';
import {decideDiplomaticProposal,lordCity,diplomaticApprovalError} from '../diplomacy.mjs';
import {factionLord,servingPeople} from '../talent-core.mjs';

test('a recipient renegotiates at its current seat through actual envoy travel, without paying or teleporting',()=>{
 const s=newCampaign(281,'guandu-200');fundCities(s,9000);
 const {p,o}=proposeDiplomatic(s);
 untilDiplomatic(s,()=>p.status==='pending');
 // Mechanism fixture: the pending offer and waiting envoy retain an older seat.
 // The recipient's actual current lord and city remain unchanged.
 const current=lordCity(s,'sunce'),old=s.cities.find(c=>c.owner==='sunce'&&c.id!==current.id);
 assert.ok(old);
 p.sites.sunce=old.id;p.meetingCity=old.id;
 Object.assign(o.unit.mission,{location:old.id,targetCity:old.id,phase:'work',route:[],progress:0});
 const gold=s.cities.map(c=>c.gold),version=p.version;
 assert.match(diplomaticApprovalError(s,p.id,p.version,{faction:'sunce',automatic:true}),/驻城/);
 const blocked=structuredClone(s);blocked.roads=[];
 const blockedBefore=serializeCampaign(blocked);
 assert.match(decideDiplomaticProposal(blocked,p.id,'renegotiate',{faction:'sunce',automatic:true}),/合法路线/);
 assert.equal(serializeCampaign(blocked),blockedBefore,'no route must not reset the offer or teleport');
 assert.equal(decideDiplomaticProposal(s,p.id,'renegotiate',{faction:'sunce',automatic:true}),null);
 assert.equal(p.sites.sunce,current.id);assert.equal(p.meetingCity,current.id);
 assert.equal(o.unit.mission.location,old.id,'request must not teleport the envoy');
 assert.equal(o.unit.mission.route.at(-1),current.id);assert.equal(p.status,'outbound');
 assert.equal(p.version,version+1);assert.deepEqual(p.approvals,{});
 assert.deepEqual(s.cities.map(c=>c.gold),gold,'request must not sign or pay');
 validateCampaign(JSON.parse(serializeCampaign(s)));
 untilDiplomatic(s,()=>p.status==='pending');
 assert.equal(o.unit.mission.location,current.id);
 assert.equal(diplomaticApprovalError(s,p.id,p.version),null);
});

test('the initiating player refreshes only its own settlement city and preserves the envoy position',()=>{
 const s=newCampaign(282,'guandu-200');fundCities(s,9000);
 const {p,o}=proposeDiplomatic(s);
 untilDiplomatic(s,()=>p.status==='pending');
 const current=lordCity(s,'cao'),old=s.cities.find(c=>c.owner==='cao'&&c.id!==current.id);
 p.sites.cao=old.id;
 const mission=structuredClone(o.unit.mission),foreignSite=p.sites.sunce,gold=s.cities.map(c=>c.gold);
 assert.match(diplomaticApprovalError(s,p.id,p.version),/驻城/);
 const absent=structuredClone(s),lord=servingPeople(absent).get(factionLord(absent,'cao')).unit;
 // Mechanism fixture for a lord not currently available at any owned city.
 lord.mission={type:'transfer'};
 const before=serializeCampaign(absent);
 assert.match(decideDiplomaticProposal(absent,p.id,'renegotiate'),/尚未驻己方城市/);
 assert.equal(serializeCampaign(absent),before);
 assert.equal(decideDiplomaticProposal(s,p.id,'renegotiate'),null);
 assert.equal(p.sites.cao,current.id);assert.equal(p.sites.sunce,foreignSite);
 assert.deepEqual(o.unit.mission,mission,'changing the payer city does not move the envoy abroad');
 assert.deepEqual(s.cities.map(c=>c.gold),gold);
 assert.equal(p.status,'negotiating');
 validateCampaign(JSON.parse(serializeCampaign(s)));
 untilDiplomatic(s,()=>p.status==='pending');
 assert.equal(diplomaticApprovalError(s,p.id,p.version),null);
});
