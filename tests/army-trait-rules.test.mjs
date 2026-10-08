import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {makeOfficer,activeUnits,lockDeployment,fillSlots,validateSave,stepBattle} from '../engine.mjs';
import {frontlineCapacity,validFrontline,armyMarchMultiplier} from '../army-trait-rules.mjs';
import {movementPoints} from '../strategic-movement.mjs';
import {newCampaign,launchExpedition,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {assignDomestic,assignmentFor,actionCandidates,ACTIONS} from '../domestic.mjs';

const entry=id=>({id,type:'spear',troops:2000,level:1,retreatAt:null});
// Use existing public officer IDs without duplicates across factions.
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
const roster=['cao',...Object.keys(OFFICER_BY_ID).filter(id=>id!=='cao'&&id!=='shao').slice(0,8)];
function scene(side=0,leader='cao',waves=[]){
 const team=roster.map(entry),other=[entry('shao')];
 return generateBattle({seed:91,terrain:'land',ownTeam:side?other:team,enemyTeam:side?team:other,[side?'enemyTeamRoles':'ownTeamRoles']:{leader,advisor:'cao'},waves});
}
test('Jianxiong permits seven on either side, reserves refill and saves resume deterministically',()=>{
 for(const side of [0,1]){
  const s=scene(side),b=s.battle;assert.equal(frontlineCapacity(b,side),7);assert.equal(activeUnits(b,side).length,7);
  assert.equal(lockDeployment(b),null);validateSave(s);
  const defeated=activeUnits(b,side)[0];defeated.battleDamage+=defeated.hp;defeated.hp=0;defeated.status='defeated';fillSlots(b,side);
  assert.equal(activeUnits(b,side).length,7);assert.equal(frontlineCapacity(b,side),7);
  const copy=structuredClone(s);validateSave(copy);stepBattle(b);stepBattle(copy.battle);assert.deepEqual(b,copy.battle);
 }
});
test('advisor does not add a slot; an eighth unit or another army cannot occupy the extra slot',()=>{
 const s=scene(0,roster[1]),b=s.battle;assert.equal(frontlineCapacity(b,0),6);assert.equal(activeUnits(b,0).length,6);
 const own=scene().battle,units=own.sides[0].units;
 assert.equal(validFrontline(own,0,units.slice(0,8)),false);
 assert.equal(validFrontline(own,0,units.slice(0,7).map(u=>({...u,armyId:'other'}))),false);
 const reserve=units.find(u=>u.status==='reserve');reserve.status='active';assert.match(lockDeployment(own),/1～7/);
});
test('seven starters do not accelerate eighth and ninth reinforcement arrivals',()=>{
 const s=scene(1,'cao',[{count:2,tick:20}]),b=s.battle;assert.equal(activeUnits(b,1).length,7);
 const dead=activeUnits(b,1)[0];dead.hp=0;dead.status='defeated';fillSlots(b,1);assert.equal(activeUnits(b,1).length,6);
 b.tick=20;fillSlots(b,1);assert.equal(activeUnits(b,1).length,7);
});
test('removed speed traits do not alter actual army movement',()=>{
 const a={units:[makeOfficer('yuanxia',2000),makeOfficer('cao',2000)],leader:'yuanxia',morale:80,hunger:0};
 const speed=movementPoints(a);assert.equal(armyMarchMultiplier(a),1);
 const control=structuredClone(a);control.units[0].id='plain';control.leader='plain';assert.ok(Math.abs(speed-movementPoints(control))<.002);
 a.leader='cao';assert.equal(armyMarchMultiplier(a),1);a.leader='yuanxia';a.units[0].troops=0;assert.equal(armyMarchMultiplier(a),1);
});
test('Qingnang enables actual clinic-free treatment but preserves grain and real-wound limits',()=>{
 const s=newCampaign(91),c=s.cities.find(c=>c.id==='xuchang'),id='person-705';
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==id);
 s.campaign.idle.push({unit:{...makeOfficer(id,0),homeCity:c.id},faction:c.owner,location:c.id,destination:null,remainingDays:0});
 c.clinic=0;c.grain=10000;fundCities(s,20000);
 const patient=c.units[0];patient.troops-=500;patient.wounded=500;
 assert.equal(assignDomestic(s,c.id,'technology',id),null);
 const a=assignmentFor(s,id);assert.ok(actionCandidates(s,a).some(p=>p.key==='heal'));
 const doctor=s.campaign.idle.find(o=>o.unit.id===id);doctor.unit.id='plain';a.officerId='plain';assert.ok(!actionCandidates(s,a).some(p=>ACTIONS[p.key].kind==='heal'));doctor.unit.id=id;a.officerId=id;
 c.grain=199;assert.ok(!actionCandidates(s,a).some(p=>ACTIONS[p.key].kind==='heal'));c.grain=10000;
 for(const [key,d] of Object.entries(ACTIONS))if(d.direction==='technology'&&key!=='heal')c.domestic.cooldowns[key]=1000;
 beginExecution(s);assert.equal(a.action.key,'heal');a.action.chance=1;
 const before=patient.troops,grain=c.grain;for(let i=0;i<5;i++)advanceCampaignDay(s);
 assert.ok(patient.troops>before&&patient.troops<=before+500);assert.equal(patient.troops-before,500-patient.wounded);assert.ok(c.grain<=grain-200);
 validateCampaign(JSON.parse(serializeCampaign(s)));
});


test('normal campaign expedition persists seven starters under Cao Cao',()=>{
 const s=newCampaign(91),c=s.cities.find(c=>c.id==='xuchang');
 assert.equal(launchExpedition(s,{cityId:c.id,officerIds:c.units.map(u=>u.id),leader:'cao',advisor:'jia',deputy:null,target:'guandu',policy:'auto'}),null);
 const army=s.armies.find(a=>a.leader==='cao');assert.equal(army.units.filter(u=>u.first).length,7);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(restored.armies.find(a=>a.id===army.id).units.filter(u=>u.first).length,7);
});
