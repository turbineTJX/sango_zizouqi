import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIT_DESIGNS as T} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS as A} from '../data/design/assignments.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {ACTIONS,assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay,researchDailyRate,siegeOpening} from '../domestic.mjs';
import {workProfile} from '../work-traits.mjs';
import {commandBenefit as benefit} from './helpers/trait-benefits.mjs';
import {cityWorkLimit,creditCityWork} from '../economy.mjs';
import {diplomaticRate,diplomaticFee,diplomaticTraits} from '../diplomatic-traits.mjs';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeBuildingDurability} from '../building-durability.mjs';
import {personnelSpeed,TRANSPORT_SPEED,PERSONNEL_SPEED} from '../personnel-movement.mjs';
import {createScenario} from '../scenarios.mjs';
import {validateSave,lockDeployment} from '../engine.mjs';

const holders=id=>Object.keys(A).filter(k=>A[k].traits.includes(id));

test('every command trait clears the 50 to 100 primary-attribute benefit floor',()=>{
 const failures=[];
 for(const [id,t] of Object.entries(T).filter(([,t])=>t.work))for(const key of t.work.actions){
  const d=ACTIONS[key],target=t.work.targets?.[0]||null,w=workProfile([id],d,target);
  const levels=['cash','grain','recruit'].includes(d.kind)?[0,1,2,3,6,12]:[3];
  for(const level of levels){const base=benefit(100,d,{}, {level}),actual=benefit(50,d,w,{level});if(actual+1e-9<base)failures.push({id,key,level,actual,base});}
 }
 assert.deepEqual(failures,[]);
});
test('official high-attribute holders retain a distinct command benefit',()=>{
 const shadowed=[];
 for(const [id,t] of Object.entries(T).filter(([,t])=>t.work))for(const holder of holders(id)){
  const values=t.work.actions.map(key=>{const d=ACTIONS[key],ability=OFFICER_BY_ID[holder][d.stat],target=t.work.targets?.[0]||null,ids=A[holder].traits;
   return benefit(ability,d,workProfile(ids,d,target))-benefit(ability,d,workProfile(ids.filter(k=>k!==id),d,target));});
  // The remaining-wound mechanism expands real eligibility, which cannot be
  // represented by a scalar on a fixed original recipient list.
  if(id!=='healRemainder'&&!values.some(n=>n>1e-8))shadowed.push({id,holder});
 }
 assert.deepEqual(shadowed,[]);
});

