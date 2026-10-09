import {pendingArmyAppointments,confirmPostbattleAppointments} from '../postbattle-appointments.mjs';
import {appointBattleRoles} from '../battle-appointments.mjs';
import {issueCommand,openReinforcementCouncil,confirmReinforcementCouncil} from '../engine.mjs';
import {officerStratagems} from '../stratagems.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {makeOfficer,lockDeployment,stepBattle,planBattleCouncilAI,deployUnit,validateSave,battleCommanders} from '../engine.mjs';
import {armyRoleScore,appointArmyRoles,recommendArmyAppointments,settleArmyAppointments} from '../army-appointments.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {fateRoll} from '../officer-fates.mjs';
import {canOccupy} from '../battlefield.mjs';

function encounter(){
 const s=newCampaign(1);fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});
 beginExecution(s);for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
 const r=activeBattles(s)[0];assert.ok(r);assert.equal(chooseEncounter(s,r.id,true),null);lockDeployment(r.battle);
 return {s,r,b:r.battle,a:s.armies.find(a=>a.id===r.armyIds.find(id=>s.armies.find(a=>a.id===id)?.faction==='cao'))};
}
function defeat(u){u.battleDamage+=u.hp;u.hp=0;u.status='defeated';u.cast=null;}
function quiet(b){for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}}

test('only two army appointments remain in constructors, editor, attribute rules and current saves',()=>{
 const d=defaultCustomBattle(),s=generateBattle(d);
 assert.ok(s.armies.every(a=>!Object.hasOwn(a,'deputy')));
 assert.ok(s.battle.sides.flatMap(s=>s.units).every(u=>!Object.hasOwn(u,'deputyBonus')));
 const unit=s.battle.sides[0].units[0];assert.deepEqual(unitAttributes({...unit,deputyBonus:1},s.battle),unitAttributes(unit,s.battle));
 const bad=structuredClone(d);bad.ownTeamRoles={leader:d.ownTeam[0].id,advisor:d.ownTeam[0].id,deputy:null};assert.throws(()=>validateCustomBattle(bad),/只支持/);
 const old=structuredClone(s);old.rulesVersion--;assert.throws(()=>validateSave(old),/重新开始/);
 const forged=structuredClone(s);forged.armies[0].deputy=forged.armies[0].leader;assert.throws(()=>validateSave(forged),/副将/);
 const bonus=structuredClone(s);bonus.battle.sides[0].units[0].deputyBonus=.1;assert.throws(()=>validateSave(bonus),/副将/);
});

test('human and AI appointment selection share scores, local candidates and atomic execution',()=>{
 const army={id:'a1',units:[makeOfficer('cao',0),makeOfficer('liao',3000),makeOfficer('jia',3000)],leader:'cao',advisor:'jia'};
 for(const role of ['leader','advisor'])for(const u of army.units)assert.equal(armyRoleScore(u,role),officerRecommendation({},u,{task:'role',role}).score);
 const roles=recommendArmyAppointments(army);assert.deepEqual(roles,{leader:'liao',advisor:'jia'});
 const human=structuredClone(army),ai=structuredClone(army);assert.equal(appointArmyRoles(human,roles),null);settleArmyAppointments(ai);assert.deepEqual(human,ai);
 const before=structuredClone(ai);assert.ok(appointArmyRoles(ai,{leader:'shao',advisor:'jia'}));assert.deepEqual(ai,before);
 assert.ok(appointArmyRoles(ai,{...roles,deputy:'liao'}));assert.deepEqual(ai,before);
 const empty={id:'a2',units:[makeOfficer('cao',0)],leader:'cao',advisor:'cao'};settleArmyAppointments(empty);assert.equal(empty.leader,null);assert.equal(empty.advisor,null);
});

test('prebattle AI uses legal placement and the same deployment operation on both sides',()=>{
 for(const side of [0,1]){
  const s=generateBattle({...defaultCustomBattle(),terrain:'river'}),b=s.battle,seed=b.seed,learning=b.sides[side].units.map(u=>[u.id,structuredClone(u.tactics)]);
  planBattleCouncilAI(b,side);const army=b.sides[side];assert.equal(army.battleIntent,'annihilate');
  const occupied=new Set();for(const u of army.units.filter(u=>u.status==='active')){
   assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(u.x>=(side?9:0)&&u.x<=(side?13:4));assert.ok(!occupied.has(`${u.x},${u.y}`));occupied.add(`${u.x},${u.y}`);
   assert.equal(deployUnit(b,u.id,u.x,u.y,side),null);assert.match(deployUnit(b,u.id,side?4:9,u.y,side),/本方布阵区/);
  }
  assert.equal(b.seed,seed);assert.deepEqual(army.units.map(u=>[u.id,u.tactics]),learning);validateSave(s);
 }
 for(const [kind,side,intent] of [['siege',0,'siege'],['defense',0,'hold'],['siege',1,'hold'],['defense',1,'siege']]){
  const b=generateBattle({...defaultCustomBattle(),battleKind:kind}).battle;planBattleCouncilAI(b,side);assert.equal(b.sides[side].battleIntent,intent);
 }
});

