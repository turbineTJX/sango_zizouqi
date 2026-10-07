import {completeTechnologyBuilding} from '../building-durability.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,changeCityTroop,equipCityUnit,recruitCityUnits,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {lockDeployment} from '../engine.mjs';
import {assignDomestic,assignmentFor,ACTIONS,cancelDomestic,canTrain,buildCost,actionCandidates} from '../domestic.mjs';
import {TECHS,canResearch,localTechnologies,technologyAllowed,cityTechnologyProfile,cityVisionRadius,technologyRequirements} from '../city-technology.mjs';
import {cityIncomeBreakdown,cityWorkLimit} from '../economy.mjs';
import {trainingCost} from '../troop-training.mjs';
import {canEquip,equipmentCost} from '../troop-equipment.mjs';
import {technologyMarkup} from '../technology-view.mjs';
import {visionSources,pointVisible} from '../strategic-vision.mjs';
import {citySceneState,citySceneMarkup} from '../city-scene.mjs';
import {peacefulCities,invadeFromGuandu} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(seed=1){const s=peacefulCities(newCampaign(seed));fundCities(s,100000);const c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id).unit;for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='technology'&&k!=='research')c.domestic.cooldowns[k]=1000;assert.equal(assignDomestic(s,c.id,'technology',u.id),null);return {s,c,u};}
function days(s,n){for(let i=0;i<n;i++){if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);assert.ok(advanceCampaignDay(s).dayEnded);}}

test('all cities have fixed partial technology trees; buildings cannot create new affinities',()=>{
 assert.equal(Object.keys(TECHS).length,20);const s=newCampaign(20,'guandu-200');
 for(const c of s.cities){const available=localTechnologies(c);assert.ok(available.length>=7&&available.length<=10,c.name);const profile=structuredClone(cityTechnologyProfile(c));for(const key of ['barracks','commerce','farm','granary','workshop','walls','drill'])c[key]=5;assert.deepEqual(cityTechnologyProfile(c),profile);assert.deepEqual(localTechnologies(c),available);}
 const c=s.cities.find(c=>c.id==='xuchang');assert.ok(!technologyAllowed(c,'whiteHorse'));assert.ok(!technologyAllowed(c,'shipbuilding'));
 const bad=structuredClone(DESIGN_TABLES);bad.technologies.records.find(r=>r.id==='militaryRegistry').parameters.buildings={barracks:1};assert.ok(validateDesignTables(bad).some(e=>e.includes('不能以兵营')));
});

test('military research uses governance and different basic facilities, never barracks level',()=>{
 const {c}=fixture();c.barracks=0;c.order=59;assert.ok(!canResearch(c,'militaryRegistry'));c.order=60;assert.ok(canResearch(c,'militaryRegistry'));c.domestic.techs=['militaryRegistry'];c.order=70;c.farm=1;c.commerce=1;c.workshop=0;
 assert.ok(canResearch(c,'militaryHouseholds'));assert.ok(canResearch(c,'militarySupply'));c.drill=0;assert.ok(!canResearch(c,'tigerCavalry'));c.drill=1;assert.ok(canResearch(c,'tigerCavalry'));c.granary=1;assert.ok(canResearch(c,'baier'));
 assert.ok(!canResearch(c,'crossbow'));assert.match(technologyRequirements(c,'crossbow').join(' '),/没有连弩兵资质/);
 const s=newCampaign(1,'guandu-200'),small=s.cities.find(c=>c.id==='chenliu');small.commerce=2;small.domestic.techs=['taxation'];assert.ok(canResearch(small,'tradeLaw'));
});

