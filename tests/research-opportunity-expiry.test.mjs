import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,researchDailyRate,setDomesticAutoApprove} from '../domestic.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function fixture(key='master',expires=1){
 const s=peacefulCities(newCampaign(1)),c=s.cities.find(c=>c.id==='xuchang');
 setDomesticAutoApprove(s,true);
 const u=s.campaign.idle.find(o=>o.location===c.id&&o.faction===c.owner).unit;
 // Isolate this real research action from alternative proposals; no custom
 // action, progress, merit or completion state is injected.
 for(const [id,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&id!==key)c.domestic.cooldowns[id]=1000;
 c.domestic.opportunities.push({kind:ACTIONS[key].opportunity,expires,amount:0,saved:0});
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);assert.equal(beginExecution(s),null);
 const a=assignmentFor(s,u.id);assert.equal(a.action.key,key);assert.equal(c.domestic.research.type,'militaryRegistry');
 a.action.researchRoll=0; // Fixed legal successful roll exercises the expiry boundary.
 return {s,c,u,a};
}
function days(s,n){for(let i=0;i<n;i++){if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);assert.ok(advanceCampaignDay(s).dayEnded);}}

for(const key of ['master','imitate']){
 test(`${key} expiry stops progress and merit while retaining a paid, freely resumable project`,()=>{
  const {s,c,u,a}=fixture(key);days(s,1);
  const before=structuredClone(c.domestic.research),gold=c.gold,credits=structuredClone(before.merit.credits);
  assert.ok(before.progress>0&&before.progress<100);assert.equal(researchDailyRate(s,c,a),0);
  days(s,1);
  assert.equal(a.action,null);assert.equal(c.domestic.research.progress,before.progress);
  assert.equal(c.domestic.research.workedDays,before.workedDays);assert.equal(c.gold,gold);
  assert.deepEqual(c.domestic.research.merit.credits,credits);assert.equal(c.domestic.research.spent,before.spent);
  c.domestic.cooldowns.research=0;
  assert.ok(actionCandidates(s,assignmentFor(s,u.id)).some(p=>p.key==='research'&&p.targetId===before.type&&p.cost===0));
  const event=s.campaign.domestic.events.find(e=>e.assignmentId===a.id&&e.phase==='failure');
  assert.ok(event);assert.equal(event.result.actual,before.progress);assert.equal(event.result.penalty,0);
  assert.match(event.text,/保留.*进度.*费用/);restore(s);
 });
 test(`${key} expiry cannot leave a complete locked technology or corrupt deterministic saves`,()=>{
  const {s,c}=fixture(key);days(s,7);
  assert.ok(c.domestic.research.progress<100);assert.ok(!c.domestic.techs.includes('militaryRegistry'));
  const copy=restore(s);assert.equal(serializeCampaign(copy),serializeCampaign(s));
  days(s,1);days(copy,1);assert.equal(serializeCampaign(copy),serializeCampaign(s));
 });
}
test('an opportunity lost before the first research day yields no progress or merit',()=>{
 const {s,c,a}=fixture(),before=structuredClone(c.domestic.research),gold=c.gold;
 c.domestic.opportunities=[];days(s,1);
 assert.equal(a.action,null);assert.deepEqual(c.domestic.research,before);assert.equal(c.gold,gold);
 const event=s.campaign.domestic.events.find(e=>e.assignmentId===a.id&&e.phase==='failure');
 assert.equal(event.result.actual,0);assert.equal(event.result.penalty,0);restore(s);
});
test('completion on the last valid opportunity day unlocks once and leaves a valid save',()=>{
 const {s,c,a}=fixture('master',20),gold=c.gold;
 for(let i=0;c.domestic.research.progress+researchDailyRate(s,c,a)<100;i++){assert.ok(i<15);days(s,1);}
 c.domestic.opportunities.find(o=>o.kind==='master').expires=s.campaign.day;days(s,1);
 assert.equal(a.action,null);assert.equal(c.domestic.research,null);assert.equal(c.gold,gold);
 assert.equal(c.domestic.techs.filter(x=>x==='militaryRegistry').length,1);
 assert.equal(s.campaign.domestic.events.filter(e=>e.result.reward?.technologyId==='militaryRegistry').length,1);
 restore(s);days(s,1);assert.equal(c.domestic.techs.filter(x=>x==='militaryRegistry').length,1);restore(s);
});
