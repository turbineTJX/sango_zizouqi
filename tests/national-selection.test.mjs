import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,assignDomestic,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {nationalLobby} from '../national-lobby.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
// All source rulers are initialized and saved in reference-scenarios.test.mjs;
// daily control here samples a different non-Cao ruler in each new layout.
const controlSamples={'coalition-190':'force-6','warlords-194':'lijue','red-cliffs-208':'sunquan','hanzhong-219':'force-2','all-heroes-251':'force-29'};
for(const spec of NATIONAL_SCENARIOS)for(const faction of spec.factions.filter(f=>!controlSamples[spec.id]||f===controlSamples[spec.id]))test(`${spec.id}: control and persistence for ${faction}`,()=>{
 const s=newCampaign(521200,spec.id,faction),rows=campaignOfficers(s);
 assert.ok(rows.length>0);const expected=[...s.cities.filter(c=>c.owner===faction).flatMap(c=>c.units.map(u=>u.id)),...s.campaign.idle.filter(o=>o.faction===faction).map(o=>o.unit.id)];assert.deepEqual(rows.map(r=>r.unit.id).sort(),expected.sort());
 assert.deepEqual(Object.keys(s.campaign.ai.factions).sort(),spec.factions.filter(f=>f!==faction).sort());
 assert.equal(s.grain,Math.floor(s.cities.filter(c=>c.owner===faction).reduce((n,c)=>n+c.grain,0)));
 const own=s.cities.find(c=>c.owner===faction&&rows.some(r=>r.location===c.id));
 const officer=rows.find(r=>r.location===own.id);assert.equal(assignDomestic(s,own.id,'agriculture',officer.unit.id),null);
 assert.ok(assignDomestic(s,s.cities.find(c=>c.owner!==faction).id,'agriculture',officer.unit.id));
 assert.equal(restore(s).campaign.playerFaction,faction);
 beginExecution(s);advanceCampaignDay(s);const copy=restore(s);
 for(const value of [s,copy]){for(const b of activeBattles(value).filter(b=>b.awaiting))chooseEncounter(value,b.id,false);advanceCampaignDay(value);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
 for(const r of activeBattles(s)){for(const side of r.battle.sides)for(const u of side.units){if(u.armyId.startsWith('city:'))continue;assert.equal(r.armies.find(a=>a.id===u.armyId)?.faction,side.faction);}if(r.armies.some(a=>a.faction===faction))assert.equal(r.battle.sides[0].faction,faction);}
});
test('lobby requires scenario then faction and invalid faction cannot start',()=>{
 assert.doesNotMatch(nationalLobby(null),/data-action="launch-national"/);
 assert.match(nationalLobby(null,{step:'faction',scenarioId:'guandu-200'}),/data-action="launch-national" disabled/);
 assert.throws(()=>newCampaign(1,'guandu-200','force-2'),/剧本势力无效/);
 const s=newCampaign(1,'guandu-200','yuan');s.campaign.playerFaction='force-2';assert.throws(()=>restore(s),/玩家势力无效/);
});
test('Yuan expedition uses the real march and battle flow with the player on side zero',async()=>{
 const {launchExpedition}=await import('../strategic-campaign.mjs');
 const s=newCampaign(521200,'guandu-200','yuan');
 const edge=s.roads.flatMap(([a,b])=>[[a,b],[b,a]]).find(([from,to])=>s.cities.some(c=>c.id===from&&c.owner==='yuan'&&c.units.length)&&s.cities.some(c=>c.id===to&&c.owner==='cao'));
 assert.ok(edge);const c=s.cities.find(c=>c.id===edge[0]),ids=c.units.slice(0,6).map(u=>u.id);
 assert.equal(launchExpedition(s,{cityId:c.id,target:edge[1],officerIds:ids,leader:ids[0],advisor:ids[0],policy:'auto'}),null);
 const armyId=s.armies.at(-1).id;let encounter;
 for(let i=0;i<20&&!encounter;i++){
  if(s.campaign.phase==='planning')beginExecution(s);
  advanceCampaignDay(s);encounter=activeBattles(s).find(r=>r.armyIds.includes(armyId));
  for(const r of activeBattles(s).filter(r=>r.awaiting&&r!==encounter))chooseEncounter(s,r.id,false);
 }
 assert.ok(encounter);assert.equal(encounter.battle.sides[0].faction,'yuan');assert.equal(encounter.battle.sides[1].faction,'cao');assert.equal(encounter.awaiting,true);
 const copy=restore(s);for(const value of [s,copy]){for(const r of activeBattles(value).filter(r=>r.awaiting))chooseEncounter(value,r.id,false);advanceCampaignDay(value);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
