import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {NATIONAL_SCENARIOS,nationalWorld,nationalRoster,nationalScenario,registerCustomScenario,scenarioOfficerEligible} from '../national-scenarios.mjs';
import {createScenarioDocument,validateScenarioDocument,scenarioRuntimeId,scenarioPeople} from '../scenario-document.mjs';
import {emptyScenarioLibrary,validateScenarioLibrary,importScenarioDocument} from '../scenario-library.mjs';
import {ScenarioEditor} from '../scenario-editor.mjs';
import {OFFICER_BY_ID,activateOfficerLibrary} from '../officer-catalog.mjs';
import {emptyOfficerLibrary,newOfficerDocument} from '../officer-library-data.mjs';
import {factionLord,servingPeople} from '../talent-core.mjs';
import {factionsHostile,diplomaticProtection} from '../diplomacy-relations.mjs';
import {preflightScenario} from '../scenario-preflight.mjs';
import {campaignDate} from '../national-scenarios.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {nationalLobby} from '../national-lobby.mjs';

const originalFaction=(s,f)=>Object.entries(nationalScenario(s.campaign.scenarioId)?.factionMap||{}).find(([,id])=>id===f)?.[0]||f;
const freePerson=d=>d.officers.find(o=>o.state==='free'&&scenarioOfficerEligible({...d,year:199},OFFICER_BY_ID[o.id]));
const opening=s=>[...s.cities.flatMap(c=>c.units.map(u=>({id:u.id,faction:originalFaction(s,c.owner),cityId:c.id}))),...s.campaign.idle.map(o=>({id:o.unit.id,faction:originalFaction(s,o.faction),cityId:o.location}))].sort((a,b)=>a.id.localeCompare(b.id));
for(const spec of NATIONAL_SCENARIOS)test(spec.name+': editable template preserves the actual opening and geography',()=>{
 const document=validateScenarioDocument(createScenarioDocument(spec.id)),original=newCampaign(217,spec.id,spec.factions[0]),id=registerCustomScenario(document),s=newCampaign(217,id,document.factions[0]);
 assert.equal(s.cities.length,76);assert.deepEqual(s.roads,original.roads);assert.deepEqual(s.roadSegments,original.roadSegments);assert.deepEqual(opening(s),opening(original));
 assert.deepEqual(s.cities.map(c=>[c.id,originalFaction(s,c.owner),c.gold,c.grain,c.manpower]),original.cities.map(c=>[c.id,c.owner,c.gold,c.grain,c.manpower]));
 assert.deepEqual(nationalRoster(id,nationalWorld(id).cities).map(o=>({id:o.id,faction:originalFaction(s,o.faction),cityId:o.cityId})).sort((a,b)=>a.id.localeCompare(b.id)),opening(s));
 validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(NATIONAL_SCENARIOS.length,7);
});

test('authoring rejects duplicate or unknown people, missing rulers, invalid homes, malformed files and illegal dates',()=>{
 const d=createScenarioDocument('coalition-190');
 for(const edit of [d=>d.officers.push(d.officers[0]),d=>d.officers[0].id='not-a-person',d=>d.cities.pop(),d=>d.cities[0].owner='constructor',d=>d.factions.push('__proto__'),d=>d.year=0,d=>d.level=11,d=>d.cities[0].grain=-1,d=>d.cities[0].gold=1.5,d=>d.name='<img src=x>',d=>d.sourceScenario='audit-local-example',d=>d.id='guandu-200']){
  const invalid=structuredClone(d);edit(invalid);assert.throws(()=>validateScenarioDocument(invalid));
 }
 const wrongHome=structuredClone(d),row=wrongHome.officers.find(o=>o.state==='serving');row.cityId=wrongHome.cities.find(c=>c.owner!==row.faction).id;
 assert.throws(()=>validateScenarioDocument(wrongHome),/驻城/);assert.doesNotThrow(()=>validateScenarioDocument(wrongHome,{playable:false}));
 const missing=structuredClone(d);missing.officers=[];assert.throws(()=>validateScenarioDocument(missing),/君主/);
 const late=structuredClone(d);late.year=1;assert.throws(()=>validateScenarioDocument(late),/年代|开局前登场/);
});

