import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,validateCampaign,serializeCampaign,orderCampaignArmy,settleDiplomaticCeasefire,findCampaignRoute,armyBattle,commissionProject} from './helpers/auto-domestic-campaign.mjs';
import {lordCity,approveDiplomaticProposal,decideDiplomaticProposal,diplomaticAIPlan,diplomaticRoute,assignDiplomat,cancelDiplomaticOrder,setDiplomaticGoal} from '../diplomacy.mjs';
import {factionsHostile,diplomaticProtection,diplomaticPassage,diplomaticPair} from '../diplomacy-relations.mjs';
import {servingPeople,factionLord} from '../talent-core.mjs';
import {resolveOfficerLoss,ransomCost} from '../officer-fates.mjs';
import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {proposeDiplomatic,approveAndSign,diplomaticDay,untilDiplomatic} from './helpers/diplomacy-campaign.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {assignmentFor,assignDomestic} from '../domestic.mjs';
import {diplomacyMarkup} from '../diplomacy-view.mjs';
import {interruptionMarkup} from '../strategic-order-view.mjs';
const fresh=()=>{const s=newCampaign(281,'guandu-200');fundCities(s,9000);return s;};
const leg=(kind,from,to,extra={})=>({kind,from,to,...extra});
const peaceTerms=duration=>[leg('peace','cao','sunce',{duration}),leg('nonaggression','cao','sunce',{duration}),leg('nonaggression','sunce','cao',{duration})];

test('protection starts next day, expires on its real boundary and never grants military access',()=>{
 const s=fresh(),{p}=proposeDiplomatic(s,{clauses:peaceTerms(3)});approveAndSign(s,p);const signed=p.signedDay;
 assert.equal(factionsHostile(s,'cao','sunce'),true);diplomaticDay(s);assert.equal(factionsHostile(s,'cao','sunce'),false);assert.equal(diplomaticPassage(s,'cao',p.sites.sunce),false);
 const source=s.cities.find(c=>c.owner==='cao'&&c.units.filter(u=>!u.mission).length>1),a=fieldFromCity(s,source.id,{ids:source.units.filter(u=>!u.mission).slice(0,1).map(u=>u.id)});
 assert.match(orderCampaignArmy(s,a.id,p.sites.sunce,'auto',{scheduled:true}),/外交保护/);
 untilDiplomatic(s,()=>s.campaign.day===signed+4);assert.equal(diplomaticProtection(s,'cao','sunce'),undefined);assert.equal(factionsHostile(s,'cao','sunce'),false);diplomaticDay(s);assert.ok(p.clauses.every(c=>c.status==='expired'));
});

test('approval is tied to exact terms even if a version number is incorrectly kept unchanged',()=>{
 const s=fresh(),{p}=proposeDiplomatic(s,{clauses:[leg('gold','cao','sunce',{amount:150,gift:true})],goal:'friendship',direction:'friendship'});untilDiplomatic(s,()=>p.status==='pending');assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);p.clauses[0].amount++;
 diplomaticDay(s);assert.equal(p.status,'cancelled');assert.equal(s.campaign.diplomacy.contracts.some(c=>c.id===p.id),false);
});

