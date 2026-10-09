import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {newMilitaryFlow,previewMilitaryFlow} from '../military-flow.mjs';
const scene=()=>{const s=newCampaign(33,'guandu-200'),a=fieldFromCity(s,'xuchang');return {s,a};};
test('military adjustments are isolated drafts and validate before committing',()=>{
 const {s,a}=scene(),p=newMilitaryFlow(s,a.id,'adjust'),before=serializeCampaign(s);p.roles.leader=a.units[1].id;p.tactic='defensive';
 // Use an existing legal strategy; changed appointment remains the tested edit.
 p.tactic=a.tactic;const r=previewMilitaryFlow(s,p);assert.equal(r.error,undefined);assert.equal(serializeCampaign(s),before);assert.equal(r.army.leader,a.units[1].id);validateCampaign(r.state);
 p.roles.advisor='absent';assert.ok(previewMilitaryFlow(s,p).error);assert.equal(serializeCampaign(s),before);
});
test('recruitment affects only selected units and previews the actual cost',()=>{
 const {s,a}=scene();a.units.forEach(u=>u.troops=100);const p=newMilitaryFlow(s,a.id,'recruit');p.selected=[a.units[1].id];const before=serializeCampaign(s),r=previewMilitaryFlow(s,p);
 assert.equal(r.error,undefined);assert.ok(r.gold>0);assert.equal(r.grain,0);assert.equal(r.army.units[0].troops,100);assert.ok(r.army.units[1].troops>100);assert.equal(serializeCampaign(s),before);validateCampaign(r.state);
});
test('split and merge previews preserve officers, learning and supplies',()=>{
 const {s,a}=scene(),p=newMilitaryFlow(s,a.id,'split'),u=a.units[0];p.selected=[u.id];p.roles={leader:u.id,advisor:u.id,};const before=serializeCampaign(s),r=previewMilitaryFlow(s,p);
 assert.equal(r.error,undefined);assert.equal(serializeCampaign(s),before);assert.equal(r.army.units.length,1);assert.deepEqual(r.army.units[0].tacticLearning,u.tacticLearning);validateCampaign(r.state);
 const merge=newMilitaryFlow(r.state,a.id,'merge');merge.target=r.army.id;const merged=previewMilitaryFlow(r.state,merge);assert.equal(merged.error,undefined);assert.equal(merged.army.units.length,a.units.length);assert.equal(merged.army.supply,a.supply);validateCampaign(merged.state);
});
test('a moved army invalidates a draft without partial changes',()=>{
 const {s,a}=scene(),p=newMilitaryFlow(s,a.id,'adjust');a.route=['chenliu'];const before=serializeCampaign(s);assert.ok(previewMilitaryFlow(s,p).error);assert.equal(serializeCampaign(s),before);
});
test('army compilation does not require choosing initial deployment before the council',()=>{
 const {s,a}=scene(),p=newMilitaryFlow(s,a.id,'adjust'),before=serializeCampaign(s);
 for(const unit of Object.values(p.units))unit.first=false;
 const r=previewMilitaryFlow(s,p);assert.equal(r.error,undefined);validateCampaign(r.state);assert.equal(serializeCampaign(s),before);
});
