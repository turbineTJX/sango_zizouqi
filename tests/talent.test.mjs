import {fundCities} from './resource-fixtures.mjs';
import {roadCost} from '../strategic-movement.mjs';
import {PERSONNEL_SPEED} from '../personnel-movement.mjs';
import {fieldFromCity,peacefulCities} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,assignmentFor,actionCandidates,ACTIONS,cancelDomestic,finishDomesticDay} from '../domestic.mjs';
import {willingness,talentEligibility,talentKey,talentContext,projectNeed,progressFor,refreshTalentDemand,servingPeople,reassuranceCap,righteousness,isLord,affinityFit} from '../talent-core.mjs';
import {discoverTalent,initializeTalent,finishTalentDay,resolveTalentOffers,startTalentProject,completeTalentProject,noteTalentCityCapture,processTalentDefeats,refreshTalentProjects,validateTalent} from '../talent-lifecycle.mjs';
import {OFFICER_BY_ID,OFFICER_CATALOG} from '../officer-catalog.mjs';
import {setRelationshipType} from '../relationships.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {strategicView} from '../strategic-view.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function scene(seed=15){const s=newCampaign(seed);peacefulCities(s);fundCities(s,100000);return s;}
function advance(s,target){for(let guard=0;guard<5000&&s.campaign.day<target;guard++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
function only(s,key,cityId='xuchang'){
 const c=s.cities.find(c=>c.id===cityId);for(const [k,d]of Object.entries(ACTIONS))if(d.direction==='talent'&&k!==key)c.domestic.cooldowns[k]=100000;
 const o=s.campaign.idle.find(o=>o.location===cityId&&o.faction===c.owner);assignDomestic(s,c.id,'talent',o.unit.id);return assignmentFor(s,o.unit.id);
}
function project(s,id,faction='cao',cityId='xuchang',progress=0){const a={officerId:s.campaign.idle.find(o=>o.faction===faction)?.unit.id||'cao',action:{key:'hire',targetId:id,cost:180}},c=s.cities.find(c=>c.id===cityId);startTalentProject(s,a,c);const p=s.campaign.talent.projects[talentKey(id,faction)];p.progress=progress;return {a,c,p};}

test('all catalogue people exist once, historical debut dates and timeless heroes differ',()=>{
 for(const spec of [null,'guandu-200','heroes-251']){const s=newCampaign(42,spec),ids=[...servingPeople(s).keys(),...s.campaign.domestic.people.map(p=>p.id)];assert.equal(ids.length,OFFICER_CATALOG.length);assert.equal(new Set(ids).size,ids.length);restore(s);
  if(spec==='guandu-200'){const p=s.campaign.domestic.people.find(p=>OFFICER_BY_ID[p.id].birthYear>200);assert.equal(p.status,'NOT_DEBUTED');assert.ok(p.debutDay>1);}else assert.ok(s.campaign.domestic.people.every(p=>p.status==='FREE'||p.status==='EXCLUDED'));
  assert.ok(s.campaign.domestic.people.filter(p=>OFFICER_BY_ID[p.id].sourceKind!=='common').every(p=>p.status==='EXCLUDED'));
  for(const id of ['person-671','person-717','person-756'])assert.equal(s.campaign.domestic.people.find(p=>p.id===id)?.status,'EXCLUDED');
 }
});
test('historical righteousness maps the actual 1..5 range and treats unspecified values as neutral',()=>{
 for(let value=1;value<=5;value++){const u=OFFICER_CATALOG.find(u=>u.sourceKind==='common'&&u.righteousness===value);assert.equal(righteousness(u.id),(value-1)*25);}
 assert.equal(righteousness('custom-1'),50);
});
test('need counts only cities, has an independent standard, and splitting does not create troops',()=>{
 const s=newCampaign(22,'heroes-251'),ctx=talentContext(s),d=s.campaign.talent.demands.cao;
 assert.equal(d.cities,s.cities.filter(c=>c.owner==='cao'&&c.kind==='city').length);
 const m=Math.ceil(d.soldiers/6000);assert.equal(d.demand,4*d.cities+m+Math.ceil(.25*m));assert.equal(ctx.factions.cao.N,new Set([...servingPeople(s).values()].filter(o=>o.faction==='cao').map(o=>o.unit.id)).size);
 const before=d.demand,a=fieldFromCity(s,'xuchang');const unit=a.units.pop();s.armies.push({...structuredClone(a),id:'extra-test',units:[unit]});refreshTalentDemand(s,true);assert.equal(s.campaign.talent.demands.cao.demand,before);
});
test('W below 60 never schedules paid hire during 100 real turns',()=>{
 const s=scene(),a=only(s,'hire');const p=s.campaign.domestic.people.find(p=>affinityFit(p.id,'cao')<20);p.cityId='xuchang';discoverTalent(s,p.id,'cao');setRelationshipType(s,p.id,'cao','disliked',0);s.campaign.talent.records[p.id].phase='SEEK';s.campaign.talent.records[p.id].phaseUntilDay=5000;
 assert.ok(willingness(s,p.id,'cao').W<60);advance(s,1001);assert.equal(s.campaign.talent.projects[talentKey(p.id,'cao')],undefined);assert.ok(!servingPeople(s).has(p.id));assert.equal(s.campaign.domestic.events.filter(e=>e.phase==='start'&&e.text.includes(OFFICER_BY_ID[p.id].name)).length,0);restore(s);
});
test('Q90 requires ten ordinary successes; effects are progress, never immediate recruitment',()=>{
 const id=OFFICER_CATALOG.find(u=>Math.max(u.leadership,u.force,u.intellect,u.politics,u.charm)===90).id;
 assert.equal(projectNeed(id),120);assert.equal(projectNeed(id,'persuade'),160);assert.deepEqual([1.2,1,.45,0].map(progressFor),[20,12,6,0]);
 const s=scene(),p=readyTalent(s),a=only(s,'hire');beginExecution(s);assert.ok(a.action);advance(s,11);const r=s.campaign.talent.projects[talentKey(p.id,'cao')];assert.ok(r.progress<=20);assert.ok(s.campaign.domestic.people.some(x=>x.id===p.id));restore(s);
});
test('same faction locks one paid target, replacing an executor preserves progress and same-turn lock',()=>{
 const s=scene(),p=readyTalent(s),a=only(s,'hire'),other=s.campaign.idle.find(o=>o.location==='xuchang'&&o.unit.id!==a.officerId);assignDomestic(s,'xuchang','talent',other.unit.id);const before=s.gold;beginExecution(s);
 assert.equal(before-s.gold,180);assert.equal(s.campaign.domestic.assignments.filter(a=>a.action).length,1);
 const r=s.campaign.talent.projects[talentKey(p.id,'cao')];r.progress=12;cancelDomestic(s,a.officerId);assert.equal(r.progress,12);assert.equal(actionCandidates(s,assignmentFor(s,other.unit.id)).length,0);restore(s);
});
test('full projects sign without further payment, signed travellers count immediately, no duplicate callbacks',()=>{
 const s=scene(),p=readyTalent(s),{p:pr}=project(s,p.id,'cao','xuchang',projectNeed(p.id));p.cityId='chenliu';discoverTalent(s,p.id,'cao');const n=talentContext(s).factions.cao.N,gold=s.gold;
 resolveTalentOffers(s,cancelDomestic);assert.equal(s.gold,gold);assert.equal(talentContext(s).factions.cao.N,n+1);const o=s.campaign.idle.find(o=>o.unit.id===p.id);assert.equal(o.destination,'xuchang');assert.equal(o.remainingDays,Math.ceil(roadCost(s,'chenliu','xuchang')/PERSONNEL_SPEED));assert.equal(pr.state,'CLOSED');resolveTalentOffers(s,cancelDomestic);assert.equal(s.campaign.idle.filter(o=>o.unit.id===p.id).length,1);restore(s);
});
test('full unwilling project pauses without another charge and resumes when conditions improve',()=>{
 const s=scene(),p=readyTalent(s),{p:pr}=project(s,p.id,'cao','xuchang',projectNeed(p.id)),gold=s.gold;setRelationshipType(s,p.id,'cao','disliked',0);
 // Explicit old-master concern makes this candidate unwilling despite local vacancies.
 s.campaign.talent.records[p.id].defeatHistory.push({oldFactionId:'yuan',formerLordId:'shao',defeatingFactionId:'cao',defeatedTurn:0,eventId:'test-defeat'});setRelationshipType(s,p.id,'shao','sworn',100);
 resolveTalentOffers(s,cancelDomestic);assert.equal(pr.state,'PAUSED');assert.equal(s.gold,gold);assert.ok(s.campaign.domestic.people.some(x=>x.id===p.id));
 s.campaign.talent.records[p.id].defeatHistory=[];setRelationshipType(s,p.id,'cao','sworn',100);resolveTalentOffers(s,cancelDomestic);assert.equal(pr.state,'CLOSED');assert.equal(s.gold,gold);
});
test('competition is independent of project iteration order and chooses at most one owner',()=>{
 const s=scene(),p=readyTalent(s);p.cityId='guandu';discoverTalent(s,p.id,'cao');discoverTalent(s,p.id,'yuan');setRelationshipType(s,p.id,'shao','sworn',100);const friend=s.campaign.idle.find(o=>o.faction==='yuan');setRelationshipType(s,p.id,friend.unit.id,'sworn',100);
 project(s,p.id,'cao','xuchang',projectNeed(p.id));project(s,p.id,'yuan','guandu',projectNeed(p.id));const b=structuredClone(s);b.campaign.talent.projects=Object.fromEntries(Object.entries(b.campaign.talent.projects).reverse());resolveTalentOffers(s,cancelDomestic);resolveTalentOffers(b,cancelDomestic);
 assert.deepEqual(s.campaign.idle,b.campaign.idle);assert.equal(s.campaign.idle.filter(o=>o.unit.id===p.id).length,1);
});
test('signing multiple offers rechecks N so willingness can stop subsequent offers',()=>{
 const s=scene(),t=s.campaign.talent;const context=talentContext(s);assert.equal(context.factions.cao.D-context.factions.cao.N,1);
 const ids=s.campaign.domestic.people.filter(p=>{const w=willingness(s,p.id,'cao');return w.W>=60&&w.W<70&&w.Q<context.factions.cao.median+10;}).slice(0,2).map(p=>p.id);assert.equal(ids.length,2);
 for(const id of ids){const p=s.campaign.domestic.people.find(p=>p.id===id);p.cityId='xuchang';t.records[id].phase='SEEK';t.records[id].phaseUntilDay=1000;discoverTalent(s,id,'cao');project(s,id,'cao','xuchang',projectNeed(id));}
 resolveTalentOffers(s,cancelDomestic);assert.equal(ids.filter(id=>servingPeople(s).has(id)).length,1);assert.equal(ids.filter(id=>t.projects[talentKey(id,'cao')].state==='PAUSED').length,1);
});
test('paid target movement invalidates progress and preserves paid cost',()=>{
 const s=scene(),p=readyTalent(s),a=only(s,'hire');beginExecution(s);const paid=s.gold;p.cityId='ye';advance(s,11);const pr=s.campaign.talent.projects[talentKey(p.id,'cao')];assert.equal(pr.progress,0);assert.ok(s.campaign.domestic.events.some(e=>e.text.includes('接洽中止')));assert.ok(s.gold>=paid);restore(s);
});
test('project decay begins after 90 idle days plus a 30-day interval and is idempotent',()=>{
 const s=scene(),p=readyTalent(s),{p:pr}=project(s,p.id,'cao','xuchang',48);s.campaign.day=120;refreshTalentProjects(s);assert.equal(pr.progress,48);s.campaign.day=121;refreshTalentProjects(s);assert.equal(pr.progress,42);refreshTalentProjects(s);assert.equal(pr.progress,42);s.campaign.day=181;refreshTalentProjects(s);assert.equal(pr.progress,30);
});
test('loyal foreign officers and reigning lords cannot be persuaded',()=>{
 const s=scene(),o=s.campaign.idle.find(o=>o.faction==='yuan');o.location='guandu';assert.equal(talentEligibility(s,o.unit.id,'cao','xuchang','persuade').reason,'loyal');assert.ok(isLord(s,'shao','yuan'));assert.ok(isLord(s,'cao','cao'));
});
test('continuous employment prevents losses; idle warnings require 30 actual days to cancel',()=>{
 const s=scene(),o=s.campaign.idle.find(o=>o.location==='xuchang'),r=s.campaign.talent.records[o.unit.id];r.graceUntilDay=1;r.idleDays=180;r.idleTurns=18;r.leaveAtDay=30;s.campaign.domestic.loyalty[o.unit.id]=30;
 assignDomestic(s,'xuchang','talent',o.unit.id);for(let n=1;n<=29;n++){s.campaign.day=n;finishTalentDay(s,cancelDomestic);}assert.equal(r.leaveAtDay,30);assert.equal(r.idleTurns,18);s.campaign.day=30;finishTalentDay(s,cancelDomestic);assert.equal(r.leaveAtDay,null);assert.equal(r.idleTurns,0);assert.ok(servingPeople(s).has(o.unit.id));
});
test('one-day boundary appointments do not erase idle history; resignation preserves learned officer',()=>{
 const s=scene(),o=s.campaign.idle.find(o=>o.location==='xuchang'),original=structuredClone(o.unit),r=s.campaign.talent.records[o.unit.id];r.graceUntilDay=1;r.idleDays=200;r.idleTurns=20;r.leaveAtDay=30;s.campaign.domestic.loyalty[o.unit.id]=20;
 for(let n=1;n<=30;n++){s.campaign.day=n;if(n%10===0){s.campaign.phase='planning';assignDomestic(s,'xuchang','talent',o.unit.id);}else cancelDomestic(s,o.unit.id);finishTalentDay(s,cancelDomestic);}
 assert.ok(!servingPeople(s).has(o.unit.id));const p=s.campaign.domestic.people.find(p=>p.id===o.unit.id);assert.deepEqual(p.unit,original);assert.equal(r.hardWaitUntilDay,91);assert.equal(r.rejoinBlocks.cao,211);assert.equal(talentEligibility(s,p.id,'cao','xuchang','hire').reason,'hardWait');
});
test('no-benefit reassurance is not charged and cannot delete a warning',()=>{
 const s=scene(),a=only(s,'reassure');for(const o of servingPeople(s).values())s.campaign.domestic.loyalty[o.unit.id]=100;
 const r=s.campaign.talent.records[a.officerId];r.idleTurns=18;r.idleDays=180;r.leaveAtDay=30;s.campaign.domestic.loyalty[a.officerId]=50;
 assert.equal(reassuranceCap(s,a.officerId),55);assert.equal(actionCandidates(s,a).length,0);beginExecution(s);assert.equal(a.action,null);assert.equal(r.leaveAtDay,30);
});
test('defeat waits for effective armies, preserves people, and processes each event once',()=>{
 const s=scene();const enemy=fieldFromCity(s,'guandu');enemy.units.forEach(u=>u.troops=100);for(const c of s.cities)if(c.owner==='yuan'){c.owner='cao';c.governor=null;}noteTalentCityCapture(s,'yuan','cao','last-city');processTalentDefeats(s,cancelDomestic);assert.equal(s.campaign.talent.processedEvents.length,0);
 const ids=[...servingPeople(s).values()].filter(o=>o.faction==='yuan').map(o=>o.unit.id);for(const a of s.armies.filter(a=>a.faction==='yuan'))for(const u of a.units){u.troops=0;u.wounded=0;}
 processTalentDefeats(s,cancelDomestic);const before=s.campaign.domestic.people.length;processTalentDefeats(s,cancelDomestic);assert.equal(s.campaign.domestic.people.length,before);assert.ok(ids.every(id=>s.campaign.domestic.people.some(p=>p.id===id)));assert.equal(s.campaign.talent.processedEvents.length,1);assert.ok(s.campaign.talent.records.shao.hardWaitUntilDay>1);
});
test('new version persists projects, phases and RNG, UI reads do not mutate saves',()=>{
 const s=scene(),p=readyTalent(s);only(s,'hire');advance(s,8);const b=restore(s),saved=serializeCampaign(s);strategicView(s,{city:'xuchang'});assert.equal(serializeCampaign(s),saved);advance(s,101);advance(b,101);assert.equal(serializeCampaign(s),serializeCampaign(b));restore(s);
 for(const mutate of [x=>x.campaign.version=6,x=>x.campaign.talent.seed=-1,x=>x.campaign.talent.records[p.id].idleTurns=-1,x=>x.campaign.domestic.people.push(structuredClone(x.campaign.domestic.people[0])),x=>x.campaign.domestic.people.pop()]){const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));}
});
test('enemy talent actions use their own treasury and preserve player funds',()=>{
 const s=newCampaign(2,'heroes-251');s.armies.forEach(a=>a.stationary=true);const before=s.gold,enemyBefore=Object.fromEntries(Object.keys(s.campaign.ai.factions).map(f=>[f,s.cities.filter(c=>c.owner===f).reduce((n,c)=>n+c.gold,0)]));beginExecution(s);assert.equal(s.gold,before);
 const enemy=s.campaign.domestic.assignments.filter(a=>s.cities.find(c=>c.id===a.cityId).owner!=='cao'&&a.action);assert.ok(enemy.length>0);assert.ok(Object.entries(enemyBefore).some(([f,n])=>s.cities.filter(c=>c.owner===f).reduce((v,c)=>v+c.gold,0)<n));restore(s);
});
test('cooldown is per faction; ordinary success has no extra wait and failures cannot wear down loyalty',()=>{
 const s=scene(),p=readyTalent(s),one=project(s,p.id);s.campaign.day=10;const result=completeTalentProject(s,one.a,one.c,.45);assert.equal(result.actual,6);assert.equal(one.p.nextAttemptDay,31);
 p.cityId='guandu';discoverTalent(s,p.id,'yuan');setRelationshipType(s,p.id,'shao','sworn',100);const friend=s.campaign.idle.find(o=>o.faction==='yuan');setRelationshipType(s,p.id,friend.unit.id,'sworn',100);
 assert.equal(talentEligibility(s,p.id,'cao','xuchang','hire').reason,'unknown');discoverTalent(s,p.id,'cao');assert.equal(talentEligibility(s,p.id,'cao','xuchang','hire').reason,'cooldown');assert.equal(talentEligibility(s,p.id,'yuan','guandu','hire').ok,true);
 s.campaign.day=31;assert.equal(talentEligibility(s,p.id,'cao','xuchang','hire').ok,true);
 completeTalentProject(s,one.a,one.c,1);assert.equal(one.p.nextAttemptDay,32);
});
test('Q90 contact project requires ten controlled ordinary outcomes, not ten random join rolls',()=>{
 const s=scene(),context=talentContext(s),p=s.campaign.domestic.people.find(p=>projectNeed(p.id)===120&&willingness(s,p.id,'cao',context).W>=60);assert.ok(p);p.cityId='xuchang';s.campaign.talent.records[p.id].phase='SEEK';s.campaign.talent.records[p.id].phaseUntilDay=1000;discoverTalent(s,p.id,'cao');
 const {a,c,p:pr}=project(s,p.id);for(let n=1;n<=10;n++){s.campaign.day=n*10;completeTalentProject(s,a,c,1);assert.equal(pr.progress,n*12);if(n<10){resolveTalentOffers(s,cancelDomestic);assert.ok(s.campaign.domestic.people.some(x=>x.id===p.id));}}
 resolveTalentOffers(s,cancelDomestic);assert.equal(servingPeople(s).get(p.id)?.faction,'cao');
});
test('project cost records actual payments when persuasion changes to hiring',()=>{
 const s=scene(),p=readyTalent(s),{a,c,p:pr}=project(s,p.id);assert.equal(pr.spent,180);a.action.key='persuade';a.action.cost=240;s.campaign.day=11;startTalentProject(s,a,c);a.action.key='hire';a.action.cost=180;s.campaign.day=21;startTalentProject(s,a,c);assert.equal(pr.spent,600);assert.equal(pr.attempts,3);
});
test('a free person migrates along real edges and other factions retain only stale location',()=>{
 const s=scene(),p=readyTalent(s);p.cityId='guandu';setRelationshipType(s,p.id,'shao','disliked',0);setRelationshipType(s,p.id,'cao','sworn',100);discoverTalent(s,p.id,'cao');const r=s.campaign.talent.records[p.id];r.phaseUntilDay=10;
 s.campaign.day=10;finishTalentDay(s,cancelDomestic);assert.equal(r.phase,'WAIT');assert.ok(p.travel);assert.equal(p.cityId,'guandu');assert.equal(s.campaign.talent.knowledge.cao[p.id].locationConfirmed,false);
 const destination=p.travel.path[0];s.campaign.day=11;finishTalentDay(s,cancelDomestic);assert.equal(p.cityId,'guandu');s.campaign.day=12;finishTalentDay(s,cancelDomestic);assert.equal(p.cityId,destination);assert.equal(s.campaign.talent.knowledge.cao[p.id].lastKnownCityId,'guandu');
});
test('initial SEEK lasts exactly eighteen turns and dead or captive people are never recruited',()=>{
 const s=scene(),p=readyTalent(s),r=s.campaign.talent.records[p.id];r.phaseUntilDay=181;s.campaign.day=170;finishTalentDay(s,cancelDomestic);assert.equal(r.phase,'SEEK');s.campaign.day=180;finishTalentDay(s,cancelDomestic);assert.equal(r.phase,'WAIT');
 for(const status of ['DEAD','CAPTIVE','NOT_DEBUTED']){p.travel=null;p.status=status;r.phase='SEEK';assert.equal(talentEligibility(s,p.id,'cao','xuchang','hire').ok,false);}
});
test('reigning lord is excluded even as a local idle officer with zero loyalty',()=>{
 const s=scene(),a=s.cities.find(c=>c.units.some(u=>u.id==='shao')),u=a.units.find(u=>u.id==='shao');a.units=a.units.filter(u=>u.id!=='shao');s.campaign.idle.push({unit:u,faction:'yuan',location:'guandu',destination:null,remainingDays:0});s.campaign.domestic.loyalty.shao=0;
 assert.equal(talentEligibility(s,'shao','cao','xuchang','persuade').reason,'lord');const r=s.campaign.talent.records.shao;r.idleDays=300;r.idleTurns=30;r.graceUntilDay=1;s.campaign.day=30;finishTalentDay(s,cancelDomestic);assert.equal(r.leaveAtDay,null);
});
test('arrival grace on a non-boundary day neither leaks loyalty nor avoids later idle penalties',()=>{
 const s=scene(),o=s.campaign.idle.find(o=>o.location==='xuchang'),r=s.campaign.talent.records[o.unit.id];r.graceUntilDay=93;s.campaign.domestic.loyalty[o.unit.id]=80;
 for(let n=1;n<=190;n++){s.campaign.day=n;finishTalentDay(s,cancelDomestic);if(n===90)assert.equal(s.campaign.domestic.loyalty[o.unit.id],80);}
 assert.ok(s.campaign.domestic.loyalty[o.unit.id]<80);const before=s.campaign.domestic.loyalty[o.unit.id];for(let n=191;n<=200;n++){s.campaign.day=n;finishTalentDay(s,cancelDomestic);}assert.equal(s.campaign.domestic.loyalty[o.unit.id],before);
});
test('an empty army does not protect an idle officer from a due resignation',()=>{
 const s=scene(),a=s.cities.find(c=>c.owner==='cao'&&c.units.length&&!c.units.some(u=>u.id==='cao'));for(const u of a.units){u.troops=0;u.wounded=0;}a.route=[];a.travel=null;const u=a.units[0],r=s.campaign.talent.records[u.id];r.idleDays=240;r.idleTurns=24;r.leaveAtDay=10;r.graceUntilDay=1;s.campaign.domestic.loyalty[u.id]=10;s.campaign.day=10;
 finishTalentDay(s,cancelDomestic);assert.ok(!servingPeople(s).has(u.id));assert.ok(s.campaign.domestic.people.some(p=>p.id===u.id));
});
