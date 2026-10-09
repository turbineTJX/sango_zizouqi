import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_GUIDES} from '../page-guides.mjs';
import {PLAYER_AI_DECISIONS,NON_DECISION_PAGES} from '../player-ai-decisions.mjs';
import {newCampaign,validateCampaign,serializeCampaign,appointGovernor} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {newMilitaryFlow,previewMilitaryFlow,applyMilitaryFlow} from '../army-management.mjs';
import {armyManagementFacts,chooseArmyManagement,manageArmyManagementAI} from '../strategic-management-ai.mjs';
import {setDomesticPriority,domesticPriority} from '../faction-affairs.mjs';
import {setCityBudget} from '../city-budget.mjs';
import {setDiplomaticBudget} from '../diplomacy.mjs';
import {armyIntelligence,updateVision} from '../strategic-vision.mjs';

test('every current page declares gameplay AI decisions or an explicit non-decision purpose',async()=>{
 const covered=new Set(Object.keys(NON_DECISION_PAGES));
 for(const contract of Object.values(PLAYER_AI_DECISIONS)){
  assert.ok(contract.policy&&contract.shared.length&&contract.ai.length);
  for(const id of contract.pages){assert.ok(PAGE_GUIDES[id],id);assert.ok(!NON_DECISION_PAGES[id],id);covered.add(id);}
  for(const [file,name]of [...contract.shared,...contract.ai])assert.equal(typeof (await import('../'+file))[name],'function',file+' / '+name);
 }
 assert.deepEqual([...covered].sort(),Object.keys(PAGE_GUIDES).sort());
});
test('the same army draft has the same legality, cost and result for the player and AI actor',()=>{
 const s=newCampaign(341,'guandu-200'),a=fieldFromCity(s,'ye'),human=structuredClone(s);human.campaign.playerFaction='yuan';
 const p=newMilitaryFlow(s,a.id,'adjust');p.roles={leader:a.units.at(-1).id,advisor:a.units[0].id,};
 const before=serializeCampaign(s),ai=previewMilitaryFlow(s,p,{faction:'yuan',scheduled:true}),player=previewMilitaryFlow(human,p);
 assert.equal(ai.error,undefined);assert.equal(player.error,undefined);assert.deepEqual(ai.army,player.army);assert.equal(ai.gold,player.gold);assert.deepEqual(ai.state.cities,player.state.cities);
 assert.equal(serializeCampaign(s),before);assert.equal(s.campaign.playerFaction,'cao');
 p.units[a.units[0].id].equipment.ship='nonexistent';
 assert.equal(previewMilitaryFlow(s,p,{faction:'yuan',scheduled:true}).error,previewMilitaryFlow(human,p).error);assert.equal(serializeCampaign(s),before);
 a.route=['junction:ye:town-1'];assert.ok(previewMilitaryFlow(s,p,{faction:'yuan',scheduled:true}).error);
});
test('AI remnant merging calls the shared atomic draft and preserves real men and food',()=>{
 const s=newCampaign(341,'guandu-200'),c=s.cities.find(c=>c.id==='ye'),ids=c.units.map(u=>u.id);assert.ok(ids.length>=2);
 fieldFromCity(s,c.id,{ids:ids.slice(0,1)});fieldFromCity(s,c.id,{ids:ids.slice(1,3)});
 const beforeIds=s.armies.flatMap(a=>a.units.map(u=>u.id)).sort(),beforeMen=s.armies.flatMap(a=>a.units).reduce((n,u)=>n+u.troops+u.wounded,0),beforeFood=s.armies.reduce((n,a)=>n+a.supply,0),decision=chooseArmyManagement(armyManagementFacts(s,'yuan'));
 const campaign=s.campaign,ai=s.campaign.ai;assert.equal(decision.kind,'merge');manageArmyManagementAI(s);assert.equal(s.campaign,campaign);assert.equal(s.campaign.ai,ai);
 assert.equal(s.armies.filter(a=>a.faction==='yuan').length,1);assert.deepEqual(s.armies.flatMap(a=>a.units.map(u=>u.id)).sort(),beforeIds);
 assert.equal(s.armies.flatMap(a=>a.units).reduce((n,u)=>n+u.troops+u.wounded,0),beforeMen);assert.equal(s.armies.reduce((n,a)=>n+a.supply,0),beforeFood);assert.equal(s.campaign.playerFaction,'cao');
 validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('invalid final management submission preserves simulation references, officers and resources',()=>{
 const s=newCampaign(341,'guandu-200'),a=fieldFromCity(s,'ye'),p=newMilitaryFlow(s,a.id,'adjust');p.roles.leader='not-here';const before=serializeCampaign(s),campaign=s.campaign;
 assert.ok(applyMilitaryFlow(s,p,{faction:'yuan',scheduled:true}).error);assert.equal(s.campaign,campaign);assert.equal(s.armies.find(x=>x.id===a.id),a);assert.equal(serializeCampaign(s),before);
});
test('background submission cannot waive the same real military conversion fee',()=>{
 const s=newCampaign(341,'guandu-200'),a=fieldFromCity(s,'ye'),c=s.cities.find(c=>c.id===a.location),p=newMilitaryFlow(s,a.id,'adjust');c.gold=0;
 p.units[a.units[0].id].type=['spear','halberd','cavalry','archer'].find(type=>type!==a.units[0].type);
 const before=serializeCampaign(s),human=structuredClone(s);human.campaign.playerFaction='yuan';
 const ai=applyMilitaryFlow(s,p,{faction:'yuan',scheduled:true}),player=previewMilitaryFlow(human,p);assert.equal(ai.error,player.error);assert.match(ai.error,/费用不足/);assert.equal(serializeCampaign(s),before);
});
test('management inputs are immutable and hidden enemy state cannot change the AI choice',()=>{
 const s=newCampaign(341,'guandu-200');fieldFromCity(s,'ye');const first=armyManagementFacts(s,'yuan'),choice=chooseArmyManagement(first),before=serializeCampaign(s);
 assert.ok(Object.isFrozen(first)&&Object.isFrozen(first.armies[0]));assert.equal(Object.hasOwn(first,'seed'),false);assert.equal(serializeCampaign(s),before);
 const hidden=s.cities.find(c=>c.owner==='cao'&&c.id!=='ye');hidden.x=1000;hidden.y=1000;updateVision(s);
 const baseline=armyManagementFacts(s,'yuan');hidden.gold+=90000;hidden.manpower+=10000;hidden.units.forEach(u=>u.troops=1);
 s.campaign.ai.plans.push({faction:'cao',phase:'prepare',officerIds:hidden.units.map(u=>u.id),target:'secret'});
 assert.deepEqual(armyManagementFacts(s,'yuan'),baseline);assert.deepEqual(chooseArmyManagement(armyManagementFacts(s,'yuan')),choice);
});
test('each faction owns a saved domestic priority and budgets never depend on the viewing faction',()=>{
 const s=newCampaign(341,'guandu-200'),old=[...domesticPriority(s,'cao')],order=[...domesticPriority(s,'yuan')].reverse();
 assert.equal(setDomesticPriority(s,order,{faction:'yuan',scheduled:true}),null);assert.deepEqual(domesticPriority(s,'cao'),old);assert.deepEqual(domesticPriority(s,'yuan'),order);
 assert.equal(setCityBudget(s,'ye','goldReserve',321,{faction:'yuan',scheduled:true}),null);assert.equal(s.cities.find(c=>c.id==='ye').budget.goldReserve,321);
 assert.ok(setCityBudget(s,'ye','goldReserve',322,{faction:'cao',scheduled:true}));
 assert.equal(setDiplomaticBudget(s,{feeBudget:123},{faction:'yuan',scheduled:true}),null);assert.equal(s.campaign.diplomacy.policies.yuan.feeBudget,123);
 const loaded=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(domesticPriority(loaded,'yuan'),order);
 const oldSave=JSON.parse(serializeCampaign(s));oldSave.campaign.version=53;assert.throws(()=>validateCampaign(oldSave),/不兼容/);
});
test('governor appointment rejects the same pending officer for either controller without clearing work',()=>{
 const s=newCampaign(341,'guandu-200'),c=s.cities.find(c=>c.id==='ye'),id=c.units[0].id;
 s.campaign.domestic.orders.push({officerIds:[id]});const before=serializeCampaign(s),human=structuredClone(s);human.campaign.playerFaction='yuan';
 assert.equal(appointGovernor(s,c.id,id,{faction:'yuan',scheduled:true}),appointGovernor(human,c.id,id));assert.match(appointGovernor(s,c.id,id,{faction:'yuan',scheduled:true}),/待执行/);assert.equal(serializeCampaign(s),before);
});
test('a live enemy dossier exposes observed strength but conceals its later orders like the map',()=>{
 const s=newCampaign(341,'guandu-200'),enemy=fieldFromCity(s,'ye');enemy.location='xuchang';enemy.target='secret';enemy.route=['secret'];updateVision(s);
 const observed=armyIntelligence(s,enemy.id,'cao').data;assert.equal(observed.units[0].troops,enemy.units[0].troops);assert.equal(observed.target,null);assert.deepEqual(observed.route,[]);assert.equal(observed.supplyLine,null);
 assert.equal(armyIntelligence(s,enemy.id,'yuan').data,enemy);
});
test('an all-AI viewing faction cannot use manual city, diplomacy or governor management',()=>{
 const s=newCampaign(341,'guandu-200','cao',{allAI:true}),c=s.cities.find(c=>c.owner==='cao'),before=serializeCampaign(s);
 assert.ok(setCityBudget(s,c.id,'goldReserve',777));assert.ok(setDomesticPriority(s,[...domesticPriority(s)].reverse()));assert.ok(setDiplomaticBudget(s,{feeBudget:777}));assert.ok(appointGovernor(s,c.id,c.units[0].id));assert.equal(serializeCampaign(s),before);
 assert.equal(setCityBudget(s,c.id,'goldReserve',777,{faction:'cao',scheduled:true}),null);
});