test('reinforcement AI keeps positions, action array, intention, retreats, cooldowns and unarrived units',()=>{
 for(const side of [0,1]){
  const d=defaultCustomBattle();d.reinforcements=[{side,name:'真实援军',tick:5,team:[{id:'person-255',type:'spear',troops:3000,level:5}],roles:{leader:'person-255',advisor:'person-255'}}];
  const s=generateBattle(d),b=s.battle;lockDeployment(b);const own=b.sides[side],fronts=structuredClone(own.units.filter(u=>u.status==='active')),order=own.units.map(u=>u.id),future=own.units.find(u=>u.reinforcementIndex===0);
  b.commandProgress=700;b.commandReady.shield=44;const intent=own.battleIntent;
  planBattleCouncilAI(b,side);assert.equal(future.status,'reserve');assert.deepEqual(own.units.filter(u=>u.status==='active'),fronts);
  b.tick=5;future.arrivalConfirmed=true;const active=own.units.find(u=>u.status==='active');defeat(active);
  const survivors=structuredClone(own.units.filter(u=>u.status==='active'));
  planBattleCouncilAI(b,side);assert.ok(own.units.filter(u=>u.status==='active').length<=7);assert.deepEqual(own.units.map(u=>u.id),order);
  for(const u of survivors)assert.deepEqual(own.units.find(v=>v.id===u.id),u);
  assert.equal(own.battleIntent,intent);assert.equal(b.commandProgress,700);assert.equal(b.commandReady.shield,44);
 }
});

test('a withdrawing commander leaves a vacancy until real battle settlement and save reload does not appoint early',()=>{
 const {s,r,b,a}=encounter(),leader=a.leader,u=b.sides[0].units.find(u=>u.id===leader);quiet(b);
 Object.assign(u,{x:0,y:0,retreatAt:u.hp});advanceCampaignStep(s);
 assert.equal(u.status,'withdrawn');assert.equal(r.settled,false);assert.equal(a.leader,null);
 assert.ok(!battleCommanders(b).some(c=>c.id===leader));assert.ok(b.sides[0].commanders.some(c=>c.id===leader&&c.role==='leader'));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(restored.armies.find(v=>v.id===a.id).leader,null);
 for(const state of [s,restored]){const battle=state.campaign.battles.find(v=>v.id===r.id);battle.battle.sides[1].units.forEach(defeat);advanceCampaignStep(state);}
 assert.equal(r.settled,true);assert.equal(a.leader,null);assert.ok(pendingArmyAppointments(s).some(p=>p.armyId===a.id));
 assert.equal(advanceCampaignStep(s).appointments,true);validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,restored]){const army=state.armies.find(v=>v.id===a.id);assert.equal(confirmPostbattleAppointments(state,army.id,recommendArmyAppointments(army)),null);}
 assert.ok(a.units.some(v=>v.id===a.leader&&v.troops>0));assert.notEqual(a.leader,leader);
  assert.ok(r.report.appointments.some(change=>change.armyId===a.id&&change.role==='leader'&&change.from===leader&&change.to===a.leader));
 const forged=JSON.parse(serializeCampaign(s));forged.campaign.battles.find(v=>v.id===r.id).report.appointments[0].to='shao';assert.throws(()=>validateCampaign(forged),/战后任命/);
 assert.equal(serializeCampaign(s),serializeCampaign(restored));validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('defeated leaders are replaced only after actual death or escape settlement; zero troop followers cannot command',()=>{
 for(const kind of ['DEAD','ESCAPED']){
  const {s,r,b,a}=encounter(),old=a.leader,key=r.id+':'+old;quiet(b);
  for(let seed=1;seed<10000;seed++){const roll=fateRoll({...s,seed},key);if(kind==='DEAD'?roll<.02:roll>=.35){s.seed=seed;break;}}
  const leader=b.sides[0].units.find(u=>u.id===old);defeat(leader);advanceCampaignStep(s);assert.equal(a.leader,old);assert.equal(r.settled,false);
  b.sides[1].units.forEach(defeat);advanceCampaignStep(s);assert.equal(r.settled,true);assert.equal(a.leader,null);assert.equal(confirmPostbattleAppointments(s,a.id,recommendArmyAppointments(a)),null);assert.notEqual(a.leader,old);assert.ok(a.units.some(u=>u.id===a.leader&&u.troops>0));
  assert.ok(s.campaign.personnelEvents.some(e=>e.id===key&&e.type===kind));if(kind==='ESCAPED')assert.ok(a.units.some(u=>u.id===old&&u.troops===0));
  validateCampaign(JSON.parse(serializeCampaign(s)));
 }
});