test('military passage permits transit but cannot order a lasting foreign garrison',()=>{
 const s=fresh(),{p}=proposeDiplomatic(s,{clauses:[...peaceTerms(30),leg('militaryPass','sunce','cao',{duration:30})]});approveAndSign(s,p);diplomaticDay(s);
 const c=s.cities.find(c=>c.owner==='cao'&&c.units.filter(u=>!u.mission&&u.troops>0).length>1),a=fieldFromCity(s,c.id,{ids:c.units.filter(u=>!u.mission&&u.troops>0).slice(0,1).map(u=>u.id)});
 assert.equal(diplomaticPassage(s,'cao',p.sites.sunce,'military',null,a),true);assert.equal(diplomaticPassage(s,'cao',p.sites.sunce,'station',null,a),false);assert.match(orderCampaignArmy(s,a.id,p.sites.sunce,'auto',{scheduled:true}),/驻军协议/);assert.equal(a.route.length,0);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('a new local domestic appointment replaces a waiting diplomatic appointment',()=>{
 const s=fresh(),o=[...servingPeople(s).values()].find(o=>o.faction==='cao'&&!o.army&&!o.unit.mission&&o.unit.id!==factionLord(s,'cao')&&!s.cities.some(c=>c.governor===o.unit.id));assert.ok(assignDiplomat(s,o.unit.id,'commerce',{choice:'now'}).applied);assert.equal(assignDomestic(s,o.location,'commerce',o.unit.id),null);assert.equal(s.campaign.diplomacy.assignments.some(a=>a.officerId===o.unit.id),false);assert.equal(assignmentFor(s,o.unit.id).direction,'commerce');validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('expiry of an actual garrison permission sends the same army physically home',()=>{
 const s=fresh(),pair=s.roads.map(([a,b])=>[s.cities.find(c=>c.id===a),s.cities.find(c=>c.id===b)]).find(([a,b])=>a?.owner==='cao'&&a.units.length>1&&b?.owner==='sunce'),[home,foreign]=pair;
 const {p}=proposeDiplomatic(s,{clauses:[...peaceTerms(45),leg('militaryPass','sunce','cao',{duration:15}),leg('station','sunce','cao',{cityId:foreign.id,duration:15})]});approveAndSign(s,p);diplomaticDay(s);
 const a=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.mission&&u.troops>0).slice(0,1).map(u=>u.id)}),ids=a.units.map(u=>u.id);assert.equal(orderCampaignArmy(s,a.id,foreign.id,'auto',{scheduled:true}),null);untilDiplomatic(s,()=>a.location===foreign.id&&!a.travel,12);assert.equal(foreign.owner,'sunce');const right=p.clauses.find(c=>c.kind==='station');untilDiplomatic(s,()=>s.campaign.day===right.untilDay+1,15);diplomaticDay(s);
 assert.ok(a.diplomaticWithdrawal);assert.equal(s.cities.find(c=>c.id===(a.target||a.location)).owner,'cao');assert.deepEqual(a.units.map(u=>u.id),ids);untilDiplomatic(s,()=>!a.travel&&s.cities.find(c=>c.id===a.location)?.owner==='cao',12);assert.equal(foreign.owner,'sunce');assert.equal(a.faction,'cao');
});

test('signed resource promises cannot be changed through an imported save',()=>{
 const s=fresh(),{p}=proposeDiplomatic(s,{clauses:[leg('gold','cao','sunce',{amount:150,gift:true}),...peaceTerms(30)],goal:'friendship',direction:'friendship'});approveAndSign(s,p);const changed=JSON.parse(serializeCampaign(s)),contract=changed.campaign.diplomacy.contracts.find(c=>c.id===p.id);contract.clauses.find(c=>c.kind==='gold').amount++;assert.throws(()=>validateCampaign(changed),/外交存档/);
});

test('a renewal waits for a new approval and starts after existing protection',()=>{
 const s=fresh();
 // Keep the actual counterparty lord at local work and give its other envoys a
 // different focus, so unrelated negotiations cannot occupy this bilateral slot.
 assert.equal(assignDomestic(s,lordCity(s,'sunce').id,'commerce',factionLord(s,'sunce'),{scheduled:true,faction:'sunce'}),null);assert.equal(setDiplomaticGoal(s,'auto','yuan',{faction:'sunce'}),null);
 const {p:old}=proposeDiplomatic(s,{clauses:peaceTerms(30)});approveAndSign(s,old);diplomaticDay(s);const boundary=old.clauses.find(c=>c.kind==='peace').untilDay;untilDiplomatic(s,()=>s.campaign.phase==='planning'&&s.campaign.day>=boundary-20);
 const {p}=proposeDiplomatic(s,{goal:'renew'});assert.ok(p.clauses.filter(c=>c.renews).every(c=>c.startDay===boundary+1));assert.equal(p.approvals.cao,undefined);approveAndSign(s,p);const renewed=p.clauses.find(c=>c.kind==='peace');assert.equal(renewed.status,'waiting');untilDiplomatic(s,()=>s.campaign.day===boundary+1,40);diplomaticDay(s);assert.equal(old.clauses.find(c=>c.kind==='peace').status,'expired');assert.equal(renewed.status,'active');assert.equal(renewed.effectiveDay,boundary+1);assert.equal(renewed.untilDay,boundary+renewed.duration);assert.equal(p.approvals.cao.controller,'player');assert.equal(p.approvals.sunce.controller,'ai');validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('an approved fixed-price framework creates bounded batches with inherited approval and real cargo',()=>{
 const s=fresh();s.campaign.diplomacy.wars[diplomaticPair('cao','sunce')].active=false;lordCity(s,'cao').grain=1800;s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));
 const {p}=proposeDiplomatic(s,{goal:'trade',direction:'commerce',clauses:[leg('trade','cao','sunce',{duration:60,resource:'grain',quota:3000,unitPrice:.18}),leg('tradePass','cao','sunce',{duration:60}),leg('tradePass','sunce','cao',{duration:60})]});approveAndSign(s,p);
 untilDiplomatic(s,()=>s.campaign.diplomacy.contracts.some(b=>b.parentId===p.id));const batch=s.campaign.diplomacy.contracts.find(b=>b.parentId===p.id),grain=batch.clauses.find(c=>c.kind==='grain');
 assert.equal(batch.approvals.cao.sourceContractId,p.id);assert.equal(batch.approvals.cao.day,p.approvals.cao.day);assert.ok(grain.amount<=3000);assert.equal(batch.clauses.find(c=>c.kind==='gold').amount,Math.ceil(grain.amount*.18));
 untilDiplomatic(s,()=>grain.delivered>0);assert.ok(grain.delivered<=grain.amount);assert.ok(s.campaign.activity.nodes.some(n=>n.result.batchId===batch.id));
});

test('a loan creates a real future debt, keeps unpaid balance and debits actual funds when paid',()=>{
 const s=fresh();
 // This checks debt settlement, so fund the real lender's treasury before
 // ordinary AI recruitment. An insolvent lender must cancel rather than lend.
 lordCity(s,'sunce').gold=50000;
 const {p}=proposeDiplomatic(s,{goal:'funding',direction:'commerce',clauses:[leg('gold','sunce','cao',{amount:500}),leg('gold','cao','sunce',{amount:550,deferred:true,dueOffset:10})]});approveAndSign(s,p);const principal=p.clauses[0],debt=p.clauses[1];assert.equal(principal.delivered,500);assert.equal(debt.delivered,0);assert.equal(p.escrow.find(e=>e.clauseId===debt.id).amount,0);
 while(s.campaign.day<=debt.dueDay+11){fundCities(s,500);diplomaticDay(s);}assert.equal(debt.delivered,0);assert.equal(debt.overdue,true);assert.equal(p.status,'signed');
 fundCities(s,3000);diplomaticDay(s);assert.equal(debt.delivered,debt.amount);assert.equal(debt.status,'done');assert.ok(lordCity(s,'cao').gold<3000);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('peace stops an actual live battle while preserving casualties and physical retreat',()=>{
 const s=fresh(),{p,o}=proposeDiplomatic(s,{clauses:peaceTerms(30)});untilDiplomatic(s,()=>p.status==='pending');
 const c=s.cities.find(c=>c.id===o.location),ids=c.units.filter(u=>!u.mission&&u.troops>0).slice(0,2).map(u=>u.id),a=fieldFromCity(s,c.id,{ids,target:p.sites.sunce});approachDestination(s,a);assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);
 untilDiplomatic(s,()=>s.campaign.battles.some(r=>r.armyIds.includes(a.id)),10);const r=s.campaign.battles.find(r=>r.armyIds.includes(a.id)),tick=r.battle.tick;
 untilDiplomatic(s,()=>r.settled,10);assert.equal(r.report.reason,'停战退兵');assert.ok(r.battle.tick>=tick);assert.equal(s.cities.find(c=>c.id===r.cityId).owner,'sunce');assert.equal(r.report.winner,null);assert.ok(r.report.stats.some(x=>x.initial>0));assert.ok(!armyBattle(s,a.id));
});

test('peaceful city exchange waits for actual receivers and preserves stocks and construction',()=>{
 const s=fresh(),first=s.cities.find(c=>c.id==='atlas-zhongli'),second=s.cities.find(c=>c.id==='atlas-linchuan'),grain=first.grain,techs=[...first.domestic.techs],levels=first.farm;
 assert.equal(commissionProject(s,first.id,'farm'),null);const paid=first.project;
 // This checks physical handover, not pricing. Pay real compensation for the
 // recipient's uncertainty about the remote city instead of giving it full intel.
 const {p}=proposeDiplomatic(s,{goal:'border',clauses:[...peaceTerms(60),leg('city','cao','sunce',{cityId:first.id}),leg('city','sunce','cao',{cityId:second.id}),leg('gold','cao','sunce',{amount:2000})]});approveAndSign(s,p);assert.equal(first.owner,'cao');assert.equal(second.owner,'sunce');
 untilDiplomatic(s,()=>p.clauses.filter(c=>c.kind==='city').every(c=>c.status==='done'));assert.equal(first.owner,'sunce');assert.equal(second.owner,'cao');assert.deepEqual(first.domestic.techs,techs);assert.ok(first.farm>=levels);assert.ok(first.project===paid||first.farm>levels);assert.ok(first.grain>0&&grain>0);assert.ok(p.receivers);assert.equal(s.campaign.activity.nodes.some(n=>n.category==='personnel'&&n.text.includes('和平交接')&&n.phase==='CAPTIVE'),false);
});

test('an envoy is really recalled before an immediate replacement domestic order can execute',()=>{
 const s=fresh(),{p,o}=proposeDiplomatic(s,{goal:'friendship',direction:'friendship',clauses:[leg('gold','cao','sunce',{amount:150,gift:true})]});untilDiplomatic(s,()=>p.status==='pending');
 untilDiplomatic(s,()=>s.campaign.phase==='planning');const command={kind:'assign',cityId:o.location,officerIds:[o.unit.id],direction:'commerce'},before=o.unit.mission.location;
 const result=requestStrategicOrder(s,command,null);assert.ok(result.confirmation);assert.ok(requestStrategicOrder(s,command,'now').queued);assert.equal(assignmentFor(s,o.unit.id),undefined);assert.equal(o.unit.mission.location,before);
 assert.match(diplomacyMarkup(s),/返城后安排/);assert.match(interruptionMarkup(s,requestStrategicOrder(s,command,null).confirmation),/后续命令：改任商业/);
 untilDiplomatic(s,()=>!o.unit.mission&&assignmentFor(s,o.unit.id)?.direction==='commerce');assert.equal(p.status,'cancelled');assert.equal(s.campaign.diplomacy.assignments.some(a=>a.officerId===o.unit.id),false);
});

test('cancelling a queued replacement keeps the real envoy journey and saves no future order',()=>{
 const s=fresh(),{p,o}=proposeDiplomatic(s,{goal:'friendship',direction:'friendship',clauses:[leg('gold','cao','sunce',{amount:150,gift:true})]});untilDiplomatic(s,()=>p.status==='pending');untilDiplomatic(s,()=>s.campaign.phase==='planning');const command={kind:'assign',cityId:o.location,officerIds:[o.unit.id],direction:'commerce'};assert.ok(requestStrategicOrder(s,command,'after').queued);const q=s.campaign.diplomacy.orders.find(q=>q.officerIds.includes(o.unit.id)),before=structuredClone(o.unit.mission);assert.equal(cancelDiplomaticOrder(s,q.id),null);assert.deepEqual(o.unit.mission,before);assert.equal(s.campaign.diplomacy.orders.length,0);assert.equal(assignmentFor(s,o.unit.id),undefined);assert.equal(p.status,'pending');validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('AI priorities respond to real shortages and judgments never modify stocks',()=>{
 const s=fresh(),before=serializeCampaign(s),plan=diplomaticAIPlan(s,'yuan');assert.ok(plan.length);assert.equal(serializeCampaign(s),before);lordCity(s,'yuan').grain=2000;const shortage=diplomaticAIPlan(s,'yuan');assert.ok(shortage.some(p=>p.direction==='commerce'&&p.goal==='buyGrain'));assert.ok(shortage[0].score>plan[0].score);
});

test('a locked actual captive finishes original custody, is escorted and released once for the agreed ransom',()=>{
 const s=fresh();let prisoner;
 for(const o of [...servingPeople(s).values()].filter(o=>o.faction==='cao'&&!o.army&&o.unit.id!==factionLord(s,'cao')).slice(0,30)){
  resolveOfficerLoss(s,{unit:o.unit,faction:'cao',location:o.location,enemy:'sunce',eventId:'diplomacy-captive-fixture:'+o.unit.id});prisoner=s.campaign.domestic.people.find(t=>t.id===o.unit.id&&t.status==='CAPTIVE');if(prisoner)break;
 }
 assert.ok(prisoner);const {p}=proposeDiplomatic(s,{goal:'prisoners',clauses:[leg('prisoner','sunce','cao',{officerId:prisoner.id}),leg('gold','cao','sunce',{amount:ransomCost(prisoner)+100})]});approveAndSign(s,p);assert.equal(prisoner.diplomaticLock,p.id);const c=p.clauses.find(c=>c.kind==='prisoner');untilDiplomatic(s,()=>c.status==='done');
 assert.equal(c.delivered,1);assert.equal(p.clauses.find(c=>c.kind==='gold').delivered,p.clauses.find(c=>c.kind==='gold').amount);assert.equal(s.campaign.domestic.people.some(t=>t.id===prisoner.id&&t.status==='CAPTIVE'),false);assert.equal(servingPeople(s).get(prisoner.id).faction,'cao');const count=s.campaign.activity.nodes.filter(n=>n.category==='personnel'&&n.officerId===prisoner.id&&n.phase==='RELEASE').length;diplomaticDay(s);assert.equal(s.campaign.activity.nodes.filter(n=>n.category==='personnel'&&n.officerId===prisoner.id&&n.phase==='RELEASE').length,count);assert.equal(count,1);
});

test('real allied aid keeps its faction and joins the recipient battle on the correct side',()=>{
 const s=fresh(),choices=[];
 for(const target of s.cities.filter(c=>c.owner==='cao'&&c.units.length)){
  const enemy=s.cities.filter(c=>c.owner==='yuan'&&c.units.length>1).map(c=>({c,path:findCampaignRoute(s,c.id,target.id,'yuan')})).filter(x=>x.path).sort((a,b)=>a.path.length-b.path.length)[0];if(!enemy)continue;
  for(const source of s.cities.filter(c=>c.owner==='sunce')){const unit=source.units.find(u=>u.troops>0&&u.id!==factionLord(s,'sunce')&&u.id!==source.governor),path=diplomaticRoute(s,source.id,target.id,'sunce','cao','military');if(unit&&path)choices.push({target,enemy,source,unit,path});}
 }
 choices.sort((a,b)=>a.path.length+a.enemy.path.length-b.path.length-b.enemy.path.length);const x=choices[0];assert.ok(x);
 const {p}=proposeDiplomatic(s,{goal:'aid',clauses:[...peaceTerms(90),leg('militaryPass','cao','sunce',{route:x.path,duration:90,officerIds:[x.unit.id],troopCap:x.unit.troops}),leg('station','cao','sunce',{cityId:x.target.id,duration:90,officerIds:[x.unit.id],troopCap:x.unit.troops}),leg('deploy','sunce','cao',{cityId:x.source.id,targetId:x.target.id,enemy:'yuan',officerIds:[x.unit.id],troops:x.unit.troops,days:x.path.length*5,route:x.path,task:'defend',deadline:90,duration:45}),leg('gold','cao','sunce',{amount:1500,milestone:'arrival',aid:true})]});approveAndSign(s,p);const task=p.clauses.find(c=>c.kind==='deploy');untilDiplomatic(s,()=>task.status==='active',70);const helper=s.armies.find(a=>a.id===task.armyId);assert.equal(helper.faction,'sunce');assert.equal(helper.location,x.target.id);
 const raid=fieldFromCity(s,x.enemy.c.id,{ids:x.enemy.c.units.filter(u=>!u.mission&&u.troops>0).slice(0,2).map(u=>u.id),target:x.target.id});raid.route=[...x.enemy.path];untilDiplomatic(s,()=>s.campaign.battles.some(r=>r.armyIds.includes(raid.id)&&r.armyIds.includes(helper.id)),60);const battle=s.campaign.battles.find(r=>r.armyIds.includes(raid.id)&&r.armyIds.includes(helper.id));assert.ok(battle.battle.sides[0].units.some(u=>u.armyId===helper.id));assert.equal(battle.armies.find(a=>a.id===helper.id).faction,'sunce');validateCampaign(JSON.parse(serializeCampaign(s)));
 untilDiplomatic(s,()=>battle.settled,50);const aidReport=s.campaign.activity.nodes.find(n=>n.category==='battle'&&n.faction==='sunce'&&n.result.battleId===battle.id);assert.ok(aidReport);assert.ok(aidReport.officerIds.includes(x.unit.id));assert.equal(s.campaign.activity.nodes.filter(n=>n.category==='battle'&&n.faction==='cao'&&n.result.battleId===battle.id).some(n=>n.officerIds.includes(x.unit.id)),false);assert.equal(battle.armies.find(a=>a.id===helper.id).faction,'sunce');
});
