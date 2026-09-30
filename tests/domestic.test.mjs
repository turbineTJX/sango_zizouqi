import {invadeFromGuandu,fieldFromCity,peacefulCities} from './helpers/field-campaign.mjs';
import {talentKey,refreshTalentDemand} from '../talent-core.mjs';
import {setRelationshipType} from '../relationships.mjs';
import {learnedTacticIds} from '../tactic-learning.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {launchExpedition,recruitCityUnits,changeCityTroop,newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,createCampaignArmy,splitCampaignArmy,orderCampaignArmy,mergeCampaignArmies,recruitCampaign,changeCampaignTroop,cityIncome,transferOfficer} from '../strategic-campaign.mjs';
import {ACTIONS,BUILDINGS,DIRECTIONS,TECHS,assignDomestic,assignmentFor,actionCandidates,cityMilitary,cancelDomestic} from '../domestic.mjs';
import {makeOfficer,lockDeployment,activeUnits,issueCommand} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function peaceful(seed=81){const s=newCampaign(seed);peacefulCities(s);s.gold=40000;s.cities.forEach(c=>c.grain=20000);s.grain=s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0);return s;}
function advance(s,to){for(let guard=0;guard<3000&&s.campaign.day<to;guard++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);}assert.equal(s.campaign.day,to);}
function addIdle(s,c,count){const used=new Set([...s.cities.flatMap(c=>c.units.map(u=>u.id)),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]),ids=Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,count);s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>!ids.includes(p.id));for(const id of ids){const u={...makeOfficer(id,0),homeCity:c,type:'spear'};u.tactics=learnedTacticIds(u);s.campaign.idle.push({unit:u,faction:'cao',location:c,destination:null,remainingDays:0});s.campaign.domestic.loyalty[id]=85;}return ids;}
function selectOnly(s,key){const c=s.cities.find(c=>c.id==='xuchang');for(const [k,d]of Object.entries(ACTIONS))if(d.direction===ACTIONS[key].direction&&k!==key)c.domestic.cooldowns[k]=1000;const o=s.campaign.idle.find(o=>o.location===c.id&&o.faction==='cao');assert.equal(assignDomestic(s,c.id,ACTIONS[key].direction,o.unit.id),null);return assignmentFor(s,o.unit.id);}

