import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,beginDomesticTurn,finishDomesticDay,cancelDomestic} from '../domestic.mjs';
import {finishTalentDay} from '../talent-lifecycle.mjs';
import {servingPeople,reassuranceCap} from '../talent-core.mjs';
import {makeOfficer} from '../engine.mjs';
import {OFFICER_ASSIGNMENTS} from '../data/design/assignments.mjs';

function fixture(){
 const s=peacefulCities(newCampaign(15)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);
 for(const o of servingPeople(s).values())s.campaign.domestic.loyalty[o.unit.id]=100;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='talent'&&key!=='reassure')c.domestic.cooldowns[key]=10000;
 const executor=s.campaign.idle.find(o=>o.location===c.id).unit.id;
 assert.equal(assignDomestic(s,c.id,'talent',executor),null);
 return {s,c,a:assignmentFor(s,executor),id:'liao'};
}
function warning(s,id,{loyalty=55}={}){
 Object.assign(s.campaign.talent.records[id],{idleDays:180,idleTurns:18,idlePenaltyStep:6,graceUntilDay:1,loyaltyWarning:true});
 s.campaign.domestic.loyalty[id]=loyalty;
}

test('reassurance chooses the lowest loyal resident even when that officer has a low-loyalty reminder',()=>{
 const {s,a,id}=fixture();warning(s,id,{loyalty:20});s.campaign.domestic.loyalty.yu=35;
 const before=serializeCampaign(s),pick=actionCandidates(s,a).find(p=>p.key==='reassure');
 assert.equal(pick?.targetId,id);assert.equal(serializeCampaign(s),before,'candidate inspection is read only');
});

test('long idle history does not cap reassurance below the loyalty safety line',()=>{
 const {s,a,id}=fixture();warning(s,id,{loyalty:54});
 assert.equal(reassuranceCap(s,id),100);assert.equal(actionCandidates(s,a).find(p=>p.key==='reassure')?.targetId,id);
});

test('parallel reassurance still reserves each target and selects the next lowest local loyalty',()=>{
 const {s,c,a,id}=fixture();warning(s,id,{loyalty:20});s.campaign.domestic.loyalty.yu=35;
 beginDomesticTurn(s);assert.equal(a.action.targetId,id);
 const other=s.campaign.idle.find(o=>o.location===c.id&&o.unit.id!==a.officerId);
 assert.equal(assignDomestic(s,c.id,'talent',other.unit.id),null);
 assert.equal(actionCandidates(s,assignmentFor(s,other.unit.id)).find(p=>p.key==='reassure')?.targetId,'yu');
});

test('loyalty recovery cancels a warning between ten-day boundaries and does not report twice',()=>{
 const {s,id}=fixture();warning(s,id);s.campaign.domestic.loyalty[id]=60;
 finishTalentDay(s,cancelDomestic);
 assert.equal(s.campaign.talent.records[id].loyaltyWarning,false);
 assert.equal(s.campaign.talent.records[id].idleTurns,18,'reassurance does not invent employment');
 const reports=()=>s.campaign.talent.reports.filter(r=>r.code==='loyalty-restored'&&r.personId===id);
 assert.equal(reports().length,1);assert.match(reports()[0].text,/忠诚/);
 finishTalentDay(s,cancelDomestic);assert.equal(reports().length,1);
});

test('partial recovery below the actual threshold keeps the low-loyalty reminder',()=>{
 const {s,id}=fixture();warning(s,id,{loyalty:59});finishTalentDay(s,cancelDomestic);
 assert.equal(s.campaign.talent.records[id].loyaltyWarning,true);
 assert.ok(!s.campaign.talent.reports.some(r=>r.code==='loyalty-restored'&&r.personId===id));
});

test('high-righteousness officers use their existing lower safety threshold',()=>{
 const {s}=fixture();warning(s,'dun',{loyalty:39});finishTalentDay(s,cancelDomestic);
 assert.equal(s.campaign.talent.records.dun.loyaltyWarning,true);
 s.campaign.domestic.loyalty.dun=40;s.campaign.day++;finishTalentDay(s,cancelDomestic);
 assert.equal(s.campaign.talent.records.dun.loyaltyWarning,false);
});

test('real paid reassurance clears the reminder only after its actual result and round-trips the save',()=>{
 const {s,c,a,id}=fixture();warning(s,id);
 const gold=c.gold;beginExecution(s);assert.equal(a.action?.key,'reassure');assert.equal(a.action.targetId,id);
 assert.equal(c.gold,gold-ACTIONS.reassure.cost);assert.equal(s.campaign.domestic.loyalty[id],55,'approval does not grant loyalty');
 for(let day=1;day<=10;day++){
  assert.equal(s.campaign.day,day);s.campaign.talent.seed=0;if(day===10)s.campaign.domestic.seed=1;advanceCampaignDay(s);
 }
 const result=s.campaign.domestic.events.find(e=>e.actionId!==null&&e.officerId===a.officerId&&e.result?.factor!==undefined);
 assert.ok(result?.result.actual>0);assert.ok(s.campaign.domestic.loyalty[id]>=60);
 assert.equal(s.campaign.talent.records[id].loyaltyWarning,false);assert.ok(servingPeople(s).has(id));
 assert.ok(!s.campaign.talent.reports.some(r=>r.code==='resigned'&&r.personId===id));
 const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
});

test('unsuccessful paid reassurance leaves low loyalty and its reminder intact',()=>{
 const {s,a,id}=fixture();warning(s,id,{loyalty:20});beginExecution(s);
 const actionId=a.action.id;
 for(let day=1;day<=10;day++){
  assert.equal(s.campaign.day,day);s.campaign.talent.seed=0;if(day===10)s.campaign.domestic.seed=1946;advanceCampaignDay(s);
 }
 const result=s.campaign.domestic.events.find(e=>e.actionId===actionId&&e.result?.factor!==undefined);
 assert.equal(result?.result.factor,0);assert.ok(servingPeople(s).has(id));
 assert.equal(s.campaign.talent.records[id].loyaltyWarning,true);assert.equal(s.campaign.domestic.loyalty[id],20);
});

test('additional reassurance from a real trait also includes the lowest loyal warned residents',()=>{
 const {s,c,a}=fixture(),executor=Object.keys(OFFICER_ASSIGNMENTS).find(id=>OFFICER_ASSIGNMENTS[id].traits.includes('liuTrust'));
 cancelDomestic(s,a.officerId);
 for(const town of s.cities)town.units=town.units.filter(u=>u.id!==executor);
 for(const army of s.armies)army.units=army.units.filter(u=>u.id!==executor);
 s.campaign.idle=s.campaign.idle.filter(o=>o.unit.id!==executor);
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>p.id!==executor);
 c.units.push({...makeOfficer(executor,2000),homeCity:c.id});s.campaign.domestic.loyalty[executor]=100;
 s.campaign.domestic.loyalty['person-11']=5;warning(s,'liao',{loyalty:20});warning(s,'yu',{loyalty:30});s.campaign.domestic.loyalty.jia=40;
 assert.equal(assignDomestic(s,c.id,'talent',executor),null);beginDomesticTurn(s);
 const work=assignmentFor(s,executor);assert.equal(work.action.targetId,'person-11');
 for(let day=1;day<=10;day++){s.campaign.day=day;s.campaign.talent.seed=0;if(day===10)s.campaign.domestic.seed=1;finishDomesticDay(s);}
 assert.ok(s.campaign.domestic.loyalty.liao>20);assert.ok(s.campaign.domestic.loyalty.yu>30);
 assert.ok(s.campaign.domestic.loyalty.jia>40);
});
