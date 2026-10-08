import {fundCities} from './resource-fixtures.mjs';
import {transportProxy} from '../personnel-movement.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignStep,advanceCampaignDay,activeBattles,chooseEncounter,serializeCampaign,validateCampaign,armyPosition,orderCampaignArmy,recruitCityUnits} from './helpers/auto-domestic-campaign.mjs';
import {newGame,startBattle,deployUnit,lockDeployment,issueCommand,armyCommanders,armyStratagems,battleStratagems} from '../engine.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {fateRoll,resolveOfficerLoss} from '../officer-fates.mjs';
import {campaignInfoDetail} from '../campaign-info.mjs';
import {movementPoints} from '../strategic-movement.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(seed=1,{emptyFollower=false}={}){
 const s=newCampaign(seed),a=fieldFromCity(s,'xuchang',{target:'guandu'}),d=fieldFromCity(s,'guandu',{target:'xuchang'});
 // These fate tests deliberately fight to destruction; auto withdrawal is tested separately.
 for(const u of [...a.units,...d.units])u.retreatAt=null;
 a.units.find(u=>u.id==='cao').troops=emptyFollower?0:1000;
 if(emptyFollower)for(const u of a.units)if(u.id!=='cao')u.troops=1000;
 beginExecution(s);
 for(let i=0;i<30&&!activeBattles(s).length;i++)advanceCampaignDay(s);
 const r=activeBattles(s)[0];assert.ok(r);assert.equal(chooseEncounter(s,r.id,true),null);
 for(const [i,u] of r.battle.sides[0].units.filter(u=>u.status==='active'&&u.id!=='cao').entries())assert.equal(deployUnit(r.battle,u.id,0,i),null);
 if(!emptyFollower)assert.equal(deployUnit(r.battle,'cao',4,3),null);
 lockDeployment(r.battle);return {s,a,d,r};
}
function run(s,r,until=()=>r.settled){
 for(let i=0;i<2000&&!until();i++){if(s.campaign.phase==='planning')beginExecution(s);for(const pending of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,pending.id,false);advanceCampaignStep(s);}
 assert.ok(until());
}
function nextBattle(a,enemy){
 const s=newGame(17);s.armies=structuredClone([a,enemy]);s.cities.find(c=>c.id==='guandu').garrison=0;
 s.pending={attackerId:a.id,defenderIds:[enemy.id],cityId:'guandu',origin:'xuchang',defenderFaction:enemy.faction};
 assert.equal(startBattle(s),null);return s.battle;
}

test('Cao loses his unit in real combat but a victorious army keeps him, his command and learned abilities',()=>{
 const {s,a,r}=fixture(),cao=a.units.find(u=>u.id==='cao'),learning=structuredClone(cao.tacticLearning);
 run(s,r,()=>r.battle.sides[0].units.find(u=>u.id==='cao').status==='defeated');
 assert.ok(!r.settled);assert.ok(!battleStratagems(r.battle).includes('assault'));
 const old=JSON.parse(serializeCampaign(s));old.campaign.version=15;assert.throws(()=>validateCampaign(old),/不兼容/);
 const resumed=restore(s),copyRecord=resumed.campaign.battles.find(x=>x.id===r.id);
 run(s,r);run(resumed,copyRecord);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
 assert.equal(r.battle.result.winner,0);assert.ok(s.armies.includes(a));assert.equal(a.leader,'cao');assert.ok(a.units.includes(cao));assert.equal(cao.troops,0);
 assert.deepEqual(cao.tacticLearning,learning);assert.ok(cao.wounded>0);
 assert.ok(!s.campaign.idle.some(o=>o.unit.id==='cao'));assert.ok(!s.campaign.domestic.people.some(p=>p.id==='cao'));assert.ok(!s.cities.some(c=>c.units.some(u=>u.id==='cao')));
 assert.match(s.campaign.personnelEvents.find(e=>e.id===r.id+':cao').text,/随.*待整编/);
 assert.match(campaignInfoDetail(s,'officer','cao').sections.map(x=>x.html).join(''),/随军待整编/);
 assert.match(campaignInfoDetail(s,'army',a.id).sections.map(x=>x.html).join(''),/随军待整编/);
 assert.ok(!armyCommanders(a).some(c=>c.id==='cao'));assert.ok(!armyStratagems(a).includes('assault'));
 const next=nextBattle(a,r.armies.find(x=>x.faction==='yuan'));
 assert.ok(!next.sides[0].units.some(u=>u.id==='cao'));assert.ok(!next.sides[0].commanders.some(c=>c.id==='cao'));assert.ok(!battleStratagems(next).includes('assault'));
 assert.ok(next.sides[0].units.every(u=>u.commandBonus===0));
 assert.ok(movementPoints(a)>movementPoints({...a,units:a.units.map(u=>u.id==='cao'?{...u,leadership:0}:u)}));
 const count=s.campaign.personnelEvents.length;advanceCampaignStep(s);assert.equal(s.campaign.personnelEvents.length,count);restore(s);
 // A returning army becomes independent city units; the existing legal recruit
 // action restores actual manpower and then permits this officer to fight again.
 run(s,r,()=>s.campaign.phase==='planning');assert.equal(orderCampaignArmy(s,a.id,'xuchang','auto',{reverse:true}),null);beginExecution(s);
 run(s,r,()=>s.cities.find(c=>c.id==='xuchang').units.some(u=>u.id==='cao'));run(s,r,()=>s.campaign.phase==='planning');
 const c=s.cities.find(c=>c.id==='xuchang');assert.ok(c.units.includes(cao));c.manpower=10000;c.grain=20000;c.drafted=0;fundCities(s,10000);
 assert.equal(recruitCityUnits(s,c.id,['cao']),null);assert.ok(cao.troops>0);assert.ok(c.manpower<10000);
 assert.deepEqual(cao.tacticLearning,learning);
 const reformed={...a,units:[cao],leader:'cao',advisor:'cao',deputy:null};
 assert.ok(armyStratagems(reformed).includes('assault'));assert.ok(nextBattle(reformed,r.armies.find(x=>x.faction==='yuan')).sides[0].units.some(u=>u.id==='cao'));restore(s);
});

