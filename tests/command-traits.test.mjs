import {frontlineCapacity} from '../army-trait-rules.mjs';
import {mechanicEntries,traitEligible} from '../trait-mechanics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,validateSave,makeOfficer} from '../engine.mjs';
import {roleTraits,activeCommandTraits,COMMAND_TRAITS,COMMAND_TRAIT_HOLDERS} from '../officer-traits.mjs';
import {passiveAttributes,passiveList} from '../passives.mjs';
import {commanderComparison} from '../combat-comparison.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
function battle(){const s=newGame(99);orderArmy(s,'a1','guandu');advanceTurn(s);assert.equal(startBattle(s),null);lockDeployment(s.battle);return s;}
test('Jianxiong appointment changes slots without restoring retired army stat multipliers',()=>{const {battle:b}=battle(),u=b.sides[0].units[0];assert.equal(frontlineCapacity(b,0),7);assert.deepEqual(activeCommandTraits(b,u),[]);b.sides[0].commanders.find(c=>c.id==='cao'&&c.role==='leader').role='advisor';assert.equal(frontlineCapacity(b,0),6);});
test('current appointment eligibility is defined per mechanism, not generic role stats',()=>{const b=battle().battle;for(const id of ['person-368','person-668','person-226']){const rule=mechanicEntries({id})[0].rule,u={id,armyId:'fixture',side:0,hp:1000,status:'active'};b.sides[0].commanders=[{id,armyId:'fixture',role:'advisor'}];assert.ok(traitEligible(b,u,rule));b.sides[0].commanders[0].armyId='other';assert.equal(traitEligible(b,u,rule),false);}});
test('appointment UI displays the matching trait effect and recommendation uses it',()=>{
 const s=newGame(99),a=s.armies[0],u=a.units.find(u=>u.id==='cao');
 const r=officerRecommendation(s,u,{task:'role',role:'leader'});assert.ok(r.traits.length);assert.ok(r.score>u.leadership);
 const html=commanderComparison(s,a.units,a,'data-role');assert.ok(html.includes('任职特性'));assert.ok(!html.includes('高级·军团特技'));for(const t of r.traits){assert.ok(html.includes(t.name));assert.ok(html.includes('data-id="'+t.id+'"'));}
 assert.deepEqual(officerRecommendation(s,u,{task:'role',role:'deputy'}).traits,[]);
 assert.deepEqual(roleTraits({...u,level:10,intellect:1,leadership:1,type:'ship'},'leader'),roleTraits(u,'leader'));
});
test('current save preserves command eligibility and deterministic continuation',()=>{
 const s=battle();for(let i=0;i<6;i++)stepBattle(s.battle);
 const saved=JSON.parse(JSON.stringify(s));assert.ok(validateSave(saved));
 const restored=validateSave(saved);assert.ok(restored.battle);
 for(let i=0;i<12;i++){stepBattle(s.battle);stepBattle(restored.battle);}assert.deepEqual(restored.battle,s.battle);
});

test('legacy numerical command traits are empty; stats never grant appointment mechanics',()=>{assert.deepEqual(COMMAND_TRAITS,{});assert.deepEqual(COMMAND_TRAIT_HOLDERS,{});const u={...makeOfficer('dun',3000),leadership:100,intellect:100,force:100,politics:100};assert.deepEqual(mechanicEntries(u),[]);});
