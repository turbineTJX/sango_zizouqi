import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,launchExpedition,beginExecution,advanceCampaignStep,chooseEncounter,serializeCampaign,validateCampaign,consolidateCityArmies} from './helpers/auto-domestic-campaign.mjs';
import {approachDestination} from './helpers/field-campaign.mjs';
import {nationalOfficerAverage,banditIntelligence,knownBanditCamps,observeBanditCamps} from '../bandit-state.mjs';
import {planBanditExpedition,settleBanditBattle,deliverBanditLoot} from '../bandits.mjs';
import {GENERATED_STATS} from '../generated-officers.mjs';
import {BANDIT_RULES} from '../data/design/bandits.mjs';
import {dispatchScout,scoutCandidates,advanceScouting} from '../scouting.mjs';
import {intelligenceWorld,updateVision} from '../strategic-vision.mjs';
import {welcomeBanditTalent} from '../talent-lifecycle.mjs';
import {banditMarkup,banditMapMarkup} from '../bandit-view.mjs';
import {mapNode} from '../map-node-data.mjs';
import {issueCommand} from '../engine.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(){
 const s=newCampaign(521200,'guandu-200'),camp=s.campaign.bandits.camps.find(c=>c.nodeId==='junction:chenliu:xuchang'),city=s.cities.find(c=>c.id==='xuchang');return {s,camp,city};
}
function tick(s,until,max=1600){for(let i=0;i<max&&!until();i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of s.campaign.battles.filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignStep(s);}assert.ok(until(),'real campaign did not reach the expected state');}
function contact(){const f=fixture(),{s,camp,city}=f,units=city.units.slice(0,3);assert.equal(launchExpedition(s,{cityId:city.id,officerIds:units.map(u=>u.id),leader:units[0].id,advisor:units[1].id,target:camp.nodeId,policy:'auto'}),null);const a=s.armies.at(-1);approachDestination(s,a);tick(s,()=>s.campaign.battles.some(r=>r.banditCampId===camp.id));return {...f,a,r:s.campaign.battles.find(r=>r.banditCampId===camp.id)};}

