import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,transferOfficer,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,setDomesticAutoApprove,siegeOpening,cancelDomestic,researchDailyRate} from '../domestic.mjs';
import {DOMESTIC_INCIDENTS,DOMESTIC_INCIDENT_RULES,incidentFor,incidentModifiers,effectiveDomesticChance} from '../domestic-incidents.mjs';
import {cityBaseIncome,cityWorkLimit} from '../economy.mjs';
import {pendingActivityReports,acknowledgeActivityReports} from '../activity-nodes.mjs';
import {cityDomesticMarkup} from '../strategic-view.mjs';
import {reportTone} from '../reward-presentation.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {officerActivityDays} from '../officer-activity.mjs';
import {relationshipInfo,setRelationshipType} from '../relationships.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import {peacefulCities,invadeFromGuandu} from './helpers/field-campaign.mjs';
import {lockDeployment,activeUnits} from '../engine.mjs';
import {cityBudget} from '../city-budget.mjs';
import {fundCities} from './resource-fixtures.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(keys=['fair'],relation=null,prepare=()=>{}){
 const s=peacefulCities(newCampaign(7));fundCities(s,40000);setDomesticAutoApprove(s,true);
 const c=s.cities.find(c=>c.id==='xuchang'),people=[...s.campaign.idle.filter(o=>o.location===c.id),...cityPersonnel(s,c.id).filter(o=>!s.campaign.idle.some(p=>p.unit.id===o.unit.id))];
 setBuildingLevel(c,'commerce',3);setBuildingLevel(c,'drill',1);
 for(const direction of new Set(keys.map(k=>ACTIONS[k].direction)))for(const [id,def]of Object.entries(ACTIONS))if(def.direction===direction&&!keys.includes(id))c.domestic.cooldowns[id]=10000;
 const ids=keys.map((key,i)=>{const id=people[i].unit.id;assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,id),null);return id;});
 if(relation)assert.equal(setRelationshipType(s,ids[0],ids[1],relation,relation==='sworn'?100:0),null);
 prepare(s,c);beginExecution(s);return {s,c,ids};
}
function example(base,code,predicate=()=>true){
 for(let seed=1;seed<=20000;seed++){
  const candidate=Math.imul(seed,0x9e3779b1)>>>0,roll=((Math.imul(candidate,1664525)+1013904223)>>>0)/4294967296;
  if(roll>=DOMESTIC_INCIDENT_RULES.triggerChance)continue;
  const s=structuredClone(base.s);s.campaign.domestic.incidents.seed=candidate;
  const before=structuredClone(s);advanceCampaignDay(s);const r=s.campaign.domestic.incidents.events.find(r=>r.code===code);
  if(r&&predicate(r))return {s,c:s.cities.find(c=>c.id===r.cityId),r,before,seed,ids:base.ids};
 }
 assert.fail('No saved independent seed produced '+code);
}
function days(s,target){while(s.campaign.day<target){if(s.campaign.phase==='planning')beginExecution(s);assert.ok(advanceCampaignDay(s).dayEnded);}}