test('all six directions have independent work and a single stat; no city morale multiplier',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang');for(const dir of Object.keys(DIRECTIONS)){assert.ok(Object.values(BUILDINGS).some(b=>b.direction===dir));assert.ok(Object.values(ACTIONS).filter(a=>a.direction===dir).length>=2);}
 const before=cityIncome(s,c);c.order=0;assert.deepEqual(cityIncome(s,c),before);
 assert.deepEqual(Object.values(ACTIONS).filter(a=>a.direction==='talent'&&a.kind!=='build').map(a=>a.kind),['hire','persuade','reassure']);
});
test('assignments persist across turns, log starts and results, and reload deterministically',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang');addIdle(s,c.id,4);const officers=s.campaign.idle.filter(o=>o.location===c.id).slice(0,6);
 Object.keys(DIRECTIONS).forEach((dir,i)=>assert.equal(assignDomestic(s,c.id,dir,officers[i].unit.id),null));advance(s,7);const copy=restore(s);advance(s,41);advance(copy,41);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.domestic.assignments.length,6);assert.ok(s.campaign.domestic.events.some(e=>e.phase==='start'));assert.ok(s.campaign.domestic.events.some(e=>['complete','failure'].includes(e.phase)));restore(s);
});
test('random results vary across seeds while identical seed is reproducible',()=>{
 const results=new Set();for(let seed=1;seed<=24;seed++){const s=peaceful(seed);selectOnly(s,'fair');advance(s,11);results.add(s.campaign.domestic.events.find(e=>e.result.factor!==undefined)?.result.factor);}assert.ok(results.size>=3);
});
test('no reserves or no legal unit vacancies means no recruitment candidate',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang'),a=selectOnly(s,'recruit');c.manpower=0;assert.equal(actionCandidates(s,a).length,0);assert.match(recruitCityUnits(s,c.id,c.units.map(u=>u.id)),/不足/);
 c.manpower=6500;for(const u of c.units)u.troops=troopCapacity(u)-u.wounded;assert.equal(actionCandidates(s,a).length,0);
});
test('recruitment reserves are shared with manual replenishment and only actual recruits are charged',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang'),a=selectOnly(s,'recruit'),before=cityMilitary(s,c).troops,people=c.manpower;beginExecution(s);assert.equal(a.action.key,'recruit');assert.equal(c.domestic.reserved,a.action.amount);restore(s);
 advance(s,11);const recruited=cityMilitary(s,c).troops-before;assert.ok(recruited>=0&&recruited<=1400);assert.equal(c.manpower,people-recruited+cityIncome(s,c).manpower);assert.equal(c.domestic.reserved,0);assert.equal(c.drafted,0);restore(s);
});
test('cancelling recruitment releases reserves; leaving recipients never get remote troops',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang'),a=selectOnly(s,'recruit');beginExecution(s);const gold=s.gold,people=c.manpower;cancelDomestic(s,a.officerId);assert.equal(c.domestic.reserved,0);assert.equal(c.manpower,people);assert.ok(s.gold>gold);restore(s);
 const x=peaceful(),b=selectOnly(x,'recruit');beginExecution(x);const source=x.cities.find(c=>c.id==='xuchang'),dest=x.cities.find(c=>c.id==='chenliu'),units=source.units;source.units=[];dest.units.push(...units);const original=units.map(u=>({id:u.id,troops:u.troops}));advance(x,11);for(const u of original)assert.equal(x.cities.flatMap(c=>c.units).find(v=>v.id===u.id).troops,u.troops);assert.equal(x.cities.find(c=>c.id==='xuchang').domestic.reserved,0);
});
test('city can hold more than ten independent units while each new expedition is capped at ten',()=>{
 const s=peaceful(),ids=addIdle(s,'xuchang',16),c=s.cities.find(c=>c.id==='xuchang');assert.equal(createCampaignArmy(s,c.id,ids),null);c.units.forEach(u=>u.troops=100);assert.ok(c.units.length>10);assert.equal(s.armies.length,0);restore(s);
 const q={kind:'expedition',cityId:c.id,officerIds:c.units.slice(0,11).map(u=>u.id),leader:c.units[0].id,advisor:c.units[0].id,deputy:null,target:'chenliu',policy:'auto'};assert.ok(launchExpedition(s,q));q.officerIds.pop();assert.equal(launchExpedition(s,q),null);assert.equal(s.armies[0].units.length,10);restore(s);
});
test('new commands replace appointments and construction can be resumed without paying twice',()=>{
 const s=peaceful(),a=selectOnly(s,'build_workshop'),c=s.cities.find(c=>c.id==='xuchang');advance(s,11);assert.ok(a.action);const left=a.action.remaining;cancelDomestic(s,a.officerId);assert.equal(c.domestic.suspended.remaining,left);const gold=s.gold;
 const o=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==a.officerId);assert.equal(assignDomestic(s,c.id,'technology',o.unit.id),null);beginExecution(s);assert.equal(s.gold,gold);assert.equal(assignmentFor(s,o.unit.id).action.remaining,left);restore(s);
});
test('research unlocks a local troop only after a successful trial',()=>{
 const s=peaceful(13),c=s.cities.find(c=>c.id==='xuchang');c.domestic.techs=['spear','archer'];c.domestic.research={type:'crossbow',progress:100};selectOnly(s,'trial');advance(s,61);assert.ok(c.domestic.techs.includes('crossbow'));assert.equal(c.domestic.research,null);
 assert.equal(changeCityTroop(s,c.id,c.units[0].id,'crossbow'),null);assert.match(changeCityTroop(s,c.id,c.units[0].id,'ship'),/兵种/);restore(s);
});
test('exploration discovers actual candidates and recruiting never duplicates a person',()=>{
 const s=peaceful(7),a=selectOnly(s,'explore');advance(s,31);assert.ok(Object.keys(s.campaign.talent.knowledge.cao).length>0);restore(s);
 cancelDomestic(s,a.officerId);const c=s.cities.find(c=>c.id==='xuchang');c.domestic.cooldowns={};selectOnly(s,'hire');advance(s,91);const ids=[...s.cities.flatMap(c=>c.units.map(u=>u.id)),...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id),...s.campaign.domestic.people.map(p=>p.id)];assert.equal(new Set(ids).size,ids.length);restore(s);
});
test('healing conserves personnel and does not require local troop technology',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang');c.clinic=2;c.domestic.techs=['spear'];const u=c.units[0];u.troops-=1000;u.wounded+=1000;const total=u.troops+u.wounded,people=c.manpower;selectOnly(s,'heal');advance(s,6);assert.equal(u.troops+u.wounded,total);assert.ok(u.wounded<1000);assert.equal(c.manpower,people);restore(s);
});
test('siege opening bonuses apply once at deployment lock, only to first six defenders',()=>{
 const s=newCampaign(12),c=s.cities.find(c=>c.id==='guandu');c.kind='gate';c.drill=5;c.walls=3;c.gateHp=21000;c.domestic.preparation={intent:{amount:12,until:100,actionId:1},shield:{amount:.1,until:100,actionId:2}};
 fieldFromCity(s,'xuchang',{id:'a1',target:c.id});beginExecution(s);
 // Keep this prepared garrison stationed; unrelated encounters must not pause its arrival.
 for(let i=0;i<12&&!activeBattles(s).some(r=>r.cityId===c.id);i++){advanceCampaignDay(s);for(const other of activeBattles(s).filter(r=>r.awaiting&&r.cityId!==c.id))chooseEncounter(s,other.id,false);}
 const r=activeBattles(s).find(r=>r.cityId===c.id);assert.ok(r,'the intended prepared city is under siege');assert.equal(r.kind,'siege');chooseEncounter(s,r.id,true);const b=r.battle,def=b.sides[1-r.attackSide];assert.ok(def.units.every(u=>!u.statuses.shield));lockDeployment(b);
 const active=activeUnits(b,1-r.attackSide);assert.ok(active.every(u=>u.intent===27&&u.statuses.shield));assert.ok(def.units.filter(u=>u.status==='reserve').every(u=>!u.statuses.shield));const before=structuredClone(b);lockDeployment(b);assert.deepEqual(b,before);for(const pending of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,pending.id,false);advanceCampaignStep(s);assert.equal(c.domestic.preparation.intent,null);assert.equal(c.domestic.preparation.shield,null);restore(s);
});
test('invalid domestic saves cannot fabricate reserves, duplicate appointments, or exceed opening caps',()=>{
 const s=peaceful();selectOnly(s,'recruit');beginExecution(s);for(const mutate of [x=>x.cities.find(c=>c.id==='xuchang').domestic.reserved++,x=>x.campaign.domestic.seed=-1,x=>x.campaign.domestic.assignments.push(structuredClone(x.campaign.domestic.assignments[0])),x=>x.cities[0].domestic.preparation.intent={amount:100,until:100,actionId:1},x=>x.cities[0].workshop=9]){const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));}
});

