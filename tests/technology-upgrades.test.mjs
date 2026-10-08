import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,unitAttributes,lockDeployment,stepBattle,validateSave,syncCombatForm} from '../engine.mjs';
import {TROOP_DESIGNS} from '../data/design/troops.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {troopTypes,equipmentTypes,combatType,emptyEquipment} from '../troop-equipment.mjs';
import {initializeTacticLearning,troopAptitude,allLearnedTacticIds} from '../tactic-learning.mjs';
import {unitTactics} from '../tactics.mjs';
import {tacticUsesLeft,tacticReadyAt} from '../tactic-tempo.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {newCampaign,prepareDepartureUnits,serializeCampaign,validateCampaign,changeCampaignTroop,orderCampaignArmy,beginExecution,advanceCampaignDay,activeBattles} from './helpers/auto-domestic-campaign.mjs';
import {fieldCampaign,fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {canTrain,TECHS} from '../domestic.mjs';
import {newScenarioSetup,changeScenarioSetup,scenarioSetupDraft,scenarioSetupMarkup} from '../scenario-setup.mjs';
import {newCommand,changeCommandUnit,prepareCommandFormation,commandMarkup} from '../strategic-command.mjs';
import {hexBeyond} from '../hex-grid.mjs';
const upgrades=troopTypes().filter(id=>TROOP_DESIGNS[id].tier===1);
const holder=type=>OFFICER_CATALOG.find(o=>troopAptitude(o,type)===3).id;
function battle(type,{equipment=emptyEquipment(),kind='field',terrain='land',seed=17}={}){
 const id=holder(type),enemy=OFFICER_CATALOG.find(o=>o.id!==id&&o.force<40).id;
 const s=generateBattle({...defaultCustomBattle(),seed,battleKind:kind,terrain,shieldPercent:0,gateHp:50000,ownTeam:[{id,type,equipment,troops:3000,level:1}],enemyTeam:[{id:enemy,type:'spear',troops:3000,level:1}]});
 const b=s.battle;lockDeployment(b);const u=b.sides[0].units[0],target=b.sides[1].units[0];
 for(const v of [u,target]){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(allLearnedTacticIds(v).map(id=>[id,999]));}
 return {s,b,u,target};
}
test('four aptitude families and all upgrades inherit small tactics while replacing only their major tactic',()=>{
 assert.equal(troopTypes().length,12);assert.equal(equipmentTypes('ship').length,4);assert.equal(equipmentTypes('siege').length,4);
 for(const type of upgrades){const u=makeOfficer(holder(type)),base=TROOP_DESIGNS[type].family;u.type=type;initializeTacticLearning(u);const advanced=unitTactics(u);const original=unitTactics({...u,type:base});assert.deepEqual(advanced.filter(s=>s.learningTier==='low').map(s=>s.id),original.filter(s=>s.learningTier==='low').map(s=>s.id));assert.notEqual(advanced.find(s=>s.learningTier==='high').id,original.find(s=>s.learningTier==='high').id);assert.equal(troopAptitude(u,type),troopAptitude(u,base));}
});
test('cities gate new recruitment and conversion; failed equipment or troop drafts spend nothing',()=>{
 const s=newCampaign(27,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];c.gold=100000;
 for(const type of ['spear','halberd','cavalry','archer'])assert.ok(canTrain(c,type));
 assert.ok(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'tigerCavalry'}));c.domestic.techs.push('militaryRegistry','tigerCavalry');
 assert.equal(prepareDepartureUnits(s,c.id,[u.id],{[u.id]:'tigerCavalry'}),null);const base=serializeCampaign(s);
 assert.ok(prepareDepartureUnits(s,c.id,[u.id],{},false,{},[],{[u.id]:{siege:'siege',ship:null}}));assert.equal(serializeCampaign(s),base);
 c.domestic.techs.push('efficientConstruction','siegeEngineering');assert.equal(prepareDepartureUnits(s,c.id,[u.id],{},false,{},[],{[u.id]:{siege:'siege',ship:null}}),null);assert.equal(u.type,'tigerCavalry');assert.equal(u.equipment.siege,'siege');validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('shared setup exposes equipment fields and preserves them for both sides and reinforcements',()=>{
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam'),id=p.selected[0];changeScenarioSetup(p,'type',id,'longbow');changeScenarioSetup(p,'ship',id,'louShip');changeScenarioSetup(p,'siege',id,'heavyRam');
 const d=scenarioSetupDraft(p),s=generateBattle(d);assert.equal(s.armies[0].units[0].equipment.ship,'louShip');assert.equal(s.armies[0].units[0].equipment.siege,'heavyRam');assert.match(scenarioSetupMarkup(p).body,/data-scenario-ship/);validateSave(s);
 assert.throws(()=>validateCustomBattle({...d,ownTeam:[{...d.ownTeam[0],type:'ship'}]}));assert.throws(()=>validateCustomBattle({...d,ownTeam:[{...d.ownTeam[0],equipment:{ship:'longbow',siege:null}}]}));
});
test('longbow shoots at five hexes and white horse cavalry shoots at three in actual basic combat',()=>{
 for(const [type,distance]of [['longbow',5],['whiteHorse',3]]){const x=battle(type);Object.assign(x.u,{x:1,y:0,cooldown:0});Object.assign(x.target,{x:1+distance,y:0});assert.equal(unitAttributes(x.u,x.b).range,distance);stepBattle(x.b);assert.ok(x.target.hp<3000,type);validateSave(x.s);}
 const x=battle('archer');Object.assign(x.u,{x:1,y:0,cooldown:0});Object.assign(x.target,{x:6,y:0});stepBattle(x.b);assert.equal(x.target.hp,3000);
});
test('rattan defense and its major tactic provide actual protection',()=>{
 const x=battle('rattan');Object.assign(x.u,{x:3,y:2,intent:100});Object.assign(x.target,{x:4,y:2});x.u.skillReady['rattan-wall']=0;stepBattle(x.b);assert.equal(x.u.tacticCasts['rattan-wall'],1);assert.ok(unitAttributes(x.u,x.b).damageReduction>0);assert.ok(x.u.statuses.shield.amount>0);assert.ok(unitAttributes(x.u).defense>unitAttributes({...x.u,type:'halberd'}).defense);validateSave(x.s);
});
test('great halberd displacement is a real, bounded movement and preserves continuation',()=>{
 let moved=false;
 for(let seed=1;seed<=12&&!moved;seed++){const x=battle('greatHalberd',{seed});Object.assign(x.u,{x:3,y:2,intent:100});Object.assign(x.target,{x:4,y:2});x.u.skillReady['halberd-shift']=0;stepBattle(x.b);assert.equal(x.u.tacticCasts['halberd-shift'],1);assert.ok(x.target.hp<3000);moved=x.target.x!==4||x.target.y!==2;const copy=validateSave(structuredClone(x.s));for(let i=0;i<4;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.s,copy);}
 assert.ok(moved,'a legal hit must sometimes push the enemy');
});
test('water and siege forms preserve identity, casualties, intent and shared usage and cooldown',()=>{
 const x=battle('longbow',{equipment:{ship:'louShip',siege:'siege'},terrain:'river',kind:'siege'}),high=unitTactics(x.u).find(s=>s.learningTier==='high');
 x.u.tacticCasts[high.id]=1;x.u.skillReady={[high.id]:40};x.u.hp=2900;x.u.battleDamage=100;x.u.intent=67;
 Object.assign(x.u,{x:3,y:3});syncCombatForm(x.b,x.u);assert.equal(combatType(x.u),'louShip');assert.equal(x.u.type,'longbow');const shipHigh=unitTactics(x.u).find(s=>s.learningTier==='high');assert.equal(tacticUsesLeft(x.u,shipHigh),0);assert.equal(tacticReadyAt(x.u,shipHigh),40);
 Object.assign(x.u,{x:8,y:1});syncCombatForm(x.b,x.u,x.b.siege.gate);assert.equal(combatType(x.u),'siege');assert.ok(x.u.formReadyTick>x.b.tick);assert.deepEqual([x.u.hp,x.u.battleDamage,x.u.intent],[2900,100,67]);assert.equal(tacticUsesLeft(x.u,unitTactics(x.u).find(s=>s.learningTier==='high')),0);
 Object.assign(x.u,{x:1,y:0});syncCombatForm(x.b,x.u,x.target);assert.equal(combatType(x.u),'longbow');validateSave(x.s);
 const copy=validateSave(structuredClone(x.s));for(let i=0;i<12;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.s,copy);
});
test('ordinary real encounters and standalone battles use identical upgrade attributes and tactics',()=>{
 for(const [type,home,faction]of [['baier','xuchang','cao'],['tigerCavalry','xuchang','cao'],['longbow','chenliu','cao']]){
  const s=newCampaign(51),c=s.cities.find(c=>c.id===home);if(!c.units.some(u=>!u.cityGuard)){const source=s.cities.find(v=>v.owner===faction&&v.units.some(u=>!u.cityGuard)),units=source.units.filter(u=>!u.cityGuard).slice(0,3);source.units=source.units.filter(u=>!units.includes(u));for(const u of units)u.homeCity=c.id;c.units.push(...units);}
  let a=fieldFromCity(s,home,{id:'a1'});const id=a.units[0].id;c.domestic.techs.push('militaryRegistry',type);c.gold=100000;
  assert.equal(changeCampaignTroop(s,a.id,id,type),null);const rival=s.cities.find(c=>c.id==='guandu');fieldFromCity(s,rival.id,{id:'a2'});assert.equal(orderCampaignArmy(s,a.id,rival.id),null);let enemy=s.armies.find(a=>a.id==='a2');enemy.route=[home];enemy.target=home;beginExecution(s);a=s.armies.find(a=>a.id==='a1');enemy=s.armies.find(a=>a.id==='a2');approachDestination(s,a,1);
  enemy.location=a.travel.to;enemy.route=[a.travel.from];enemy.target=a.travel.from;enemy.travel={from:a.travel.to,to:a.travel.from,road:a.travel.road,progress:0};
  for(let i=0;i<5&&!activeBattles(s).some(r=>r.armyIds.includes(a.id));i++)advanceCampaignDay(s);const r=activeBattles(s).find(r=>r.armyIds.includes(a.id));assert.ok(r,'normal mode must create a real encounter');const u=r.battle.sides.flatMap(side=>side.units).find(u=>u.id===id);
  const standalone=generateBattle({...defaultCustomBattle(),ownTeam:[{id,type,troops:u.initial,level:u.level}],enemyTeam:[{id:'cao'===id?'shao':'cao',type:'spear',troops:3000,level:1}]}).battle.sides[0].units[0];assert.equal(unitAttributes(u,r.battle).range,unitAttributes(standalone).range);assert.deepEqual(unitTactics(u).map(s=>s.id),unitTactics(standalone).map(s=>s.id));validateCampaign(JSON.parse(serializeCampaign(s)));
 }
});
