import {gateDurability} from '../building-durability.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,roadLength,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,validateCampaign,serializeCampaign,launchExpedition} from './helpers/auto-domestic-campaign.mjs';
import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,strategicPower,strategicCapabilities,strategicTravelDays,safeStrategicTransportRoute,validateStrategicAI,expeditionTiming,evaluateOffensive,factionStrategicProfile,estimateStrategicEnemy} from '../strategic-ai.mjs';
import {cityForce} from '../city-units.mjs';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {assignDomestic,beginDomesticTurn,assignmentFor,finishDomesticDay,cancelDomestic,ACTIONS} from '../domestic.mjs';
import {requestFactionOrder,resolveStrategicOrders,validateStrategicOrders} from '../strategic-orders.mjs';
import {plannedOfficer,plannedGrain,domesticIntentWeight} from '../strategic-intent.mjs';
import {pendingOrdersMarkup} from '../strategic-order-view.mjs';
import {strategicAIMarkup} from '../strategic-view.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
const city=(s,id)=>s.cities.find(c=>c.id===id);
// Small connected front built from current city units, never a legacy city army.
function scene(){
 const s=newCampaign(513,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.grain=20000;c.project=null;gateDurability(c).hp=0;}
 const home=city(s,'ye'),target=city(s,'town-5'),rear=city(s,'town-8');
 Object.assign(home,{owner:'yuan',x:0,y:0});Object.assign(target,{owner:'cao',x:8,y:0,gateHp:6000});Object.assign(rear,{x:-8,y:0});
 home.domestic.owner='yuan';target.domestic.owner='cao';s.roads=[[home.id,target.id],[home.id,rear.id]];
 // This compact front tests decisions and contact, not national travel time.
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:7.5};
 home.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:home.id}));
 target.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:target.id}));
  // A rear base is friendly; a high wall alone no longer blocks occupation.
 rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=1000000;home.gold=6000;target.gold=6000;rear.gold=6000;initializeVision(s);initializeStrategicAI(s);
 return {s,home,target,rear};
}
const men=s=>s.cities.flatMap(c=>c.units).concat(s.armies.flatMap(a=>a.units)).reduce((n,u)=>n+u.troops+u.wounded,0);
const grain=s=>s.cities.reduce((n,c)=>n+c.grain,0)+s.armies.reduce((n,a)=>n+a.supply,0);
const assess=({s,home,target},units=home.units.slice(0,3))=>evaluateOffensive(s,{faction:'yuan',staging:home,target,groups:[{c:home,units,days:0}],assaultDays:1,siegeDays:target.units.length?2:0});

test('the same marginal objective is accepted by a bold lord and declined by a cautious lord',()=>{
 for(const [personality,attack] of [[4,true],[2,false]]){
  const {s,home,target}=scene();home.units.find(u=>u.id==='shao').personality=personality;
  target.units=[];target.kind='port';target.commerce=0;target.grain=0;
  const before={men:men(s),grain:grain(s)};planStrategicAI(s);
  assert.equal(s.campaign.ai.plans.some(p=>p.phase==='attack'),attack);
  assert.equal(men(s),before.men);assert.equal(grain(s),before.grain);
  s.campaign.ai.cities[home.id].role='rear';
  assert.equal(domesticIntentWeight(s,home.id,'commerce')/1.2>domesticIntentWeight(s,home.id,'military'),!attack);
 }
});

test('lord judgment bounds enemy estimate error without rerolls or changing actual forces',()=>{
 const {s,home,target}=scene(),lord=home.units.find(u=>u.id==='shao'),truth=10000;
 lord.leadership=20;lord.intellect=20;const low=estimateStrategicEnemy(s,'yuan',target.id,truth),bound=factionStrategicProfile(s,'yuan').errorBound;
 assert.ok(Math.abs(low-truth)<=truth*bound);assert.notEqual(low,truth);
 const snapshot=serializeCampaign(s);assert.equal(estimateStrategicEnemy(JSON.parse(snapshot),'yuan',target.id,truth),low);
 s.campaign.day+=10;assert.equal(estimateStrategicEnemy(s,'yuan',target.id,truth),low);
 lord.leadership=95;lord.intellect=95;const high=estimateStrategicEnemy(s,'yuan',target.id,truth);
 assert.ok(Math.abs(high-truth)<Math.abs(low-truth));assert.equal(truth,10000);
});