test('city resources, officer placement and levels take effect through the shared opening and deterministic save loop',()=>{
 const d=createScenarioDocument();d.level=1;const c=d.cities.find(c=>c.owner==='cao');Object.assign(c,{gold:12345,grain:9876,manpower:4567});
 const other=d.cities.find(x=>x.owner==='cao'&&x.id!==c.id),row=d.officers.find(o=>o.faction==='cao'&&!d.forces.some(f=>f.leaderId===o.id));row.cityId=other.id;
 const id=registerCustomScenario(d),s=newCampaign(217,id,'cao'),actual=s.cities.find(x=>x.id===c.id);
 assert.deepEqual([actual.gold,actual.grain,actual.manpower],[12345,9876,4567]);assert.equal(opening(s).find(o=>o.id===row.id).cityId,other.id);
 assert.ok([...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit)].every(u=>u.level===1));
 beginExecution(s);advanceCampaignDay(s);const restored=validateCampaign(JSON.parse(serializeCampaign(s)));for(let i=0;i<2;i++){advanceCampaignDay(s);advanceCampaignDay(restored);}assert.equal(serializeCampaign(s),serializeCampaign(restored));
 const before=serializeCampaign(s),edited=structuredClone(d);edited.name='另一个版本';registerCustomScenario(edited);assert.notEqual(scenarioRuntimeId(edited),id);assert.equal(nationalScenario(id).name,d.name);assert.equal(serializeCampaign(s),before);
});

test('custom saves restore in a fresh process without the editor library and reject missing or altered snapshots',()=>{
 const d=createScenarioDocument('warlords-194'),s=newCampaign(217,registerCustomScenario(d),d.factions[0]),raw=serializeCampaign(s);
 const result=spawnSync(process.execPath,['--input-type=module','-e',"import {readFileSync} from 'node:fs';import {validateCampaign,serializeCampaign} from './strategic-campaign.mjs';const raw=readFileSync(0,'utf8');if(serializeCampaign(validateCampaign(JSON.parse(raw)))!==raw)throw Error('roundtrip mismatch');console.log('PASS');"],{cwd:new URL('..',import.meta.url),input:raw,encoding:'utf8',windowsHide:true});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PASS/);
 const missing=JSON.parse(raw);delete missing.campaign.scenarioDocument;assert.throws(()=>validateCampaign(missing),/快照/);
 const altered=JSON.parse(raw);altered.campaign.scenarioDocument.name='改变快照';assert.throws(()=>validateCampaign(altered),/不匹配/);
});

test('library imports keep collisions as copies and reject malformed imports atomically',()=>{
 const empty=emptyScenarioLibrary(),d=createScenarioDocument(),first=importScenarioDocument(empty,d),second=importScenarioDocument(first,d);
 assert.equal(empty.scenarios.length,0);assert.equal(second.scenarios.length,2);assert.notEqual(second.scenarios[0].id,second.scenarios[1].id);
 const before=structuredClone(first),bad=structuredClone(d);bad.officers.push(bad.officers[0]);assert.throws(()=>importScenarioDocument(first,bad));assert.deepEqual(first,before);
 assert.throws(()=>validateScenarioLibrary({...first,scenarios:[d,d]}),/重复/);
 assert.throws(()=>validateScenarioLibrary({...empty,scenarios:Array(65).fill(d)}),/64/);
});

test('storage failures retain both saved work and draft edits; subsequent writes recover',async t=>{
 let stored=emptyScenarioLibrary(),fail=false;const editor=new ScenarioEditor({storage:{write:async value=>{if(fail)throw Error('模拟保存失败');stored=structuredClone(value);}}});t.after(()=>clearTimeout(editor.timer));
 await editor.save();const before=structuredClone(stored);editor.change('name','修改的剧本');fail=true;
 await assert.rejects(()=>editor.save(),/保存失败/);assert.deepEqual(stored,before);assert.deepEqual(editor.library,before);assert.equal(editor.draft.name,'修改的剧本');
 fail=false;await editor.save();assert.equal(stored.scenarios[0].name,'修改的剧本');
 const row=editor.draft.officers.find(o=>o.state==='serving');row.cityId=editor.draft.cities.find(c=>c.owner!==row.faction).id;await editor.persistDraft();assert.deepEqual(stored.draft,editor.draft);assert.throws(()=>validateScenarioDocument(stored.draft));
});

