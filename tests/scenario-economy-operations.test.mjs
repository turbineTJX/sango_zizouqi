import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {actionCandidates,cityFoodReserve} from '../domestic.mjs';
import {advanceDiplomacy,validateDiplomacy,diplomaticAIPlan,diplomaticOfficerCandidates} from '../diplomacy.mjs';
import {assignDomestic} from '../domestic.mjs';
import {prepareEnemyDomestic} from '../talent-lifecycle.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {cityNeedsAgriculture} from '../economy.mjs';
import {localBuildingLimit} from '../metropolitan-areas.mjs';

test('a small AI roster assigns a farmer before filling optional departments',()=>{
 const s=newCampaign(417,'all-heroes-251'),c=s.cities.find(c=>c.id==='wan'),other=s.cities.find(x=>x.owner==='cao');
 const retained=new Set(['person-61','person-204','person-416']);
 for(const o of s.campaign.idle.filter(o=>o.location===c.id&&!retained.has(o.unit.id))){o.location=other.id;o.faction=other.owner;}
 c.units.forEach(u=>u.troops=4500);c.governor='person-416';
 assert.equal(cityPersonnel(s,c.id).length,3);prepareEnemyDomestic(s);
 assert.ok(s.campaign.domestic.assignments.some(a=>a.cityId===c.id&&a.direction==='agriculture'));
});
test('AI diplomacy leaves the last necessary resident farmer at work while explicit player choices remain available',()=>{
 const s=newCampaign(417,'guandu-200'),q=diplomaticAIPlan(s,'yuan')[0];assert.ok(q);
 const c=s.cities.find(c=>cityPersonnel(s,c.id).some(o=>o.unit.id===q.officerId));c.farm=0;
 assert.equal(assignDomestic(s,c.id,'agriculture',q.officerId,{scheduled:true,faction:'yuan'}),null);
 assert.ok(diplomaticOfficerCandidates(s,'yuan',q.direction).some(o=>o.unit.id===q.officerId));
 assert.ok(!diplomaticAIPlan(s,'yuan').some(p=>p.officerId===q.officerId));
 // Legal local fields suffice after the other residents are stationed elsewhere.
 // Increasing a poor city's fields beyond its ceiling would hide its food needs.
 const destination=s.cities.find(t=>t.owner===c.owner&&t.id!==c.id);
 for(const o of cityPersonnel(s,c.id).filter(o=>o.unit.id!==q.officerId)){
  o.unit.homeCity=destination.id;
  if(o.cityUnit){c.units=c.units.filter(u=>u.id!==o.unit.id);destination.units.push(o.unit);}
  else o.location=destination.id;
 }
 c.governor=null;c.farm=localBuildingLimit(s,c,'farm');assert.ok(!cityNeedsAgriculture(s,c));assert.ok(diplomaticAIPlan(s,'yuan').some(p=>p.officerId===q.officerId));
});
test('food staffing forecasts domestic full-capacity replenishment beyond the strategic 4500 target',()=>{
 const s=newCampaign(417,'coalition-190'),c=s.cities.find(c=>c.id==='town-21');c.farm=3;
 // Six ordinary 4500-person units fit these fields, but the actual officers'
 // legal full-capacity units do not. Existing money and grain remain plentiful.
 assert.ok(c.grain>10000);assert.ok(cityNeedsAgriculture(s,c));
});

function agricultureFixture(){
 const s=newCampaign(417,'warlords-194'),c=s.cities.find(c=>c.id==='town-2'),o=s.campaign.idle.find(o=>o.faction==='force-12'&&o.location===c.id&&!c.governor?.includes(o.unit.id));
 assert.ok(o);c.gold=10000;
 return {s,c,a:{cityId:c.id,direction:'agriculture',officerId:o.unit.id,lastKey:null,failures:0}};
}
test('a resolved disaster does not occupy the sole farmer again',()=>{
 const {s,c,a}=agricultureFixture();c.domestic.opportunities=[{kind:'disaster',expires:20,amount:600,saved:1},{kind:'mold',expires:20,amount:600,saved:1}];
 assert.ok(!actionCandidates(s,a).some(x=>['harvest','store'].includes(x.key)));
});
test('food below the work buffer makes cashless food production precede expansion and minor rescues',()=>{
 const {s,c,a}=agricultureFixture();c.grain=cityFoodReserve(s,c,10);c.domestic.opportunities=[{kind:'disaster',expires:20,amount:100,saved:0}];
 const choices=actionCandidates(s,a),good=choices.filter(x=>x.score>=choices[0].score-14);
 assert.equal(choices[0].key,'cultivate');assert.ok(good.every(x=>['cultivate','buy'].includes(x.key)),JSON.stringify(good));
});
test('reused couriers credit only their current contract and cargo resource',()=>{
 const s=newCampaign(417,'guandu-200'),d=s.campaign.diplomacy,from=s.cities.find(c=>c.owner==='yuan'),to=s.cities.find(c=>c.owner==='sunce'),o=s.campaign.idle.find(o=>o.faction==='yuan'&&!o.unit.troops&&!o.unit.wounded);
 assert.ok(o);d.lastAIReview=1;d.nextId=3;d.assignments=[];
 const clause=(id,kind,fromFaction,toFaction,extra={})=>({id,kind,from:fromFaction,to:toFaction,status:'active',effectiveDay:1,untilDay:91,delivered:0,remaining:0,...extra});
 const contract=(id,clauses)=>{const sites={yuan:from.id,sunce:to.id},approved=clauses.map(({status,effectiveDay,untilDay,delivered,remaining,carrierId,...terms})=>terms),signedTerms=JSON.stringify({version:1,sites,clauses:approved});return {id,version:1,factions:['yuan','sunce'],officerId:o.unit.id,direction:'commerce',goal:'sellGrain',sites,status:'signed',clauses,createdDay:1,expiresDay:21,signedDay:1,deadline:91,signedTerms,approvals:{yuan:{version:1,day:1,controller:'ai',terms:signedTerms},sunce:{version:1,day:1,controller:'ai',terms:signedTerms}},progress:5,workDays:5,escrow:[],receivers:{}};};
 const oldCargo=clause(1,'grain','yuan','sunce',{status:'done',untilDay:null,amount:700,delivered:700,carrierId:o.unit.id});
 const old=contract(1,[oldCargo,clause(2,'tradePass','sunce','yuan')]);
 const newCargo=clause(1,'grain','yuan','sunce',{status:'waiting',untilDay:null,amount:3000,remaining:3000,carrierId:o.unit.id});
 const current=contract(2,[newCargo,clause(2,'tradePass','sunce','yuan')]);d.contracts=[old,current];
 from.grain-=3000;to.grain=1000;
 o.unit.mission={type:'diplomacy',projectId:2,clauseId:1,faction:'yuan',homeCity:from.id,targetCity:to.id,location:to.id,route:[],progress:0,lastDay:0,phase:'work',purpose:'cargo',cancelled:false,workDone:false,cargo:{kind:'grain',amount:3000}};
 validateDiplomacy(s);advanceDiplomacy(s);
 assert.equal(to.grain,4000);assert.equal(oldCargo.delivered,700);assert.equal(newCargo.delivered,3000);assert.equal(newCargo.remaining,0);validateDiplomacy(s);
});
