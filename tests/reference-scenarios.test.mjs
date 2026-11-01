import test from 'node:test';
import assert from 'node:assert/strict';
import {REFERENCE_SCENARIO} from '../data/design/reference-scenario.mjs';
import {NATIONAL_SCENARIOS,NATIONAL_FACTIONS,nationalWorld,nationalRoster,nationalPersonnel,scenarioOfficerEligible} from '../national-scenarios.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {playerHome} from '../player-faction.mjs';
import {createScenarioDocument} from '../scenario-document.mjs';
import {servingPeople} from '../talent-core.mjs';
import {discoverTalent,activateScheduledScenarioPeople} from '../talent-lifecycle.mjs';
import {newCampaign,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
const added=NATIONAL_SCENARIOS.filter(s=>s.rosterDistribution==='reference');
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
for(const spec of added){
 test(`${spec.name}: every selectable ruler owns a city and keeps unique real officers in their declared homes`,()=>{
  const w=nationalWorld(spec.id),roster=nationalRoster(spec.id,w.cities);assert.equal(w.cities.length,76);assert.equal(w.junctions.length,77);assert.equal(w.roads.length,223);
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

test('reference snapshot carries all public source years and reproducible provenance without importing abilities',()=>{
 assert.deepEqual([REFERENCE_SCENARIO.source.year,REFERENCE_SCENARIO.source.month,REFERENCE_SCENARIO.source.day],[251,1,1]);
 assert.equal(REFERENCE_SCENARIO.source.relatedFiles.length,3);assert.match(REFERENCE_SCENARIO.source.sha256,/^[a-f0-9]{64}$/);
 for(const p of REFERENCE_SCENARIO.people){assert.ok([p.debutYear,p.birthYear,p.deathYear].every(Number.isSafeInteger));assert.equal(p.command,undefined);assert.equal(p.strength,undefined);}
 for(const [sourceId,year]of [[226,198],[290,208],[137,225],[482,216]])assert.equal(REFERENCE_SCENARIO.people.find(p=>p.sourceId===sourceId).debutYear,year);
});

test('all seven editor templates carry every person, allegiance, source location and availability date',()=>{
 for(const spec of NATIONAL_SCENARIOS){
  const world=nationalWorld(spec.id),personnel=nationalPersonnel(spec.id,world.cities),doc=createScenarioDocument(spec.id),s=newCampaign(93,spec.id),serving=servingPeople(s);
  assert.equal(doc.kind,spec.kind);assert.equal(doc.officers.length,832);assert.deepEqual(doc.officers,personnel);
  for(const o of personnel){
   const person=s.campaign.domestic.people.find(p=>p.id===o.id);
   if(serving.has(o.id)){assert.equal(o.state,'serving');assert.equal(serving.get(o.id).faction,o.faction);continue;}
   assert.equal(person.cityId,o.cityId);
   if(['dead','excluded'].includes(o.state)){assert.equal(person.status,o.state.toUpperCase());continue;}
   const expected=(o.debutDate.year-spec.year)*360+1;assert.equal(person.debutDay,Math.max(1,expected));assert.equal(person.status,expected>1?'NOT_DEBUTED':'FREE');
   if(o.state==='free')assert.deepEqual(o.freeDate,o.debutDate);
  }
 }
 const heroes=newCampaign(93,'heroes-251');assert.equal(heroes.campaign.domestic.people.find(p=>p.id==='person-2').status,'FREE');assert.equal(servingPeople(heroes).has('person-2'),false);
});

// Move only the fixture calendar near a real source year, then use the actual
// daily processor across New Year. This is a timing regression, not a natural run.
function nearYear(s,year){const day=(year-190)*360;s.campaign.day=day;s.campaign.phase='executing';s.turn=Math.floor((day-1)/10)+1;s.campaign.domestic.lastFinishedDay=day-1;s.campaign.talent.lastDay=day-1;}
test('a built-in future officer waits until the reference year, joins the original force once and survives saving',()=>{
 const s=newCampaign(41,'coalition-190'),id='person-226',p=s.campaign.domestic.people.find(p=>p.id===id);
 assert.equal(p.status,'NOT_DEBUTED');assert.equal(p.debutDay,2881);assert.equal(discoverTalent(s,id,'cao'),false);assert.equal(servingPeople(s).has(id),false);
 nearYear(s,198);const copy=restore(s);assert.equal(copy.campaign.domestic.people.find(p=>p.id===id).status,'NOT_DEBUTED');
 for(const value of [s,copy]){advanceCampaignDay(value);assert.equal(value.campaign.day,2881);assert.equal(servingPeople(value).get(id).faction,'force-6');assert.equal(servingPeople(value).get(id).location,'luoyang');activateScheduledScenarioPeople(value);assert.equal([...servingPeople(value).keys()].filter(k=>k===id).length,1);restore(value);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('a built-in future officer goes wild at the declared city if that city has changed hands',()=>{
 const s=newCampaign(41,'coalition-190'),id='person-226';nearYear(s,198);
 s.campaign.day++;s.turn++;s.cities.find(c=>c.id==='luoyang').owner='cao';activateScheduledScenarioPeople(s);
 const p=s.campaign.domestic.people.find(p=>p.id===id);assert.equal(p.status,'FREE');assert.equal(p.cityId,'luoyang');assert.equal(servingPeople(s).has(id),false);activateScheduledScenarioPeople(s);assert.equal(s.campaign.domestic.people.filter(p=>p.id===id).length,1);
});

test('a built-in free person becomes discoverable at the reference debut year without being forced into service',()=>{
 const s=newCampaign(41,'coalition-190'),id='person-2';assert.equal(s.campaign.domestic.people.find(p=>p.id===id).debutDay,(223-190)*360+1);nearYear(s,223);
 assert.equal(discoverTalent(s,id,'cao'),false);const copy=restore(s);advanceCampaignDay(s);advanceCampaignDay(copy);
 const p=s.campaign.domestic.people.find(p=>p.id===id);assert.equal(p.status,'FREE');assert.equal(p.cityId,'town-24');assert.equal(servingPeople(s).has(id),false);assert.equal(discoverTalent(s,id,'cao'),true);assert.equal(discoverTalent(copy,id,'cao'),true);assert.equal(serializeCampaign(s),serializeCampaign(copy));restore(s);
});