test('editor personnel assignment preserves uniqueness and the lobby includes playable authored scenarios only',async t=>{
 const editor=new ScenarioEditor({storage:{write:async()=>{}}});t.after(()=>clearTimeout(editor.timer));const d=editor.draft,row=d.officers.find(o=>o.state==='serving'),home=d.cities.find(c=>c.owner===row.faction);editor.officerId=row.id;editor.change('officer-city',home.id);assert.equal(d.officers.filter(o=>o.id===row.id).length,1);
 assert.ok(OFFICER_BY_ID[row.id]);editor.change('officer-city','');assert.equal(d.officers.some(o=>o.id===row.id),false);
 const valid=createScenarioDocument();assert.match(nationalLobby(null,{},[valid]),/data-action="scenario-editor"/);assert.match(nationalLobby(null,{},[valid]),new RegExp(scenarioRuntimeId(valid)));
 assert.equal((nationalLobby(null).match(/data-action="select-national-scenario"/g)||[]).length,7);
});

test('incomplete metadata persists as a draft; undo and redo restore ownership and faction removal',async t=>{
 const editor=new ScenarioEditor({storage:{write:async()=>{}}});t.after(()=>clearTimeout(editor.timer));const original=structuredClone(editor.draft);
 editor.change('name','');editor.change('year',0);await editor.persistDraft();assert.equal(editor.library.draft.name,'');assert.equal(editor.library.draft.year,0);assert.throws(()=>validateScenarioDocument(editor.library.draft),/名称|年份/);
 await editor.action('undo');assert.equal(editor.draft.year,original.year);await editor.action('undo');assert.equal(editor.draft.name,original.name);await editor.action('redo');assert.equal(editor.draft.name,'');await editor.action('undo');
 const faction=editor.draft.factions[0];await editor.action('remove-faction',{dataset:{id:faction}});await editor.action('cancel');assert.deepEqual(editor.draft,original);
 await editor.action('remove-faction',{dataset:{id:faction}});await editor.action('confirm-faction');assert.ok(!editor.draft.factions.includes(faction));assert.ok(!editor.draft.officers.some(o=>o.faction===faction));assert.ok(!editor.draft.cities.some(c=>c.owner===faction));
 await editor.action('undo');assert.deepEqual(editor.draft,original);editor.tab='officers';assert.doesNotMatch(editor.markup(),/undefined|NaN/);
});

test('importing over unsaved work requires confirmation and cancellation preserves the draft',async t=>{
 const editor=new ScenarioEditor({storage:{write:async()=>{}}});t.after(()=>clearTimeout(editor.timer));editor.change('name','尚未保存的剧本');const before=structuredClone(editor.draft),incoming=createScenarioDocument('hanzhong-219'),file={size:1000,text:async()=>JSON.stringify(incoming)};
 await editor.importFile(file);assert.equal(editor.pending.type,'import');assert.deepEqual(editor.draft,before);assert.equal(editor.library.scenarios.length,0);
 await editor.action('cancel');assert.deepEqual(editor.draft,before);await editor.importFile(file);await editor.action('confirm-import');assert.equal(editor.draft.id,incoming.id);assert.equal(editor.library.scenarios.length,1);
});

test('authored scenarios support all-AI observation with deterministic continuation',()=>{
 const d=createScenarioDocument('coalition-190'),s=newCampaign(217,registerCustomScenario(d),d.factions[0],{allAI:true});beginExecution(s);advanceCampaignDay(s);const copy=validateCampaign(JSON.parse(serializeCampaign(s)));advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(s.campaign.allAI,true);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});

