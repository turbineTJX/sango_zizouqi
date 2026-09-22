import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {troopAptitude} from '../tactic-learning.mjs';
import {TROOPS,unitAttributes} from '../unit-stats.mjs';
import {newCampaign,prepareDepartureUnits,changeCityTroop,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {canTrain,TECHS} from '../domestic.mjs';
import {trainingCost} from '../troop-training.mjs';
import {commandMarkup,newCommand} from '../strategic-command.mjs';

test('all 832 officers use family aptitude for subtypes',()=>{
 for(const u of OFFICER_CATALOG)for(const [sub,base] of [['crossbow','archer'],['ram','siege'],['tower','siege']]){
  assert.equal(troopAptitude(u,sub),troopAptitude(u,base));assert.equal(u.aptitudes[sub],u.aptitudes[base]);
 }
});
test('siege variants have distinct implemented range and gate damage',()=>{
 const u={leadership:80,force:80,intellect:80,politics:80,troops:3000,level:1};
 const stats=Object.fromEntries(['ram','siege','tower'].map(type=>[type,unitAttributes({...u,type})]));
 assert.equal(stats.ram.range,1);assert.equal(stats.siege.range,5);assert.equal(stats.tower.range,4);
 assert.ok(stats.ram.siege>stats.siege.siege);assert.ok(stats.siege.siege>stats.tower.siege);
});
test('city technology, faction funds, failed atomic drafts and conversion costs',()=>{
 const s=newCampaign(19,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 for(const type of ['ram','siege','tower']){c.domestic.techs=c.domestic.techs.filter(t=>t!==type);assert.equal(canTrain(c,type),false);assert.equal(TECHS[type].troopId,type);}
 let before=serializeCampaign(s);assert.ok(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'ram'}));assert.equal(serializeCampaign(s),before);
 c.domestic.techs.push('ram','siege','tower');s.gold=0;before=serializeCampaign(s);assert.ok(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'ram'}));assert.equal(serializeCampaign(s),before);
 s.gold=100000;const old=s.gold;assert.equal(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'ram'}),null);assert.equal(old-s.gold,trainingCost('ram',u.troops+u.wounded));
 const cash=s.gold;assert.equal(changeCityTroop(s,c.id,u.id,'ram'),null);assert.equal(s.gold,cash);
 before=serializeCampaign(s);assert.ok(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'tower'},false,{[u.id]:999}));assert.equal(serializeCampaign(s),before);
 assert.ok(prepareDepartureUnits(s,'not-a-city',[u.id]));assert.equal(serializeCampaign(s),before);
 validateCampaign(JSON.parse(before));
});
test('city form shows local unlocks, family and differentiated costs',()=>{
 const s=newCampaign(19,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0],p=newCommand(s,'expedition',c.id);
 c.domestic.techs=['spear','archer','ram'];p.step='formation';p.unitOfficer=u.id;p.selected=[u.id];p.types[u.id]='ram';
 const html=commandMarkup(s,{officerPick:p}).body;assert.match(html,/当前允许编制：枪兵、弓兵、冲车/);assert.match(html,/冲车（兵器） · 每千人 600 金/);assert.doesNotMatch(html,/<option value="tower"/);
 assert.equal(canTrain(undefined,'ram'),false);assert.equal(canTrain(c,'bogus'),false);
});

import {defaultCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
test('all siege variants damage a real gate from zero intent and resume deterministically',()=>{
 for(const type of ['ram','siege','tower']){
  const draft={...defaultCustomBattle(),battleKind:'siege',gateHp:50000,limit:120,shieldPercent:0,ownTeam:[{id:'cao',type,troops:6000,level:5}],enemyTeam:[{id:'shao',type:'spear',troops:1000,level:5}]};
  const s=createScenario('custom-battle',31,0,null,draft),b=s.battle;lockDeployment(b);
  for(let i=0;i<12&&!b.result;i++)stepBattle(b);
  const loaded=validateSave(JSON.parse(JSON.stringify(s)));
  while(!b.result){stepBattle(b);stepBattle(loaded.battle);}
  assert.deepEqual(loaded.battle,b);assert.ok(b.siege.gate.hp<50000,type+' must use actual siege damage');
 }
});