test('unseen enemy reserves and random state do not change the AI council plan',()=>{
 const a=generateBattle(defaultCustomBattle()).battle,c=structuredClone(a);
 c.seed=123456789;for(const u of c.sides[1].units.filter(u=>u.status==='reserve'))Object.assign(u,{hp:1,leadership:1,intellect:1});
 planBattleCouncilAI(a,0);planBattleCouncilAI(c,0);assert.deepEqual(a.sides[0],c.sides[0]);
});

test('reinforcement councils appoint only arrived local survivors and preserve prior command effects through reload',()=>{
 const d=defaultCustomBattle();d.ownTeam=['cao','jia','liao','dun','he','jin'].map(id=>({id,type:'spear',troops:3000,level:5}));d.ownTeamRoles={leader:'cao',advisor:'jia'};
 d.reinforcements=[{side:0,name:'后援军',tick:60,team:[{id:'person-255',type:'spear',troops:3000,level:5}],roles:{leader:'person-255',advisor:'person-255'}}];
 const s=generateBattle(d),b=s.battle;lockDeployment(b);quiet(b);
 const own=b.sides[0],armyId=own.units.find(u=>u.id==='cao').armyId,future=own.units.find(u=>u.reinforcementIndex===0);
 assert.match(appointBattleRoles(b,future.armyId,{leader:future.id,advisor:future.id}),/军议/);
 while(b.tick<59)stepBattle(b,{aiSides:[]});assert.equal(issueCommand(b,'cao-wuchao'),null);
 stepBattle(b,{aiSides:[]});stepBattle(b,{aiSides:[]});assert.equal(b.reinforcementCouncil,'pending');assert.equal(openReinforcementCouncil(b),null);
 const before=structuredClone({last:b.lastCommand,ready:b.commandReady,progress:b.commandProgress,uses:own.stratagemUses,statuses:own.units.map(u=>u.statuses),positions:own.units.map(u=>[u.id,u.x,u.y,u.status]),intent:own.units.map(u=>u.intent)});
 assert.match(appointBattleRoles(b,armyId,{leader:future.id,advisor:'jia'}),/本军团/);
 assert.equal(appointBattleRoles(b,armyId,{leader:'liao',advisor:'liao'}),null);
 assert.equal(appointBattleRoles(b,future.armyId,{leader:future.id,advisor:future.id}),null);
 assert.deepEqual({last:b.lastCommand,ready:b.commandReady,progress:b.commandProgress,uses:own.stratagemUses,statuses:own.units.map(u=>u.statuses),positions:own.units.map(u=>[u.id,u.x,u.y,u.status]),intent:own.units.map(u=>u.intent)},before);
 const copy=validateSave(structuredClone(s));assert.ok(copy.battle.sides[0].commanders.some(c=>c.armyId===armyId&&c.role==='leader'&&c.id==='liao'));
 assert.ok(!battleCommanders(copy.battle).some(c=>c.id==='cao'));
 for(const state of [s,copy])confirmReinforcementCouncil(state.battle);
 for(let i=0;i<15;i++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(b,copy.battle);
 const forged=structuredClone(s);forged.battle.sides[0].appointmentEvents[0].roles.advisor='shao';assert.throws(()=>validateSave(forged),/任命/);
});

test('postbattle human vacancies persist and reject zero troops while AI fills the same legal roles in background',()=>{
 const {s,r,b,a}=encounter();quiet(b);defeat(b.sides[0].units.find(u=>u.id===a.leader));b.sides[1].units.forEach(defeat);advanceCampaignStep(s);
 assert.ok(r.settled);assert.ok(pendingArmyAppointments(s).some(p=>p.armyId===a.id));
 const restored=validateCampaign(JSON.parse(serializeCampaign(s))),before=serializeCampaign(restored);
 assert.equal(advanceCampaignStep(restored).appointments,true);assert.equal(serializeCampaign(restored),before);
 const local=restored.armies.find(u=>u.id===a.id);assert.ok(confirmPostbattleAppointments(restored,a.id,{leader:'shao',advisor:local.advisor}));assert.equal(serializeCampaign(restored),before);
 assert.equal(confirmPostbattleAppointments(restored,a.id,recommendArmyAppointments(local)),null);assert.equal(pendingArmyAppointments(restored).length,0);validateCampaign(JSON.parse(serializeCampaign(restored)));
 const fixture=encounter();quiet(fixture.b);defeat(fixture.b.sides[1].units.find(u=>u.id===fixture.r.armies.find(a=>a.faction==='yuan').leader));fixture.b.sides[0].units.forEach(defeat);advanceCampaignStep(fixture.s);
 for(const army of fixture.s.armies.filter(a=>a.faction==='yuan'&&fixture.r.armyIds.includes(a.id)))assert.ok(army.units.some(u=>u.id===army.leader&&u.troops>0));
 assert.ok(pendingArmyAppointments(fixture.s).every(p=>fixture.s.armies.find(a=>a.id===p.armyId).faction==='cao'));
});
