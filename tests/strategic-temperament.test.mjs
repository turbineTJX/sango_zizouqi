import test from 'node:test';
import assert from 'node:assert/strict';
import {temperamentProbability,drawFactionTemperament,temperamentTolerance,validTemperament} from '../strategic-temperament.mjs';
import {factionStrategicProfile,evaluateOffensive,planStrategicAI,validateStrategicAI} from '../strategic-ai.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';
import {makeOfficer} from '../engine.mjs';
import {requestFactionOrder} from '../strategic-orders.mjs';

const profile={lordId:'shao',personality:4,leadership:70,intellect:60,politics:60};
function intent(p=profile,roll=0,{turn=21,quietTurns=10}={}){
 const v={turn,lordId:p.lordId,personality:p.personality,leadership:p.leadership,intellect:p.intellect,politics:p.politics,quietTurns,probability:0,roll,willing:false};
 v.probability=temperamentProbability(v);v.willing=roll<v.probability;return v;
}
function marginalFront(){
 const f=planningFront(),{s,home,target}=f;s.turn=21;s.campaign.day=201;
 home.units.find(u=>u.id==='shao').personality=4;s.campaign.ai.factions.yuan.style='bold';
 target.gold=0;target.manpower=0;target.units.forEach(u=>u.troops=1950);initializeVision(s);
 const p=factionStrategicProfile(s,'yuan'),proposal={faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,3),days:0}],assaultDays:1,siegeDays:2};
 return {...f,profile:p,proposal};
}

test('ruler personality and attributes change sampled risk taking while early turns and quiet pressure remain bounded',()=>{
 const sample=personality=>{const ai={temperamentSeed:731,factions:{yuan:{temperament:null}}};let count=0;for(let turn=21;turn<=1020;turn++)count+=Number(drawFactionTemperament(ai,'yuan',turn,{...profile,personality},10).willing);return count;};
 const timid=sample(1),careful=sample(2),balanced=sample(3),bold=sample(4);
 assert.ok(timid<careful&&careful<balanced&&balanced<bold);assert.ok(bold-balanced>200&&balanced-careful>100);assert.ok(bold<1000&&timid>0);
 const base={...profile,turn:21,quietTurns:0};
 assert.ok(temperamentProbability({...base,leadership:95,intellect:95})<temperamentProbability({...base,leadership:30,intellect:30}));
 assert.ok(temperamentProbability({...base,politics:95})<temperamentProbability({...base,politics:30}));
 assert.ok(temperamentProbability({...base,turn:1})<temperamentProbability(base));
 assert.ok(temperamentProbability({...base,quietTurns:10})>temperamentProbability(base));
 assert.equal(temperamentProbability({...base,turn:400,quietTurns:400}),temperamentProbability({...base,turn:40,quietTurns:40}));
});

test('one ruler preference is drawn per strategic turn and survives a real save and daily continuation',()=>{
 const s=newCampaign(829,'guandu-200','cao',{allAI:true});beginExecution(s);advanceCampaignDay(s);
 const policy=s.campaign.ai.factions.cao,first=structuredClone(policy.temperament),seed=s.campaign.ai.temperamentSeed;
 planStrategicAI(s);assert.deepEqual(policy.temperament,first);assert.equal(s.campaign.ai.temperamentSeed,seed);
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));advanceCampaignDay(s);advanceCampaignDay(copy);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.deepEqual(s.campaign.ai.factions.cao.temperament,first);assert.equal(s.campaign.ai.temperamentSeed,seed);
});

