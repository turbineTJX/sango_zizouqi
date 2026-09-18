import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_SOURCE} from '../data/officers.mjs';
import {OFFICER_CATALOG,OFFICER_BY_ID,LEGACY_SOURCE_IDS,searchOfficers} from '../officer-catalog.mjs';
import {rosterMarkup,officerDetailMarkup} from '../officer-roster.mjs';
import {makeOfficer,newGame,validateSave,stepBattle,settleBattle,unitAttributes,officerStratagems} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {passiveList,SKILL_ROUTES} from '../passives.mjs';
import {unitTactics} from '../tactics.mjs';
import {gainExperience} from '../progression.mjs';

test('all 832 library and 3 custom records survive normalization without merging names or source fields',()=>{
 assert.equal(OFFICER_CATALOG.length,835);
 assert.equal(OFFICER_CATALOG.filter(u=>u.sourceKind==='common').length,832);
 assert.equal(OFFICER_CATALOG.filter(u=>u.sourceKind==='custom').length,3);
 assert.equal(new Set(OFFICER_CATALOG.map(u=>u.id)).size,835);
 for(const entry of OFFICER_SOURCE){
  const u=OFFICER_CATALOG.find(u=>u.sourceKind===entry.kind&&u.sourceId===entry.source.Id);
  assert.deepEqual(u.source,entry.source);assert.equal(u.name,entry.source.Name);
  assert.equal(u.charm,entry.source.glamour);
 }
 assert.equal(searchOfficers({query:'张南'}).filter(u=>u.name==='张南').length,2);
 assert.equal(searchOfficers({query:'李丰'}).filter(u=>u.name==='李丰').length,3);
 assert.notEqual(OFFICER_BY_ID['custom-1'].id,OFFICER_BY_ID['person-1'].id);
 assert.equal(OFFICER_BY_ID.he.sourceId,412);assert.equal(searchOfficers({query:'张郃'})[0].id,'he');
});
test('every officer has five growth skills; ordinary officers have no exclusive tactics and only authored commander stratagems',()=>{
 const historicalCommanders={'person-610':['fortify','heal'],'person-167':['fortify','cleanse'],'person-447':['disrupt','cleanse','cycle']};
 for(const entry of OFFICER_CATALOG){
  const u=makeOfficer(entry.id);assert.equal(u.leadership,entry.source.command);assert.equal(u.force,entry.source.strength);
  assert.equal(u.intellect,entry.source.intelligence);assert.equal(u.politics,entry.source.politics);
  const stats=unitAttributes(u);for(const key of ['attack','defense','martialPower','strategyPower','discipline'])assert.ok(Number.isFinite(stats[key]));
  assert.equal(unitTactics(u).length,3);
  if(!SKILL_ROUTES[u.id]){
   assert.equal(u.skill,'');assert.deepEqual(officerStratagems(u.id),historicalCommanders[u.id]||[]);
   const growth=gainExperience(u,10000);assert.equal(u.level,10);assert.equal(growth.unlocked.length,5);assert.equal(passiveList(u).length,5);assert.ok(passiveList(u).every(s=>s.tier!=='专属'));
  }else assert.equal(passiveList({...u,level:10}).length,5);
 }
 for(const id of ['missing','toString','__proto__'])assert.throws(()=>makeOfficer(id),/未知武将/);
});
test('catalogue search, source filters, descending stats, no-result and HTML escaping',()=>{
 assert.ok(searchOfficers({query:'孔明'}).some(u=>u.sourceId===290));
 assert.equal(searchOfficers({kind:'custom'}).length,3);
 const sorted=searchOfficers({sort:'force'});assert.ok(sorted.every((u,i)=>i===0||u.force<=sorted[i-1].force));
 assert.deepEqual(searchOfficers({query:'没有这个武将'}),[]);
 assert.match(rosterMarkup({query:'"><script>alert(1)</script>'}),/&lt;script&gt;/);
 assert.doesNotMatch(rosterMarkup({query:'"><script>alert(1)</script>'}),/<script>/);
 assert.match(rosterMarkup({page:999}),/35 \/ 35/);
 assert.match(officerDetailMarkup('person-290'),/100/);assert.match(officerDetailMarkup('custom-1'),/小美/);
 assert.ok(OFFICER_BY_ID['person-290'].biography.includes('\n'));
 assert.ok(!OFFICER_BY_ID['person-290'].biography.includes('<color'));
});
test('custom rosters including legacy enemies and same-name people save, resume and settle deterministically',()=>{
 for(const ids of [['person-290','person-246','person-661'],['shao','he','yan','custom-1','person-429','person-430'],['custom-3']]){
  const state=createScenario('officer-lab',21,20,ids);
  assert.deepEqual(state.testScenario.officerIds,ids);assert.equal(state.armies[0].leader,ids[0]);
  for(let i=0;i<15;i++)stepBattle(state.battle);
  const resumed=validateSave(structuredClone(state));
  while(!state.battle.result){stepBattle(state.battle);stepBattle(resumed.battle);}
  assert.deepEqual(resumed.battle,state.battle);
  const report=settleBattle(state);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.killed+side.wounded);
  validateSave(structuredClone(state));
 }
});
test('every catalogue record is accepted by battle save validation without relying on name matching',()=>{
 for(let i=0;i<OFFICER_CATALOG.length;i+=6){
  const ids=OFFICER_CATALOG.slice(i,i+6).map(u=>u.id),state=createScenario('officer-lab',1,20,ids);
  stepBattle(state.battle);validateSave(structuredClone(state));
 }
});
test('invalid custom roster, unknown source ID, edited attributes and duplicate IDs are rejected',()=>{
 for(const ids of [[],['person-290','person-290'],['missing'],['toString'],OFFICER_CATALOG.slice(0,7).map(u=>u.id)])assert.throws(()=>createScenario('officer-lab',1,20,ids));
 assert.throws(()=>createScenario('field',1,20,['person-290']));
 for(const mutate of [
  s=>s.testScenario.officerIds=['missing'],
  s=>s.armies[0].units[0].intellect++,
  s=>s.battle.sides[0].units[0].politics++,
  s=>s.testScenario.officerIds.push(s.testScenario.officerIds[0])
 ]){
  const state=createScenario('officer-lab');mutate(state);assert.throws(()=>validateSave(state));
 }
});
test('old officer data versions are rejected without changing saved progress',()=>{
 for(const version of [undefined,1,3])for(const s of [newGame(25),createScenario('field',25)]){
  s.officerDataVersion=version;const before=structuredClone(s);
  assert.throws(()=>validateSave(s),/武将数据版本/);assert.deepEqual(s,before);
 }
});
