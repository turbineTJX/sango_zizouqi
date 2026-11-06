import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,advanceCampaignStep,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {equippedTreasureIds} from '../treasure-equipment.mjs';

test('extinction transfers originals without rewriting the concluded battle loadout',()=>{
 const s=newCampaign(23,'coalition-190','cao',{allAI:true}),c=s.cities.find(c=>c.id==='chenliu');
 const a=fieldFromCity(s,'town-4'),edge=s.roads.find(pair=>pair.includes(c.id));
 a.location=edge.find(id=>id!==c.id);a.route=[c.id];a.target=c.id;approachDestination(s,a,0);
 s.campaign.phase='executing';s.campaign.ai.lastPlanDay=s.campaign.day;s.campaign.diplomacy.lastDay=s.campaign.day;
 advanceCampaignStep(s);
 const r=s.campaign.battles.find(r=>r.cityId===c.id&&!r.settled);assert.ok(r);
 const defender=r.battle.sides[1-r.attackSide],held=defender.units.flatMap(u=>equippedTreasureIds(u));assert.ok(held.length);
 // End this controlled siege through the common settlement, including actual
 // last-main-city extinction and confiscation. No AI outcome is inferred.
 for(const u of defender.units){u.hp=0;u.battleDamage=u.initial;u.status='defeated';}
 r.battle.result={winner:r.attackSide,reason:'击溃'};
 advanceCampaignStep(s);assert.ok(r.settled);assert.ok(s.campaign.talent.defeats.cao);
 assert.deepEqual(defender.units.flatMap(u=>equippedTreasureIds(u)),held);
 assert.ok(held.every(id=>s.campaign.treasures.items.find(t=>t.id===id).factionId!=='cao'));
 const before=serializeCampaign(s),copy=validateCampaign(JSON.parse(before));assert.equal(serializeCampaign(copy),before);
 for(let n=0;n<3;n++){advanceCampaignStep(s);advanceCampaignStep(copy);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const broken=JSON.parse(before),record=broken.campaign.battles.find(b=>b.id===r.id);
 const u=record.battle.sides[1-record.attackSide].units.find(u=>equippedTreasureIds(u).length);
 u.equipment.weapon=null;
 assert.throws(()=>validateCampaign(broken),'unexplained loadout damage must still fail validation');
});