test('an escaped commander returns from the actual road position after the last troops depart',()=>{
 const {s,a,r}=fixture();run(s,r,()=>r.battle.sides[0].units.find(u=>u.id==='cao').status==='defeated');
 assert.ok(fateRoll(s,r.id+':cao')>=.35);const point=armyPosition(s,a);assert.equal(issueCommand(r.battle,'retreat'),null);run(s,r);
 assert.equal(r.battle.result.winner,1);assert.ok(!s.armies.some(x=>x.id===a.id));const escaped=s.campaign.idle.find(o=>o.unit.id==='cao');assert.ok(escaped?.destination);assert.equal(escaped.unit.troops,0);assert.ok(escaped.journey.route.length);
 const after=armyPosition(s,transportProxy(s,escaped));assert.ok(Math.hypot(point.x-after.x,point.y-after.y)<1);assert.equal(s.campaign.personnelEvents.filter(e=>e.id===r.id+':cao').length,1);restore(s);
});

test('previous followers return physically when their remaining escort is annihilated, without another fate roll',()=>{
 const {s,a,r}=fixture(1,{emptyFollower:true});assert.ok(!r.battle.sides[0].units.some(u=>u.id==='cao'));
 run(s,r);assert.equal(r.battle.result.winner,1);assert.ok(!s.armies.some(x=>x.id===a.id));
 const o=s.campaign.idle.find(o=>o.unit.id==='cao');assert.ok(o?.destination);assert.ok(o.journey.route.length);assert.match(o.movementReason,/军团失去作战部队/);
 assert.ok(!s.campaign.personnelEvents.some(e=>e.id===r.id+':cao'));assert.ok(!s.campaign.domestic.people.some(p=>p.id==='cao'));restore(s);
});

test('death and captivity still remove a commander; only escape keeps a living army appointment',()=>{
 for(const kind of ['DEAD','CAPTIVE','ESCAPED']){
  const s=newCampaign(23),a=fieldFromCity(s,'xuchang',{target:'guandu'}),u=a.units.find(u=>u.id==='cao');let key;
  for(let i=0;i<10000;i++){const k='follow-fate:'+i,roll=fateRoll(s,k);if(kind==='DEAD'?roll<.02:kind==='CAPTIVE'?roll>=.02&&roll<.35:roll>=.35){key=k;break;}}
  assert.equal(resolveOfficerLoss(s,{unit:u,faction:a.faction,location:a.location,enemy:'yuan',eventId:key,survivingArmy:a}),kind);
  assert.equal(a.units.includes(u),kind==='ESCAPED');assert.equal(a.leader==='cao',kind==='ESCAPED');
  assert.equal(resolveOfficerLoss(s,{unit:u,faction:a.faction,location:a.location,enemy:'yuan',eventId:key,survivingArmy:a}),null);restore(s);
 }
});
