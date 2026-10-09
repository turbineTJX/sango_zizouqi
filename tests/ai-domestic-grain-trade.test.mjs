import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,advanceCampaignDay} from '../strategic-campaign.mjs';
import {ACTIONS,grainCapacity,assignDomestic,assignmentFor,actionCandidates,beginDomesticTurn,decideDomesticProposal} from '../domestic.mjs';

function fixture(allAI){
 const s=newCampaign(20261009,'guandu-200','cao',{allAI}),c=s.cities.find(c=>c.id==='xuchang');
 s.campaign.domestic.incidents.enabled=false;c.gold=5000;c.grain=grainCapacity(c)-431.4;c.budget.grainReserve=grainCapacity(c)*2;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction===ACTIONS.buy.direction&&key!=='buy')c.domestic.cooldowns[key]=10000;
 const id=c.units[0].id;assert.equal(assignDomestic(s,c.id,ACTIONS.buy.direction,id,{faction:'cao',scheduled:allAI}),null);
 return {s,c,a:assignmentFor(s,id)};
}
for(const allAI of [false,true])test((allAI?'AI':'player')+' grain purchase floors fractional warehouse space before approval and save',()=>{
 const {s,c,a}=fixture(allAI),before=serializeCampaign(s),pick=actionCandidates(s,a).find(x=>x.key==='buy');
 assert.ok(pick);assert.equal(pick.amount,431);assert.equal(serializeCampaign(s),before);
 // The malformed fractional fixture probes quote rounding only. Actual orders
 // start from whole stock, and save validation rejects fractional inventories.
 assert.throws(()=>validateCampaign(JSON.parse(before)),/资源须为非负整数/);c.grain=Math.ceil(c.grain);
 const gold=c.gold;beginDomesticTurn(s);
 if(!allAI){assert.ok(a.proposal);assert.equal(c.gold,gold);assert.equal(decideDomesticProposal(s,a.proposal.id,true),null);}
 assert.equal(a.action.key,'buy');assert.equal(a.action.amount,431);
 const paid=s.campaign.domestic.assignments.filter(x=>x.cityId===c.id&&x.action).reduce((n,x)=>n+x.action.cost,0);
 assert.equal(c.gold,gold-paid);
 assert.equal(serializeCampaign(validateCampaign(JSON.parse(serializeCampaign(s)))),serializeCampaign(s));
});
test('AI grain purchase with fractional stock remains saveable through actual daily execution',()=>{
 const {s,c,a}=fixture(true);c.grain=Math.ceil(c.grain);beginDomesticTurn(s);assert.equal(a.action.key,'buy');
 for(let i=0;i<10;i++){const day=s.campaign.day;advanceCampaignDay(s);assert.equal(s.campaign.day,day+1);validateCampaign(JSON.parse(serializeCampaign(s)));}
});