test('a winnable attack is refused when casualty replacement is unaffordable',()=>{
 const setup=scene(),{s,home}=setup;assert.ok(assess(setup).accepted);
 home.manpower=0;const result=assess(setup);assert.ok(result.estimatedLosses>0);assert.equal(result.accepted,false);assert.match(result.reason,/预备兵/);
 home.manpower=20000;home.gold=500;assert.match(assess(setup).reason,/补兵金/);
});

test('valuable civil workers and a development-minded lord increase the opportunity cost',()=>{
 const setup=scene(),{s,home,target}=setup,lord=home.units.find(u=>u.id==='shao'),worker=home.units.find(u=>u.id==='ju');target.units=[];
 const idle=assess(setup,[worker]);assert.equal(assignDomestic(s,home.id,'technology','ju',{faction:'yuan'}),null);
 lord.politics=20;const low=assess(setup,[worker]);lord.politics=100;const high=assess(setup,[worker]);
 assert.ok(low.workCost>idle.workCost);assert.ok(high.workCost>low.workCost);assert.ok(high.score<low.score);
});

test('occupation value is rejected when surviving troops cannot hold against nearby counterattack',()=>{
 const setup=scene(),{s,home,target,rear}=setup;target.units=[];target.commerce=10;assert.ok(assess(setup,home.units.slice(0,1)).accepted);
 // The threat borders the objective only, so it is a post-capture concern.
 s.roads=[[home.id,target.id],[target.id,rear.id]];rear.owner='cao';rear.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,6000,i,3),homeCity:rear.id}));
 const result=assess(setup,home.units.slice(0,1));assert.equal(result.accepted,false);assert.match(result.reason,/反攻/);
});

test('AI occupies an undefended objective regardless of wall durability',()=>{
 const {s,target}=scene();target.units=[];gateDurability(target).hp=1000000;planStrategicAI(s);
 assert.equal(s.campaign.ai.plans[0]?.target,target.id);assert.equal(s.campaign.ai.plans[0]?.phase,'attack');
});

test('a worthwhile opening opportunity is evaluated immediately without development timers',()=>{
 const {s,target}=scene();target.units=[];initializeStrategicAI(s);planStrategicAI(s);
 assert.equal(s.campaign.ai.plans[0]?.phase,'attack');assert.ok(!Object.hasOwn(s.campaign.ai.factions.yuan,'nextOffensiveDay'));
});

test('cancelled plans respond to changed conditions without a fixed rest deadline',()=>{
 const {s,target}=scene();planStrategicAI(s);const p=s.campaign.ai.plans[0];gateDurability(target).hp=1000000;next(s);
 assert.equal(p.phase,'cancelled');target.units=[];s.campaign.day=11;s.turn=2;
 const copy=JSON.parse(serializeCampaign(s));planStrategicAI(s);planStrategicAI(copy);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(s.campaign.ai.plans.length,2);
});

test('heavily wounded troops recover at home before a voluntary offensive',()=>{
 const {s,home,target}=scene();target.units=[];home.units.forEach(u=>u.wounded=u.troops);
 planStrategicAI(s);assert.equal(s.campaign.ai.plans.length,0);assert.equal(home.units.length,6);
 home.units.forEach(u=>u.wounded=0);s.campaign.day=11;s.turn=2;planStrategicAI(s);
 assert.equal(s.campaign.ai.plans[0]?.phase,'attack');
});

test('offensive grain reservations include home rations and wait for actual supplies',()=>{
 const {s,home,rear}=scene();home.grain=2500;rear.grain=20000;planStrategicAI(s);
 const p=s.campaign.ai.plans[0];assert.ok(p);assert.notEqual(p.phase,'attack');assert.equal(s.armies.length,0);
 assert.ok(s.campaign.ai.cities[home.id].grainNeed>=plannedGrain(s,home.id)+2500);
 home.grain=20000;next(s);assert.equal(p.phase,'attack');assert.ok(home.grain>=2500);
});