test('bandit generals use a saved national mean, unique procedural identities and current levels',()=>{
 const {s}=fixture(),b=s.campaign.bandits,average=nationalOfficerAverage(s),names=new Set();assert.ok(b.camps.length>0&&b.camps.length<=BANDIT_RULES.maximumCamps);
 for(const c of b.camps){assert.deepEqual(c.average,average);assert.ok(c.units.length>=BANDIT_RULES.minGenerals&&c.units.length<=BANDIT_RULES.maxGenerals);for(const u of c.units){assert.ok(u.name&&u.courtesy);assert.equal(u.level,Math.round(average.level));assert.ok(!names.has(u.id));names.add(u.id);for(const k of GENERATED_STATS)assert.ok(u[k]<=Math.floor(average[k]*BANDIT_RULES.abilityMaximum));assert.ok(u.troops>=BANDIT_RULES.minTroops&&u.troops<=BANDIT_RULES.maxTroops);}}
 assert.deepEqual(restore(s).campaign.bandits,b);s.cities[0].units.forEach(u=>u.level=9);assert.deepEqual(b,fixture().s.campaign.bandits);
 const bad=JSON.parse(serializeCampaign(fixture().s));bad.campaign.bandits.camps[0].units[0].force++;assert.throws(()=>validateCampaign(bad),/贼将/);
});
test('actual scouts discover camps once and each faction keeps its own dated report',()=>{
 const {s,camp,city}=fixture();assert.equal(banditIntelligence(s,camp.id,'cao'),null);assert.doesNotMatch(banditMapMarkup(s),new RegExp(camp.id));
 const officer=scoutCandidates(s,city.id)[0];assert.equal(dispatchScout(s,city.id,officer.unit.id,camp.nodeId),null);
 for(let day=0;day<12&&!banditIntelligence(s,camp.id,'cao');day++){advanceScouting(s);s.campaign.day++;}updateVision(s);
 assert.ok(banditIntelligence(s,camp.id,'cao'));assert.equal(banditIntelligence(s,camp.id,'yuan'),null);assert.ok(s.campaign.scouting.tasks[0].contacts.some(c=>c.kind==='bandit'&&c.id===camp.id));
 assert.deepEqual(restore(s).campaign.scouting.tasks[0].contacts,s.campaign.scouting.tasks[0].contacts);
 assert.equal(intelligenceWorld(s,'yuan').campaign.bandits.camps.some(c=>c.id===camp.id),false);
 const report=structuredClone(banditIntelligence(s,camp.id,'cao'));s.campaign.scouting.tasks=[];officer.unit.scouting=null;s.campaign.day=Math.max(s.campaign.day,...s.campaign.vision.factions.cao.scouted.map(v=>v.expiresDay))+1;camp.units[0].troops--;updateVision(s);assert.deepEqual(banditIntelligence(s,camp.id,'cao'),report);
});
test('real bandit contact uses the common battlefield and deterministic save continuation',()=>{
 const {s,camp,r}=contact();assert.ok(r.battle.sides[1-r.attackSide].units.every(u=>u.generatedOfficer));assert.equal(r.battle.buildingSiteId,null);assert.ok(r.name.includes('贼寨'));assert.equal(camp.battleId,r.id);
 const resumed=restore(s);tick(s,()=>r.settled);const other=resumed.campaign.battles.find(x=>x.id===r.id);tick(resumed,()=>other.settled);assert.equal(serializeCampaign(resumed),serializeCampaign(s));assert.equal(r.report.winner,r.attackSide);assert.ok(r.battle.tick>0);assert.ok(r.report.stats[1-r.attackSide].killed>0);restore(s);
});
test('bandit spoils conserve real stock, follow the survivors and credit a city once on return',()=>{
 const {s,camp,r}=contact();tick(s,()=>r.settled);const loot=r.report.banditLoot,carrier=s.armies.flatMap(a=>a.units).find(u=>u.spoilsGold>0);assert.ok(carrier);assert.equal(carrier.spoilsGold,loot.gold);assert.equal(carrier.spoilsGrain,loot.grain);assert.equal(camp.gold,0);assert.equal(camp.grain,0);assert.equal(loot.gold+loot.lostGold,loot.beforeGold);assert.equal(loot.grain+loot.lostGrain,loot.beforeGrain);
 const saved=serializeCampaign(s);settleBanditBattle(s,r);assert.equal(serializeCampaign(s),saved);tick(s,()=>s.campaign.activity.nodes.some(n=>n.phase==='bandit-delivery'));
 const receipts=s.campaign.activity.nodes.filter(n=>n.phase==='bandit-delivery');assert.equal(receipts.reduce((n,x)=>n+x.result.gold,0)+(carrier.spoilsGold||0),loot.gold);assert.equal(receipts.reduce((n,x)=>n+x.result.grain,0)+(carrier.spoilsGrain||0),loot.grain);const before=s.gold;deliverBanditLoot(s);assert.equal(s.gold,before);restore(s);
});
test('bandit AI uses only observed camps and the same paid real expedition, retaining a garrison',()=>{
 const {s,camp,city}=fixture();assert.equal(planBanditExpedition(s,'cao'),null);observeBanditCamps(s,'cao',p=>p.id===camp.nodeId);const ids=city.units.map(u=>u.id),grain=city.grain,other=structuredClone(s);other.campaign.bandits.seed^=0x7fffffff;other.seed=77;for(const c of other.campaign.bandits.camps)if(c.id!==camp.id){c.gold=1;c.grain=1;c.units.forEach(u=>u.troops=1);}
 const alternate=planBanditExpedition(other,'cao');
 const result=planBanditExpedition(s,'cao');assert.ok(result);assert.deepEqual(result,alternate);assert.deepEqual(s.armies.at(-1),other.armies.at(-1));const a=s.armies.find(a=>a.id===result.armyId),source=s.cities.find(c=>c.id===a.homeCity);assert.equal(a.banditTarget,camp.id);assert.ok(a.units.every(u=>ids.includes(u.id))||source.id!==city.id);assert.ok(source.units.some(u=>u.troops>0));if(source===city)assert.equal(city.grain+a.supply,grain);assert.equal(planBanditExpedition(s,'cao'),null);restore(s);
 const poor=fixture();observeBanditCamps(poor.s,'cao',p=>p.id===poor.camp.nodeId);for(const c of poor.s.cities)c.grain=0;assert.equal(planBanditExpedition(poor.s,'cao'),null);
});
test('a real retreat leaves the same surviving bandits in place and awards no loot',()=>{
 const {s,camp,r}=contact(),identities=camp.units.map(u=>u.id);chooseEncounter(s,r.id,false);assert.equal(issueCommand(r.battle,'retreat',null,r.attackSide),null);tick(s,()=>r.settled);assert.notEqual(r.report.winner,r.attackSide);assert.equal(r.report.banditLoot,undefined);assert.equal(camp.clearedDay,null);assert.equal(camp.battleId,null);assert.deepEqual(camp.units.map(u=>u.id),identities);assert.ok(camp.units.every(u=>u.troops>0));assert.ok(!s.armies.some(a=>a.banditCampId));restore(s);
});
test('talent rewards transfer an existing free person without cloning or teleporting',()=>{
 const {s,city}=fixture(),p=s.campaign.domestic.people.find(p=>p.status==='FREE'&&!p.travel&&p.cityId!==city.id);assert.ok(p);const id=p.id,origin=p.cityId;assert.equal(welcomeBanditTalent(s,id,'cao',city.id,'山中贼寨'),true);assert.equal(s.campaign.domestic.people.some(p=>p.id===id),false);const o=s.campaign.idle.find(o=>o.unit.id===id);assert.equal(o.location,origin);assert.equal(o.destination,city.id);assert.ok(o.remainingDays>0);assert.equal(o.unit.troops,0);assert.equal(welcomeBanditTalent(s,id,'cao',city.id,'山中贼寨'),false);restore(s);
});
test('bandit views show only discovered reports and reuse the standard expedition picker',()=>{
 const {s,camp}=fixture();assert.doesNotMatch(banditMarkup(s,camp.id).body,/campaign-pick/);observeBanditCamps(s,'cao',p=>p.id===camp.nodeId);const html=banditMarkup(s,camp.id).body;assert.match(html,/data-task="expedition"/);assert.match(html,new RegExp(camp.units[0].name));assert.match(banditMapMarkup(s),/data-bandit-node=/);const before=serializeCampaign(s);banditMarkup(s,camp.id);banditMapMarkup(s);assert.equal(serializeCampaign(s),before);
});