test('research spends city funds once, progresses on real days and reloads deterministically',()=>{
 const {s,c,u}=fixture(),other=s.cities.find(c=>c.id==='chenliu'),gold=c.gold,otherGold=other.gold;
 assert.equal(beginExecution(s),null);assert.equal(c.domestic.research.type,'militaryRegistry');assert.equal(c.domestic.research.progress,0);assert.equal(c.gold,gold-200);assert.equal(other.gold,otherGold);assert.equal(canTrain(c,'baier'),false);
 days(s,3);assert.ok(c.domestic.research.progress>0&&c.domestic.research.progress<100);assert.equal(c.domestic.research.workedDays,3);assert.match(technologyMarkup(s,c),/预计还需/);const copy=restore(s);
 days(s,6);days(copy,6);assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.ok(c.domestic.techs.includes('militaryRegistry'));assert.equal(c.domestic.research,null);assert.equal(s.campaign.domestic.events.filter(e=>e.cityId===c.id&&e.result.reward?.technologyId==='militaryRegistry').length,1);assert.equal(c.gold,gold-200);
 assert.ok(!ACTIONS.trial);assert.equal(assignmentFor(s,u.id).action,null);
});

test('cancelling and resuming retains paid research and accepts changed dynamic conditions',()=>{
 const {s,c,u}=fixture();beginExecution(s);days(s,3);const progress=c.domestic.research.progress,spent=c.gold;cancelDomestic(s,u.id);const replacement=c.units.find(v=>v.id!==u.id);s.campaign.phase='planning';c.order=0;
 assert.equal(assignDomestic(s,c.id,'technology',replacement.id),null);const a=assignmentFor(s,replacement.id);assert.ok(actionCandidates(s,a).some(p=>p.targetId==='militaryRegistry'&&p.cost===0));beginExecution(s);assert.equal(c.gold,spent);assert.equal(c.domestic.research.progress,progress);days(s,2);assert.ok(c.domestic.research.progress>=progress);restore(s);
});

test('one city research project is exclusive and a second scientist can cooperate',()=>{
 const {s,c,u}=fixture();assert.equal(assignDomestic(s,c.id,'technology',c.units.find(v=>v.id!==u.id).id),null);beginExecution(s);
 assert.equal(s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&a.action?.key==='research').length,1);days(s,1);assert.ok(Object.values(s.campaign.domestic.cooperation).some(r=>r.cityId===c.id&&r.direction==='technology'));restore(s);
});

test('tech income bonuses add to 25 percent and increase the actual shared production allowance',()=>{
 const {s,c}=fixture();c.governor=null;const base=cityIncomeBreakdown(s,c).base,limit=cityWorkLimit(s,c,'manpower');c.domestic.techs=['militaryRegistry','militaryHouseholds'];
 assert.equal(cityIncomeBreakdown(s,c).base.manpower,Math.floor(base.manpower*1.25));assert.equal(cityWorkLimit(s,c,'manpower'),Math.floor(limit*1.25));assert.equal(cityIncomeBreakdown(s,c).base.gold,base.gold);
 const other=s.cities.find(c=>c.id==='chenliu');other.governor=null;const money=cityIncomeBreakdown(s,other).base.gold;other.domestic.techs=['taxation','tradeLaw'];assert.equal(cityIncomeBreakdown(s,other).base.gold,Math.floor(money*1.25));restore(s);
});

test('technology increases completed real resource operations without a second harvest payout',()=>{
 for(const [key,direction,resource,techs]of [['fair','commerce','gold',['taxation']],['cultivate','agriculture','grain',['cultivation']],['recruit','military','manpower',['militaryRegistry','militaryHouseholds']]]){
  const {s,c,u}=fixture(1);cancelDomestic(s,u.id);if(resource==='manpower')c.manpower=0;
  for(const [id,def]of Object.entries(ACTIONS))if(def.direction===direction&&id!==key)c.domestic.cooldowns[id]=1000;
  assert.equal(assignDomestic(s,c.id,direction,u.id),null);const boosted=structuredClone(s),other=boosted.cities.find(x=>x.id===c.id);other.domestic.techs=techs;
  days(s,10);days(boosted,10);const actual=world=>world.campaign.domestic.events.find(e=>e.cityId===c.id&&e.result.resourceCredit?.[resource]>0)?.result.resourceCredit[resource];
  assert.ok(actual(boosted)>actual(s),resource+' real completed proceeds');assert.equal(other.domestic.production[resource],actual(boosted));assert.equal(c.domestic.production[resource],actual(s));restore(boosted);
 }
});

