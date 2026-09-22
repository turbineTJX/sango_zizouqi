import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {OFFICER_TRAITS,WORK_TRAITS,officerTraits} from '../officer-traits.mjs';
import {PASSIVES,passiveList} from '../passives.mjs';
import {makeOfficer} from '../engine.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,actionChance} from '../domestic.mjs';
import {cooperationProfile} from '../domestic-cooperation.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {personnelSpeed} from '../personnel-movement.mjs';
import {traitMarkup} from '../officer-roster.mjs';

function setup(id,key,seed=31){
 const s=newCampaign(seed);peacefulCities(s);s.gold=50000;
 const c=s.cities.find(c=>c.id==='xuchang');c.governor=null;c.grain=10000;c.clinic=1;c.drill=1;c.gateHp=3000;
 // Scenario placement: each identity exists exactly once, with equal aptitude for comparisons.
 for(const city of s.cities)city.units=city.units.filter(u=>u.id!==id);
 for(const army of s.armies)army.units=army.units.filter(u=>u.id!==id);
 s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
 const u={...makeOfficer(id,0),homeCity:c.id};
 s.campaign.idle.push({unit:u,faction:c.owner,location:c.id,destination:null,remainingDays:0});
 s.campaign.domestic.loyalty[id]=85;
 if(key){for(const [k,d]of Object.entries(ACTIONS))if(d.direction===ACTIONS[key].direction&&k!==key)c.domestic.cooldowns[k]=10000;assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,id),null);}
 return {s,c,u};
}
function advance(s,day){while(s.campaign.day<day){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}}
const result=(s,id)=>s.campaign.domestic.events.find(e=>e.officerId===id&&e.result.factor!==undefined);

test('all 832 identities have fixed positive traits, independent of level, troop and learned tactics',()=>{
 const counts=new Set();
 for(const p of OFFICER_CATALOG){const ids=officerTraits(p);counts.add(ids.length);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>0);assert.ok(ids.every(id=>PASSIVES[id]&&PASSIVES[id].available!==false));
  const u=makeOfficer(p.id);assert.deepEqual(passiveList(u).map(p=>p.id),ids);assert.ok(passiveList(u).every(p=>p.unlocked&&p.level===1));
  assert.deepEqual(officerTraits({...u,level:10,type:'ship',skillRouteType:'ship',politics:1,tactics:[]}),ids);
 }
 assert.ok(counts.size>1);assert.equal(Object.keys(OFFICER_TRAITS).length,832);
 assert.ok(!WORK_TRAITS.impetuous&&!WORK_TRAITS.cautious);assert.doesNotMatch(traitMarkup(makeOfficer('dun')),/级解锁|负面|急躁/);
});

test('actor administration works without a governor and matching governor does not double the discount',()=>{
 const {s,c,u}=setup('person-255','build_farm');const a=assignmentFor(s,u.id);
 assert.equal(actionCandidates(s,a)[0].cost,400);c.governor=u.id;assert.equal(actionCandidates(s,a)[0].cost,400);
 c.governor=null;advance(s,2);assert.equal(a.action.cost,400);const saved=validateCampaign(JSON.parse(serializeCampaign(s)));advance(s,11);advance(saved,11);assert.equal(serializeCampaign(s),serializeCampaign(saved));
});

test('research, farming, repairs, medicine and preparation traits change real paid task outcomes',()=>{
 for(const [id,key,prepare]of [
  ['person-290','research',()=>{}],['person-107','cultivate',()=>{}],['person-567','repair',()=>{}],
  ['person-705','heal',c=>{c.units[0].troops-=1000;c.units[0].wounded=1000;}],
  ['person-0','exercise',()=>{}],
 ]){
  // Pick a real trainer from the catalogue rather than assuming a source ID.
  const actor=key==='exercise'?OFFICER_CATALOG.find(p=>officerTraits(p).includes('trainer')).id:id;
  const f=setup(actor,key),plain=setup('person-123',key);prepare(f.c);prepare(plain.c);
  const before=f.c.grain;advance(f.s,2);const a=assignmentFor(f.s,actor);assert.ok(a.action.traitIds.length,key);
  const fork=validateCampaign(JSON.parse(serializeCampaign(f.s)));advance(f.s,11);advance(fork,11);advance(plain.s,11);
  assert.equal(serializeCampaign(f.s),serializeCampaign(fork));const r=result(f.s,actor),base=result(plain.s,'person-123');assert.ok(r&&base,key);assert.equal(r.result.factor,base.result.factor,key);
  if(['research','cultivate','repair','heal'].includes(key))assert.ok(r.result.actual>base.result.actual,key);
  else assert.ok(f.c.domestic.preparation.intent.amount>plain.c.domestic.preparation.intent.amount);
  if(key==='heal')assert.ok(f.c.units[0].wounded>=0);
  assert.ok(before>=0);
 }
});

test('recruitment discounts charge actual recruits at the saved rate without creating free people',()=>{
 const {s,c,u}=setup('person-107','recruit');c.units[0].troops=1000;c.manpower=2000;
 advance(s,2);const a=assignmentFor(s,u.id),x=a.action;assert.equal(x.unitCost,.25*.85);assert.equal(x.cost,60+Math.ceil(x.amount*x.unitCost));
 const fork=validateCampaign(JSON.parse(serializeCampaign(s)));advance(s,11);advance(fork,11);assert.equal(serializeCampaign(s),serializeCampaign(fork));
 const r=result(s,u.id);assert.ok(r.result.actual<=x.amount);assert.equal(r.result.spent,60+Math.ceil(r.result.actual*x.unitCost));
});

test('talent traits improve only the corresponding real action chance; mediator does not stack',()=>{
 const {s,c,u}=setup('person-255');u.politics=60;u.charm=60;const plain={...u,id:'person-634'};
 assert.ok(Math.abs(actionChance(s,c,u,ACTIONS.explore)-actionChance(s,c,plain,ACTIONS.explore)-.08)<1e-9);
 assert.equal(actionChance(s,c,u,ACTIONS.hire),actionChance(s,c,plain,ACTIONS.hire));
 const talker={...plain,id:'person-123'};assert.ok(actionChance(s,c,talker,ACTIONS.hire)>actionChance(s,c,plain,ACTIONS.hire));
 const neutral={...plain,compatibility:null},one=cooperationProfile(s,{...u,compatibility:null},neutral,ACTIONS.fair),none=cooperationProfile(s,{...neutral,id:'person-107'},neutral,ACTIONS.fair);
 assert.ok(Math.abs(one.chance-none.chance-.1)<1e-9);assert.equal(cooperationProfile(s,{...u,compatibility:null},{...neutral,id:'person-123'},ACTIONS.fair).chance,one.chance);
});

test('transport speed applies to actual travel and saves resume; light travel has separate eligibility',()=>{
 const {s,u}=setup('person-533');const o=s.campaign.idle.find(o=>o.unit===u);assert.equal(transferOfficer(s,u.id,'chenliu',{cargo:{grain:1000,manpower:0}}),null);
 assert.equal(personnelSpeed(o),120);const fork=validateCampaign(JSON.parse(serializeCampaign(s)));advance(s,11);advance(fork,11);assert.equal(serializeCampaign(s),serializeCampaign(fork));
 assert.equal(personnelSpeed({unit:makeOfficer('person-487',0),destination:'chenliu'}),70*1.15);
 assert.equal(personnelSpeed({unit:makeOfficer('person-533',0),destination:'chenliu'}),70);
});
