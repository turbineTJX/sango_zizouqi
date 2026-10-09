import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCE_SCENARIO} from '../data/design/reference-scenario.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS,nationalWorld,nationalRoster,scenarioOfficerEligible} from '../national-scenarios.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {playerHome} from '../player-faction.mjs';
import {newCampaign,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
const added=NATIONAL_SCENARIOS.filter(s=>s.rosterDistribution==='reference');
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
for(const spec of added){
 test(`${spec.name}: every selectable ruler owns a city and keeps unique real officers in their declared homes`,()=>{
  const w=nationalWorld(spec.id),roster=nationalRoster(spec.id,w.cities);assert.equal(w.cities.length,76);assert.equal(w.junctions.length,70);assert.equal(w.roads.length,280);
  assert.equal(new Set(roster.map(r=>r.id)).size,roster.length);
  const s=newCampaign(217,spec.id),actual=[...s.cities.flatMap(c=>c.units.map(u=>({id:u.id,faction:c.owner,cityId:c.id}))),...s.campaign.idle.map(o=>({id:o.unit.id,faction:o.faction,cityId:o.location}))];
  assert.deepEqual(actual.sort((a,b)=>a.id.localeCompare(b.id)),[...roster].sort((a,b)=>a.id.localeCompare(b.id)));
  for(const row of roster){assert.ok(scenarioOfficerEligible(spec,OFFICER_BY_ID[row.id]));assert.equal(w.cities.find(c=>c.id===row.cityId)?.owner,row.faction);assert.equal(OFFICER_BY_ID[row.id].sourceKind,'common');}
  for(const faction of spec.factions){
   const start=newCampaign(217,spec.id,faction),rows=campaignOfficers(start);assert.ok(rows.length>0);assert.ok(rows.some(r=>OFFICER_BY_ID[r.unit.id].sourceId===NATIONAL_FACTIONS[faction].leaderSourceId));
   assert.equal(start.cities.find(c=>c.id===playerHome(start)).owner,faction);assert.equal(restore(start).campaign.playerFaction,faction);
  }
 });
 test(`${spec.name}: a real expedition moves and continues deterministically after saving`,()=>{
  const s=newCampaign(217,spec.id),c=s.cities.find(c=>c.id===playerHome(s)),ids=c.units.map(u=>u.id);assert.ok(ids.length);
  const edge=s.roads.find(e=>e.includes(c.id)),target=edge.find(id=>id!==c.id);
  assert.equal(launchExpedition(s,{cityId:c.id,target,officerIds:ids,leader:ids[0],advisor:ids[1]||ids[0],policy:'auto'}),null);
  const armyId=s.armies.at(-1).id;
  const advance=value=>{if(value.campaign.phase==='planning')beginExecution(value);for(const b of activeBattles(value).filter(b=>b.awaiting))chooseEncounter(value,b.id,false);advanceCampaignDay(value);};
  advance(s);const copy=restore(s);for(let day=0;day<3;day++){advance(s);advance(copy);}
  assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);const army=s.armies.find(a=>a.id===armyId);assert.ok(army.travel||army.location===target||activeBattles(s).some(b=>b.armyIds.includes(armyId)));
 });
}
test('full source scenario preserves the project city owners and serving public people; the historical eras really differ',()=>{
 const w=nationalWorld('all-heroes-251'),r=nationalRoster('all-heroes-251',w.cities),faction=n=>n===1?'cao':n===8?'yuan':n?`force-${n}`:'neutral';
 assert.equal(NATIONAL_SCENARIOS.length,7);assert.equal(NATIONAL_SCENARIOS.find(s=>s.id==='all-heroes-251').factions.length,37);assert.equal(REFERENCE_SCENARIO.people.length,832);
 for(const c of REFERENCE_SCENARIO.cities)assert.equal(w.cities.find(x=>x.sourceId===c.sourceId).owner,faction(c.forceId));
 const sourceActive=REFERENCE_SCENARIO.people.filter(p=>[1,2,3,4].includes(p.state)&&REFERENCE_SCENARIO.forces.some(f=>f.sourceId===p.forceId));assert.equal(r.length,sourceActive.length);
 for(const p of sourceActive){const row=r.find(o=>OFFICER_BY_ID[o.id].sourceId===p.sourceId);assert.equal(row.faction,faction(p.forceId));assert.equal(w.cities.find(c=>c.id===row.cityId).sourceId,p.citySourceId);}
 const a=nationalWorld('coalition-190'),b=nationalWorld('warlords-194'),c=nationalWorld('red-cliffs-208'),d=nationalWorld('hanzhong-219');
 assert.notDeepEqual(a.cities.map(c=>c.owner),b.cities.map(c=>c.owner));assert.notDeepEqual(c.cities.map(c=>c.owner),d.cities.map(c=>c.owner));
 const late=nationalRoster('hanzhong-219',d.cities);assert.ok(!late.some(o=>o.id==='jia'));for(const id of ['person-125','person-186'])assert.equal(late.find(o=>o.id===id).faction,'force-2');
 assert.equal(nationalRoster('coalition-190',a.cities).find(o=>o.id==='person-447').faction,'cao');
});