test('an actual siege pauses daily research without losing the project or its payment',()=>{
 const {s,c}=fixture(1);beginExecution(s);days(s,2);invadeFromGuandu(s);let r;
 for(let i=0;i<8&&!r;i++){advanceCampaignDay(s);r=activeBattles(s).find(r=>r.kind==='siege'&&r.cityId===c.id);}
 assert.ok(r);const progress=c.domestic.research.progress,worked=c.domestic.research.workedDays,spent=c.domestic.research.spent;assert.equal(chooseEncounter(s,r.id,true),null);lockDeployment(r.battle);advanceCampaignDay(s);
 assert.equal(c.domestic.research.progress,progress);assert.equal(c.domestic.research.workedDays,worked);assert.equal(c.domestic.research.spent,spent);restore(s);
});

test('military and construction discounts affect paid city actions and preview calculations',()=>{
 const {s,c}=fixture();const u=c.units[0];c.domestic.techs=['militaryRegistry','militarySupply'];const gold=c.gold,cost=trainingCost('baier',u.troops+u.wounded,c);c.domestic.techs.push('baier');
 assert.equal(changeCityTroop(s,c.id,u.id,'baier'),null);assert.equal(c.gold,gold-cost);assert.equal(cost,Math.ceil((u.troops+u.wounded)*400*.9/1000));
 c.domestic.techs.push('efficientConstruction','siegeEngineering');const gear={siege:'tower',ship:null},fee=equipmentCost(gear,u.equipment,u.troops+u.wounded,c),before=c.gold;assert.equal(equipCityUnit(s,c.id,u.id,gear),null);assert.equal(c.gold,before-fee);
 assert.equal(buildCost(s,c,'commerce',u),450);u.troops=1000;const replenishGold=c.gold;assert.equal(recruitCityUnits(s,c.id,[u.id]),null);assert.equal(replenishGold-c.gold,trainingCost(u,u.troops-1000,c));restore(s);
});

test('umbrella gear technologies unlock their three local forms, with a real water condition',()=>{
 const s=newCampaign(1,'guandu-200'),c=s.cities.find(c=>c.id==='town-31');c.domestic.techs=['efficientConstruction','shipbuilding'];for(const id of ['mengchong','louShip','fightingShip'])assert.ok(canEquip(c,id));assert.ok(!canEquip(c,'tower'));c.water=false;assert.ok(!canEquip(c,'louShip'));
 const forge=s.cities.find(c=>c.id==='xuchang');forge.domestic.techs=['efficientConstruction','siegeEngineering'];for(const id of ['heavyRam','siege','tower'])assert.ok(canEquip(forge,id));
});

test('watchtowers are persistent sight sources and transfer with the city, without revealing remote points',()=>{
 const {s,c}=fixture();s.cities.forEach(x=>x.owner='yuan');c.owner='cao';c.domestic.owner='cao';const point={x:c.x+30,y:c.y};assert.ok(!pointVisible(s,point,'cao'));c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower');assert.equal(cityVisionRadius(c,22),32);assert.ok(pointVisible(s,point,'cao'));assert.ok(!pointVisible(s,{x:c.x+50,y:c.y},'cao'));
 assert.match(citySceneMarkup(citySceneState(s,c)),/data-city-watchtower="xuchang"/);c.owner='yuan';assert.ok(!visionSources(s,'cao').length);assert.ok(visionSources(s,'yuan').some(v=>v.id===c.id&&v.radius===32));
});

test('save validation rejects foreign-city technology and impossible research progress',()=>{
 const {s,c}=fixture();beginExecution(s);days(s,2);restore(s);
 for(const mutate of [x=>x.cities.find(v=>v.id===c.id).domestic.techs.push('shipbuilding'),x=>x.cities.find(v=>v.id===c.id).domestic.techs.push('baier'),x=>x.cities.find(v=>v.id===c.id).domestic.research.progress=101,x=>x.cities.find(v=>v.id===c.id).domestic.research.spent=0,x=>x.campaign.domestic.version=11]){const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));}
});
