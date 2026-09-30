import {requestStrategicOrder} from '../strategic-orders.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,activeBattles,chooseEncounter,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,setArmyMarchMode,transferOfficer,orderCampaignArmy} from '../strategic-campaign.mjs';
import {TECHS,ACTIONS,assignDomestic,assignmentFor,beginDomesticTurn,cancelDomestic,actionCandidates} from '../domestic.mjs';
import {makeOfficer,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {sideBonds} from '../bonds.mjs';
import {fieldFromCity,peacefulCities} from './helpers/field-campaign.mjs';
import {movementPoints} from '../strategic-movement.mjs';
import {setRelationshipType} from '../relationships.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function setup(ids,seed=71){
 const s=peacefulCities(newCampaign(seed)),c=s.cities.find(c=>c.id==='xuchang');s.gold=100000;c.granary=5;c.grain=50000;c.clinic=1;c.workshop=1;c.farm=1;c.commerce=1;
 for(const id of ids){for(const t of s.cities)t.units=t.units.filter(u=>u.id!==id);for(const a of s.armies)a.units=a.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);c.units.push({...makeOfficer(id,2000),homeCity:c.id});}
 s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));return {s,c,units:ids.map(id=>c.units.find(u=>u.id===id))};
}
function only(c,direction,keys){for(const [key,d]of Object.entries(ACTIONS))if(d.direction===direction&&!keys.includes(key))c.domestic.cooldowns[key]=1000;}
function days(s,n){const target=s.campaign.day+n;for(let i=0;i<500&&s.campaign.day<target;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
test('Diao Chan alone starts Qingguo and cap budget is preserved; real hits and saves use common statuses',()=>{
 assert.equal(BOND_ASSIGNMENTS['person-425'].bondBeauty,2);for(const id of ['person-301','person-388','person-267','person-311'])assert.equal(BOND_ASSIGNMENTS[id].bondBeauty,1);
 const u=id=>({id,type:'archer',troops:5000,level:10});const s=createScenario('custom-battle',811,20,null,{seed:811,terrain:'land',ownTeam:['person-425','person-301','person-388','person-267'].map(u),enemyTeam:['cao','dun','chu','liao'].map(u)}),b=s.battle;lockDeployment(b);assert.equal(sideBonds(b,0).bondBeauty.points,5);
 let seen=false;for(let i=0;i<120&&!b.result;i++){stepBattle(b);if(b.sides[1].units.some(u=>u.statuses.powerDown?.sourceSkillName==='倾国')){seen=true;break;}}assert.ok(seen);
 const copy=validateSave(structuredClone(s));for(let i=0;i<8;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);
});
test('real paid work can hand off exactly once without double fees and resumes deterministically',()=>{
 const {s,c}=setup(['person-263','person-533']);only(c,'commerce',['fair']);assignDomestic(s,c.id,'commerce','person-533');beginDomesticTurn(s);const old=assignmentFor(s,'person-533').action;
 assignDomestic(s,c.id,'commerce','person-263');const gold=s.gold;cancelDomestic(s,'person-533');const next=assignmentFor(s,'person-263');assert.equal(next.action.id,old.id);assert.equal(s.gold,gold);assert.equal(assignmentFor(s,'person-533'),undefined);
 const copy=restore(s);days(s,9);days(copy,9);assert.equal(serializeCampaign(s),serializeCampaign(copy));
});
test('military farming counts only actual available troops and produces bounded progress',()=>{
 const {s,c,units}=setup(['person-482']);only(c,'agriculture',['cultivate']);assignDomestic(s,c.id,'agriculture','person-482');beginDomesticTurn(s);const a=assignmentFor(s,'person-482');assert.equal(a.action.key,'cultivate');days(s,1);assert.equal(a.action.farmDays,1);assert.ok(a.action.farmContribution>0);restore(s);
 const bad=structuredClone(s);bad.campaign.domestic.assignments.find(a=>a.officerId===units[0].id).action.farmContribution=99;assert.throws(()=>restore(bad));
});
test('cross-direction cooperation uses actual resident Zhang Zhao and common daily settlement',()=>{
 const {s,c}=setup(['person-420','person-263']);only(c,'commerce',['build_commerce']);only(c,'agriculture',['build_farm']);assignDomestic(s,c.id,'commerce','person-420');assignDomestic(s,c.id,'agriculture','person-263');days(s,1);
 const records=Object.values(s.campaign.domestic.cooperation);assert.ok(records.some(r=>[r.helperId,r.officerId].includes('person-420')&&[r.helperId,r.officerId].includes('person-263')));assert.equal(records.length,1);restore(s);
});
test('march choices exchange actual grain and pay morale on real movement; save and cancel are safe',()=>{
 const {s,c}=setup(['person-482']);const a=fieldFromCity(s,c.id,{ids:['person-482']});const total=c.grain+a.supply,base=movementPoints(a);
 assert.equal(setArmyMarchMode(s,a.id,'light'),null);assert.equal(a.supplyCapacity,450);assert.equal(c.grain+a.supply,total);assert.ok(movementPoints(a)>base);restore(s);
 assert.equal(setArmyMarchMode(s,a.id,'normal'),null);assert.equal(a.supplyCapacity,900);assert.equal(c.grain+a.supply,total);assert.equal(setArmyMarchMode(s,a.id,'forced'),null);orderCampaignArmy(s,a.id,'chenliu');const morale=a.morale;days(s,1);assert.equal(a.morale,morale-5);assert.ok(a.travel||a.location!==c.id);restore(s);
});
test('relay cargo retains real stocks at the waypoint and moves to final destination after a stop',()=>{
 const {s,c}=setup(['person-533']);const mid=s.cities.find(c=>c.id==='chenliu'),dest=s.cities.find(c=>c.id==='wan');mid.owner=c.owner;dest.owner=c.owner;mid.domestic.owner=c.owner;dest.domestic.owner=c.owner;
 const before=c.grain;assert.equal(transferOfficer(s,'person-533',dest.id,{cargo:{grain:500,manpower:0},relay:mid.id}),null);const o=s.campaign.idle.find(o=>o.unit.id==='person-533');assert.equal(c.grain,before-500);assert.equal(o.destination,mid.id);assert.equal(o.relayDestination,dest.id);restore(s);
 const copy=restore(s);days(s,4);days(copy,4);assert.equal(serializeCampaign(s),serializeCampaign(copy));
 const bad=structuredClone(copy),moving=bad.campaign.idle.find(o=>o.unit.id==='person-533');if(moving?.destination){moving.relayDestination=moving.destination;assert.throws(()=>restore(bad));}
});
test('referral finds a real relationship candidate without recruiting or relocating the person',()=>{
 let found=false;for(let seed=1;seed<=12&&!found;seed++){
  const {s,c}=setup(['person-255'],seed),p=s.campaign.domestic.people.find(p=>p.status==='FREE'&&!p.travel&&p.cityId===c.id);assert.ok(p);setRelationshipType(s,'person-255',p.id,'liked',75);only(c,'technology',['explore']);assignDomestic(s,c.id,'technology','person-255');days(s,10);
  found=!!s.campaign.talent.knowledge[c.owner]?.[p.id]?.locationConfirmed;if(found){assert.equal(p.status,'FREE');assert.equal(p.cityId,c.id);restore(s);}
 }assert.ok(found);
});
test('continuous convoys reload each batch from real source stock and cannot duplicate troops',()=>{
 const {s,c,units}=setup(['person-195']);units[0].troops=0;const destination=s.cities.find(v=>v.id==='chenliu');destination.granary=5;destination.grain=0;
 assert.equal(transferOfficer(s,units[0].id,destination.id,{cargo:{grain:500,manpower:0},cycles:2}),null);let o=s.campaign.idle.find(o=>o.unit.id===units[0].id);assert.equal(o.convoyCycle.remaining,2);const copy=restore(s);days(s,10);days(copy,10);assert.equal(serializeCampaign(s),serializeCampaign(copy));
 o=s.campaign.idle.find(o=>o.unit.id===units[0].id);assert.ok(!o.convoyCycle||o.convoyCycle.remaining<2);assert.equal(s.cities.flatMap(c=>c.units).filter(u=>u.id===units[0].id).length,0);restore(s);
});
test('healing remainder reaches only real new wounded and never creates soldiers',()=>{
 let verified=false;
 for(let seed=1;seed<=12&&!verified;seed++){
  const {s,c,units}=setup(['person-529'],seed),first=c.units.find(u=>u.id!==units[0].id),other=c.units.find(u=>u.id!==units[0].id&&u!==first);first.troops-=300;first.wounded=300;only(c,'technology',['heal']);assignDomestic(s,c.id,'technology',units[0].id);beginDomesticTurn(s);const a=assignmentFor(s,units[0].id);assert.equal(a.action.key,'heal');
  first.troops+=first.wounded;first.wounded=0;other.troops-=300;other.wounded=300;const before=other.troops;days(s,5);if(other.troops>before){verified=true;assert.ok(other.troops-before<=300);assert.equal(other.wounded,300-(other.troops-before));restore(s);}
 }assert.ok(verified);
});
test('crafting continuation starts a new fully paid timed trial and pending orders suppress chains',()=>{
 let verified=false;for(let seed=1;seed<12&&!verified;seed++){
  const {s,c}=setup(['person-509'],seed);only(c,'technology',['research','trial']);assignDomestic(s,c.id,'technology','person-509');beginDomesticTurn(s);const a=assignmentFor(s,'person-509');assert.equal(a.action.key,'research');
  c.domestic.research.progress=TECHS[a.action.targetId].requiredProgress-1;const waiting=structuredClone(s);assert.ok(requestStrategicOrder(waiting,{kind:'dismiss',cityId:c.id,officerIds:['person-509']},'after').queued);days(s,10);days(waiting,10);assert.equal(assignmentFor(waiting,'person-509'),undefined);if(a.action?.key==='trial'){verified=true;assert.equal(a.action.remaining,ACTIONS.trial.days);assert.equal(a.action.cost,ACTIONS.trial.cost);restore(s);}
 }assert.ok(verified);
});

test('shared task ranking values farming only while the required troops are actually present',()=>{
 const {s,c,units}=setup(['person-482']);only(c,'agriculture',['cultivate']);assignDomestic(s,c.id,'agriculture','person-482');const a=assignmentFor(s,'person-482');
 const armed=actionCandidates(s,a).find(x=>ACTIONS[x.key].kind==='grain');assert.ok(armed);for(const u of c.units)u.troops=0;const unarmed=actionCandidates(s,a).find(x=>x.key===armed.key);assert.ok(unarmed);assert.ok(armed.score>unarmed.score);assert.equal(armed.chance,unarmed.chance);
});

