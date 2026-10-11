import test from 'node:test';
import assert from 'node:assert/strict';
import {planVictoryStrategy} from '../strategic-victory.mjs';
import {strategicContext} from '../strategic-context.mjs';
import {planStrategicAI,evaluateOffensive} from '../strategic-ai.mjs';
import {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {initializeVision,updateVision} from '../strategic-vision.mjs';
import {advanceScouting} from '../scouting.mjs';
import {diplomaticPair,factionsHostile} from '../diplomacy-relations.mjs';
import {evaluateDiplomaticProposal,diplomaticCandidates} from '../diplomacy.mjs';
import {evaluateCostBenefitV1,evaluateCostBenefitV2} from '../strategic-algorithm-defaults.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {planningFront} from './helpers/strategic-planning.mjs';

function geography(){
 const cities=[['a','us','north'],['b','us','north'],['bridge','rival','north'],['plain','large','south'],['next','large','south'],['far','large','south']].map(([id,owner,province])=>({id,owner,province}));
 return {faction:'us',ownCities:[{id:'a'},{id:'b'}],territory:{cities,edges:[['a','bridge'],['b','bridge'],['a','plain'],['plain','next'],['bridge','far']]},hostile:{rival:true,large:true}};
}
const proposal=({home,target})=>({faction:'yuan',staging:home,target,groups:[{c:home,units:home.units.slice(0,-1),days:0}],assaultDays:1,siegeDays:0});

test('every ruler in every original scenario retains unification as the final victory objective',()=>{
 for(const spec of NATIONAL_SCENARIOS){const s=newCampaign(119,spec.id,'cao',{allAI:true});
  for(const [f,p] of Object.entries(s.campaign.ai.factions)){
   assert.equal(p.strategy.victory.objective,'unify');assert.equal(p.strategy.victory.totalCities,s.cities.length);
   assert.equal(p.strategy.victory.ownedCities,s.cities.filter(c=>c.owner===f).length);assert.equal(p.strategy.victory.status,'active');
  }
  validateCampaign(JSON.parse(serializeCampaign(s)));
 }
});

test('unification values connecting holdings, finishing a region, known last strongholds and future corridors',()=>{
 const context=geography(),before=structuredClone(context),{victory,targets}=planVictoryStrategy(context);
 assert.equal(victory.focus.targetCity,'bridge');assert.equal(victory.focus.province,'north');
 assert.equal(targets.bridge.connection,R.victory.connectionValue);assert.equal(targets.bridge.completion,R.victory.completionValue);
 assert.equal(targets.bridge.elimination,R.victory.eliminationValue);assert.equal(targets.plain.elimination,0);
 assert.ok(targets.bridge.corridor>0);assert.ok(targets.bridge.score>targets.plain.score);assert.deepEqual(context,before);
});

test('bounded long term value can justify a locally costly route while leaving attrition costs intact',()=>{
 const {targets}=planVictoryStrategy(geography()),input={facts:{target:{kind:'city',commerce:0,grain:0},work:[],duration:30,relieveBorder:false,defense:0,victoryValue:targets.bridge},
  prediction:{estimatedLosses:1000,consumedGrain:1000,replacementGold:5000,militaryGold:0},profile:{developmentWeight:1},rules:ECONOMY_RULES.ai.offensive};
 input.facts.duration=20;
 const local=evaluateCostBenefitV1(input),long=evaluateCostBenefitV2(input);
 assert.ok(local.score<0);assert.ok(long.score>0);assert.equal(long.cost,local.cost);assert.equal(long.workCost,local.workCost);
 assert.equal(long.score-local.score,targets.bridge.score);
 input.prediction.estimatedLosses=1000000;assert.ok(evaluateCostBenefitV2(input).score<0);
});

test('regional direction persists through small changes and neutral cities remain mandatory for victory',()=>{
 const context=geography(),first=planVictoryStrategy(context);context.territory.cities.find(c=>c.id==='bridge').owner='neutral';
 const next=planVictoryStrategy(context,first.victory);assert.equal(next.victory.focus.province,'north');assert.equal(next.targets.bridge.elimination,0);
 for(const c of context.territory.cities.filter(c=>c.owner!=='neutral'))c.owner='us';
 context.ownCities=context.territory.cities.filter(c=>c.owner==='us').map(c=>({id:c.id}));
 const cleanup=planVictoryStrategy(context);assert.equal(cleanup.victory.status,'active');assert.equal(cleanup.victory.remainingCities,1);
 assert.ok(cleanup.targets.bridge.territory>first.targets.bridge.territory);
 context.territory.cities.find(c=>c.id==='bridge').owner='us';context.ownCities.push({id:'bridge'});
 assert.equal(planVictoryStrategy(context).victory.status,'achieved');
});

test('a viable unification operation reopens an unprotected peace through the shared declaration handler',()=>{
 const fixture=planningFront(),{s,home,target}=fixture,key=diplomaticPair('yuan','cao');
 s.campaign.diplomacy.wars[key].active=false;const initialGold=home.gold,initialTarget=target.owner;
 planStrategicAI(s);assert.equal(factionsHostile(s,'yuan','cao'),true);
 const g=s.campaign.ai.factions.yuan.strategy.goal,p=s.campaign.ai.plans.find(p=>p.faction==='yuan');
 assert.equal(g.targetCity,target.id);assert.ok(g.victoryValue.score>0);assert.match(g.reason,/全国统一/);
 assert.ok(s.campaign.activity.nodes.some(n=>n.result?.event==='war'||n.text.includes('宣战')));
 assert.ok(p&&p.phase==='attack'&&s.armies.some(a=>a.faction==='yuan'&&a.target===target.id));assert.equal(home.gold,initialGold);assert.equal(target.owner,initialTarget);
});

test('victory ambition cannot declare war or depart with unaffordable replacement or active protection',()=>{
 const {s,home}=planningFront(),key=diplomaticPair('yuan','cao');s.campaign.diplomacy.wars[key].active=false;home.gold=0;
 planStrategicAI(s);assert.equal(factionsHostile(s,'yuan','cao'),false);assert.equal(s.campaign.ai.plans.filter(p=>p.faction==='yuan').length,0);
 const fixture=planningFront(),protectedState=fixture.s;protectedState.campaign.diplomacy.wars[key].active=false;
 protectedState.campaign.diplomacy.contracts.push({id:'test-protection',status:'signed',factions:['yuan','cao'],sites:{},clauses:[{kind:'nonaggression',from:'yuan',to:'cao',status:'active',effectiveDay:1,untilDay:20}]});
 planStrategicAI(protectedState);assert.equal(factionsHostile(protectedState,'yuan','cao'),false);assert.equal(protectedState.campaign.ai.plans.filter(p=>p.faction==='yuan').length,0);
});

test('unification assessments cannot see hidden foreign ownership, resources, orders or random outcomes',()=>{
 const fixture=planningFront(),{s,target}=fixture;target.x=500;initializeVision(s);
 const before=strategicContext(s,'yuan'),assessment=evaluateOffensive(s,proposal(fixture));
 target.owner='lu';target.grain=999999;target.gold=0;target.units.forEach(u=>u.troops*=20);s.seed+=200;
 assert.deepEqual(strategicContext(s,'yuan'),before);assert.deepEqual(evaluateOffensive(s,proposal(fixture)),assessment);
 assert.deepEqual(planVictoryStrategy(strategicContext(s,'yuan')),planVictoryStrategy(before));
});

test('an unknown peaceful main direction obtains real scouting before any declaration or departure',()=>{
 const {s,target}=planningFront();s.campaign.diplomacy.wars[diplomaticPair('yuan','cao')].active=false;target.x=500;initializeVision(s);
 planStrategicAI(s);const scout=s.campaign.scouting.tasks.find(t=>t.faction==='yuan'&&t.targetCity===target.id);assert.ok(scout);
 assert.equal(factionsHostile(s,'yuan','cao'),false);assert.equal(s.campaign.ai.plans.filter(p=>p.faction==='yuan').length,0);
 assert.equal(strategicContext(s,'yuan').reports.find(r=>r.id===target.id).known,false);
 advanceScouting(s);updateVision(s);assert.equal(strategicContext(s,'yuan').reports.find(r=>r.id===target.id).known,true);
});

test('recovery keeps the final objective and victory direction changes only at the next ten day review',()=>{
 const {s,home,target}=planningFront();home.units=[];planStrategicAI(s);
 const strategy=s.campaign.ai.factions.yuan.strategy;assert.ok(['develop','recover'].includes(strategy.goal.kind));assert.match(strategy.goal.reason,/统一/);
 const first=structuredClone(strategy);target.owner='yuan';target.domestic.owner='yuan';s.campaign.day=2;updateVision(s);planStrategicAI(s);
 assert.deepEqual(s.campaign.ai.factions.yuan.strategy,first);
 s.campaign.day=11;s.turn=2;updateVision(s);planStrategicAI(s);
 const next=s.campaign.ai.factions.yuan.strategy;assert.equal(next.victory.ownedCities,first.victory.ownedCities+1);assert.equal(next.revision,first.revision+1);
});

test('peace with a selected main opponent has a real unification opportunity cost',()=>{
 const {s,target}=planningFront(),p={goal:'peace',factions:['yuan','cao'],clauses:[{kind:'peace',from:'yuan',to:'cao',duration:30}]};
 const before=evaluateDiplomaticProposal(s,p,'yuan');planStrategicAI(s);
 assert.equal(s.campaign.ai.factions.yuan.strategy.goal.targetFaction,target.owner);
 const after=evaluateDiplomaticProposal(s,p,'yuan');assert.ok(after.cost>before.cost||before.cost>0);
});

test('automatic peace renewal yields to the unification direction but remains available during real recovery',()=>{
 const {s,home,target}=planningFront(),clauses=[{id:1,kind:'nonaggression',from:'yuan',to:'cao',duration:30,status:'active',effectiveDay:1,untilDay:3}];
 s.campaign.diplomacy.contracts.push({id:'test-renewal',status:'signed',factions:['yuan','cao'],sites:{},clauses,signedTerms:JSON.stringify({clauses})});
 const options=()=>diplomaticCandidates(s,{faction:'yuan',direction:'negotiation',homeCity:home.id}).filter(c=>c.goal==='renew'&&c.other==='cao');
 assert.equal(options().length,1);
 const strategy=s.campaign.ai.factions.yuan.strategy;strategy.victory.focus={province:target.province,targetCity:target.id,reason:'统一方向'};
 assert.equal(options().length,0);
 home.grain=1;assert.equal(options().length,1);
});

test('final objectives and score evidence survive deterministic ordinary all AI continuation and reject malformed saves',()=>{
 const s=newCampaign(119,'guandu-200','cao',{allAI:true});advanceCampaignDay(s);
 const saved=serializeCampaign(s),copy=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(copy),saved);
 assert.ok(Object.values(s.campaign.ai.factions).every(p=>p.strategy.victory.objective==='unify'&&p.strategy.trace.at(-1).victory.objective==='unify'));
 advanceCampaignDay(s);advanceCampaignDay(copy);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 for(const edit of [x=>delete x.campaign.ai.factions.cao.strategy.victory,x=>x.campaign.ai.factions.cao.strategy.victory.ownedCities++,x=>x.campaign.ai.factions.cao.strategy.victory.objective='survive',x=>x.campaign.ai.factions.cao.strategy.trace[0].victory.remainingCities=-1]){
  const bad=JSON.parse(saved);edit(bad);assert.throws(()=>validateCampaign(bad),/战略AI/);
 }
 const malformed=JSON.parse(saved),capture=Object.values(malformed.campaign.ai.factions).find(p=>p.strategy.goal.victoryValue);
 assert.ok(capture);capture.strategy.goal.victoryValue.score=1e9;assert.throws(()=>validateCampaign(malformed),/战略AI/);
});