test('custom rulers and their names, colors and people are portable and isolated between campaign snapshots',t=>{
 t.after(()=>activateOfficerLibrary(emptyOfficerLibrary()));
 const d=createScenarioDocument(),person=newOfficerDocument('custom-'+'a'.repeat(32));person.name='新君主';d.officerLibrary.officers.push(person);
 const home=d.cities.find(c=>c.owner==='neutral'&&nationalWorld(d.sourceScenario).cities.find(t=>t.id===c.id).citySize==='large'),id='user-force-test';home.owner=id;d.factions.push(id);d.forces.push({id,name:'新汉',color:'#445566',leaderId:person.id,capitalId:home.id});d.officers.push({id:person.id,state:'serving',faction:id,cityId:home.id,level:7,merit:12,loyalty:96,troops:1300,wounded:50});
 const runtime=preflightScenario(d),s=newCampaign(11,runtime,id),f=s.campaign.playerFaction;
 assert.equal(factionLord(s,f),person.id);assert.equal(nationalScenario(runtime).factions.includes(f),true);assert.equal(s.cities.find(c=>c.id===home.id).owner,f);assert.equal(s.cities.find(c=>c.id===home.id).units.find(u=>u.id===person.id).troops,1300);
 const raw=serializeCampaign(s),edited=structuredClone(d);edited.forces.at(-1).name='后来改名';const next=registerCustomScenario(edited);assert.notEqual(nationalScenario(next).factionMap[id],f);assert.equal(factionLord(s,f),person.id);
 activateOfficerLibrary(emptyOfficerLibrary());assert.doesNotThrow(()=>validateCampaign(JSON.parse(raw)));
 const result=spawnSync(process.execPath,['--input-type=module','-e',"import {readFileSync} from 'node:fs';import {validateCampaign} from './strategic-campaign.mjs';import {factionLord} from './talent-core.mjs';const s=validateCampaign(JSON.parse(readFileSync(0,'utf8')));if(!factionLord(s,s.campaign.playerFaction).startsWith('custom-'))throw Error('missing custom ruler');console.log('PASS');"],{cwd:new URL('..',import.meta.url),input:raw,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
});

test('city development, technology, gate condition and personal appointments use the live game fields',()=>{
 const d=createScenarioDocument(),c=d.cities.find(c=>c.id==='xuchang');Object.assign(c,{order:72,buildings:{farm:2,commerce:2,barracks:2,walls:3,granary:2},techs:['taxation'],wallIntegrity:25});
 const row=d.officers.find(o=>o.id==='jia');Object.assign(row,{role:'agriculture',level:6,merit:12,loyalty:94,troops:0});
 const g=d.officers.find(o=>o.faction==='cao'&&o.id!==row.id&&!d.forces.some(f=>f.leaderId===o.id));Object.assign(g,{cityId:c.id,role:'governor',troops:0});
 const s=newCampaign(17,preflightScenario(d),'cao'),city=s.cities.find(t=>t.id===c.id),person=servingPeople(s).get(row.id).unit;
 assert.equal(city.order,72);assert.equal(city.farm,2);assert.deepEqual(city.domestic.techs,['taxation']);assert.equal(city.buildings.walls[c.id].hp,Math.floor(city.buildings.walls[c.id].maxHp*.25));assert.equal(city.governor,g.id);
 assert.equal(person.level,6);assert.equal(person.merit,12);assert.equal(s.campaign.domestic.loyalty[row.id],94);assert.equal(s.campaign.domestic.assignments.find(a=>a.officerId===row.id).direction,'agriculture');validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('debut and wild availability dates activate exactly once and survive a save before the date',()=>{
 const d=createScenarioDocument(),future=d.officers.find(o=>o.id==='jia'),free=freePerson(d);
 Object.assign(future,{debutDate:{year:200,month:1,day:3},troops:0,level:5,merit:11,loyalty:93});
 Object.assign(free,{state:'free',faction:null,cityId:'xuchang',level:4,debutDate:{year:200,month:1,day:2},freeDate:{year:200,month:1,day:3}});
 const s=newCampaign(9,preflightScenario(d),'cao');assert.equal(servingPeople(s).has(future.id),false);assert.equal(s.campaign.domestic.people.find(p=>p.id===free.id).status,'NOT_DEBUTED');
 beginExecution(s);advanceCampaignDay(s);assert.equal(s.campaign.day,2);assert.equal(servingPeople(s).has(future.id),false);assert.equal(s.campaign.domestic.people.find(p=>p.id===free.id).status,'NOT_DEBUTED');
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));advanceCampaignDay(s);advanceCampaignDay(restored);assert.equal(serializeCampaign(s),serializeCampaign(restored));
 assert.equal(s.campaign.day,3);assert.equal(servingPeople(s).get(future.id).unit.level,5);assert.equal(s.campaign.domestic.people.some(p=>p.id===future.id),false);assert.equal(s.campaign.domestic.people.find(p=>p.id===free.id).status,'FREE');assert.equal(s.campaign.domestic.people.find(p=>p.id===free.id).unit.level,4);
 advanceCampaignDay(s);assert.equal([...servingPeople(s).keys()].filter(id=>id===future.id).length,1);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('a mid-month opening preserves calendar turn boundaries and initial treaties expire through the common processor',()=>{
 const d=createScenarioDocument();d.month=5;d.day=20;d.diplomacy=[{a:d.factions[0],b:d.factions[1],state:'alliance',relation:73,days:2}];
 const id=preflightScenario(d),s=newCampaign(4,id,'cao',{allAI:true}),[a,b]=nationalScenario(id).factions;
 assert.equal(campaignDate(s),'200年5月20日');assert.equal(factionsHostile(s,a,b),false);assert.ok(diplomaticProtection(s,a,b));assert.equal(s.campaign.diplomacy.relations[[a,b].sort().join(':')],73);
 beginExecution(s);advanceCampaignDay(s);assert.equal(campaignDate(s),'200年5月21日');assert.equal(s.campaign.phase,'planning');validateCampaign(JSON.parse(serializeCampaign(s)));
 beginExecution(s);advanceCampaignDay(s);advanceCampaignDay(s);assert.equal(diplomaticProtection(s,a,b),undefined);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('captives and excluded people keep their configured identities without appearing as serving or free officers',()=>{
 const d=createScenarioDocument(),row=d.officers.find(o=>o.id==='jia'),prison=d.cities.find(c=>c.owner==='yuan');Object.assign(row,{state:'captive',captor:'yuan',cityId:prison.id,troops:0});
 const dead=freePerson(d);Object.assign(dead,{state:'excluded',faction:null,cityId:'xuchang'});delete dead.freeDate;
 const s=newCampaign(6,preflightScenario(d),'cao'),p=s.campaign.domestic.people.find(p=>p.id===row.id);
 assert.equal(servingPeople(s).has(row.id),false);assert.equal(p.status,'CAPTIVE');assert.equal(p.cityId,prison.id);assert.equal(p.fate.captor,nationalScenario(s.campaign.scenarioId).factionMap.yuan);assert.equal(s.campaign.domestic.people.find(p=>p.id===dead.id).status,'EXCLUDED');validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('authoring rejects impossible dates, ruler schedules, troop caps, technology profiles and duplicate diplomacy',()=>{
 const d=createScenarioDocument();
 for(const change of [d=>d.day=31,d=>d.month=13,d=>d.forces[0].capitalId=d.cities.find(c=>c.owner!==d.forces[0].id).id,d=>d.officers.find(o=>o.id===d.forces[0].leaderId).debutDate={year:201,month:1,day:1},d=>d.officers[0].troops=100000,d=>d.cities[0].techs=['tradeLaw'],d=>{d.diplomacy=[{a:d.factions[0],b:d.factions[1],state:'peace',relation:30,days:10}];d.diplomacy.push({...d.diplomacy[0]});}]){const bad=structuredClone(d);change(bad);assert.throws(()=>validateScenarioDocument(bad));}
 const bad=structuredClone(d),free=freePerson(bad);Object.assign(free,{state:'free',faction:null,cityId:'xuchang',debutDate:{year:201,month:1,day:2},freeDate:{year:201,month:1,day:1}});assert.throws(()=>validateScenarioDocument(bad),/在野日期/);
});

test('dates before the opening mean already available, while future captive identities wait for their debut',()=>{
 const d=createScenarioDocument(),free=freePerson(d);Object.assign(free,{state:'free',faction:null,cityId:'xuchang',debutDate:{year:199,month:1,day:1},freeDate:{year:199,month:2,day:1}});
 const captive=d.officers.find(o=>o.id==='jia');Object.assign(captive,{state:'captive',captor:'yuan',cityId:d.cities.find(c=>c.owner==='yuan').id,debutDate:{year:200,month:1,day:2},troops:0});
 const s=newCampaign(18,preflightScenario(d),'cao');assert.equal(s.campaign.domestic.people.find(p=>p.id===free.id).status,'FREE');assert.equal(s.campaign.domestic.people.find(p=>p.id==='jia').status,'NOT_DEBUTED');
 beginExecution(s);advanceCampaignDay(s);assert.equal(s.campaign.domestic.people.find(p=>p.id==='jia').status,'CAPTIVE');validateCampaign(JSON.parse(serializeCampaign(s)));
});
