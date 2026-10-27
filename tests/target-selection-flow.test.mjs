import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {newCommand,selectCommandOfficers,selectCommandArmy,commandCanAdvance} from '../strategic-command.mjs';
import {diplomaticSelection,diplomacyMarkup} from '../diplomacy-view.mjs';
import {diplomaticOfficerCandidates} from '../diplomacy.mjs';
import {newMilitaryFlow,militarySelectionError} from '../army-management.mjs';
import {militaryFlowMarkup} from '../military-flow.mjs';
import {previewBattlePlacement,deployBattleUnit} from '../battle-deployment.mjs';
import {createScenario} from '../scenarios.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';

test('changing actual expedition or transport participants invalidates dependent orders without spending resources',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),ids=home.units.slice(0,2).map(u=>u.id),before=serializeCampaign(s);
 for(const task of ['expedition','transfer']){
  const p=newCommand(s,task,home.id);p.selected=[ids[0]];Object.assign(p,{leader:ids[0],advisor:ids[0],destination:'chenliu',route:['chenliu'],waypoints:['old-node'],relay:'luoyang',cargo:{gold:1,grain:2,manpower:3},cycles:2});
  const unchanged=JSON.stringify(p);selectCommandOfficers(p,[ids[0]]);assert.equal(JSON.stringify(p),unchanged,'returning to a page or reselecting the same person keeps the draft');
  selectCommandOfficers(p,[ids[1]]);assert.equal(p.destination,null);assert.equal(p.route,null);assert.deepEqual(p.waypoints,[]);assert.equal(p.relay,null);assert.equal(p.leader,null);assert.equal(p.advisor,null);
  p.step='target';assert.equal(commandCanAdvance(s,p),false);
  if(task==='transfer')assert.deepEqual(p.cargo,{gold:0,grain:0,manpower:0});
 }
 const raid=newCommand(s,'expedition',home.id);raid.contextDestination='junction:chenliu:xuchang';selectCommandOfficers(raid,ids);assert.equal(raid.destination,raid.contextDestination,'an explicitly chosen camp remains the contextual target');assert.equal(raid.route,null);
 assert.equal(serializeCampaign(s),before);
});

test('changing a marching army rejects foreign sources and discards the previous route and map focus',()=>{
 const s=newCampaign(33,'guandu-200'),a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye'),p=newCommand(s,'march',a.location,{armyId:a.id});
 Object.assign(p,{destination:'chenliu',route:['chenliu'],waypoints:['old-node'],mapUI:{city:'chenliu'}});const draft=JSON.stringify(p),before=serializeCampaign(s);
 assert.ok(selectCommandArmy(s,p,enemy.id));assert.equal(JSON.stringify(p),draft);
 assert.equal(selectCommandArmy(s,p,a.id),null);assert.equal(p.destination,null);assert.equal(p.route,null);assert.equal(p.mapUI,null);assert.deepEqual(p.waypoints,[]);assert.equal(serializeCampaign(s),before);
});

test('diplomatic assignment requires an owned source city and a currently eligible local officer',()=>{
 const s=newCampaign(203,'guandu-200'),officer=diplomaticOfficerCandidates(s,'cao','commerce')[0],before=serializeCampaign(s),draft={'diplomacy-city-commerce':officer.location,'diplomacy-officer-commerce':officer.unit.id};
 assert.equal(diplomaticSelection(s,{},'commerce').officer,undefined);
 assert.equal(diplomaticSelection(s,{'diplomacy-officer-commerce':officer.unit.id},'commerce').officer,undefined);
 assert.equal(diplomaticSelection(s,draft,'commerce').officer.unit.id,officer.unit.id);
 const other=s.cities.find(c=>c.owner==='cao'&&c.id!==officer.location);assert.equal(diplomaticSelection(s,{...draft,'diplomacy-city-commerce':other.id},'commerce').officer,undefined);
 const html=diplomacyMarkup(s,draft);assert.match(html,/diplomatic-assignment-preview/);assert.match(diplomacyMarkup(s),/id="diplomacy-officer-commerce"[^>]*disabled/);assert.equal(serializeCampaign(s),before);
});

test('merge and split cannot advance with no target, a foreign army, or no actual participants',()=>{
 const s=newCampaign(33,'guandu-200'),a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye'),p=newMilitaryFlow(s,a.id,'merge'),before=serializeCampaign(s);
 assert.ok(militarySelectionError(s,p));assert.match(militaryFlowMarkup(s,p).footer,/data-action="military-next"[^>]*disabled/);
 p.target=enemy.id;assert.ok(militarySelectionError(s,p));p.kind='split';assert.ok(militarySelectionError(s,p));p.selected=[a.units[0].id];assert.equal(militarySelectionError(s,p),null);assert.equal(serializeCampaign(s),before);
});

test('battle placement previews preserve the whole battle and confirm through the same legal swap',()=>{
 const entry=id=>({id,type:'spear',troops:3000,level:5}),s=createScenario('custom-battle',4511,20,null,{...defaultCustomBattle(),ownTeam:['cao','jia','yu'].map(entry),enemyTeam:['shao','wen','yan'].map(entry),ownTeamRoles:{leader:'cao',advisor:'yu'}}),b=s.battle,[unit,other]=b.sides[0].units.filter(u=>u.status==='active'),before=JSON.stringify(s),origin={x:unit.x,y:unit.y};
 const p=previewBattlePlacement(b,unit.id,other.x,other.y);assert.equal(p.error,undefined);assert.equal(p.swapId,other.id);assert.equal(p.unitId,unit.id);assert.equal(JSON.stringify(s),before,'preview and cancellation cannot change positions, RNG, roles, or resources');
 assert.ok(previewBattlePlacement(b,b.sides[1].units[0].id,0,0).error);assert.ok(previewBattlePlacement(b,unit.id,14,0).error);assert.equal(JSON.stringify(s),before);
 assert.equal(deployBattleUnit(b,p.unitId,p.x,p.y),null);assert.deepEqual({x:other.x,y:other.y},origin);assert.deepEqual({x:unit.x,y:unit.y},{x:p.x,y:p.y});
});