test('close same-work officers gain a strong, saved joint effect on both real operations',()=>{
 const f=example(fixture(['fair','fair'],'sworn'),'unity'),assignments=f.s.campaign.domestic.assignments;
 assert.equal(f.r.officerIds.length,2);assert.equal(f.r.actionIds.length,2);
 for(const a of assignments){assert.equal(incidentFor(f.s,a)?.id,f.r.id);assert.equal(incidentModifiers(f.s,a).quantity,2);assert.equal(effectiveDomesticChance(f.s,a),.94);}
 const reports=pendingActivityReports(f.s).filter(n=>n.phase==='incident');assert.equal(reports.length,1);assert.equal(reports[0].officerIds.length,2);
 assert.doesNotMatch(reports[0].text,/%|概率|成功率/);assert.match(cityDomesticMarkup(f.s,f.c.id),/同心协力/);
 const control=structuredClone(f.before);control.campaign.domestic.incidents.enabled=false;advanceCampaignDay(control);days(f.s,11);days(control,11);
 const result=(s,id)=>s.campaign.domestic.events.find(e=>e.officerId===id&&e.result.actual!==undefined);const first=f.ids[0];assert.ok(result(f.s,first).result.actual>result(control,first).result.actual);
 // Both results keep the same event even though the loop settles one first.
 for(const id of f.ids)assert.equal(result(f.s,id).result.incidentId,f.r.id);
 assert.equal(f.c.domestic.production.gold,Math.min(cityWorkLimit(f.s,f.c,'gold'),f.ids.reduce((n,id)=>n+result(f.s,id).result.actual,0)));
 assert.ok(f.c.domestic.production.gold<=cityWorkLimit(f.s,f.c,'gold'));restore(f.s);
});
test('hostile same-work officers can obstruct both participants without new fees',()=>{
 const f=example(fixture(['fair','fair'],'disliked'),'rivalry');for(const a of f.s.campaign.domestic.assignments){assert.equal(incidentModifiers(f.s,a).quantity,.35);assert.ok(effectiveDomesticChance(f.s,a)<a.action.chance);}
 assert.equal(f.c.gold,f.before.cities.find(c=>c.id===f.c.id).gold);assert.equal(reportTone(pendingActivityReports(f.s).find(n=>n.phase==='incident')),'concern');restore(f.s);
});
test('the concrete Xun Yu and Xiahou Dun market story loses real reserves and lowers their friendship',()=>{
 const base=fixture(),s=base.s;s.campaign.domestic.incidents.seed=3171201372;const before=base.c.manpower,gold=base.c.gold;advanceCampaignDay(s);
 const r=s.campaign.domestic.incidents.events[0];assert.equal(r.code,'marketAbuse');assert.equal(r.sourceOfficerId,'person-255');assert.equal(r.otherOfficerId,'dun');
 assert.equal(base.c.manpower,before-800);assert.equal(base.c.gold,gold);assert.equal(r.relationship.delta,-12);assert.equal(relationshipInfo('person-255','dun',s.relationshipScores,s.relationshipTypes).score,r.relationship.after);
 const report=pendingActivityReports(s).find(n=>n.phase==='incident');assert.match(report.text,/荀彧.+夏侯惇强夺/);assert.match(report.text,/预备兵减少800.+友好度下降12/);assert.equal(reportTone(report),'concern');
 for(const id of [r.sourceOfficerId,r.otherOfficerId])assert.ok(officerActivityDays(s,id).rows.some(d=>d.actions.some(a=>a.nodeId===report.id)));restore(s);
});
test('one commercial officer encounters good and bad farming and training stories with real colleagues',()=>{
 const base=fixture();for(const code of ['protectHarvest','wasteGrain','enlistHelp','bullyRecruits']){
  const f=example(base,code),a=assignmentFor(f.s,f.ids[0]);assert.equal(f.r.sourceDirection,'commerce');assert.equal(f.r.sourceOfficerId,a.officerId);assert.equal(f.r.actionIds.length,0);assert.equal(a.action.incidentId,null);
  assert.equal(f.s.campaign.domestic.assignments.length,1);assert.notEqual(f.r.direction,'commerce');assert.ok(f.r.participants.every(p=>p.cityId===f.c.id));
  const e=DOMESTIC_INCIDENTS[code],n=f.r.resources.delta[e.story.resource];assert.equal(n,e.story.amount);assert.equal(Math.sign(f.r.relationship.delta),Math.sign(e.relationDelta));
  assert.deepEqual(cityBaseIncome(f.s,f.c),cityBaseIncome(base.s,base.c));const report=pendingActivityReports(f.s).find(n=>n.phase==='incident');assert.doesNotMatch(report.text,/undefined|%|概率/);assert.ok(report.officerIds.includes(f.r.otherOfficerId));restore(f.s);
 }
});
test('cross-domain incidents can help another existing approved research project',()=>{
 const f=example(fixture(['fair','research']),'insight');
 const found=f;
 assert.equal(found.r.sourceDirection,'commerce');const a=found.s.campaign.domestic.assignments.find(a=>a.direction==='technology');assert.ok(found.r.officerIds.includes(a.officerId));
 const control=structuredClone(found.s),b=assignmentFor(control,a.officerId);b.action.incidentId=null;assert.ok(researchDailyRate(found.s,found.c,a)>researchDailyRate(control,control.cities.find(c=>c.id===found.c.id),b));
 assert.equal(incidentModifiers(found.s,a).progress,2);assert.ok(researchDailyRate(found.s,found.c,a)>0);restore(found.s);
});
test('same research slot has one actual project and a waiting colleague can aid its progress',()=>{
 const f=example(fixture(['research','research'],'sworn'),'unity');
 const assignments=f.s.campaign.domestic.assignments,actor=assignments.find(a=>a.action),helper=assignments.find(a=>!a.action);
 assert.ok(helper);assert.equal(f.r.actionIds.length,1);assert.equal(incidentFor(f.s,actor)?.id,f.r.id);assert.ok(f.c.domestic.research.progress>0);
 const progress=f.c.domestic.research.progress,gold=f.c.gold,copy=restore(f.s);assert.equal(copy.cities.find(c=>c.id===f.c.id).domestic.research.progress,progress);assert.equal(f.c.gold,gold);
 const total=Object.values(f.c.domestic.research.merit.credits).reduce((n,x)=>n+x.exact,0);assert.ok(total<=f.c.domestic.research.merit.budget);restore(f.s);
});
test('departure breaks the joint effect, and different tasks never produce social incidents',()=>{
 const f=example(fixture(['fair','fair'],'sworn'),'unity'),actor=assignmentFor(f.s,f.r.officerIds[0]),helper=f.r.officerIds[1];
 cancelDomestic(f.s,helper);assert.equal(transferOfficer(f.s,helper,'chenliu',{scheduled:true}),null);assert.equal(incidentFor(f.s,actor),null);assert.equal(incidentModifiers(f.s,actor).quantity,1);restore(f.s);
 const base=fixture(['fair','research'],'sworn');for(let seed=1;seed<=20;seed++){const s=structuredClone(base.s);s.campaign.domestic.incidents.seed=seed;advanceCampaignDay(s);assert.ok(s.campaign.domestic.incidents.events.every(r=>!['unity','rivalry'].includes(r.code)));}
});
test('positive stories improve friendship and saved settlement never rerolls or pays twice',()=>{
 const f=example(fixture(),'marketPeace'),r=f.r,before=serializeCampaign(f.s),copy=restore(f.s);assert.equal(serializeCampaign(copy),before);assert.equal(r.relationship.delta,12);assert.equal(r.resources.delta.gold,2000);
 cityDomesticMarkup(f.s,f.c.id);pendingActivityReports(f.s);assert.equal(serializeCampaign(f.s),before);assert.match(cityDomesticMarkup(f.s,f.c.id),/已结算/);
 const reports=pendingActivityReports(f.s);acknowledgeActivityReports(f.s,reports.map(n=>n.id));assert.equal(pendingActivityReports(restore(f.s)).length,0);acknowledgeActivityReports(copy,reports.map(n=>n.id));
 advanceCampaignDay(f.s);advanceCampaignDay(copy);assert.equal(serializeCampaign(f.s),serializeCampaign(copy));assert.equal(f.s.campaign.domestic.incidents.events.length,1);days(f.s,11);restore(f.s);
});
test('unapproved work and nonresident characters never generate a story',()=>{
 const s=peacefulCities(newCampaign(7));fundCities(s,40000);const c=s.cities.find(c=>c.id==='xuchang'),id=s.campaign.idle.find(o=>o.location===c.id).unit.id;for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;assignDomestic(s,c.id,'technology',id);beginExecution(s);assert.ok(assignmentFor(s,id).proposal);assert.equal(advanceCampaignDay(s).proposals,true);assert.equal(s.campaign.domestic.incidents.events.length,0);
 const base=fixture();for(const o of cityPersonnel(base.s,base.c.id).filter(o=>o.unit.id!==base.ids[0]))assert.equal(transferOfficer(base.s,o.unit.id,'chenliu',{scheduled:true}),null);
 for(let seed=1;seed<=20;seed++){const copy=structuredClone(base.s);copy.campaign.domestic.incidents.seed=Math.imul(seed,0x9e3779b1)>>>0;advanceCampaignDay(copy);assert.equal(copy.campaign.domestic.incidents.events.length,0);}restore(base.s);
});
test('one faction receives at most one incident per turn; saved source and effect tampering is rejected',()=>{
 const base=fixture(['fair','cultivate','research']);for(let seed=1;seed<=30;seed++){const s=structuredClone(base.s);s.campaign.domestic.incidents.seed=seed;days(s,10);assert.ok(s.campaign.domestic.incidents.events.length<=1);const participants=s.campaign.domestic.incidents.events.flatMap(r=>r.participants.map(p=>p.id));assert.equal(new Set(participants).size,participants.length);restore(s);}
 const f=example(fixture(),'marketAbuse');for(const mutate of [r=>r.resources.delta.manpower=-999,r=>r.relationship.after=100,r=>r.otherOfficerId=r.sourceOfficerId,r=>r.participants[1].cityId='chenliu']){const copy=restore(f.s);mutate(copy.campaign.domestic.incidents.events[0]);assert.throws(()=>restore(copy));}
});
test('more cities and workers do not add rolls, and a failed turn stays spent after loading',()=>{
 const small=fixture(),large=fixture(['fair','cultivate','research'],null,(s,c)=>{
  const second=s.cities.find(c=>c.id==='chenliu');assert.equal(second.owner,c.owner);
  const people=cityPersonnel(s,second.id).slice(0,2);assert.equal(people.length,2);
  for(const person of people)assert.equal(assignDomestic(s,second.id,'commerce',person.unit.id),null);
 });
 // A failed faction roll is saved even with multiple active cities and directions.
 for(const base of [small,large]){
  const s=base.s;s.campaign.domestic.incidents.seed=1;advanceCampaignDay(s);
  const d=s.campaign.domestic.incidents,check=structuredClone(d.factionChecks[base.c.owner]);
  assert.ok(check.roll>=DOMESTIC_INCIDENT_RULES.triggerChance);assert.equal(check.groupKey,null);assert.equal(d.events.length,0);
  const random=d.seed,copy=restore(s);days(copy,10);
  assert.equal(copy.campaign.domestic.incidents.seed,random);assert.deepEqual(copy.campaign.domestic.incidents.factionChecks[base.c.owner],check);assert.equal(copy.campaign.domestic.incidents.events.length,0);
 }
 assert.deepEqual(small.s.campaign.domestic.incidents.factionChecks[small.c.owner],large.s.campaign.domestic.incidents.factionChecks[large.c.owner]);
 const hit=example(fixture(),'marketPeace'),copy=restore(hit.s);copy.campaign.domestic.incidents.factionChecks[hit.c.owner].roll=.5;assert.throws(()=>restore(copy));
});
test('a harmful reserve story clips to real unreserved soldiers and keeps the paid recruitment intact',()=>{
 const base=fixture(['fair','recruit'],null,(s,c)=>{c.manpower=20000;c.grain=20000;c.units.forEach(u=>u.troops-=100);});
 assert.ok(base.c.domestic.reserved>0);const recruiter=assignmentFor(base.s,base.ids[1]),cost=recruiter.action.cost,amount=recruiter.action.amount;
 base.c.manpower=base.c.domestic.reserved+37;const f=example(base,'marketAbuse');assert.equal(f.r.resources.delta.manpower,-37);assert.equal(f.r.resources.after.manpower,f.r.resources.reserved);
 assert.ok(f.c.manpower>=f.c.domestic.reserved);assert.equal(assignmentFor(f.s,base.ids[1]).action.cost,cost);assert.equal(assignmentFor(f.s,base.ids[1]).action.amount,amount);restore(f.s);
 const empty=fixture();empty.c.manpower=0;for(let i=1;i<=20;i++){const s=structuredClone(empty.s);s.campaign.domestic.incidents.seed=Math.imul(i,0x9e3779b1)>>>0;advanceCampaignDay(s);assert.ok(s.campaign.domestic.incidents.events.every(r=>r.resources.delta.manpower>=0));}
});
test('surprise gifts arrive in full without taking normal work capacity and enter the harvest once',()=>{
 const full=fixture();for(const k of ['gold','grain','manpower'])full.c.domestic.production[k]=cityWorkLimit(full.s,full.c,k);
 const f=example(full,'marketPeace'),credit=f.r.resources.delta.gold,firstProduction=f.c.domestic.production.gold;assert.equal(credit,2000);assert.equal(firstProduction,cityWorkLimit(f.s,f.c,'gold'));
 const node=f.s.campaign.activity.nodes.find(n=>n.result.incident?.id===f.r.id);assert.equal(node.result.resourceCredit.gold,credit);const gold=f.c.gold,copy=restore(f.s);assert.equal(copy.cities.find(c=>c.id===f.c.id).gold,gold);
 days(f.s,11);const harvest=f.s.campaign.activity.nodes.find(n=>n.phase==='harvest');assert.equal(harvest.result.cities.find(c=>c.id===f.c.id).work.gold,credit);assert.equal(f.c.domestic.production.gold,firstProduction);restore(f.s);
 const crowded=fixture();crowded.c.grain=19000;crowded.c.manpower=29500;for(let i=1;i<=100;i++){const seed=Math.imul(i,0x9e3779b1)>>>0,roll=((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;if(roll>=DOMESTIC_INCIDENT_RULES.triggerChance)continue;const s=structuredClone(crowded.s);s.campaign.domestic.incidents.seed=seed;advanceCampaignDay(s);assert.ok(s.campaign.domestic.incidents.events.every(r=>!['protectHarvest','enlistHelp'].includes(r.code)));}
});
test('story relationships respect tier boundaries and siege participation pauses incident checks',()=>{
 const base=fixture();setRelationshipType(base.s,'person-255','dun','friendly',69);const f=example(base,'marketPeace',r=>r.otherOfficerId==='dun');assert.equal(f.r.relationship.afterType,'liked');restore(f.s);
 const capped=fixture();for(const o of cityPersonnel(capped.s,capped.c.id).filter(o=>o.unit.id!==capped.ids[0]))setRelationshipType(capped.s,capped.ids[0],o.unit.id,'sworn',100);
 const g=example(capped,'protectHarvest');assert.equal(g.r.relationship.delta,0);restore(g.s);
 const initial=fixture();invadeFromGuandu(initial.s);let battle;for(let i=0;i<8&&!battle;i++){advanceCampaignDay(initial.s);battle=activeBattles(initial.s).find(r=>r.cityId===initial.c.id);}assert.ok(battle);chooseEncounter(initial.s,battle.id,true);lockDeployment(battle.battle);
 const before=structuredClone(initial.s.campaign.domestic.incidents);advanceCampaignDay(initial.s);assert.deepEqual(initial.s.campaign.domestic.incidents,before);restore(initial.s);
});
