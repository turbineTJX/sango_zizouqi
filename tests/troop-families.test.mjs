import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {troopAptitude} from '../tactic-learning.mjs';
import {TROOPS,unitAttributes} from '../unit-stats.mjs';
import {troopTypes,canEquip} from '../troop-equipment.mjs';
import {newCampaign,prepareDepartureUnits,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {canTrain,TECHS} from '../domestic.mjs';
import {trainingCost} from '../troop-training.mjs';
import {commandMarkup,newCommand} from '../strategic-command.mjs';
import {syncResourceTotals} from '../city-resources.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';

test('all 832 officers have four aptitudes and upgrades inherit the real family aptitude',()=>{
 for(const u of OFFICER_CATALOG){assert.deepEqual(Object.keys(u.aptitudes).sort(),['archer','cavalry','halberd','spear']);for(const type of troopTypes())assert.equal(troopAptitude(u,type),u.aptitudes[TROOPS[type].family]);}
});

test('carried siege forms have distinct implemented range and gate damage',()=>{
 const u={type:'halberd',leadership:80,force:80,intellect:80,politics:80,troops:3000,level:1};
 const stats=Object.fromEntries(['ram','heavyRam','siege','tower'].map(formType=>[formType,unitAttributes({...u,formType})]));
 assert.equal(stats.ram.range,1);assert.equal(stats.siege.range,5);assert.equal(stats.tower.range,4);
 assert.ok(stats.heavyRam.siege>stats.ram.siege);assert.ok(stats.ram.siege>stats.siege.siege);assert.ok(stats.siege.siege>stats.tower.siege);
});

test('local equipment technology, city payment and atomic failed drafts',()=>{
 const s=newCampaign(19,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];c.domestic.techs=[];
 assert.ok(canEquip(c,'ram'));for(const type of ['ram','siege','tower'])assert.equal(canTrain(c,type),false);
 for(const type of ['siege','tower']){assert.equal(canEquip(c,type),false);assert.ok(TECHS.siegeEngineering.unlocks.includes(type));}
 const choose=(type,counts={})=>prepareDepartureUnits(s,c.id,[u.id],{},false,counts,[],{[u.id]:{siege:type,ship:null}});
 let before=serializeCampaign(s);assert.ok(choose('siege'));assert.equal(serializeCampaign(s),before);
 c.domestic.techs.push('efficientConstruction','siegeEngineering');c.gold=0;syncResourceTotals(s);before=serializeCampaign(s);assert.ok(choose('ram'));assert.equal(serializeCampaign(s),before);
 c.gold=100000;syncResourceTotals(s);const old=c.gold;assert.equal(choose('ram'),null);assert.equal(old-c.gold,trainingCost('ram',u.troops+u.wounded));
 const cash=c.gold;assert.equal(choose('ram'),null);assert.equal(c.gold,cash);
 before=serializeCampaign(s);assert.ok(choose('tower',{[u.id]:999}));assert.equal(serializeCampaign(s),before);validateCampaign(JSON.parse(before));
});

test('city form separates local troop unlocks and carried equipment',()=>{
 const s=newCampaign(19,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0],p=newCommand(s,'draft',c.id);c.domestic.techs=['militaryRegistry','tigerCavalry','efficientConstruction','siegeEngineering'];p.selected=[u.id];
 const html=commandMarkup(s,{officerPick:p}).body;assert.match(html,/data-command-ship/);assert.match(html,/data-command-siege/);assert.match(html,/<option value="tigerCavalry"/);assert.doesNotMatch(html.match(/<select data-command-type[^>]*>[\s\S]*?<\/select>/)[0],/<option value="siege"/);assert.match(html,/井栏 · 每千人 650 金/);
 assert.equal(canTrain(undefined,'ram'),false);assert.equal(canTrain(c,'bogus'),false);
});

test('all carried siege variants damage a real gate from zero intent and resume deterministically',()=>{
 for(const siege of ['ram','heavyRam','siege','tower']){
  const draft={...defaultCustomBattle(),battleKind:'siege',gateHp:50000,limit:120,shieldPercent:0,ownTeam:[{id:'cao',type:'halberd',equipment:{siege,ship:null},troops:6000,level:5}],enemyTeam:[{id:'shao',type:'spear',troops:1000,level:5}]};
  const s=createScenario('custom-battle',31,0,null,draft),b=s.battle;for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;lockDeployment(b);
  for(let i=0;i<12&&!b.result;i++)stepBattle(b);const loaded=validateSave(JSON.parse(JSON.stringify(s)));
  while(!b.result){stepBattle(b);stepBattle(loaded.battle);}assert.deepEqual(loaded.battle,b);assert.ok(b.siege.gate.hp<50000,siege+' must use actual siege damage');
 }
});
