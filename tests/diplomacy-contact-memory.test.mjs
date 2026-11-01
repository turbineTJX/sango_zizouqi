import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {proposeDiplomatic,approveAndSign} from './helpers/diplomacy-campaign.mjs';
import {diplomaticCandidates,diplomaticOfficerCandidates,setDiplomaticGoal,lordCity} from '../diplomacy.mjs';
test('signed contacts are remembered only by their participants',()=>{
const s=newCampaign(281,'guandu-200');fundCities(s,9000);
const {p,o}=proposeDiplomatic(s);approveAndSign(s,p);
const seat=p.sites.sunce,old=s.cities.find(c=>c.owner==='sunce'&&c.id!==seat);
// Recreate a stale initial contact after an actual signed meeting.
s.campaign.diplomacy.contacts.sunce=old.id;
setDiplomaticGoal(s,'friendship','sunce');
const a={faction:'cao',officerId:o.unit.id,homeCity:lordCity(s,'cao').id,direction:'friendship'};
const candidate=diplomaticCandidates(s,a).find(c=>c.goal==='friendship');
assert.ok(candidate);
console.log(JSON.stringify({signedSeat:seat,staleContact:old.id,targetCity:candidate.targetCity}));
assert.equal(candidate.targetCity,seat,'a participant should retain the seat confirmed by its own signed agreement');
assert.equal(setDiplomaticGoal(s,'friendship','sunce',{faction:'yuan',scheduled:true}),null);
const outsider=diplomaticOfficerCandidates(s,'yuan','friendship')[0];assert.ok(outsider);
const third=diplomaticCandidates(s,{faction:'yuan',officerId:outsider.unit.id,homeCity:outsider.location,direction:'friendship'}).find(c=>c.other==='sunce');
assert.ok(third);assert.equal(third.targetCity,old.id,'a third party must not learn the privately confirmed seat');
console.log('participant memory and third-party isolation passed');

});
