import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,chooseEncounter,activeBattles,calendar,orderCampaignArmy,takeOverBattle,viewCampaignMap,readDailySnapshot,serializeCampaign,validateCampaign,commissionProject,relieveCity,appointGovernor,createCampaignArmy,transferOfficer,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,supplyConnection,armyPosition,CAMPAIGN,canEditArmy} from '../strategic-campaign.mjs';
import {lockDeployment,configureUnitTactics,deployUnit,activeUnits,armyTroops,battleWounded} from '../engine.mjs';
import {recoverableWounded} from '../tactics.mjs';
import {visibleStatuses} from '../status-display.mjs';
const resume=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function runTo(s,day,{auto=true,planning=true}={}){
  for(let guard=0;s.campaign.day<day&&guard<2000;guard++){
    if(s.campaign.phase==='planning'){if(!planning)break;beginExecution(s);}
    const result=advanceCampaignDay(s);
    if(result.encounter){if(!auto)break;for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);}
    if(result.deployment||s.finished)break;
  }return s;
}
function encounter(){const s=newCampaign();beginExecution(s);runTo(s,10,{auto:false});assert.ok(activeBattles(s).some(r=>r.awaiting));return s;}

test('campaign begins in day-one planning with cities, homes and at most ten units',()=>{
  const s=newCampaign();assert.deepEqual(calendar(s),{day:1,turn:1,dayInTurn:1});assert.equal(s.campaign.phase,'planning');assert.equal(s.armies.length,4);assert.ok(s.armies.every(a=>a.units.length<=10&&a.units.every(u=>u.homeCity)));assert.ok(s.campaign.idle.length>=4);resume(s);
});
test('ten days advance exactly one strategic turn; planning cannot advance combat or income',()=>{
  const s=newCampaign();const initial=serializeCampaign(s);advanceCampaignDay(s);assert.equal(serializeCampaign(s),initial);
  beginExecution(s);runTo(s,11,{planning:false});assert.equal(s.campaign.day,11);assert.equal(s.turn,2);assert.equal(s.campaign.phase,'planning');assert.equal(s.campaign.turnReports.length,1);
  const saved=serializeCampaign(s);advanceCampaignStep(s);assert.equal(serializeCampaign(s),saved);resume(s);
});
test('armies move visibly along road interiors before arriving',()=>{
  const s=newCampaign(),a=s.armies[0];assert.equal(orderCampaignArmy(s,a.id,'guandu'),null);const initial=armyPosition(s,a);beginExecution(s);advanceCampaignDay(s);
  assert.ok(a.travel&&a.travel.progress>0);assert.notDeepEqual(armyPosition(s,a),initial);assert.equal(a.location,'xuchang');resume(s);
});
test('head-on marching armies meet on the road without passing through each other',()=>{
  const s=newCampaign();s.armies=s.armies.filter(a=>['a1','a2'].includes(a.id));const foe=s.armies[1];foe.location='guandu';foe.route=['xuchang'];foe.target='xuchang';orderCampaignArmy(s,'a1','guandu');beginExecution(s);runTo(s,10,{auto:false});
  const r=activeBattles(s)[0];assert.equal(r.kind,'field');assert.equal(r.armyIds.length,2);const [a,b]=s.armies;assert.ok(Math.abs(armyPosition(s,a).x-armyPosition(s,b).x)<.01);assert.ok(Math.abs(armyPosition(s,a).y-armyPosition(s,b).y)<.01);resume(s);
});
test('delegating locks deployment; takeover does not rewind date, RNG, casualties or cooldowns',()=>{
  const s=encounter(),r=activeBattles(s)[0];chooseEncounter(s,r.id,false);runTo(s,s.campaign.day+3);const before=JSON.stringify(r.battle),day=s.campaign.day;
  assert.equal(takeOverBattle(s,r.id),null);assert.equal(JSON.stringify(s.battle),before);assert.equal(s.campaign.day,day);assert.ok(s.battle.deploymentLocked);
  const u=s.battle.sides[0].units[0];assert.ok(configureUnitTactics(s,u.id,u.tactics));assert.ok(deployUnit(s.battle,u.id,0,0));resume(s);
});
test('manual battle suspends at the next planning phase and resumes the same battle',()=>{
  const s=encounter(),r=activeBattles(s)[0];chooseEncounter(s,r.id,true);assert.equal(r.battle.tick,0);assert.equal(advanceCampaignStep(s).deployment,true);lockDeployment(r.battle);
  runTo(s,11,{planning:false});assert.equal(s.campaign.phase,'planning');assert.equal(s.battle,null);assert.equal(s.campaign.resumeId,r.id);const before=JSON.stringify(r.battle);
  assert.ok(takeOverBattle(s,r.id));assert.equal(beginExecution(s),null);assert.equal(s.battle.id,r.id);assert.equal(JSON.stringify(s.battle),before);resume(s);
});
test('multiple battles and their snapshots share the same global day',()=>{
  const s=newCampaign();orderCampaignArmy(s,'a1','guandu');orderCampaignArmy(s,'a3','baima');beginExecution(s);runTo(s,7);
  const battles=activeBattles(s);assert.ok(battles.length>=2);const ticks=battles.map(r=>r.battle.tick);runTo(s,8);
  for(let i=0;i<battles.length;i++){assert.equal(battles[i].battle.tick-ticks[i],CAMPAIGN.stepsPerDay);assert.equal(battles[i].snapshots.at(-1).day,8);}resume(s);
});
test('daily snapshots reconstruct full battle state and are independent readonly copies',()=>{
  const s=encounter(),r=activeBattles(s)[0];chooseEncounter(s,r.id,false);runTo(s,s.campaign.day+2);const b=readDailySnapshot(r,s.campaign.day);
  assert.deepEqual(b,r.battle);b.sides[0].units[0].hp=1;assert.notEqual(r.battle.sides[0].units[0].hp,1);assert.notEqual(readDailySnapshot(r,s.campaign.day).sides[0].units[0].hp,1);
});
test('mid-day and multi-battle saves continue deterministically without charging supply twice',()=>{
  const s=newCampaign();orderCampaignArmy(s,'a1','guandu');orderCampaignArmy(s,'a3','baima');beginExecution(s);runTo(s,8);
  advanceCampaignStep(s);advanceCampaignStep(s);const restored=resume(s);assert.equal(restored.campaign.stepInDay,2);
  runTo(s,21);runTo(restored,21);assert.deepEqual(JSON.parse(serializeCampaign(restored)),JSON.parse(serializeCampaign(s)));
});
test('troops arriving on the map reinforce an existing battle, sharing six slots',()=>{
  const s=newCampaign();beginExecution(s);runTo(s,8);const r=activeBattles(s)[0];assert.ok(r.armyIds.length>=3);assert.ok(r.battle.sides.flatMap(x=>x.units).some(u=>u.arrivalTick!==undefined));
  for(const side of [0,1])assert.ok(activeUnits(r.battle,side).length<=6);resume(s);
});
test('construction is paid once, completes at the turn boundary and reports income once',()=>{
  const s=newCampaign(),c=s.cities.find(c=>c.id==='xuchang'),gold=s.gold;assert.equal(commissionProject(s,c.id,'farm'),null);assert.equal(s.gold,gold-500);assert.ok(commissionProject(s,c.id,'commerce'));
  beginExecution(s);runTo(s,10);assert.equal(c.farm,1);runTo(s,11,{planning:false});assert.equal(c.farm,2);assert.equal(c.project,null);assert.ok(s.campaign.turnReports[0].items.some(x=>x.includes('完成开垦农田')));resume(s);
});
test('governors must stay at home; relief is limited and assigned officials cannot join armies',()=>{
  const s=newCampaign(),o=s.campaign.idle.find(o=>o.location==='xuchang');assert.equal(appointGovernor(s,'xuchang',o.unit.id),null);assert.ok(createCampaignArmy(s,'xuchang',[o.unit.id]));assert.ok(transferOfficer(s,o.unit.id,'chenliu'));
  assert.equal(relieveCity(s,'xuchang'),null);assert.ok(relieveCity(s,'xuchang'));assert.equal(s.cities.find(c=>c.id==='xuchang').order,95);resume(s);
});
test('officer transfers take real time and new armies require local idle officers and recruitment',()=>{
  const s=newCampaign(),o=s.campaign.idle.find(o=>o.location==='xuchang');assert.equal(transferOfficer(s,o.unit.id,'chenliu'),null);assert.ok(o.remainingDays>0);assert.ok(createCampaignArmy(s,'chenliu',[o.unit.id]));
  beginExecution(s);runTo(s,11);assert.equal(o.destination,null);assert.equal(o.location,'chenliu');assert.equal(o.unit.homeCity,'chenliu');
  assert.match(createCampaignArmy(s,'chenliu',[o.unit.id]),/围城/);
  const local=s.campaign.idle.find(o=>o.location==='xuchang'&&!o.destination);assert.equal(createCampaignArmy(s,'xuchang',[local.unit.id]),null);const a=s.armies.at(-1);assert.equal(a.units[0].troops,0);resume(s);
});
test('split and merge conserve supply and capacity, and enforce ten-unit maximum',()=>{
  const s=newCampaign(),a=s.armies[0],before={troops:armyTroops(a),supply:a.supply,capacity:a.supplyCapacity};assert.equal(splitCampaignArmy(s,a.id,[a.units.at(-1).id]),null);const b=s.armies.at(-1);
  assert.equal(a.supply+b.supply,before.supply);assert.equal(a.supplyCapacity+b.supplyCapacity,before.capacity);assert.equal(mergeCampaignArmies(s,a.id,b.id),null);assert.equal(armyTroops(a),before.troops);
  const fake={...structuredClone(a),id:'a99',units:[...a.units,...a.units]};s.armies.push(fake);assert.match(mergeCampaignArmies(s,a.id,fake.id),/10/);
});
test('recruitment consumes local manpower and grain and is limited across splits',()=>{
  const s=newCampaign(),a=s.armies[0],c=s.cities.find(c=>c.id===a.location),before=c.manpower;assert.equal(recruitCampaign(s,a.id),null);assert.equal(c.manpower,before-3000);assert.equal(c.drafted,3000);assert.ok(recruitCampaign(s,a.id));
  splitCampaignArmy(s,a.id,[a.units.at(-1).id]);assert.ok(recruitCampaign(s,s.armies.at(-1).id));resume(s);
});
test('supply connection is cut by hostile road occupation',()=>{
  const s=newCampaign(),a=s.armies[0];s.cities.filter(c=>c.id!=='chenliu').forEach(c=>c.grain=0);const enemy=s.armies.find(a=>a.faction==='yuan');
  assert.ok(supplyConnection(s,a));enemy.location='chenliu';enemy.travel={from:'chenliu',to:'xuchang',progress:20};assert.equal(supplyConnection(s,a),null);
});
test('five days without food disband armies and preserve officers for their return',()=>{
  const s=newCampaign();s.armies=s.armies.filter(a=>a.faction==='cao');s.cities.forEach(c=>c.grain=0);s.armies.forEach(a=>a.supply=0);const ids=s.armies.flatMap(a=>a.units.map(u=>u.id));beginExecution(s);runTo(s,6);
  assert.equal(s.armies.length,0);assert.ok(ids.every(id=>s.campaign.idle.some(o=>o.unit.id===id)));assert.ok(s.campaign.idle.filter(o=>ids.includes(o.unit.id)).every(o=>o.unit.troops===0&&o.unit.wounded===0&&o.destination));resume(s);
});
test('corrupt calendar, route, snapshot, duplicate participants and old saves are rejected',()=>{
  const s=encounter(),r=activeBattles(s)[0];chooseEncounter(s,r.id,false);runTo(s,s.campaign.day+2);
  for(const corrupt of [x=>x.campaign.day=0,x=>x.campaign.version=0,x=>x.armies[0].supply=-1,x=>x.armies[0].units[0].homeCity='nowhere',x=>x.campaign.battles[0].snapshots[0].data.seed=-1,x=>x.campaign.battles.push(structuredClone(x.campaign.battles[0]))]){const bad=JSON.parse(serializeCampaign(s));corrupt(bad);assert.throws(()=>validateCampaign(bad));}
});

