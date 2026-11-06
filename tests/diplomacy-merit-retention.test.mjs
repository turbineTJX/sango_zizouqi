import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {proposeDiplomatic,approveAndSign,diplomaticDay} from './helpers/diplomacy-campaign.mjs';
import {compactActivityState} from '../activity-retention.mjs';
import {totalMerit} from '../progression.mjs';
import {servingPeople} from '../talent-core.mjs';
import {validateDiplomacy,lordCity} from '../diplomacy.mjs';
import {fundCities} from './resource-fixtures.mjs';

function signedPeace(){
 const s=newCampaign(281,'guandu-200');
 const {p}=proposeDiplomatic(s);approveAndSign(s,p);diplomaticDay(s);
 return {s,p};
}

test('diplomatic contract merit survives actual activity compaction and deterministic save continuation',()=>{
 let {s,p}=signedPeace();const id=p.id,officerId=p.officerId;
 const isReward=n=>n.officerId===officerId&&['effective','fulfilled'].some(k=>n.sourceId===`merit:diplomacy-${k}:${id}:${officerId}`);
 const first=s.campaign.activity.nodes.filter(isReward);assert.equal(first.length,2);
 const initial=totalMerit(servingPeople(s).get(officerId).unit),awarded=first.reduce((v,n)=>v+n.result.growth.gained,0);
 assert.equal(awarded,90);
 // Read reports normally; unread level-up reports must not hide the defect.
 for(const n of s.campaign.activity.nodes)n.read=true;
 const lastSequence=s.campaign.activity.nextSequence-1;
 for(let i=0;i<25;i++){
  diplomaticDay(s);compactActivityState(s);
  assert.equal(s.campaign.activity.nodes.filter(n=>isReward(n)&&n.sequence>lastSequence).length,0,'same contract paid again after compaction');
  for(const n of s.campaign.activity.nodes)n.read=true;
  if(i===12)s=validateCampaign(JSON.parse(serializeCampaign(s)));
 }
 p=s.campaign.diplomacy.contracts.find(p=>p.id===id);assert.equal(p.status,'signed');
 assert.equal(s.campaign.activity.nodes.some(isReward),false,'receipt text really left the rolling ledger');
 assert.ok(totalMerit(servingPeople(s).get(officerId).unit)>=initial);
 const replay=validateCampaign(JSON.parse(serializeCampaign(s)));diplomaticDay(s);diplomaticDay(replay);
 assert.equal(serializeCampaign(s),serializeCampaign(replay));
});

test('effective merit is kept while deferred payment earns fulfilled merit later exactly once',()=>{
 const s=newCampaign(281,'guandu-200');fundCities(s,9000);lordCity(s,'sunce').gold=50000;
 const {p}=proposeDiplomatic(s,{goal:'funding',direction:'commerce',clauses:[
  {kind:'gold',from:'sunce',to:'cao',amount:500},
  {kind:'gold',from:'cao',to:'sunce',amount:550,deferred:true,dueOffset:30},
 ]});approveAndSign(s,p);
 assert.equal(p.meritAwards.effective,p.signedDay);assert.equal(p.meritAwards.fulfilled,null);
 const id=p.id,source=kind=>`merit:diplomacy-${kind}:${id}:${p.officerId}`,paid=[];
 let last=0;
 for(let i=0;i<35;i++){
  for(const n of s.campaign.activity.nodes.filter(n=>n.sequence>last))if([source('effective'),source('fulfilled')].includes(n.sourceId))paid.push(n);
  last=s.campaign.activity.nextSequence-1;
  for(const n of s.campaign.activity.nodes)n.read=true;
  diplomaticDay(s);compactActivityState(s);
 }
 assert.deepEqual(paid.map(n=>n.result.growth.gained),[30,60]);
 assert.equal(p.meritAwards.fulfilled,p.signedDay+30);
 validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('diplomatic save validation rejects lost, malformed and impossible contract merit receipts',()=>{
 const {s,p}=signedPeace(),copy=()=>structuredClone(s),contract=t=>t.campaign.diplomacy.contracts.find(q=>q.id===p.id);
 for(const invalid of [undefined,null,{}, {effective:0,fulfilled:null},{effective:null,fulfilled:s.campaign.day}, {effective:s.campaign.day+1,fulfilled:null},{effective:p.signedDay,fulfilled:p.signedDay-1},{effective:p.signedDay,fulfilled:null,extra:true}]){
  const t=copy();contract(t).meritAwards=invalid;assert.throws(()=>validateDiplomacy(t),/外交存档无效/);
 }
 const old=copy();old.campaign.diplomacy.version=1;assert.throws(()=>validateDiplomacy(old),/外交存档无效/);
 for(const key of ['initial','parentId']){
  const t=copy();contract(t)[key]=true;assert.throws(()=>validateDiplomacy(t),/外交存档无效/);
 }
});