test('a threatened home preserves defense while its troops are already fighting',()=>{
 const {s,home,target,rear}=scene(),policy=s.campaign.ai.factions.yuan;policy.lastReviewTurn=s.turn;
 rear.owner='neutral';rear.domestic.owner='neutral'; // A separate easy objective remains available.
 const ids=home.units.slice(0,3).map(u=>u.id);
 assert.equal(launchExpedition(s,{cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,policy:'auto'},{faction:'yuan'}),null);
 beginExecution(s);for(let i=0;i<4&&!activeBattles(s).length;i++)advanceCampaignDay(s);assert.ok(activeBattles(s).length);
 home.units.forEach(u=>u.troops=100);policy.lastReviewTurn=0;s.campaign.ai.lastPlanDay=0;
 planStrategicAI(s);assert.equal(s.campaign.ai.plans.length,0);
});

test('AI factions still fight each other on actual hostile arrival',()=>{
 const {s,home,target}=scene();target.owner='sunce';target.domestic.owner='sunce';
 // Keep a player city so the world does not end before the columns arrive.
 city(s,'xuchang').owner='cao';city(s,'xuchang').domestic.owner='cao';
 for(const p of Object.values(s.campaign.ai.factions))p.lastReviewTurn=s.turn;
 const ids=home.units.slice(0,3).map(u=>u.id);
 assert.equal(launchExpedition(s,{cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,policy:'auto'},{faction:'yuan'}),null);
 beginExecution(s);for(let i=0;i<4&&!activeBattles(s).some(b=>b.battle.sides.every(side=>side.faction!=='cao'));i++){
  for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);
  advanceCampaignDay(s);
 }
 assert.ok(activeBattles(s).some(b=>b.battle.sides.every(side=>side.faction!=='cao')));
});

