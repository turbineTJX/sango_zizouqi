import {gateDurability} from '../building-durability.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,dailySupply,supplyConnection,settleCityEconomy,serializeCampaign,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,dailyConsumption,roadLength} from './helpers/auto-domestic-campaign.mjs';
import {initializeStrategicAI,manageStrategicEconomy,planStrategicAI,strategicCityBudget} from '../strategic-ai.mjs';
import {cityBudget,cityGoldCommitment} from '../city-budget.mjs';
import {forecastArmySupply,cityDailyFood} from '../city-logistics.mjs';
import {cityForce} from '../city-units.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay,cityFoodReserve} from '../domestic.mjs';
import {economicStaffingError} from '../economy.mjs';
import {advancePersonnel} from '../personnel-movement.mjs';

const town=(s,id)=>s.cities.find(c=>c.id===id);
function scene(){
 const s=newCampaign(734,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.gold=6000;c.grain=12000;c.hunger=0;c.project=null;gateDurability(c).hp=0;}
 const source=town(s,'ye'),rear=town(s,'town-8'),front=town(s,'town-5'),player=town(s,'xuchang');
 for(const c of [source,rear,front]){c.owner='yuan';c.domestic.owner='yuan';}
 player.owner='cao';player.domestic.owner='cao';
 Object.assign(source,{x:0,y:0});Object.assign(rear,{x:-8,y:0});Object.assign(front,{x:8,y:0,grain:0});
 s.roads=[[source.id,front.id],[source.id,rear.id]];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:7.5};
 source.units=[{...makeOfficer('shao',1000,0,3),homeCity:source.id}];
 initializeVision(s);initializeStrategicAI(s);
 for(const p of Object.values(s.campaign.ai.factions))p.lastReviewTurn=s.turn;
 for(const p of Object.values(s.campaign.diplomacy.policies))p.feeBudget=0;
 return {s,source,rear,front,player};
}
function field(s,source,front,id,men=4000,supply=900){
 const u={...makeOfficer(id,men,0,3),homeCity:source.id};
 const a={...cityForce(source),id:'a'+s.nextId++,units:[u],leader:id,advisor:id,location:front.id,homeCity:source.id,faction:'yuan',route:[],travel:null,target:null,supply,supplyCapacity:900,hunger:0,stationary:true};
 delete a.cityForce;s.armies.push(a);return a;
}
const totalMen=s=>s.cities.reduce((n,c)=>n+c.manpower+c.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.armies.reduce((n,a)=>n+a.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded+(o.cargo?.manpower||0),0);

test('city budget counts the actual grain-line source and fills before daily consumption',()=>{
 const {s,source,rear,front}=scene();source.units=[];rear.grain=0;field(s,source,front,'yan',4000,900);
 const before=serializeCampaign(s),b=cityBudget(s,source),other=cityBudget(s,rear);
 assert.equal(b.costs.grain,9*40);assert.equal(other.costs.grain,0);assert.equal(serializeCampaign(s),before);
 const stock=source.grain;for(let i=0;i<10;i++)dailySupply(s);
 assert.equal(stock-source.grain,b.costs.grain);assert.equal(s.armies[0].hunger,0);
});
test('multiple armies share depot and road budgets in forecasts and actual settlement',()=>{
 for(const granary of [0,2]){
  const {s,source,rear,front}=scene();source.units=[];rear.grain=0;source.granary=granary;
  for(const id of ['yan','wen','he'])field(s,source,front,id,4000,500);
  const f=forecastArmySupply(s),stock=source.grain;
  assert.ok(f.cities[source.id].daily.every(n=>n<=Math.min(360,240+120*granary)));
  for(let i=0;i<10;i++)dailySupply(s);
  assert.equal(stock-source.grain,f.cities[source.id].grain);assert.ok(s.armies.every(a=>a.hunger===0));
 }
});
test('road capacity shortages remain visible even with a full city warehouse',()=>{
 const {s,source,rear,front}=scene();source.units=[];rear.grain=0;source.granary=0;
 for(const id of ['yan','wen','he','ju'])field(s,source,front,id,6500,50);
 const f=forecastArmySupply(s,{days:20});assert.ok(f.armies.some(x=>x.firstShortDay!==null&&x.unfed>0));
 assert.ok(f.cities[source.id].grain<=240*20);assert.equal(source.grain,12000);
});
test('AI reserves food for externally supplied armies before recruiting local soldiers',()=>{
 const {s,source,rear,front}=scene();rear.grain=0;source.grain=4000;
 for(const id of ['yan','wen','he','ju'])field(s,source,front,id,6000,900);
 assert.equal(cityDailyFood(s,source),250);assert.ok(cityFoodReserve(s,source,20)>4000);
 const plain=structuredClone(s);plain.armies=[];plain.campaign.ai.lastEconomyTurn=0;
 const before={gold:source.gold,men:source.units[0].troops};manageStrategicEconomy(s);
 assert.equal(source.gold,before.gold);assert.equal(source.units[0].troops,before.men);
 manageStrategicEconomy(plain);assert.ok(town(plain,source.id).units[0].troops>before.men);
});
test('AI preserves a bound deferred payment before paying for troops',()=>{
 const {s,source}=scene();source.gold=3500;source.grain=20000;
 s.campaign.diplomacy.contracts.push({status:'signed',sites:{yuan:source.id},clauses:[{id:1,kind:'gold',deferred:true,from:'yuan',status:'waiting',dueDay:5,amount:3000,delivered:0}],escrow:[]});
 assert.equal(cityGoldCommitment(s,source).total,3500);manageStrategicEconomy(s);
 assert.equal(source.gold,3500);assert.equal(source.units[0].troops,1000);
});
test('AI sends real local gold and food cargo while preserving the donor budget',()=>{
 const {s,source,rear,player}=scene();source.gold=0;source.grain=800;rear.grain=10000;
 const u={...makeOfficer('tian',0,0,3),homeCity:rear.id};s.campaign.idle.push({unit:u,faction:'yuan',location:rear.id,destination:null,remainingDays:0});
 const old={gold:rear.gold,grain:rear.grain,player:player.gold};planStrategicAI(s);
 const courier=s.campaign.idle.find(o=>o.unit.id===u.id);assert.equal(courier.destination,source.id);assert.ok(courier.cargo.gold>0&&courier.cargo.grain>0);
 assert.equal(source.gold,0);assert.equal(source.grain,800);assert.equal(rear.gold+courier.cargo.gold,old.gold);assert.equal(rear.grain+courier.cargo.grain,old.grain);assert.equal(player.gold,old.player);
 assert.ok(rear.gold>=strategicCityBudget(s,rear).goldNeed);assert.ok(rear.grain>=strategicCityBudget(s,rear).grainNeed);
 for(let i=0;i<20&&courier.destination;i++)advancePersonnel(s,courier);
 assert.equal(courier.destination,null);assert.ok(source.gold>0&&source.grain>800);
});
test('voluntary orders retain the last necessary resident food or cash worker',()=>{
 const {s,source}=scene();source.units.push({...makeOfficer('ju',1000,1,3),homeCity:source.id});source.farm=0;source.gold=0;
 assert.equal(assignDomestic(s,source.id,'agriculture','shao',{faction:'yuan'}),null);
 assert.equal(assignDomestic(s,source.id,'commerce','ju',{faction:'yuan'}),null);
 assert.match(economicStaffingError(s,source,['shao']),/农业/);assert.match(economicStaffingError(s,source,['ju']),/商业/);
 const u={...makeOfficer('tian',0,0,3),homeCity:source.id};s.campaign.idle.push({unit:u,faction:'yuan',location:source.id,destination:null,remainingDays:0});
 assert.equal(assignDomestic(s,source.id,'agriculture',u.id,{faction:'yuan'}),null);assert.equal(economicStaffingError(s,source,['shao']),null);
});
test('a penniless AI city reuses a waiting optional worker for real cash production',()=>{
 const {s,source}=scene();source.units.push({...makeOfficer('ju',1000,1,3),homeCity:source.id});source.gold=0;source.grain=20000;
 assignDomestic(s,source.id,'agriculture','shao',{faction:'yuan'});assignDomestic(s,source.id,'technology','ju',{faction:'yuan'});beginDomesticTurn(s);
 assert.equal(assignmentFor(s,'ju').direction,'commerce');assert.equal(assignmentFor(s,'ju').action.key,'fair');assert.equal(source.gold,0);
});
test('an army with a drying warehouse starts returning before it becomes hungry',()=>{
 const {s,source,rear,front}=scene();source.units=[];rear.grain=0;source.grain=0;front.grain=0;
 rear.grain=5000;rear.granary=0;s.roadSegments[[source.id,front.id].sort().join(':')]={distance:120};s.roadSegments[[source.id,rear.id].sort().join(':')]={distance:120};
 const a=field(s,source,front,'yan',6000,400);a.stationary=false;front.owner='neutral';front.domestic.owner='neutral';initializeVision(s);
 assert.equal(supplyConnection(s,a),null);assert.equal(a.hunger,0);const before={grain:rear.grain,supply:a.supply,troops:a.units[0].troops};planStrategicAI(s);
 assert.equal(a.task,'回城补给');assert.equal(a.target,rear.id);assert.ok(a.route.length);assert.equal(a.hunger,0);
 assert.equal(rear.grain,before.grain);assert.equal(a.supply,before.supply);assert.equal(a.units[0].troops,before.troops);
});
test('a quiet city can return unsupported soldiers to reserves without losing men or gaining money',()=>{
 const {s,source,rear,front}=scene();source.units.push({...makeOfficer('ju',1000,1,3),homeCity:source.id});source.grain=15;rear.grain=0;front.grain=0;
 const before={men:totalMen(s),gold:source.gold,grain:source.grain,manpower:source.manpower};planStrategicAI(s);
 assert.equal(source.units.length,0);assert.equal(source.manpower,before.manpower+2000);assert.equal(totalMen(s),before.men);assert.equal(source.gold,before.gold);assert.equal(source.grain,before.grain);
 assert.ok(s.campaign.ai.decisions.some(d=>d.kind==='recover'&&/预备兵/.test(d.reason)));
});
test('timely real grain cargo prevents unnecessary demobilization without crediting it early',()=>{
 const {s,source,rear}=scene();source.units[0].troops=3000;source.grain=45;rear.grain=12000;
 const u={...makeOfficer('tian',0,0,3),homeCity:rear.id};s.campaign.idle.push({unit:u,faction:'yuan',location:rear.id,destination:null,remainingDays:0});planStrategicAI(s);
 assert.equal(source.units[0].troops,3000);assert.equal(source.grain,45);assert.ok(s.campaign.idle.some(o=>o.destination===source.id&&o.cargo.grain>0));
});
test('a player road blockade still consumes carried grain and causes actual starvation losses',()=>{
 const {s,source,rear,front}=scene();source.units=[];rear.grain=0;const a=field(s,source,front,'yan',4000,80);
 const blocker={...cityForce(town(s,'xuchang')),id:'a'+s.nextId++,faction:'cao',units:[{...makeOfficer('cao',4000,0,3),homeCity:'xuchang'}],location:source.id,travel:{from:source.id,to:front.id,road:'main',progress:1},route:[front.id],supply:900,supplyCapacity:900};delete blocker.cityForce;s.armies.push(blocker);initializeVision(s);
 assert.equal(supplyConnection(s,a),null);const before=source.grain;
 for(let i=0;i<5;i++)dailySupply(s);
 assert.equal(a.supplyIn,0);assert.equal(a.supply,0);assert.ok(a.hunger>=3);assert.ok(a.units[0].troops<4000);assert.equal(source.grain,before);
});
test('a funded army forecast does not spend harvest income before its actual settlement day',()=>{
 const {s,source,rear,front}=scene();source.units=[];source.grain=900;source.granary=0;rear.grain=0;
 field(s,source,front,'yan',6000,0);
 const f=forecastArmySupply(s,{days:10,funded:true});
 assert.ok(f.cities[source.id].grain<=900);assert.ok(f.cities[source.id].stock>0,'the end-of-day harvest may remain in the forecast depot');
 assert.equal(source.grain,900);
});
test('a quiet AI city operates for twelve real economic cycles without exhausting food or working capital',()=>{
 const {s,source,rear,front}=scene();for(const c of [rear,front]){c.owner='neutral';c.domestic.owner='neutral';}
 source.gold=2000;source.grain=6000;source.units[0].troops=2500;
 for(const id of ['ju','tian'])s.campaign.idle.push({unit:{...makeOfficer(id,0,0,3),homeCity:source.id},faction:'yuan',location:source.id,destination:null,remainingDays:0});
 const samples=[];
 for(let day=1;day<=120;day++){
  s.campaign.day=day;s.turn=Math.floor((day-1)/10)+1;
  // Isolate peaceful economic operation, while using real work, fees, drafts,
  // daily consumption and settlement. No stock top-ups or prescribed outcomes.
  for(const p of Object.values(s.campaign.ai.factions))p.lastReviewTurn=s.turn;
  if((day-1)%10===0){manageStrategicEconomy(s);beginDomesticTurn(s);}
  planStrategicAI(s);dailySupply(s);finishDomesticDay(s);
  if(day%10===0)settleCityEconomy(s,source);
  samples.push({gold:source.gold,grain:source.grain,hunger:source.hunger});
 }
 assert.ok(samples.every(x=>x.hunger===0&&x.gold>=source.budget.goldReserve&&x.grain>0));
 assert.ok(source.units.some(u=>u.troops>=2500),'sustainability is not obtained by removing the entire army');
 assert.ok(s.campaign.domestic.events.some(e=>e.phase==='complete'));assert.ok(source.farm>1||source.commerce>1,'real production infrastructure improves');
});
test('a real AI siege can order physical withdrawal before a cut grain line causes hunger',()=>{
 const {s,source,rear,front}=scene();rear.grain=0;front.owner='cao';front.domestic.owner='cao';gateDurability(front).hp=15000;
 front.units=[{...makeOfficer('cao',3000,0,3),homeCity:front.id}];initializeVision(s);
 assert.equal(launchExpedition(s,{cityId:source.id,officerIds:['shao'],leader:'shao',advisor:'shao',target:front.id,policy:'auto'},{faction:'yuan'}),null);
 beginExecution(s);for(let i=0;i<5&&!activeBattles(s).length;i++)advanceCampaignDay(s);
 const battle=activeBattles(s).find(b=>b.cityId===front.id);assert.ok(battle);assert.equal(battle.kind,'siege');
 if(battle.awaiting)chooseEncounter(s,battle.id,false);
 const a=s.armies.find(a=>a.faction==='yuan');assert.ok(a);a.supply=dailyConsumption(s,a);a.hunger=0;
 const blocker={...cityForce(front),id:'a'+s.nextId++,units:[{...makeOfficer('dun',3000,0,3),homeCity:front.id}],location:front.id,faction:'cao',travel:{from:front.id,to:source.id,road:'main',progress:roadLength(s,front.id,source.id)/2},route:[source.id],supply:900,supplyCapacity:900};delete blocker.cityForce;s.armies.push(blocker);initializeVision(s);
 assert.equal(supplyConnection(s,a),null);const before={supply:a.supply,men:a.units[0].troops};s.campaign.ai.lastPlanDay=0;planStrategicAI(s);
 assert.equal(a.hunger,0);assert.equal(battle.battle.sides[battle.attackSide].retreat,true);
 assert.equal(a.supply,before.supply);assert.equal(a.units[0].troops,before.men);
 assert.equal(a.location,front.id);assert.ok(s.armies.includes(a),'the order does not teleport or delete the army');
});