test('combat desertions are never healable and dissolved officers are not duplicated in saves',()=>{
  const s=newCampaign();s.armies=s.armies.filter(a=>['a1','a2'].includes(a.id));orderCampaignArmy(s,'a1','guandu');s.armies[1].route=['xuchang'];s.armies[1].target='xuchang';beginExecution(s);runTo(s,10,{auto:false});
  const r=activeBattles(s)[0];chooseEncounter(s,r.id,false);s.cities.forEach(c=>c.grain=0);s.armies.forEach(a=>a.supply=0);
  for(let day=0;day<6;day++){
    advanceCampaignDay(s);resume(s);
    for(const u of r.battle.sides.flatMap(x=>x.units)){
      assert.equal(battleWounded(u),recoverableWounded(u));
      if(u.battleDeserted)assert.equal(battleWounded(u),Math.max(0,Math.floor((u.battleDamage-u.battleDeserted)*.35)-u.healed));
      if(u.supplyPenalty)assert.ok(visibleStatuses(r.battle,u).some(x=>x.key==='hunger'));
    }
  }
  assert.equal(s.armies.length,0);assert.ok(r.settled);assert.ok(r.report.stats.some(x=>x.escaped>0));
  assert.equal(new Set(s.campaign.idle.map(o=>o.unit.id)).size,s.campaign.idle.length);
});

test('city capture settles once and can be saved immediately within a day',()=>{
  const s=newCampaign();orderCampaignArmy(s,'a1','guandu');beginExecution(s);runTo(s,6);
  const r=s.campaign.battles.find(r=>r.cityId==='guandu');assert.ok(r);
  for(let guard=0;guard<240&&!r.settled;guard++){
    if(s.campaign.phase==='planning')beginExecution(s);
    for(const x of activeBattles(s).filter(x=>x.awaiting))chooseEncounter(s,x.id,false);
    advanceCampaignStep(s);
  }
  assert.ok(r.settled);const read=resume(s);assert.equal(read.campaign.battles.find(x=>x.id===r.id).report.reason,r.report.reason);
  const count=s.victories;advanceCampaignStep(s);assert.equal(s.victories,count);
});

test('import rejects a live battlefield on a different day from the rest of the world',()=>{
  const s=encounter(),r=activeBattles(s)[0];chooseEncounter(s,r.id,false);runTo(s,s.campaign.day+2);
  const data=JSON.parse(serializeCampaign(s));data.campaign.battles[0].startedDay--;
  assert.throws(()=>validateCampaign(data),/日期/);
});
