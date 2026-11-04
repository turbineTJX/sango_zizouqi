import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_SCENARIOS,nationalWorld} from '../national-scenarios.mjs';
import {createScenarioDocument,validateScenarioDocument} from '../scenario-document.mjs';
import {isMainCity,factionHasMainCity} from '../city-classification.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep} from './helpers/auto-domestic-campaign.mjs';
import {noteTalentCityCapture,processTalentDefeats} from '../talent-lifecycle.mjs';
import {cityCaptureContext,officerReturnCity,displaceCityOfficers} from '../officer-fates.mjs';
import {cancelDomestic,reconcileDomestic} from '../domestic.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {planVictoryStrategy} from '../strategic-victory.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {diplomaticOfficerCandidates,assignDiplomat,prepareDiplomaticProposal,lordCity,diplomaticRoute} from '../diplomacy.mjs';
import {diplomaticPair} from '../diplomacy-relations.mjs';

test('all seven built-in openings give every playable faction a fixed main city',()=>{
 for(const spec of NATIONAL_SCENARIOS){const w=nationalWorld(spec.id);for(const f of spec.factions)assert.ok(factionHasMainCity(w,f),spec.id+':'+f);assert.ok(isMainCity(w.cities.find(c=>c.id==='chenliu')));validateScenarioDocument(createScenarioDocument(spec.id));}
});
test('custom scenarios reject factions owning only small cities, even with a valid ruler and seat',()=>{
 const d=createScenarioDocument('coalition-190'),f=d.forces.find(f=>f.id==='cao'),small=d.cities.find(c=>c.id==='atlas-jingxing');
 for(const c of d.cities)if(c.owner==='cao')c.owner='neutral';small.owner='cao';f.capitalId=small.id;
 for(const o of d.officers)if(o.faction==='cao')o.cityId=small.id;
 assert.throws(()=>validateScenarioDocument(d),/没有主城/);assert.ok(validateScenarioDocument(d,{playable:false}));
});
test('losing the last main city frees distant residents and field forces, neutralizes small holdings and transfers the treasury once',()=>{
 const s=newCampaign(23,'coalition-190'),seat=s.cities.find(c=>c.id==='chenliu'),small=s.cities.find(c=>c.id==='atlas-jingxing');
 small.owner='cao';const resident=seat.units.pop();resident.homeCity=small.id;small.units.push(resident);reconcileDomestic(s);
 const army=fieldFromCity(s,seat.id),ids=[resident.id,...army.units.map(u=>u.id)],stock={gold:small.gold,grain:small.grain,manpower:small.manpower};
 const treasure=s.campaign.treasures.items.find(t=>t.factionId==='cao'&&t.state==='treasury');assert.ok(treasure);
 // Only the main city changes hands; the small city still belongs to Cao here.
 seat.owner='yuan';assert.equal(cityCaptureContext(s,'cao'),'elimination');assert.equal(officerReturnCity(s,resident,'cao'),null);
 noteTalentCityCapture(s,'cao','yuan','last-main');processTalentDefeats(s,cancelDomestic);reconcileDomestic(s);syncResourceTotals(s);
 assert.equal(small.owner,'neutral');assert.deepEqual({gold:small.gold,grain:small.grain,manpower:small.manpower},stock);assert.equal(small.units.length,0);assert.ok(!s.armies.some(a=>a.faction==='cao'));
 for(const id of ids){const people=s.campaign.domestic.people.filter(p=>p.id===id);assert.equal(people.length,1);assert.equal(people[0].status,'FREE');assert.equal(people[0].unit.troops,0);assert.equal(people[0].unit.wounded,0);}
 assert.equal(treasure.factionId,'yuan');assert.equal(treasure.state,'treasury');
 const saved=serializeCampaign(s);processTalentDefeats(s,cancelDomestic);noteTalentCityCapture(s,'cao','yuan','last-main');assert.equal(serializeCampaign(s),saved);validateCampaign(JSON.parse(saved));
});
for(const allAI of [false,true])test(`a real empty-city occupation destroys a faction with a surviving small holding (${allAI?'AI':'player'})`,()=>{
 const s=newCampaign(23,'coalition-190','cao',{allAI}),seat=s.cities.find(c=>c.id==='chenliu'),small=s.cities.find(c=>c.id==='atlas-jingxing');small.owner='cao';
 seat.manpower=0;for(const u of seat.units)u.troops=0;
 const a=fieldFromCity(s,'town-4');const from=s.roads.find(e=>e.includes(seat.id)).find(id=>id!==seat.id);a.location=from;a.route=[seat.id];a.target=seat.id;approachDestination(s,a,.5);reconcileDomestic(s);syncResourceTotals(s);
 s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
 assert.equal(seat.owner,'yuan');assert.equal(small.owner,'neutral');assert.equal(s.finished,allAI?null:'defeat');const copy=validateCampaign(JSON.parse(serializeCampaign(s)));
 if(allAI){for(let i=0;i<2;i++){advanceCampaignDay(s);advanceCampaignDay(copy);}assert.equal(serializeCampaign(s),serializeCampaign(copy));}
});
test('losing a small city leaves a faction with its main city alive and its treasury intact',()=>{
 const s=newCampaign(23,'coalition-190'),small=s.cities.find(c=>c.id==='atlas-jingxing');small.owner='cao';
 const before=JSON.stringify(s.campaign.treasures),ids=s.cities.find(c=>c.id==='chenliu').units.map(u=>u.id);small.owner='yuan';
 assert.equal(cityCaptureContext(s,'cao'),'siege');noteTalentCityCapture(s,'cao','yuan','small-only');processTalentDefeats(s,cancelDomestic);
 assert.ok(factionHasMainCity(s,'cao'));assert.deepEqual(s.cities.find(c=>c.id==='chenliu').units.map(u=>u.id),ids);assert.equal(JSON.stringify(s.campaign.treasures),before);
});
test('diplomacy cannot trade away the last main city while retaining a small city',()=>{
 const s=newCampaign(23,'coalition-190');s.cities.find(c=>c.id==='atlas-jingxing').owner='cao';
 const o=diplomaticOfficerCandidates(s,'cao','negotiation')[0];assert.ok(assignDiplomat(s,o.unit.id,'negotiation',{choice:'now'}).applied);
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId===o.unit.id),other='force-18',targetCity=lordCity(s,other).id,path=diplomaticRoute(s,a.homeCity,targetCity,'cao',other);
 s.campaign.diplomacy.relations[diplomaticPair('cao',other)]=100;
 s.campaign.diplomacy.wars[diplomaticPair('cao',other)].active=false;
 assert.equal(prepareDiplomaticProposal(s,a,{goal:'border',other,targetCity,path,clauses:[{kind:'city',from:'cao',to:other,cityId:'chenliu'}],score:100,reason:'主城交换资格'}),null);
 assert.match(a.waiting,/主城/);
});
test('AI values a known last main city for elimination even when the enemy retains a small city',()=>{
 const context={faction:'us',ownCities:[{id:'home'}],territory:{cities:[{id:'home',owner:'us',citySize:'large'},{id:'seat',owner:'enemy',citySize:'large'},{id:'small',owner:'enemy',citySize:'small'}],edges:[['home','seat'],['home','small']]}};
 const result=planVictoryStrategy(context);assert.equal(result.targets.seat.elimination,R.victory.eliminationValue);assert.equal(result.targets.small.elimination,0);
});
test('an already engaged expedition settles its real battle after extinction without reviving the faction by taking a main city',()=>{
 const s=newCampaign(23,'coalition-190','cao',{allAI:true}),seat=s.cities.find(c=>c.id==='chenliu'),target=s.cities.find(c=>c.id==='town-12'),owner=target.owner;
 const a=fieldFromCity(s,seat.id),ids=a.units.map(u=>u.id);a.location=s.roads.find(e=>e.includes(target.id)).find(id=>id!==target.id);a.route=[target.id];a.target=target.id;approachDestination(s,a,.5);
 s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
 const r=s.campaign.battles.find(r=>!r.settled&&r.armyIds.includes(a.id));assert.ok(r);assert.equal(r.kind,'siege');
 seat.owner='yuan';noteTalentCityCapture(s,'cao','yuan','last-main-during-siege');displaceCityOfficers(s,seat.id,'cao','last-main-during-siege');processTalentDefeats(s,cancelDomestic);reconcileDomestic(s);
 assert.ok(s.armies.includes(a));assert.ok(!s.campaign.talent.processedEvents.includes('last-main-during-siege'));
 syncResourceTotals(s);const copy=validateCampaign(JSON.parse(serializeCampaign(s))),other=copy.campaign.battles.find(b=>b.id===r.id);
 // End the opposing formation in this battle fixture, then use the real settlement.
 for(const record of [r,other]){for(const u of record.battle.sides[1-record.attackSide].units){u.hp=0;u.battleDamage=u.initial;u.status='defeated';}if(record.battle.siege?.gate)record.battle.siege.gate.hp=0;}
 for(let i=0;i<24&&!r.settled;i++){advanceCampaignStep(s);advanceCampaignStep(copy);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));
 assert.ok(r.settled);assert.equal(r.battle.result.winner,r.attackSide);assert.equal(target.owner,owner);assert.ok(!s.armies.some(a=>a.faction==='cao'));
 for(const id of ids)assert.ok(s.campaign.domestic.people.some(p=>p.id===id&&p.status==='FREE'));
 syncResourceTotals(s);validateCampaign(JSON.parse(serializeCampaign(s)));
});