test('persuasion respects nearby foreign targets and cooldowns; reassurance raises actual loyalty',()=>{
 const s=peaceful(17),target=s.campaign.idle.find(o=>o.faction==='yuan');target.location='guandu';target.unit.homeCity='guandu';const extra=addIdle(s,'ye',20);for(const o of s.campaign.idle)if(extra.includes(o.unit.id))o.faction='yuan';refreshTalentDemand(s,true);const a=selectOnly(s,'persuade'),id=target.unit.id;s.campaign.domestic.loyalty[id]=20;setRelationshipType(s,id,'cao','sworn',100);setRelationshipType(s,id,'shao','disliked',0);setRelationshipType(s,id,a.officerId,'sworn',100);assert.equal(actionCandidates(s,a)[0].targetId,id);advance(s,11);
 const project=s.campaign.talent.projects[talentKey(id,'cao')];assert.ok(project);assert.equal(s.campaign.domestic.loyalty[id],20);if(project.nextAttemptDay>s.campaign.day)assert.ok(!actionCandidates(s,a).some(x=>x.targetId===id));restore(s);
 const x=peaceful(2),c=x.cities.find(c=>c.id==='xuchang'),u=c.units[0];x.campaign.domestic.loyalty[u.id]=25;selectOnly(x,'reassure');advance(x,41);assert.ok(x.campaign.domestic.loyalty[u.id]>25);restore(x);
});

test('new assignments end on transfer, and unresearched troops cannot receive new recruits',()=>{
 const s=peaceful(),a=selectOnly(s,'fair');assert.equal(transferOfficer(s,a.officerId,'chenliu'),null);assert.equal(assignmentFor(s,a.officerId),undefined);restore(s);
 const x=peaceful(),c=x.cities.find(c=>c.id==='xuchang'),army=c;c.domestic.techs=['spear'];const u=army.units.find(u=>u.type!=='spear');assert.ok(u);const before=u.troops;recruitCityUnits(x,c.id,c.units.map(u=>u.id));assert.equal(u.troops,before);restore(x);
});

test('actual siege pauses construction without charging again or completing in the background',()=>{
 const s=peaceful(19),a=selectOnly(s,'build_workshop');const enemy=invadeFromGuandu(s);enemy.route=['xuchang'];enemy.target='xuchang';beginExecution(s);
 for(let i=0;i<10&&!activeBattles(s).some(r=>r.cityId==='xuchang');i++)advanceCampaignDay(s);
 const r=activeBattles(s).find(r=>r.cityId==='xuchang');assert.ok(r);const remaining=a.action.remaining,gold=s.gold;chooseEncounter(s,r.id,true);lockDeployment(r.battle);advanceCampaignDay(s);assert.equal(a.action.remaining,remaining);assert.equal(s.gold,gold);assert.ok(a.action.paused);restore(s);
});

