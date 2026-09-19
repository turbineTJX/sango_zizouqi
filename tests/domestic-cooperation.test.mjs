import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,transferOfficer,orderCampaignArmy} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,dismissDomestic,assignmentFor,actionCandidates,finishDomesticDay,cityMilitary} from '../domestic.mjs';
import {compatibilityInfo,cooperationProfile,growCooperationRelationship} from '../domestic-cooperation.mjs';
import {relationshipInfo,setRelationshipType} from '../relationships.mjs';
import {makeOfficer,lockDeployment} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {strategicView} from '../strategic-view.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function setup(seed=1,keys=['fair'],count=2){
 const s=newCampaign(seed),c=s.cities.find(c=>c.id==='xuchang');s.armies.forEach(a=>a.stationary=true);s.gold=40000;s.cities.forEach(c=>c.grain=20000);s.grain=s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0);
 const present=s.campaign.idle.filter(o=>o.location===c.id&&o.faction===c.owner);
 if(count>present.length){const used=new Set([...s.armies.flatMap(a=>a.units.map(u=>u.id)),...s.campaign.idle.map(o=>o.unit.id)]);for(const id of Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,count-present.length)){const o={unit:{...makeOfficer(id,0),homeCity:c.id},faction:c.owner,location:c.id,destination:null,remainingDays:0};s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);s.campaign.idle.push(o);present.push(o);}}
 const dir=ACTIONS[keys[0]].direction;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction===dir&&!keys.includes(key))c.domestic.cooldowns[key]=10000;
 for(const o of present.slice(0,count))assert.equal(assignDomestic(s,c.id,dir,o.unit.id),null);
 return {s,c,officers:present.slice(0,count),dir};
}
function advance(s,target){for(let i=0;i<500&&s.campaign.day<target;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
function example(keys,predicate,prepare=()=>{},target=11){
 for(let seed=1;seed<=120;seed++){const f=setup(seed,keys);prepare(f);advance(f.s,target);const r=f.s.campaign.domestic.cooperation[f.c.id+':'+f.dir];if(r&&predicate(r,f))return {...f,r};}
 assert.fail('No real simulation matched the required cooperative outcome');
}

test('same city/direction retains multiple officers, reassigns only the selected person, and renders independent rows',()=>{
 const {s,c,officers}=setup(1,['fair'],12);assert.equal(s.campaign.domestic.assignments.length,12);restore(s);
 const html=strategicView(s,{city:c.id,strategyTab:'city'});assert.equal((html.match(/data-domestic-officer=/g)||[]).length,12);assert.match(html,/添加商业负责人/);
 const id=officers[0].unit.id,other=assignmentFor(s,officers[1].unit.id);assert.equal(assignDomestic(s,c.id,'agriculture',id),null);assert.equal(s.campaign.domestic.assignments.length,12);assert.strictEqual(assignmentFor(s,officers[1].unit.id),other);
 assert.equal(dismissDomestic(s,id),null);assert.equal(s.campaign.domestic.assignments.length,11);restore(s);
});

test('compatibility uses circular distance including zero, and relation/affinity independently affect cooperation',()=>{
 assert.equal(compatibilityInfo({compatibility:149},{compatibility:0}).distance,1);assert.equal(compatibilityInfo({compatibility:75},{compatibility:0}).distance,75);assert.equal(compatibilityInfo({compatibility:null},{compatibility:0}).distance,null);
 const {s,officers}=setup(),a={...officers[0].unit,compatibility:75},b={...officers[1].unit,compatibility:75};setRelationshipType(s,a.id,b.id,'liked',70);
 const strong=cooperationProfile(s,a,b,'commerce');assert.equal(strong.chance,.44);
 assert.ok(cooperationProfile(s,a,{...b,compatibility:0},'commerce').chance<strong.chance);
 setRelationshipType(s,a.id,b.id,'disliked',0);assert.equal(cooperationProfile(s,a,{...b,compatibility:0},'commerce').chance,.05);
 const nulls=cooperationProfile(s,{...a,compatibility:null},{...b,compatibility:null},'commerce');assert.equal(nulls.chance,.05);
});

test('same-direction different actions can cooperate; waiting colleagues can assist a single research slot',()=>{
 const {s,c,r}=example(['build_workshop','research'],r=>r.success);assert.equal(r.direction,'technology');assert.ok(s.campaign.domestic.events.some(e=>e.phase==='start'&&e.text.includes('研制')));assert.ok(s.campaign.domestic.events.some(e=>e.phase==='start'&&e.text.includes('工坊')));assert.ok(r.actual>0);restore(s);
 const waiting=example(['research'],r=>r.success);assert.equal(waiting.s.campaign.domestic.events.filter(e=>e.phase==='start').length,1);assert.ok(waiting.r.actual>0);assert.ok(waiting.r.relationGain>0);restore(waiting.s);
});

test('real cash cooperation increases actual income, grows relationship once, and consumes no extra action cost',()=>{
 const {s,r}=example(['fair'],r=>r.success&&r.actual>0&&r.relationGain>0);
 const e=s.campaign.domestic.events.find(e=>e.phase==='complete'&&e.actionId===r.actionId);assert.equal(e.result.actual,r.after);assert.ok(r.after>r.before);
 assert.equal(s.campaign.domestic.events.filter(e=>e.phase==='start').length,2);assert.equal(s.campaign.domestic.events.filter(e=>e.phase==='cooperation').length,1);
 assert.equal(relationshipInfo(r.officerId,r.helperId,s.relationshipScores,s.relationshipTypes).score,r.relation+r.relationGain);restore(s);
});

test('failed trigger and failed activity give no relationship reward; failure consumes the turn slot',()=>{
 const failed=example(['fair'],r=>!r.success);assert.equal(failed.r.actual,0);assert.equal(failed.r.relationGain,0);restore(failed.s);
 const noYield=example(['breakthrough'],r=>r.success&&r.actual===0);assert.equal(noYield.r.relationGain,0);assert.equal(noYield.s.campaign.domestic.events.filter(e=>e.phase==='cooperation').length,1);restore(noYield.s);
});

test('group cap is independent of officer count, and UI/refresh preserve deterministic results',()=>{
 const {s,c}=setup(9,['fair'],8);advance(s,9);const fork=restore(s),rng=s.campaign.domestic.seed;strategicView(s,{city:c.id});assert.equal(s.campaign.domestic.seed,rng);
 advance(s,11);advance(fork,11);assert.equal(serializeCampaign(s),serializeCampaign(fork));assert.equal(s.campaign.domestic.events.filter(e=>e.phase==='cooperation').length,1);
 const later=restore(s);advance(s,31);advance(later,31);assert.equal(serializeCampaign(s),serializeCampaign(later));assert.ok(s.campaign.domestic.events.filter(e=>e.phase==='cooperation').length<=3);restore(s);
});

test('different directions, different cities and empty tasks cannot generate cooperation',()=>{
 const {s,c,officers}=setup();assignDomestic(s,c.id,'agriculture',officers[1].unit.id);advance(s,11);assert.deepEqual(s.campaign.domestic.cooperation,{});
 const f=setup();assert.equal(transferOfficer(f.s,f.officers[1].unit.id,'chenliu'),null);advance(f.s,11);assert.deepEqual(f.s.campaign.domestic.cooperation,{});
 const empty=setup();empty.s.gold=0;advance(empty.s,11);assert.deepEqual(empty.s.campaign.domestic.cooperation,{});restore(empty.s);
});

test('multiple research and talent assignments retain exclusive research and person targets',()=>{
 const f=setup(5,['research','trial'],6);beginExecution(f.s);assert.equal(f.s.campaign.domestic.assignments.filter(a=>a.action).length,1);restore(f.s);
 const g=setup(5,['hire'],5),p=g.s.campaign.domestic.people.find(p=>p.cityId===g.c.id);p.known=true;beginExecution(g.s);assert.equal(g.s.campaign.domestic.assignments.filter(a=>a.action).length,1);advance(g.s,11);restore(g.s);
 const all=[...g.s.armies.flatMap(a=>a.units.map(u=>u.id)),...g.s.campaign.idle.map(o=>o.unit.id),...g.s.campaign.domestic.people.map(p=>p.id)];assert.equal(all.length,new Set(all).size);
});

test('parallel recruiting reserves different capacity and cooperation respects approved headcount and charges',()=>{
 const {s,c,r}=example(['recruit'],r=>r.success&&r.actual>0);const e=s.campaign.domestic.events.find(e=>e.actionId===r.actionId&&e.result.factor!==undefined);
 assert.ok(e.result.actual<=1400);assert.equal(e.result.actual,r.after);assert.equal(e.result.spent,60+Math.ceil(e.result.actual*.25));assert.equal(c.domestic.reserved,0);restore(s);
 const f=setup(4,['recruit'],6);for(const u of f.s.armies.filter(a=>a.location===f.c.id).flatMap(a=>a.units))u.troops=troopCapacity(u)-u.wounded-100;
 beginExecution(f.s);const reservations=f.s.campaign.domestic.assignments.filter(a=>a.action?.key==='recruit').flatMap(a=>a.action.recipients),totals={};for(const r of reservations)totals[r.id]=(totals[r.id]||0)+r.amount;assert.ok(Object.values(totals).every(n=>n<=100));restore(f.s);
});

test('cooperative healing conserves existing people and grain storage clips extra harvest',()=>{
 const healing=example(['heal'],r=>r.success&&r.actual>0,f=>{const {s,c}=f;c.clinic=1;for(const u of s.armies.find(a=>a.location===c.id).units){const n=Math.min(1500,u.troops);u.troops-=n;u.wounded+=n;}const military=cityMilitary(s,c);f.initialPeople=military.troops+military.wounded;},6);
 const {s,c}=healing,military=cityMilitary(s,c);assert.equal(military.troops+military.wounded,healing.initialPeople);restore(s);
 let clipped=false;for(let seed=1;seed<=30&&!clipped;seed++){const f=setup(seed,['cultivate']);f.c.grain=1000;advance(f.s,10);f.c.grain=10000+f.c.granary*10000;f.s.grain=f.s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0);advance(f.s,11);const r=f.s.campaign.domestic.cooperation[f.c.id+':'+f.dir];if(r?.success&&r.actual===0){assert.equal(r.relationGain,0);assert.ok(f.c.grain<=10000+f.c.granary*10000);restore(f.s);clipped=true;}}assert.ok(clipped);
});

test('cooperative talent success stays capped and only one target outcome is settled',()=>{
 const f=example(['hire'],r=>r.success&&r.actual>0,({s,c})=>{s.campaign.domestic.people.find(p=>p.cityId===c.id).known=true;});assert.ok(f.r.after<=94);assert.ok(f.r.actual<=8);assert.equal(f.s.campaign.domestic.events.filter(e=>e.actionId===f.r.actionId&&['complete','failure'].includes(e.phase)).length,1);restore(f.s);
});

test('repeating a daily settlement cannot advance tasks or reroll cooperation',()=>{
 const f=setup(6,['build_workshop']);beginExecution(f.s);finishDomesticDay(f.s);const snapshot=serializeCampaign(f.s);finishDomesticDay(f.s);assert.equal(serializeCampaign(f.s),snapshot);advanceCampaignDay(f.s);restore(f.s);
 const bad=JSON.parse(serializeCampaign(f.s));bad.campaign.domestic.lastFinishedDay--;assert.throws(()=>validateCampaign(bad));
});

test('construction cooperation shortens paid work, remains fractional and resumes without recharging',()=>{
 const f=example(['build_workshop'],r=>r.success,()=>{},2);const a=f.s.campaign.domestic.assignments.find(a=>a.action);assert.ok(a.action.remaining<19);assert.ok(f.r.actual>0);restore(f.s);
 const copy=restore(f.s);advance(f.s,11);advance(copy,11);assert.equal(serializeCampaign(f.s),serializeCampaign(copy));
});

test('relationship growth leaves an active battle and its snapshots unchanged',()=>{
 const f=setup(12,['fair']);const enemy=f.s.armies.find(a=>a.faction==='yuan');enemy.stationary=false;assert.equal(orderCampaignArmy(f.s,'a1','guandu'),null);beginExecution(f.s);
 for(let i=0;i<15&&!activeBattles(f.s).length;i++)advanceCampaignDay(f.s);const r=activeBattles(f.s)[0];assert.ok(r);chooseEncounter(f.s,r.id,true);lockDeployment(r.battle);
 const before=structuredClone(r.battle.relationshipScores),snaps=structuredClone(r.snapshots),[a,b]=f.officers.map(o=>o.unit),gain=growCooperationRelationship(f.s,a,b,1);assert.ok(gain>0);assert.deepEqual(r.battle.relationshipScores,before);assert.deepEqual(r.snapshots,snaps);assert.equal(growCooperationRelationship(f.s,a,b,1),0);restore(f.s);
});

test('siege prevents new cooperation and invalid record or old save is rejected',()=>{
 const f=setup(19,['build_workshop']);const enemy=f.s.armies.find(a=>a.faction==='yuan'&&a.location==='guandu');enemy.route=['xuchang'];enemy.target='xuchang';beginExecution(f.s);
 for(let i=0;i<10&&!activeBattles(f.s).some(r=>r.cityId==='xuchang');i++)advanceCampaignDay(f.s);
 const battle=activeBattles(f.s).find(r=>r.cityId==='xuchang');assert.ok(battle);const previous=structuredClone(f.s.campaign.domestic.cooperation);chooseEncounter(f.s,battle.id,true);lockDeployment(battle.battle);advanceCampaignDay(f.s);assert.deepEqual(f.s.campaign.domestic.cooperation,previous);restore(f.s);
 const {s,r}=example(['fair'],r=>r.success&&r.actual>0),key=r.cityId+':'+r.direction;
 for(const mutate of [s=>s.campaign.version=3,s=>s.campaign.domestic.version=1,s=>s.campaign.domestic.cooperation[key].helperId=r.officerId,s=>s.campaign.domestic.cooperation[key].chance=2,s=>s.campaign.domestic.cooperation[key].actual=-1,s=>s.campaign.domestic.cooperationGrowth.bad=1]){const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));}
});