function setup(ids,key='research'){
 const s=peacefulCities(newCampaign(17)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);
 for(const id of ids){for(const town of s.cities)town.units=town.units.filter(u=>u.id!==id);for(const a of s.armies)a.units=a.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(o=>o.id!==id);c.units.push({...makeOfficer(id,2000),homeCity:c.id});}
 Object.assign(c,{grain:20000,granary:5,workshop:1,farm:1,commerce:1,clinic:1});initializeBuildingDurability(c);
 for(const [k,d] of Object.entries(ACTIONS))if(d.direction===ACTIONS[key].direction&&k!==key)c.domestic.cooldowns[k]=1000;
 if(ACTIONS[key].kind==='research'){c.domestic.techs=['efficientConstruction'];c.domestic.research={type:'siegeEngineering',progress:0,spent:600,workedDays:0};}
 for(const id of ids)assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,id),null);
 beginDomesticTurn(s);return {s,c,a:assignmentFor(s,ids[0]),u:c.units.find(u=>u.id===ids[0])};
}
test('real production of a 50-politics specialist uses its increased bounded capacity',()=>{
 for(const [id,key] of [['marketYield','fair'],['farmYield','cultivate']])for(const [roll,seed] of [[.03,0],[.5,1],[.78,2],[.99,3]]){
  const f=setup([holders(id)[0]],key);f.u.politics=50;
  // The saved seed controls only the real completion roll, with no injected result.
  let candidateSeed=seed;for(;;candidateSeed++){const x=(Math.imul(1664525,candidateSeed)+1013904223)>>>0;if(Math.abs(x/4294967296-roll)<.0001)break;}
  f.s.campaign.domestic.seed=candidateSeed;f.a.action.chance=.68;f.s.campaign.domestic.assignments=[f.a];
  const before=f.c.domestic.production[key==='fair'?'gold':'grain'],actionId=f.a.action.id;
  for(let d=0;d<ACTIONS[key].days;d++){f.s.campaign.day++;finishDomesticDay(f.s);}
  const event=f.s.campaign.domestic.events.find(e=>e.actionId===actionId&&e.result.factor!==undefined);
  assert.ok(event);assert.ok(event.result.actual>=0);assert.ok(f.c.domestic.production[key==='fair'?'gold':'grain']>=before);
  if(event.result.factor>=1)assert.ok(event.result.actual>cityWorkLimit(f.s,f.c,key==='fair'?'gold':'grain'));
 }
});
test('specialist production capacity is shared by the city and cannot stack with headcount',()=>{
 const {s,c}=setup([holders('marketYield')[0]],'fair'),limit=cityWorkLimit(s,c,'gold',2);
 assert.equal(creditCityWork(s,c,'gold',limit,2),limit);
 for(let i=0;i<20;i++)assert.equal(creditCityWork(s,c,'gold',limit,2),0);
 assert.equal(c.domestic.production.gold,limit);assert.equal(creditCityWork(s,c,'gold',1000),0);
});
test('research team benefit requires an actual available same-city helper and survives reload',()=>{
 const f=setup([holders('zhugeCoordination')[0],'person-420']);f.a.action.researchRoll=0;
 const rate=researchDailyRate(f.s,f.c,f.a),helper=assignmentFor(f.s,'person-420');helper.proposal={pick:{key:'research'},siteId:f.c.id};
 assert.equal(researchDailyRate(f.s,f.c,f.a)*2,rate);helper.proposal=null;
 const copy=validateCampaign(JSON.parse(serializeCampaign(f.s)));assert.equal(researchDailyRate(copy,copy.cities.find(c=>c.id===f.c.id),assignmentFor(copy,f.u.id)),rate);
 f.c.units=f.c.units.filter(u=>u.id!=='person-420');assert.equal(researchDailyRate(f.s,f.c,f.a)*2,rate);
});
test('Anzhong successful reassurance immediately starts another paid legal target',()=>{
 let seen=false;
 for(let seed=1;seed<20&&!seen;seed++){
  const f=setup([holders('calmChain')[0]],'reassure');
  // Add two real local eligible low-loyalty targets before selecting work.
  for(const u of f.c.units){f.s.campaign.domestic.loyalty[u.id]=25;}
  const a=f.a;if(!a.action){a.lastTurn=0;beginDomesticTurn(f.s);}if(!a.action)continue;
  const old=a.action.id,target=a.action.targetId,cost=a.action.cost;f.s.campaign.domestic.seed=seed;
  for(let day=0;day<15&&a.action?.id===old;day++){f.s.campaign.day++;finishDomesticDay(f.s);}
  const event=f.s.campaign.domestic.events.find(e=>e.actionId===old&&e.result.factor>=1);if(!event)continue;
  assert.ok(a.action);assert.notEqual(a.action.id,old);assert.notEqual(a.action.targetId,target);assert.equal(a.action.cost,cost);seen=true;
 }assert.ok(seen);
});
test('all diplomatic trait directions match or beat 100 attribute at 50 and remain useful at the cap',()=>{
 for(const [id,t] of Object.entries(T).filter(([,t])=>t.diplomacy))for(const holder of holders(id))for(const direction of t.diplomacy.directions){
  const u={...makeOfficer(holder,0),politics:50,intellect:50,charm:50};
  assert.ok(diplomaticRate(u,direction)>=2);assert.ok(diplomaticTraits(u,direction).some(t=>t.id===id));
  assert.ok(diplomaticFee(151,u,direction)<=151);
 }
});
test('grain transport boost applies on both relay legs and cycle returns, never on empty ordinary travel or retreat',()=>{
 const unit=makeOfficer(holders('relayCargo')[0],0),ordinary={unit,destination:'chenliu',cargo:{grain:500}};
 assert.equal(personnelSpeed({...ordinary,relayDestination:'wan'}),TRANSPORT_SPEED*2);
 assert.equal(personnelSpeed(ordinary),TRANSPORT_SPEED*2);
 assert.equal(personnelSpeed({...ordinary,retreating:true}),TRANSPORT_SPEED);
 assert.equal(personnelSpeed({...ordinary,cargo:{grain:0}}),PERSONNEL_SPEED);
 assert.equal(personnelSpeed({unit:makeOfficer(holders('cycleCargo')[0],0),destination:'wan',cargo:{grain:0},convoyCycle:{leg:'return'}}),TRANSPORT_SPEED*2);
});
test('strong defensive preparation survives actual deployment and battle save validation',()=>{
 const f=setup([holders('zhouDrill')[0]],'exercise');Object.assign(f.c,{drill:5,walls:3});initializeBuildingDurability(f.c);
 f.c.domestic.preparation.intent={amount:24,until:100,actionId:f.a.id};f.c.domestic.preparation.shield={amount:.4,until:100,actionId:f.a.id};
 const opening=siegeOpening(f.c,1);assert.equal(opening.intent,39);assert.ok(opening.shield>.35&&opening.shield<=.6);
 const s=createScenario('custom-battle',811,20,null,{seed:811,terrain:'land',battleKind:'siege',gateHp:12000,ownTeam:[{id:'person-25',type:'spear',troops:3000,level:10}],enemyTeam:[{id:'person-387',type:'spear',troops:3000,level:10}]});
 s.battle.strategicRetreat=true;for(const side of s.battle.sides)side.retreatDestination=null;
 s.battle.domesticOpening={...opening,side:1,applied:false};lockDeployment(s.battle);
 const copy=validateSave(structuredClone(s),{strategic:true});assert.equal(copy.battle.domesticOpening.intent,39);assert.equal(copy.battle.domesticOpening.applied,true);
});
