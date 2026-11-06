import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';
import {planStrategicAI} from '../strategic-ai.mjs';
import {proposeFactionPlanning,commitFactionPlanning} from '../ai-policy/action-runtime.mjs';

test('a changed admitted draft cannot bypass the faction task and resource checks',()=>{
 const {s}=planningFront(),before=serializeCampaign(s),p=proposeFactionPlanning(s,draft=>planStrategicAI(draft));
 p.draft.cities[0].gold++;
 assert.throws(()=>commitFactionPlanning(s,p),/草案被修改/);assert.equal(serializeCampaign(s),before);
});
test('a newer real-world change invalidates an earlier faction proposal without overwriting it',()=>{
 const {s}=planningFront(),p=proposeFactionPlanning(s,draft=>planStrategicAI(draft));
 s.cities[0].gold--;const newer=serializeCampaign(s);
 assert.throws(()=>commitFactionPlanning(s,p),/已过期/);assert.equal(serializeCampaign(s),newer);
});
test('an admitted faction proposal is single-use and keeps external city references live',()=>{
 const {s,home}=planningFront(),p=proposeFactionPlanning(s,draft=>planStrategicAI(draft));
 commitFactionPlanning(s,p);assert.strictEqual(s.cities.find(c=>c.id===home.id),home);
 assert.ok(s.armies.some(a=>a.faction==='yuan'));const done=serializeCampaign(s);
 assert.throws(()=>commitFactionPlanning(s,p),/已过期/);assert.equal(serializeCampaign(s),done);
});