test('defending city troops leave as real retreat transports without duplicating personnel',()=>{
 const s=newCampaign(19),ids=addIdle(s,'xuchang',14);assert.equal(createCampaignArmy(s,'xuchang',ids),null);const own=s.cities.find(c=>c.id==='xuchang');own.units.forEach(u=>u.troops=1000);const original=own.units.map(u=>u.id);assert.ok(original.length>10);
 peacefulCities(s);const enemy=invadeFromGuandu(s);enemy.route=['xuchang'];enemy.target='xuchang';
 beginExecution(s);for(let i=0;i<20&&!activeBattles(s).some(r=>r.cityId==='xuchang');i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);for(const r of activeBattles(s).filter(r=>r.awaiting&&r.cityId!=='xuchang'))chooseEncounter(s,r.id,false);}
 const r=activeBattles(s).find(r=>r.cityId==='xuchang');assert.ok(r);chooseEncounter(s,r.id,true);lockDeployment(r.battle);restore(s);assert.equal(issueCommand(r.battle,'retreat'),null);
 for(let i=0;i<500&&!r.settled;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);advanceCampaignStep(s);}
 assert.ok(r.settled);const withdrawn=r.battle.sides.flatMap(side=>side.units).filter(u=>original.includes(u.id)&&u.status==='withdrawn');assert.ok(withdrawn.length>10);assert.ok(withdrawn.every(u=>u.retreatDispatched));
 const people=[...s.armies.flatMap(a=>a.units),...s.cities.flatMap(c=>c.units),...s.campaign.idle.map(o=>o.unit),...s.campaign.domestic.people.map(p=>p.unit)];for(const id of original)assert.equal(people.filter(u=>u?.id===id).length,1,id);
 assert.ok(s.armies.filter(a=>!a.defense).every(a=>a.units.filter(u=>u.troops>0).length<=10));assert.ok(s.campaign.idle.some(o=>original.includes(o.unit.id)&&o.retreating&&o.journey.route.length));restore(s);
});

test('completed domestic work earns merit, cancellation earns none, and reload cannot duplicate it',()=>{
 const s=peaceful(81),a=selectOnly(s,'build_workshop'),o=s.campaign.idle.find(o=>o.unit.id===a.officerId),c=s.cities.find(c=>c.id===a.cityId);c.governor=null;
 beginExecution(s);const before={level:o.unit.level,merit:o.unit.merit};cancelDomestic(s,a.officerId);assert.deepEqual({level:o.unit.level,merit:o.unit.merit},before);
 const q=peaceful(81),b=selectOnly(q,'build_workshop'),city=q.cities.find(c=>c.id===b.cityId);city.governor=null;beginExecution(q);const restored=restore(q);advance(q,61);advance(restored,61);assert.equal(serializeCampaign(q),serializeCampaign(restored));
 const u=q.campaign.idle.find(o=>o.unit.id===b.officerId).unit;assert.ok(u.level>1||u.merit>0);assert.ok(q.campaign.domestic.events.some(e=>e.text.includes('功绩 +')));
});

test('force-led drills and patrols produce real defensive preparation with no secondary-stat penalty',()=>{
 for(const key of ['exercise','patrol']){
  let weak=0,strong=0;
  for(let seed=1;seed<=20;seed++){
   const s=peaceful(seed),a=selectOnly(s,key),c=s.cities.find(c=>c.id===a.cityId),u=s.campaign.idle.find(o=>o.unit.id===a.officerId).unit;c.drill=1;c.walls=1;c.governor=null;
   const original=Object.fromEntries(['force','leadership','intellect','politics','charm'].map(k=>[k,u[k]]));Object.assign(u,{force:20,leadership:70,intellect:70,politics:70,charm:70});const high=structuredClone(s),v=high.campaign.idle.find(o=>o.unit.id===u.id).unit;v.force=95;
   beginExecution(s);beginExecution(high);assert.equal(a.action.key,key);assert.ok(assignmentFor(high,u.id).action.chance>a.action.chance);
   advance(s,11);advance(high,11);const field=ACTIONS[key].value;weak+=c.domestic.preparation[field]?.amount||0;strong+=high.cities.find(x=>x.id===c.id).domestic.preparation[field]?.amount||0;
   if(seed===1){Object.assign(u,original);Object.assign(v,original);restore(s);restore(high);assert.ok(high.campaign.domestic.events.some(e=>e.actionId&&e.text.includes(ACTIONS[key].name)));}
  }
  assert.ok(strong>weak,key+' must give high-force officers a measurable real-work advantage');
 }
});