test('a willing ruler can admit an affordable marginal offensive without changing power losses resources or combat RNG',()=>{
 const f=marginalFront(),before=serializeCampaign(f.s),careful=evaluateOffensive(f.s,{...f.proposal,temperament:intent(f.profile,.99999)}),bold=evaluateOffensive(f.s,{...f.proposal,temperament:intent(f.profile)});
 assert.equal(careful.accepted,false);assert.equal(careful.reason,'预计攻守优势不足');assert.equal(bold.accepted,true);
 assert.ok(bold.requiredAdvantage<careful.requiredAdvantage&&bold.score>careful.score);
 for(const key of ['attackPower','defensePower','estimatedLosses','emergencyMen','reinforcementPower'])assert.equal(bold.military[key],careful.military[key]);
 assert.equal(bold.replacementGold,careful.replacementGold);assert.equal(bold.consumedGrain,careful.consumedGrain);assert.equal(serializeCampaign(f.s),before);
});

test('ruler willingness cannot waive actual supply home guards or casualty replacement costs',()=>{
 for(const key of ['grain','gold','manpower']){
  const f=marginalFront();f.home[key]=0;const before=serializeCampaign(f.s),evaluation=evaluateOffensive(f.s,{...f.proposal,temperament:intent(f.profile)});
  assert.equal(evaluation.accepted,false,key+' cannot be replaced by a willingness roll');assert.equal(serializeCampaign(f.s),before);
 }
 const f=marginalFront();f.proposal.groups[0].units=f.home.units;assert.equal(evaluateOffensive(f.s,{...f.proposal,temperament:intent(f.profile)}).accepted,false,'all troops cannot leave their guard duty');
 assert.equal(temperamentTolerance(intent(),.8,{feasible:true}).active,false,'extreme expected casualties do not get a risk exception');
});

test('a committed operation retains its ruler preference when the next turn draws a different willingness',()=>{
 const {s,home,rear}=planningFront();s.turn=21;s.campaign.day=201;home.grain=2500;rear.grain=20000;
 const courier={...makeOfficer('gao',0,0,3),homeCity:rear.id};s.campaign.domestic.people=s.campaign.domestic.people.filter(o=>o.id!==courier.id);
 s.campaign.idle.push({unit:courier,faction:'yuan',location:rear.id,destination:null,remainingDays:0});
 assert.ok(requestFactionOrder(s,'yuan',{kind:'transfer',cityId:rear.id,officerIds:[courier.id],target:home.id,cargo:{gold:0,grain:6000,manpower:0},route:[home.id],safeOnly:true},'now').applied);
 home.units.find(u=>u.id==='shao').personality=4;s.campaign.ai.temperamentSeed=0;
 planStrategicAI(s);const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.ok(p);assert.equal(p.phase,'prepare');
 const committed=structuredClone(p.military.temperament);assert.equal(committed.willing,true);
 let unwillingSeed;
 for(let i=0;i<256;i++){
  const seed=i*100000;
  const probe=structuredClone(s.campaign.ai);probe.temperamentSeed=seed;
  for(const faction of Object.keys(probe.factions))drawFactionTemperament(probe,faction,22,factionStrategicProfile(s,faction),21);
  if(!probe.factions.yuan.temperament.willing){unwillingSeed=seed;break;}
 }
 assert.notEqual(unwillingSeed,undefined);s.campaign.day=211;s.turn=22;s.campaign.ai.temperamentSeed=unwillingSeed;planStrategicAI(s);
 assert.equal(s.campaign.ai.factions.yuan.temperament.willing,false);assert.notEqual(p.phase,'cancelled');assert.deepEqual(p.military.temperament,committed);validateStrategicAI(s);
});

test('ruler choice validation rejects modified dice probabilities attributes and old AI saves',()=>{
 const original=intent();assert.equal(validTemperament(original,21,id=>id==='shao'),true);
 for(const change of [x=>x.roll=1,x=>x.probability=.99,x=>x.willing=false,x=>x.quietTurns=99,x=>x.intellect=101,x=>x.turn=22]){
  const bad=structuredClone(original);change(bad);assert.equal(validTemperament(bad,21,id=>id==='shao'),false);
 }
 const s=newCampaign(839,'guandu-200','cao',{allAI:true}),saved=JSON.parse(serializeCampaign(s));saved.campaign.ai.version=15;
 assert.throws(()=>validateCampaign(saved),/重新开始|版本/);
});
