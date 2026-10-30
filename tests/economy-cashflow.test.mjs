import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor,actionCandidates,beginDomesticTurn,finishDomesticDay,decideDomesticProposal,domesticProposalText,domesticOfficer,cityFoodReserve} from '../domestic.mjs';
import {officerSalary} from '../officer-salaries.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';

function fixture(seed=1,{allAI=false,only=null}={}){
 const s=newCampaign(seed,'all-heroes-251','force-2',{allAI}),c=s.cities.find(c=>c.id==='town-31');
 s.campaign.domestic.assignments=[];s.campaign.domestic.incidents.enabled=false;c.gold=0;c.grain=20000;
 if(only)for(const [id,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&id!==only)c.domestic.cooldowns[id]=10000;
 return {s,c};
}
const appoint=(s,c,id)=>{assert.equal(assignDomestic(s,c.id,'commerce',id,{scheduled:true,faction:c.owner}),null);return assignmentFor(s,id);};

test('a city with no cash can propose a real grain sale, with commission and proceeds settled only on completion',()=>{
 for(const allAI of [false,true])for(let seed=1;seed<=8;seed++){
  const {s,c}=fixture(seed,{allAI,only:'sell'}),a=appoint(s,c,'person-367'),grain=c.grain;
  beginDomesticTurn(s);assert.equal(c.gold,0);assert.equal(c.grain,grain);
  s.campaign.domestic.assignments=s.campaign.domestic.assignments.filter(x=>x.cityId!==c.id||x===a);
  if(!allAI){assert.ok(a.proposal);assert.equal(a.proposal.expenses.gold,0);assert.equal(a.proposal.expenses.grain,1200);assert.match(domesticProposalText(s,a),/成交后.*30金手续费/);
   assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);}
  assert.equal(a.action.key,'sell');assert.equal(a.action.cost,0);
  for(let i=0;i<10;i++){
   if(i<9){assert.equal(c.gold,0);assert.equal(c.grain,grain);}
   finishDomesticDay(s);s.campaign.day++;
  }
  const event=s.campaign.activity.nodes.find(n=>n.officerId===a.officerId&&n.key==='sell'&&['complete','failure'].includes(n.phase));assert.ok(event);
  const gross=Math.floor(event.result.actual*.18*(event.result.factor>1?1.1:1)),fee=Math.min(30,gross);
  assert.equal(c.gold,gross-fee);assert.equal(c.grain,grain-event.result.actual);assert.equal(event.result.spent,fee);
  if(event.result.factor>0){assert.ok(c.gold>0);}else {assert.equal(c.gold,0);assert.equal(event.result.spent,0);}
  const paid=c.gold;finishDomesticDay(s);assert.equal(c.gold,paid,'reading another finished day cannot pay twice');
 }
});

test('cash work reserves only the shared completion-turn scheduling allowance, never unfinished money',()=>{
 const {s,c}=fixture(7,{only:'fair'}),first=appoint(s,c,'person-533'),second=appoint(s,c,'person-520'),third=appoint(s,c,'person-367');
 beginDomesticTurn(s);assert.equal(first.action.key,'fair');assert.equal(second.action,null);assert.equal(third.action,null);
 assert.equal(c.gold,0);assert.equal(c.domestic.production.gold,0);
 const before=serializeCampaign(s);assert.ok(!actionCandidates(s,second).some(p=>p.key==='fair'));assert.equal(serializeCampaign(s),before);
 first.action.remaining=20;assert.ok(actionCandidates(s,second).some(p=>p.key==='fair'),'a task finishing next turn does not occupy this turn allowance');
 first.action.remaining=5;s.campaign.day=6;c.domestic.production.gold=225;
 assert.ok(actionCandidates(s,second).some(p=>p.key==='fair'),'current credited output does not consume next turn allowance');
});

test('an in-progress sale protects promised real grain from another sale without withdrawing it early',()=>{
 const {s,c}=fixture(7,{allAI:true,only:'sell'}),first=appoint(s,c,'person-520'),second=appoint(s,c,'person-367');
 c.grain=cityFoodReserve(s,c,20)+1300;const initial=c.grain;beginDomesticTurn(s);
 assert.equal(first.action.key,'sell');assert.equal(first.action.amount,1200);assert.equal(second.action,null);assert.equal(c.grain,initial);
 assert.ok(!actionCandidates(s,second).some(p=>p.key==='sell'));
});

test('the salary curve makes early service affordable while high ranks retain a real recurring cost',()=>{
 assert.deepEqual(Array.from({length:10},(_,i)=>officerSalary({level:i+1})),[5,10,15,22,30,40,52,66,82,100]);
 assert.equal(officerSalary({level:10}),100);assert.equal(39*officerSalary({level:3}),585);
 for(const change of [a=>a.pop(),a=>a[3]=a[2],a=>a[0]=0,a=>a[2]=15.5]){
  const tables=structuredClone(DESIGN_TABLES);change(tables.economy.maintenance.officerSalaryByLevel);
  assert.ok(validateDesignTables(tables).some(e=>e.includes('officerSalaryByLevel')));
 }
 assert.equal(ECONOMY_RULES.development.workValueBase,150);
});
