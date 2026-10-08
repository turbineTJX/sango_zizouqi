import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,lockDeployment,stepBattle,validateSave,issueCommand,COMMAND_RESOURCE,activeUnits} from '../engine.mjs';
import {gainMerit,changeMerit,retainFactionMerit,totalMerit,meritFloor,validMeritGrowth} from '../progression.mjs';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {settleOfficerMerit,settleMeritCapacity,transportMerit} from '../campaign-merit.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {startTalentProject,resolveTalentOffers} from '../talent-lifecycle.mjs';
import {projectNeed,talentKey,servingPeople} from '../talent-core.mjs';
import {cancelDomestic} from '../domestic.mjs';
import {assignDomestic,ACTIONS} from '../domestic.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {scoutCandidates,scoutTargets,dispatchScout,recallScout,advanceScouting} from '../scouting.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {setStatus,hasStatus} from '../tactics.mjs';
import {troopCapacity} from '../troop-capacity.mjs';
import {stratagemAiFixture,militaryResource} from './helpers/stratagem-ai.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEMS} from '../stratagems.mjs';

test('level ten retains upgrade surplus and keeps earning a deduction buffer',()=>{
 const u=makeOfficer('cao',3000,0,9);u.merit=4400;
 const g=gainMerit(u,600);assert.equal(u.level,10);assert.equal(u.merit,500);assert.ok(validMeritGrowth(g));
 gainMerit(u,300);changeMerit(u,-300);assert.equal(u.merit,500);
 changeMerit(u,-800);assert.equal(u.level,9);assert.equal(u.merit,4200);
 gainMerit(u,300);assert.equal(u.level,10);assert.equal(u.merit,0);
 const s=newCampaign(501);gainMerit(s.cities.find(c=>c.units.length).units[0],50000);validateCampaign(s);
});
test('downgrades reverse every threshold, clamp at one, and restore saved bonds without rerolls',()=>{
 const u=makeOfficer('cao',3000,0,10,817),timeline=structuredClone(u.bondGrowth.history),fixed=structuredClone(u.tacticLearning);
 for(let level=9;level>=1;level--){changeMerit(u,meritFloor(level)-totalMerit(u));assert.equal(u.level,level);assert.deepEqual(u.bondGrowth.levels,timeline[level-1]);}
 changeMerit(u,-99999);assert.equal(totalMerit(u),0);
 const copy=structuredClone(u);for(const value of [u,copy])gainMerit(value,meritFloor(10)+700);
 assert.deepEqual(u,copy);assert.deepEqual(u.bondGrowth.history,timeline);assert.deepEqual(u.bondGrowth.levels,timeline[9]);assert.deepEqual(u.tacticLearning,fixed);
});
test('changed allegiance retains twenty percent of thresholds plus balance',()=>{
 const u=makeOfficer('cao',3000,0,10),leadership=u.leadership;u.merit=500;
 const g=retainFactionMerit(u);assert.equal(totalMerit(u),3400);assert.equal(u.level,5);assert.equal(u.merit,1400);assert.ok(validMeritGrowth(g));
 assert.equal(u.leadership,leadership);const v=makeOfficer('liao',3000,0,8);v.merit=600;retainFactionMerit(v);assert.equal(totalMerit(v),1800);assert.equal(v.level,4);assert.equal(v.merit,800);
});
test('real recruitment preserves first service and discounts former service once, including former free officers',()=>{
 for(const former of [null,'yuan']){
  const s=newCampaign(42),p=readyTalent(s),unit=makeOfficer(p.id,0,0,10);unit.merit=500;p.unit=unit;
  s.campaign.talent.records[p.id].meritFaction=former;
  const c=s.cities.find(c=>c.id==='xuchang'),executor=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===c.id),a={officerId:executor.unit.id,action:{key:'hire',targetId:p.id,cost:180}};
  startTalentProject(s,a,c);s.campaign.talent.projects[talentKey(p.id,'cao')].progress=projectNeed(p.id);
  resolveTalentOffers(s,cancelDomestic);assert.equal(servingPeople(s).get(p.id).faction,'cao');assert.equal(totalMerit(unit),former?3400:17000);
  const saved=serializeCampaign(s);resolveTalentOffers(s,cancelDomestic);assert.equal(serializeCampaign(s),saved);validateCampaign(JSON.parse(saved));
 }
});
test('permanent event records prevent repeat rewards and deductions after reload',()=>{
 const s=newCampaign(44),o=s.campaign.idle[0],event={sourceId:'failure-check',amount:-20,faction:o.faction,cityId:o.location,reason:'事务失败'};
 gainMerit(o.unit,420);settleOfficerMerit(s,o.unit,event);const copy=validateCampaign(JSON.parse(serializeCampaign(s))),other=copy.campaign.idle.find(x=>x.unit.id===o.unit.id),before=totalMerit(other.unit);
 settleOfficerMerit(copy,other.unit,event);assert.equal(totalMerit(other.unit),before);
 const bad=structuredClone(copy),n=bad.campaign.activity.nodes.find(n=>n.sourceId.includes('failure-check'));n.result.growth.gained--;assert.throws(()=>validateCampaign(bad));
});
test('downgrade preserves field soldiers and returns excess troops to reserves at home',()=>{
 const s=newCampaign(45),c=s.cities.find(c=>c.owner==='cao'&&c.units.length),u=c.units[0];gainMerit(u,meritFloor(10));u.troops=troopCapacity(u);const total=u.troops+c.manpower;
 changeMerit(u,-10000);assert.ok(u.troops>troopCapacity(u));validateCampaign(JSON.parse(serializeCampaign(s)));
 settleMeritCapacity(s);assert.equal(u.troops,troopCapacity(u));assert.equal(u.troops+c.manpower,total);assert.equal(u.meritCapacity,undefined);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('split transport deliveries and reverse deliveries share one route budget',()=>{
 const run=parts=>{const s=newCampaign(46),o=s.campaign.idle[0],before=totalMerit(o.unit);parts.forEach((gold,i)=>transportMerit(s,o.unit,o.faction,i%2?'chenliu':'xuchang',i%2?'xuchang':'chenliu',{gold},{sourceId:'delivery-'+i}));return totalMerit(o.unit)-before;};
 assert.equal(run([3000]),60);assert.equal(run([1500,1500]),60);assert.equal(run([1000,1000,1000,1000]),60);
});
test('scouting rewards real intelligence and watch days, capped and persistent across redispatch',()=>{
 const s=newCampaign(203);for(const c of s.cities.filter(c=>c.owner!=='cao'))c.units.forEach(u=>u.troops=0);
 const c=s.cities.find(c=>c.owner==='cao'&&scoutCandidates(s,c.id).length),o=scoutCandidates(s,c.id)[0],target=scoutTargets(s,c.id).find(n=>n.owner!=='cao');assert.ok(target);
 const before=totalMerit(o.unit);assert.equal(dispatchScout(s,c.id,o.unit.id,target.id),null);advanceScouting(s);
 const earned=totalMerit(o.unit);assert.equal(recallScout(s,o.unit.id),null);assert.equal(dispatchScout(s,c.id,o.unit.id,target.id),null);advanceScouting(s);assert.equal(totalMerit(o.unit),earned);
 const copy=validateCampaign(JSON.parse(serializeCampaign(s)));advanceScouting(copy);assert.equal(totalMerit(servingPeople(copy).get(o.unit.id).unit),earned);
 for(let i=0;i<10;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}assert.ok(totalMerit(o.unit)>before);assert.ok(totalMerit(o.unit)-before<=60);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('actual shield absorption credits its friendly provider, including reload',()=>{
 const s=createScenario('field',818);lockDeployment(s.battle);const b=s.battle,victim=b.sides[0].units[0],provider=b.sides[0].units[1];
 setStatus(b,victim,'shield',50,{amount:1000,source:provider.id+':guard',sourceId:provider.id,label:'护盾'});
 const copy=validateSave(structuredClone(s));for(let i=0;i<50&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}
 assert.deepEqual(s,copy);assert.ok(provider.contribution.protection>0);assert.ok(provider.contribution.protection<=1000);
});
test('command control credits only newly affected targets, excluding protected units on either side',()=>{
 for(const side of [0,1]){
  const s=stratagemAiFixture('disrupt',side,11231),b=s.battle,resource=militaryResource(b,side);
  while(resource.commandProgress<COMMAND_RESOURCE.capacity&&!b.result)stepBattle(b,{aiSides:[]});
  const enemies=activeUnits(b,1-side);setStatus(b,enemies[0],'resolve',100);
  const point=chooseStratagemPoint(b,STRATAGEMS.disrupt,side),before=new Map(enemies.map(u=>[u.id,hasStatus(b,u,'stun')])),prior=b.sides[side].units.reduce((n,u)=>n+u.contribution.control,0);
  assert.equal(issueCommand(b,'disrupt',point,side),null);
  const affected=enemies.filter(u=>!before.get(u.id)&&hasStatus(b,u,'stun')).length;
  assert.ok(affected>0);assert.equal(hasStatus(b,enemies[0],'stun'),false);
  assert.equal(b.sides[side].units.reduce((n,u)=>n+u.contribution.control,0)-prior,affected);validateSave(structuredClone(s));
 }
});
test('actual ordinary failures deduct merit and can downgrade, while partial results retain credit',()=>{
 let failure=false,partial=false;
 for(let seed=1;seed<=24&&(!failure||!partial);seed++){
  const s=newCampaign(seed);peacefulCities(s);const c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.politics<35&&u.id!==c.governor);assert.ok(u);
  gainMerit(u,100);const before=totalMerit(u);
  for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='fair')c.domestic.cooldowns[key]=10000;
  assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);beginExecution(s);
  for(let i=0;i<10;i++)advanceCampaignDay(s);
  const node=s.campaign.activity.nodes.find(n=>n.officerId===u.id&&n.key==='fair'&&['complete','failure'].includes(n.phase));assert.ok(node);
  if(node.result.factor===0){assert.equal(node.result.penalty,20);assert.equal(totalMerit(u),before-20);assert.equal(u.level,1);failure=true;}
  if(node.result.factor>0&&node.result.factor<1){assert.equal(node.result.penalty,0);assert.ok(totalMerit(u)>before);assert.ok(node.result.earned<60);partial=true;}
  validateCampaign(JSON.parse(serializeCampaign(s)));
 }
 assert.ok(failure&&partial);
});
