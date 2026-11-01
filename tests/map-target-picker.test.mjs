import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from '../strategic-campaign.mjs';
import {scoutCandidates,scoutTargets,dispatchScout} from '../scouting.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {targetMapMarkup} from '../map-target-picker.mjs';

test('route selection neutralizes a real scout marker while preserving the city target',()=>{
 const s=newCampaign(203,'guandu-200');
 const city=s.cities.find(c=>c.owner==='cao'&&scoutCandidates(s,c.id).length),officer=scoutCandidates(s,city.id)[0],target=scoutTargets(s,city.id)[0];
 assert.equal(dispatchScout(s,city.id,officer.unit.id,target.id),null);
 const before=JSON.stringify(s),marker=armyMapMarkers(s,{});
 assert.match(marker,/data-action="scout-open"/);
 const html=targetMapMarkup(`<g data-city="${target.id}"></g>`+marker,[target.id],target.id);
 assert.doesNotMatch(html,/data-action="scout-open"|data-scout-task=/);
 assert.match(html,/data-command-scout=/);
 assert.ok(html.includes(`data-command-city="${target.id}" data-map-target="selected"`));
 assert.equal(JSON.stringify(s),before);
});