test('siege budgeting exposes an archer column outlasting its food and caps simultaneous attackers',()=>{
 const {s,home}=scene(),u={...makeOfficer('person-637',4500,0,1),type:'archer'},a={...cityForce(home),units:[u]};
 const cap=strategicCapabilities(s,a);assert.ok(15000/cap.siege>900/cap.foodPerDay);
 assert.ok(15000/strategicCapabilities(s,{...a,units:[{...u,type:'ram'}]}).siege<900/cap.foodPerDay);
 const six=strategicCapabilities(s,{...a,units:Array(6).fill(u)}),ten=strategicCapabilities(s,{...a,units:Array(10).fill(u)});
 assert.equal(ten.siege,six.siege);assert.ok(ten.foodPerDay>six.foodPerDay);
});
function nearFinish(s,id){
 const action=assignmentFor(s,id).action;
 for(let i=0;i<90&&action.remaining>2;i++){s.campaign.day++;finishDomesticDay(s);s.turn=Math.floor((s.campaign.day-1)/10)+1;}
 assert.equal(assignmentFor(s,id).action,action);assert.ok(action.remaining<=2);
}
const next=s=>{s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;planStrategicAI(s);};
function incoming(s,c,from,menPerUnit=3000){
 const units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,menPerUnit,i,3),homeCity:from.id}));
 for(const town of s.cities)town.units=town.units.filter(u=>!units.some(x=>x.id===u.id));
 const a={...cityForce(from),id:`a${s.nextId++}`,units,faction:'cao',leader:'cao',advisor:'cao',route:[c.id],target:c.id,stationary:false,travel:{from:from.id,to:c.id,road:'main',progress:roadLength(s,from.id,c.id)*.7},supply:2700,supplyCapacity:2700};delete a.cityForce;s.armies.push(a);return a;
}
test('advantageous attack retains threat-sized city defense and conserves actual men and grain',()=>{
 const {s,home,target}=scene(),before={men:men(s),grain:grain(s)},enemy=strategicPower(s,cityForce(target));planStrategicAI(s);
 const a=s.armies.find(a=>a.faction==='yuan');assert.equal(a?.target,target.id);assert.ok(home.units.length>0);assert.ok(strategicPower(s,cityForce(home))>=enemy*.55);
 assert.equal(men(s),before.men);assert.equal(grain(s),before.grain);assert.ok(a.units.length<=10);assert.equal(s.campaign.ai.plans[0].phase,'attack');
 const snapshot=serializeCampaign(s);planStrategicAI(s);assert.equal(serializeCampaign(s),snapshot);
});
test('superior defenses produce no attack plan or resource debit',()=>{
 const {s,target}=scene();target.units.forEach(u=>u.troops=7000);gateDurability(target).hp=27000;const before=grain(s);planStrategicAI(s);
 assert.equal(s.campaign.ai.plans.length,0);assert.equal(s.armies.length,0);assert.equal(grain(s),before);
});
test('a large city roster selects legal columns and leaves wounded units in the city',()=>{
 const {s,home}=scene(),used=new Set(s.cities.flatMap(c=>c.units.map(u=>u.id)));
 home.units.push(...Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,16).map((id,i)=>({...makeOfficer(id,i<7?3000:0,i,3),homeCity:home.id,wounded:i<7?0:500})));
 const before=men(s);planStrategicAI(s);assert.ok(s.armies.length);assert.ok(s.armies.every(a=>a.units.length<=10&&a.units.every(u=>u.troops>0)));assert.equal(men(s),before);assert.equal(home.units.filter(u=>!u.troops).length,9);
});
test('a serious incoming attack retains the home defense instead of expanding',()=>{
 const {s,home,target}=scene();incoming(s,home,target,6500);planStrategicAI(s);
 assert.equal(s.armies.filter(a=>a.faction==='yuan').length,0);assert.equal(home.units.length,6);assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='hold'&&d.target===home.id));
});
test('rescue uses arrival times and does not count a late column as successful relief',()=>{
 for(const timely of [true,false]){
  const {s,home,target,rear}=scene();target.owner='yuan';target.domestic.owner='yuan';target.units=[];gateDurability(target).hp=0;
  const enemyFrom=city(s,'xuchang');// The timely approach is already within the defender's actual sight radius.
  Object.assign(enemyFrom,{x:timely?50:8,y:timely?0:1});s.roads.push([target.id,enemyFrom.id]);s.roadSegments[[target.id,enemyFrom.id].sort().join(':')]={distance:timely?90:7.5};incoming(s,target,enemyFrom,2000);
  if(!timely){home.x=-100;delete s.roadSegments[[home.id,target.id].sort().join(':')];}gateDurability(rear).hp=1000000;planStrategicAI(s);const relief=s.armies.find(a=>a.faction==='yuan'&&a.target===target.id);
  assert.equal(!!relief,timely);if(timely){assert.ok(relief.units.length<=10);assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='reinforce'));}
 }
});
test('hungry marching columns reverse continuous road progress once without teleporting',()=>{
 const {s,home,target}=scene();const ids=home.units.slice(0,3).map(u=>u.id);assert.equal(launchExpedition(s,{cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:target.id,policy:'auto'},{faction:'yuan'}),null);
 const a=s.armies[0],length=roadLength(s,home.id,target.id);Object.assign(a,{hunger:1,supply:0,travel:{from:home.id,to:target.id,progress:2,road:'main'}});planStrategicAI(s);
 assert.deepEqual(a.travel,{from:target.id,to:home.id,progress:length-2,road:'main'});assert.deepEqual(a.route,[home.id]);const returning=structuredClone(a.travel);next(s);assert.deepEqual(a.travel,returning);
});
test('shared recruitment spends one city quota and the AI treasury only, preserving planned grain',()=>{
 const {s,home}=scene();home.units.forEach(u=>u.troops=1000);const before={men:men(s),gold:home.gold,player:s.gold,grain:home.grain,pop:home.manpower};manageStrategicEconomy(s);
 const recruited=men(s)-before.men;assert.equal(recruited,3000);assert.equal(home.drafted,recruited);assert.equal(home.grain,before.grain);assert.equal(home.manpower,before.pop-recruited);assert.equal(home.gold,before.gold-Math.ceil(recruited/4));assert.equal(s.gold,before.player);
 const snapshot=serializeCampaign(s);manageStrategicEconomy(s);assert.equal(serializeCampaign(s),snapshot);
});
test('a persisted common AI order waits for real domestic work and never creates an army early',()=>{
 const {s,home,target}=scene(),id='ju';
 assert.equal(assignDomestic(s,home.id,'technology',id,{faction:'yuan'}),null);beginDomesticTurn(s);assert.ok(assignmentFor(s,id)?.action);
 const result=requestFactionOrder(s,'yuan',{kind:'expedition',cityId:home.id,officerIds:[id],leader:id,advisor:id,target:target.id},'after');assert.ok(result.queued);assert.equal(s.armies.length,0);assert.ok(home.units.some(u=>u.id===id));validateStrategicOrders(s);
 assert.equal(pendingOrdersMarkup(s),'','AI waits must not expose player cancel buttons');
 const copy=JSON.parse(serializeCampaign(s));let completed=false;
 for(let n=0;n<90&&!completed;n++){
  for(const state of [s,copy]){state.campaign.day++;finishDomesticDay(state);resolveStrategicOrders(state);}
  completed=s.armies.some(a=>a.units.some(u=>u.id===id));
 }
 assert.ok(completed);assert.equal(serializeCampaign(copy),serializeCampaign(s));assert.equal(s.campaign.domestic.orders.length,0);assert.ok(!assignmentFor(s,id));
});
test('local plan reservation lets current work finish and blocks starting another task',()=>{
 const {s,home}=scene();home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);gateDurability(home).hp=1000000;gateDurability(city(s,'town-5')).hp=0;assert.equal(assignDomestic(s,home.id,'technology','ju',{faction:'yuan'}),null);beginDomesticTurn(s);const action=assignmentFor(s,'ju')?.action;assert.ok(action);nearFinish(s,'ju');city(s,'town-5').units.forEach(u=>u.troops=1000);home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);gateDurability(home).hp=1000000;gateDurability(city(s,'town-5')).hp=0;city(s,'town-5').commerce=10;planStrategicAI(s);
 const p=s.campaign.ai.plans[0];assert.ok(p);assert.ok(plannedOfficer(s,'ju'));assert.equal(s.armies.length,0);const original=action.id;
 s.campaign.day+=10;s.turn=Math.floor((s.campaign.day-1)/10)+1;beginDomesticTurn(s);assert.equal(assignmentFor(s,'ju').action.id,original);assert.equal(p.id,s.campaign.ai.plans[0].id);assert.ok(plannedGrain(s,home.id)>0);
});
test('plans survive small value changes but cancel on lost staging city and release commitments',()=>{
 const {s,home,target}=scene();assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);planStrategicAI(s);const p=s.campaign.ai.plans[0];assert.ok(p);
 target.commerce++;next(s);assert.equal(s.campaign.ai.plans[0].id,p.id);assert.notEqual(p.phase,'cancelled');home.owner='cao';next(s);
 assert.equal(p.phase,'cancelled');assert.equal(plannedGrain(s,home.id),0);assert.ok(p.officerIds.every(id=>!plannedOfficer(s,id)));
});
test('AI actively transports grain through shared personnel movement without materializing it at destination',()=>{
 const {s,home,target,rear}=scene();home.grain=400;target.units.forEach(u=>u.troops=12000);rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=0;
 const id='person-533';s.campaign.idle.push({unit:{...makeOfficer(id,0,0,1),homeCity:rear.id},faction:'yuan',location:rear.id});const before=rear.grain;planStrategicAI(s);
 const courier=s.campaign.idle.find(o=>o.unit.id===id);assert.equal(courier.destination,home.id);assert.ok(courier.cargo.grain>0);assert.equal(home.grain,400);assert.equal(rear.grain+courier.cargo.grain,before);assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='transport'));
});
test('unsafe transport roads are rejected and no courier or grain is dispatched',()=>{
 const {s,home,rear,target}=scene();rear.owner='yuan';rear.domestic.owner='yuan';home.grain=0;const enemy=incoming(s,rear,target,6500);s.roads.push([target.id,rear.id]);
 assert.equal(safeStrategicTransportRoute(s,home.id,rear.id,'yuan'),null);
 enemy.travel=null;enemy.location=target.id;
 assert.deepEqual(safeStrategicTransportRoute(s,home.id,rear.id,'yuan'),[rear.id],'a stationary enemy does not disclose its future target');
});
test('AI save rejects duplicated commitments and old planner versions',()=>{
 const {s}=scene();planStrategicAI(s);validateStrategicAI(s);const bad=structuredClone(s);bad.campaign.ai.plans[0].officerIds.push(bad.campaign.ai.plans[0].officerIds[0]);assert.throws(()=>validateStrategicAI(bad));
 const old=structuredClone(s);old.campaign.ai.version=1;assert.throws(()=>validateStrategicAI(old));assert.equal(strategicAIMarkup(s),'');
});
test('two cities assemble for one target through real marching before the coordinated assault',()=>{
 const {s,home,target,rear}=scene();rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=0;target.units.forEach(u=>u.troops=4000);
 // Isolate military assembly from separate outbound talent and diplomacy missions.
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 for(const c of [home,rear])for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='talent')c.domestic.cooldowns[key]=10000;
 const used=new Set(s.cities.flatMap(c=>c.units.map(u=>u.id)));
 rear.units=Object.keys(OFFICER_BY_ID).filter(id=>!used.has(id)).slice(0,5).map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:rear.id}));
 city(s,'town-5').commerce=10;planStrategicAI(s);const p=s.campaign.ai.plans[0];assert.ok(p);assert.equal(p.origins.length,2);assert.equal(p.phase,'assemble');assert.ok(s.armies.every(a=>a.target===home.id));
 const ids=[...p.officerIds];assert.equal(new Set(ids).size,ids.length);assert.equal(s.campaign.ai.plans.filter(p=>!['complete','cancelled'].includes(p.phase)).length,1);
 for(let i=0;i<15&&p.phase!=='attack';i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}
 assert.equal(p.phase,'attack',p.reason);assert.ok(s.armies.filter(a=>a.faction==='yuan').every(a=>a.units.length<=10));assert.deepEqual(p.officerIds,ids);
});
test('a city short of personnel receives a real transfer, leaving the governor and defenders in place',()=>{
 const {s,home,target,rear}=scene();target.units.forEach(u=>u.troops=7000);rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=0;home.units=[];
 const candidates=['shao','yan','wen','he','ju','tian','person-533'];rear.units=[];
 s.campaign.idle=candidates.map(id=>({unit:{...makeOfficer(id,0,0,3),homeCity:rear.id},faction:'yuan',location:rear.id}));rear.governor='shao';
 planStrategicAI(s);const traveler=s.campaign.idle.find(o=>o.destination===home.id);assert.ok(traveler);assert.notEqual(traveler.unit.id,'shao');assert.equal(traveler.location,rear.id);assert.equal(home.units.length,0);assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='transfer'));
});
test('waiting transport earmarks cargo without a debit and replenishment preserves plan food',()=>{
 const {s,home,target,rear}=scene();home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);gateDurability(home).hp=1000000;gateDurability(city(s,'town-5')).hp=0;home.governor='shao';assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);nearFinish(s,'ju');city(s,'town-5').units.forEach(u=>u.troops=1000);home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);gateDurability(home).hp=1000000;gateDurability(city(s,'town-5')).hp=0;city(s,'town-5').commerce=10;planStrategicAI(s);const reserved=plannedGrain(s,home.id);assert.ok(reserved);
 home.grain=reserved;home.units.forEach(u=>u.troops=1000);manageStrategicEconomy(s);assert.equal(home.grain,reserved);
 // Common queued cargo does not debit until actual departure.
 rear.owner='yuan';rear.domestic.owner='yuan';const id='ju',before=home.grain;
 const result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:[id],target:rear.id,cargo:{grain:300,manpower:100}},'after');assert.ok(result.queued);assert.equal(home.grain,before);assert.equal(s.campaign.domestic.orders.at(-1).cargo.grain,300);
});
test('captured objective stays in consolidation until guard and food conditions recover',()=>{
 const {s,target}=scene();planStrategicAI(s);const p=s.campaign.ai.plans[0];target.owner='yuan';target.domestic.owner='yuan';target.grain=0;next(s);assert.equal(p.phase,'consolidate');
 for(let i=0;i<4;i++)next(s);assert.equal(p.phase,'consolidate');target.grain=20000;next(s);assert.equal(p.phase,'complete');assert.equal(plannedGrain(s,target.id),0);
 assert.ok(!Object.hasOwn(s.campaign.ai.factions.yuan,'nextOffensiveDay'));
});
test('cancelling an assault before its first movement actually clears the outgoing route',()=>{
 const {s,target}=scene();planStrategicAI(s);const p=s.campaign.ai.plans[0],a=s.armies.find(a=>a.faction==='yuan');assert.ok(a?.route.length);assert.equal(a.travel,null);
 gateDurability(target).hp=1000000;next(s);assert.equal(p.phase,'cancelled');assert.equal(a.route.length,0);assert.equal(a.target,null);
});
test('queued safe transport rechecks threats before dispatch and retains undebited cargo on cancellation',()=>{
 const {s,home,target,rear}=scene();home.governor='shao';rear.owner='yuan';rear.domestic.owner='yuan';assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);assert.ok(assignmentFor(s,'ju').action);
 const before=home.grain,result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:['ju'],target:rear.id,cargo:{grain:300,manpower:0},safeOnly:true},'after');assert.ok(result.queued);
 incoming(s,rear,target,1000);s.roads.push([target.id,rear.id]);resolveStrategicOrders(s);
 assert.equal(s.campaign.domestic.orders.length,0);assert.equal(home.grain,before);assert.ok(home.units.some(u=>u.id==='ju'));assert.ok(assignmentFor(s,'ju').action);
});
test('travel estimates charge each road separately, matching lost movement at city arrivals',()=>{
 const {s,home,target,rear}=scene(),a=cityForce(home);const direct=strategicTravelDays(s,a,[target.id]);assert.equal(strategicTravelDays(s,a,[target.id,home.id,rear.id]),direct*3);
});
test('departure checks real presence before considering work or interruption history',()=>{
 const {s,home,rear}=scene();rear.owner='yuan';rear.domestic.owner='yuan';home.governor='shao';
 assert.equal(expeditionTiming(s,home.id,['ju']).choice,'now');
 assert.ok(requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:['ju'],target:rear.id,cargo:{grain:0,manpower:0}},'now').applied);
 const before=serializeCampaign(s),timing=expeditionTiming(s,home.id,['ju']);assert.equal(timing.choice,null);assert.match(timing.error,/实际驻扎/);assert.equal(serializeCampaign(s),before);
});
test('ordinary ready offensives interrupt lengthy work through the real command and record the loss',()=>{
 const {s,home}=scene();home.units.forEach(u=>u.troops=u.id==='ju'?3000:500);gateDurability(home).hp=1000000;gateDurability(city(s,'town-5')).hp=0;assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);
 const action=assignmentFor(s,'ju').action;assert.ok(action.remaining>2);assert.equal(expeditionTiming(s,home.id,['ju']).choice,'now');
 city(s,'town-5').commerce=10;planStrategicAI(s);assert.ok(s.armies.some(a=>a.faction==='yuan'&&a.units.some(u=>u.id==='ju')));assert.equal(assignmentFor(s,'ju'),undefined);
 assert.ok(s.campaign.domestic.workHistory.ju.some(h=>h.actionId===action.id&&h.status==='interrupted'));
});
test('recent real interruption protects the next task across reload except when rescue would be missed',()=>{
 const {s,home}=scene();home.governor='shao';assignDomestic(s,home.id,'commerce','ju',{faction:'yuan'});beginDomesticTurn(s);assert.ok(assignmentFor(s,'ju').action);
 cancelDomestic(s,'ju','中止后重新安排');assignDomestic(s,home.id,'commerce','ju',{faction:'yuan'});beginDomesticTurn(s);assert.ok(assignmentFor(s,'ju').action);
 const before=serializeCampaign(s),timing=expeditionTiming(s,home.id,['ju']);assert.equal(timing.choice,'after');assert.match(timing.reason,/近一旬/);
 assert.deepEqual(expeditionTiming(JSON.parse(before),home.id,['ju']),timing);assert.equal(serializeCampaign(s),before);
 assert.equal(expeditionTiming(s,home.id,['ju'],{arrivalDeadline:s.campaign.day+2,travelDays:1}).choice,'now');
 assert.equal(expeditionTiming(s,home.id,['ju'],{arrivalDeadline:s.campaign.day+30,travelDays:1}).choice,'after');
});
test('an expensive real construction near completion is protected even with more than two days left',()=>{
 const {s,home}=scene();home.workshop=0;home.gold=50000;
 // Isolate the real construction being measured from other lawful workers
 // competing for the single city construction slot under faction priorities.
 for(const [key,def] of Object.entries(ACTIONS))if((def.direction==='technology'||['build','repair'].includes(def.kind))&&key!=='build_workshop')home.domestic.cooldowns[key]=10000;
 assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);const action=assignmentFor(s,'ju').action;assert.equal(action.key,'build_workshop');assert.ok(action.cost>=500);
 while(action.remaining>6){s.campaign.day++;finishDomesticDay(s);}
 assert.ok(action.remaining>2);const timing=expeditionTiming(s,home.id,['ju']);assert.equal(timing.choice,'after');assert.match(timing.reason,/高投入/);
});
test('both national scenarios continue real plans, movements and battles deterministically after reload',()=>{
 for(const id of ['guandu-200','heroes-251']){
  const s=newCampaign(643,id);beginExecution(s);
  for(let i=0;s.campaign.day<5&&i<30;i++){advanceCampaignDay(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);}
  const copy=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(copy.campaign.ai,s.campaign.ai);assert.equal(s.campaign.ai.lastPlanDay,s.campaign.day-1,'the real world is reviewed daily even when no affordable offensive is available');
  for(let i=0;i<3;i++)for(const state of [s,copy]){advanceCampaignDay(state);for(const b of activeBattles(state).filter(b=>b.awaiting))chooseEncounter(state,b.id,false);}
  assert.equal(serializeCampaign(copy),serializeCampaign(s));
 }
});

