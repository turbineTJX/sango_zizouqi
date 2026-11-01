import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_BY_ID,OFFICER_CATALOG,BASE_OFFICER_CATALOG,currentOfficerLibrary,activateOfficerLibrary,withOfficerLibrary} from '../officer-catalog.mjs';
import {OFFICER_STATS,officerEdit,newOfficerDocument,emptyOfficerLibrary,validateOfficerDocument,validateOfficerLibrary,mergeOfficerLibrary} from '../officer-library-data.mjs';
import {OfficerEditor} from '../officer-editor.mjs';
import {makeOfficer,validateSave,stepBattle} from '../engine.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {troopAptitude} from '../tactic-learning.mjs';
import {newScenarioSetup,scenarioSetupOfficer} from '../scenario-setup.mjs';
import {nationalLobby} from '../national-lobby.mjs';

const customId='custom-12345678123412341234123456789abc';
const custom=()=>({...newOfficerDocument(customId),name:'测试将军',charm:97,force:88,intellect:11,aptitudes:{spear:3,halberd:0,cavalry:2,archer:1}});
const library=()=>({...emptyOfficerLibrary(),officers:[custom(),{...officerEdit(BASE_OFFICER_CATALOG.find(o=>o.id==='cao')),name:'测试曹操',force:0,charm:100}]});

