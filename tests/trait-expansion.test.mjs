import {initializeBuildingDurability,gateDurability} from '../building-durability.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {cityWorkLimit} from '../economy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TRAIT_DESIGNS as traits} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS as assignments} from '../data/design/assignments.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
import {workProfile,workFactor,workChance} from '../work-traits.mjs';
import {ACTIONS,TECHS,assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay,actionChance,actionCandidates,researchDailyRate} from '../domestic.mjs';
import {taskTraits} from '../officer-traits.mjs';
import {makeOfficer} from '../engine.mjs';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {traitExpansionMarkdown} from '../scripts/trait-expansion-report.mjs';
const holders=id=>Object.keys(assignments).filter(k=>assignments[k].traits.includes(id));
function fixture(key,id,seed=71){
 const s=peacefulCities(newCampaign(seed)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);
 for(const t of s.cities)t.units=t.units.filter(u=>u.id!==id);for(const a of s.armies)a.units=a.units.filter(u=>u.id!==id);s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==id);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
 const u={...makeOfficer(id,2000),homeCity:c.id};c.units.push(u);Object.assign(c,{granary:5,grain:20000,clinic:1,workshop:1,farm:1,commerce:1,drill:1,walls:1,hall:1,manpower:10000});
 for(const v of c.units){v.troops=2000;v.wounded=1000;s.campaign.domestic.loyalty[v.id]=25;}
 if(key==='buy')c.grain=1000;
 if(['research','breakthrough','craftsmen','master','imitate'].includes(key)){c.domestic.techs=['efficientConstruction'];c.workshop=3;c.domestic.research={type:'siegeEngineering',progress:0,spent:600,workedDays:0};}
 if(ACTIONS[key].opportunity)c.domestic.opportunities.push({kind:ACTIONS[key].opportunity,expires:100,saved:0,amount:600});
 if(ACTIONS[key].kind==='rescue')c.domestic.opportunities.push({kind:ACTIONS[key].value,expires:100,saved:0,amount:600});
 for(const [k,d]of Object.entries(ACTIONS))if(d.direction===ACTIONS[key].direction&&k!==key)c.domestic.cooldowns[k]=1000;
 initializeBuildingDurability(c);gateDurability(c).hp=ACTIONS[key].kind==='repair'?1000:gateDurability(c).maxHp;
 assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,id),null);const candidates=actionCandidates(s,assignmentFor(s,id));assert.ok(candidates.every(p=>Number.isFinite(p.score)),key+' finite candidates '+JSON.stringify(candidates));beginDomesticTurn(s);const a=assignmentFor(s,id);assert.equal(a.action?.key,key,`${key} starts legally`);
 return {s,c,u,a,key,actionId:a.action.id};
}
function finish(f){const duration=f.a.action.remaining;for(let i=0;i<duration&&f.a.action?.id===f.actionId;i++){f.s.campaign.day++;finishDomesticDay(f.s);}return f.s.campaign.domestic.events.find(e=>e.actionId===f.actionId&&e.result.factor!==undefined);}
test('40 work traits have real holders, matching command snapshots and no new commands',()=>{
 const pool=Object.entries(traits).filter(([,t])=>t.work);assert.equal(pool.length,40);assert.equal(Object.keys(ACTIONS).length,40);
 for(const [id,t]of pool){assert.ok(holders(id).length);if(t.tier==='专属')assert.equal(holders(id).length,1);for(const key of t.work.actions){assert.ok(taskTraits({id:holders(id)[0]},ACTIONS[key]).includes(id));const other=Object.values(ACTIONS).find(d=>!t.work.actions.includes(d.id));assert.ok(!taskTraits({id:holders(id)[0]},other).includes(id));}assert.ok(traitExpansionMarkdown().includes(t.name));}
 const bad=structuredClone(DESIGN_TABLES);bad.traits.marketYield.work.actions=['new-command'];assert.ok(validateDesignTables(bad).some(e=>e.includes('未知或重复内政命令')));
});
test('real automatic commands apply output, temporary duration, discounts and repair',()=>{
 for(const [trait,key,check]of [
 ['marketYield','fair',(f,e)=>assert.equal(e.result.actual,Math.min(cityWorkLimit(f.s,f.c,'gold'),Math.round(Math.round(ACTIONS.fair.value*e.result.factor*(.7+f.u.politics/150))*(e.result.factor>=1?1.25:1))))],
 ['farmYield','cultivate',(f,e)=>assert.ok(e.result.actual>0&&e.result.actual<=cityWorkLimit(f.s,f.c,'grain'))],
 ['merchantReach','merchants',(f,e)=>assert.equal(f.c.domestic.effects.find(x=>x.key==='gold').untilTurn,Math.floor((f.s.campaign.day-1)/10)+4)],
 ['partnershipDeal','partnership',(f,e)=>assert.equal(f.c.domestic.effects.find(x=>x.key==='discount:commerce').amount,Math.round((.2*e.result.factor+.1)*10000)/10000)],
 ['wallRepair','repair',(f,e)=>assert.equal(e.result.actual,Math.round(3000*e.result.factor*1.3))],
 ['patrolReadiness','patrol',(f,e)=>assert.equal(f.c.domestic.preparation.shield.until,f.s.campaign.day+45)],
 ['zhouDrill','exercise',(f,e)=>{assert.equal(f.c.domestic.preparation.intent.until,f.s.campaign.day+60);assert.equal(f.c.domestic.preparation.intent.amount,Math.min(15,12*e.result.factor*1.25));}],
 ['caoFortress','fortify',(f,e)=>assert.equal(f.c.domestic.preparation.shield.amount,Math.min(.125,.1*e.result.factor*1.25))]
 ]){let checked=false;for(let seed=1;seed<15&&!checked;seed++){const f=fixture(key,holders(trait)[0],seed),e=finish(f);if(e?.result.factor>0){check(f,e);checked=true;}}assert.ok(checked,trait);}
});
test('single-roll floors, recruitment budgets and healing conserve actual resources',()=>{
 assert.equal(workFactor(0,workProfile(['jiaContingency'],ACTIONS.breakthrough)),.3);
 assert.equal(workFactor(.45,workProfile(['purchaseFill'],ACTIONS.buy)),.75);
 assert.equal(workChance(workProfile(['urgentRisk'],ACTIONS.urgent),ACTIONS.urgent),.15);
 for(const [id,key]of [['recruitFill','recruit'],['acuteHealing','heal'],['longHealing','recover'],['purchaseFill','buy'],['harvestRescue','harvest'],['storageRescue','store']]){
  const f=fixture(key,holders(id)[0]),before=f.c.units.reduce((n,u)=>n+u.troops+u.wounded,0),reserve=f.c.manpower,reserved=f.a.action.amount,e=finish(f);assert.ok(e,id);
  if(key==='recruit'){assert.equal(f.c.manpower,reserve-e.result.actual);assert.ok(e.result.actual<=reserved);assert.equal(f.c.units.reduce((n,u)=>n+u.troops+u.wounded,0),before+e.result.actual);}
  if(['heal','recover'].includes(key)){assert.equal(f.c.units.reduce((n,u)=>n+u.troops+u.wounded,0),before);assert.ok(f.c.units.every(u=>u.wounded>=0));}
  if(key==='buy')assert.equal(f.c.grain,1000+e.result.actual);
  if(['harvest','store'].includes(key))assert.ok(f.c.domestic.opportunities[0].saved<=1);
 }
});
test('siege research trait applies only to the umbrella siege technology',()=>{
 const u=makeOfficer(holders('liuEngines')[0],2000),base=fixture('research',holders('liuEngines')[0]);u.intellect=30;
 const ordinary=actionChance(base.s,base.c,u,ACTIONS.research,'baier'),siege=actionChance(base.s,base.c,u,ACTIONS.research,'siegeEngineering');assert.ok(Math.abs(siege-ordinary-.1)<1e-10);
 assert.equal(workProfile(['liuEngines'],ACTIONS.research,'baier').chance,undefined);
});
test('mid-command JSON roundtrip completes identically and mismatched work snapshot is rejected',()=>{
 const f=fixture('fair',holders('marketYield')[0]);beginExecution(f.s);advanceCampaignDay(f.s);
 const copy=validateCampaign(JSON.parse(serializeCampaign(f.s)));
 for(let i=0;i<9;i++){if(f.s.campaign.phase==='planning'){beginExecution(f.s);beginExecution(copy);}advanceCampaignDay(f.s);advanceCampaignDay(copy);}assert.equal(serializeCampaign(f.s),serializeCampaign(copy));
 const bad=fixture('fair',holders('marketYield')[0]);bad.a.action.traitIds.push('farmYield');assert.throws(()=>validateCampaign(JSON.parse(serializeCampaign(bad.s))));
});
test('construction setbacks and great-success refunds use the original paid project',()=>{
 for(const [id,key]of [['marketConstruction','build_commerce'],['farmConstruction','build_farm'],['drillConstruction','build_drill'],['hallConstruction','build_hall']]){
  let seen=false;for(let seed=1;seed<60&&!seen;seed++){const f=fixture(key,holders(id)[0],seed),initial=f.a.action.cost,e=finish(f);if(e.result.factor<1){assert.equal(f.a.action.remaining,3);assert.equal(f.a.action.cost,initial);assert.equal(f.c.project.actionId,f.actionId);seen=true;}}assert.ok(seen,id);
 }
 let seen=false;for(let seed=1;seed<60&&!seen;seed++){const f=fixture('build_walls',holders('militaryConstruction')[0],seed),cost=f.a.action.cost,e=finish(f);if(e.result.factor>1){assert.equal(e.result.spent,cost-Math.floor(cost*.25));assert.equal(f.c.walls,2);seen=true;}}assert.ok(seen);
});
test('Liu Bei reassures at most two additional real local targets with half primary gain',()=>{
 let seen=false;for(let seed=1;seed<30&&!seen;seed++){const f=fixture('reassure',holders('liuTrust')[0],seed),target=f.a.action.targetId,old={...f.s.campaign.domestic.loyalty},e=finish(f);if(e.result.factor>=1){const now=f.s.campaign.domestic.loyalty,gain=now[target]-old[target],others=f.c.units.filter(u=>u.id!==target&&now[u.id]>old[u.id]);assert.ok(gain>0);assert.ok(others.length>0&&others.length<=2);for(const u of others)assert.ok(now[u.id]-old[u.id]<=Math.floor(gain*.5));seen=true;}}assert.ok(seen);
});
test('Zhuge Liang doubles only a successful real research cooperation contribution',()=>{
 let seen=false;for(let seed=1;seed<50&&!seen;seed++){const f=fixture('research',holders('zhugeCoordination')[0],seed),helper=f.c.units.find(u=>u.id!==f.u.id);assert.equal(assignDomestic(f.s,f.c.id,'technology',helper.id),null);beginDomesticTurn(f.s);const e=finish(f),coop=Object.values(f.s.campaign.domestic.cooperation).find(r=>r.actionId===f.actionId&&r.success);if(coop&&e.result.factor>0){assert.ok(e.result.actual>0&&e.result.actual<=100);assert.ok(Math.abs(coop.after-coop.before*(1+coop.gain*2))<.001);assert.ok(coop.applied);seen=true;}}assert.ok(seen);
});
test('capacity and invalidated target never create extra proceeds',()=>{
 const f=fixture('cultivate',holders('farmYield')[0]);f.c.grain=1000000;const e=finish(f);assert.equal(e.result.actual,0);assert.equal(f.c.grain,1000000);
 const r=fixture('repair',holders('wallRepair')[0]);gateDurability(r.c).hp=gateDurability(r.c).maxHp;const event=finish(r);assert.equal(event.result.actual,0);
});