test('offensive composition leaves busy officers working when idle troops suffice',()=>{
 const {s,home}=scene();assignDomestic(s,home.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);
 const action=assignmentFor(s,'ju').action;assert.ok(action);
 planStrategicAI(s);assert.equal(s.campaign.ai.plans[0].phase,'attack');assert.ok(!s.campaign.ai.plans[0].officerIds.includes('ju'));
 assert.strictEqual(assignmentFor(s,'ju').action,action);assert.ok(!s.campaign.domestic.workHistory.ju?.some(h=>h.status==='interrupted'));
});

test('a staging city with an existing defense shortfall cannot reserve an impossible offensive',()=>{
 const {s,home,target,rear}=scene();rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=0;
 rear.units=home.units;rear.units.forEach(u=>u.homeCity=rear.id);home.units=[];
 // Rear troops could beat the target, but all would be committed to attacking;
 // the staging city has no separate troops to meet its visible border threat.
 planStrategicAI(s);
 assert.equal(s.campaign.ai.plans.filter(p=>p.staging===home.id&&!['cancelled','complete'].includes(p.phase)).length,0);
 assert.equal(s.armies.filter(a=>a.faction==='yuan').length,0);
});

test('deferred AI departure rechecks the home guard when the original work finishes',()=>{
 const {s,home,target,rear}=scene();home.governor='shao';rear.owner='yuan';rear.domestic.owner='yuan';gateDurability(rear).hp=0;
 const ids=home.units.slice(0,4).map(u=>u.id);assignDomestic(s,home.id,'commerce',ids[0],{faction:'yuan'});beginDomesticTurn(s);
 const result=requestFactionOrder(s,'yuan',{kind:'expedition',cityId:home.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:rear.id},'after');assert.ok(result.queued);
 incoming(s,home,target,5000);
 for(let i=0;i<90&&s.campaign.domestic.orders.length;i++){s.campaign.day++;s.turn=Math.floor((s.campaign.day-1)/10)+1;finishDomesticDay(s);resolveStrategicOrders(s);}
 assert.equal(s.armies.filter(a=>a.faction==='yuan').length,0);
 assert.equal(s.campaign.domestic.orders.length,0);
 assert.ok(ids.every(id=>home.units.some(u=>u.id===id)));
});