test('editor schema accepts all 832 public profiles and preserves charm and zero values',()=>{
 for(const u of BASE_OFFICER_CATALOG)assert.deepEqual(validateOfficerDocument(officerEdit(u)),officerEdit(u));
 const d=custom();for(const [key]of OFFICER_STATS)d[key]=0;d.sex=0;d.compatibility=0;
 assert.equal(validateOfficerDocument(d).charm,0);assert.equal(validateOfficerDocument(d).compatibility,0);
 for(const change of [d=>d.name=' ',d=>d.name='<将军>',d=>d.charm=null,d=>d.force=101,d=>d.intellect=1.5,d=>d.aptitudes.spear=4,d=>d.deathYear=d.birthYear,d=>d.id='custom-1',d=>d.skill='fake']){const d=custom();change(d);assert.throws(()=>validateOfficerDocument(d));}
 assert.throws(()=>validateOfficerLibrary({...library(),officers:[custom(),custom()]}),/重复/);
});
test('catalogue installation and exception scopes preserve public identities and leave formal data untouched',()=>{
 const original=structuredClone(BASE_OFFICER_CATALOG),before=currentOfficerLibrary();
 assert.throws(()=>withOfficerLibrary(library(),()=>{assert.equal(OFFICER_CATALOG.length,833);assert.equal(OFFICER_BY_ID.cao.force,0);assert.equal(OFFICER_BY_ID[customId].charm,97);assert.ok(OFFICER_BY_ID.cao.aliases.includes('曹操'));throw Error('scope');}),/scope/);
 assert.deepEqual(currentOfficerLibrary(),before);assert.deepEqual(BASE_OFFICER_CATALOG,original);assert.equal(OFFICER_BY_ID[customId],undefined);
});
test('saving is transactional, switching requires a choice, restoring and copying keep correct identities',async()=>{
 let stored=emptyOfficerLibrary(),reject=false;const storage={async write(next){if(reject)throw Error('disk full');stored=structuredClone(next);}};
 const editor=new OfficerEditor({storage});editor.draft.charm=0;const before=structuredClone(editor.library);reject=true;
 await assert.rejects(()=>editor.save(),/disk full/);assert.deepEqual(editor.library,before);assert.ok(editor.dirty);assert.equal(stored.officers.length,0);
 editor.navigate('load','dun');assert.equal(editor.draft.id,'cao');assert.equal(editor.pending.kind,'leave');
 reject=false;await editor.action('save-leave');assert.equal(editor.draft.id,'dun');assert.equal(stored.officers[0].charm,0);
 editor.navigateNow('copy');assert.notEqual(editor.draft.id,'dun');assert.equal(editor.draft.charm,OFFICER_BY_ID.dun.charm);await editor.save();assert.equal(stored.officers.length,2);
 editor.load('cao');await editor.action('confirm-reset');assert.equal(stored.officers.length,1);assert.equal(editor.draft.charm,OFFICER_BY_ID.cao.charm);
 editor.load(stored.officers[0].id);await editor.action('confirm-delete');assert.equal(stored.officers.length,0);
});
test('import validation and merging are atomic and duplicate IDs replace only after confirmation',async()=>{
 const current=library(),copy=structuredClone(current);assert.throws(()=>mergeOfficerLibrary(current,{...library(),officers:[{...custom(),charm:101}]}));assert.deepEqual(current,copy);
 const next=mergeOfficerLibrary(current,{...emptyOfficerLibrary(),officers:[{...custom(),charm:0}]});assert.equal(next.officers.length,2);assert.equal(next.officers.find(o=>o.id===customId).charm,0);
 let writes=0;const editor=new OfficerEditor({storage:{async write(){writes++;}}});
 await editor.importFile(new Blob([JSON.stringify(current)]));assert.equal(writes,0);assert.equal(editor.pending.kind,'import');
 await editor.confirmImport();assert.equal(writes,1);assert.equal(editor.library.officers.length,2);
});
test('custom officers use the shared aptitude/tactics/battle flow and saved snapshots survive library deletion',()=>{
 let saved;
 withOfficerLibrary(library(),()=>{
  const u=makeOfficer(customId,3000,0,10);assert.equal(u.charm,97);assert.equal(troopAptitude(u,'spear'),3);assert.ok(u.tactics.length>=3);
  const draft=defaultCustomBattle();draft.ownTeam[0].id=customId;draft.ownTeamRoles={leader:customId,advisor:customId};
  const state=createScenario('custom-battle',89,20,null,draft);for(let i=0;i<6;i++)stepBattle(state.battle);saved=JSON.stringify(state);validateSave(JSON.parse(saved));
 });
 assert.equal(OFFICER_BY_ID[customId],undefined);const restored=validateSave(JSON.parse(saved));assert.equal(JSON.stringify(restored),saved);
 assert.equal(restored.armies[0].units[0].name,'测试将军');
 const damaged=JSON.parse(saved);damaged.officerLibrary.officers[0].aptitudes.spear=4;assert.throws(()=>validateSave(damaged));assert.equal(OFFICER_BY_ID[customId],undefined);
});
test('national new games include custom talent, preserve edited stats and resume from their own library',()=>{
 let raw;
 withOfficerLibrary(library(),()=>{
  const state=newCampaign(901,'guandu-200','cao');const person=state.campaign.domestic.people.find(o=>o.id===customId);assert.equal(person.status,'FREE');
  const cao=[...state.cities.flatMap(c=>c.units),...state.campaign.idle.map(o=>o.unit)].find(u=>u.id==='cao');assert.equal(cao.force,0);assert.equal(cao.charm,100);
  validateCampaign(JSON.parse(serializeCampaign(state)));beginExecution(state);advanceCampaignDay(state);raw=serializeCampaign(state);
 });
 assert.equal(OFFICER_CATALOG.length,832);const copy=JSON.parse(raw);validateCampaign(copy);assert.equal(serializeCampaign(copy),raw);assert.equal(OFFICER_CATALOG.length,832);
});
test('muster previews refresh when the catalogue changes, and impossible ruler dates disable opening safely',()=>{
 const setup=newScenarioSetup(defaultCustomBattle(),'ownTeam'),base=scenarioSetupOfficer(setup,'cao');
 withOfficerLibrary(library(),()=>assert.notEqual(scenarioSetupOfficer(setup,'cao').force,base.force));
 assert.equal(scenarioSetupOfficer(setup,'cao').force,base.force);
 const edit={...officerEdit(OFFICER_BY_ID.cao),birthYear:950,deathYear:999};
 withOfficerLibrary({...emptyOfficerLibrary(),officers:[edit]},()=>{
  const html=nationalLobby(null,{step:'faction',scenarioId:'red-cliffs-208',faction:'cao'});
  assert.match(html,/role="alert"/);assert.match(html,/data-action="launch-national" disabled/);
 });
});
