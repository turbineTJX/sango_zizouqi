import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {diplomaticRelation,diplomaticTradeMultiplier,diplomaticActionUnlocked,diplomaticAccessError} from '../diplomatic-access.mjs';
import {diplomaticRelationsMarkup} from '../diplomatic-matrix.mjs';
import {diplomaticCandidates,diplomaticOfficerCandidates,setDiplomaticGoal,lordCity,assignDiplomat,prepareDiplomaticProposal} from '../diplomacy.mjs';
import {DIPLOMACY_RELATION_ACTIONS} from '../data/design/diplomacy-rules.mjs';

function fixture(relation){
 const s=newCampaign(281,'guandu-200');fundCities(s,9000);
 s.campaign.diplomacy.relations['cao:sunce']=relation;
 lordCity(s,'cao').grain=2000;
 return s;
}
test('every action unlocks exactly at its shared relation threshold in both directions',()=>{
 const s=fixture(0);
 for(const [key,a]of Object.entries(DIPLOMACY_RELATION_ACTIONS)){
  if(a.minimum){s.campaign.diplomacy.relations['cao:sunce']=a.minimum-1;assert.equal(diplomaticActionUnlocked(s,'cao','sunce',key),false);}
  s.campaign.diplomacy.relations['cao:sunce']=a.minimum;
  assert.equal(diplomaticActionUnlocked(s,'sunce','cao',key),true);
 }
 for(const [relation,multiplier]of [[0,1.5],[39,1.5],[40,1.2],[59,1.2],[60,1.1],[79,1.1],[80,1],[100,1]]){
  s.campaign.diplomacy.relations['cao:sunce']=relation;
  assert.equal(diplomaticTradeMultiplier(s,'cao','sunce'),multiplier);
 }
 assert.equal(diplomaticRelation(s,'sunce','cao'),100);
});
test('faction matrix shows all action columns, real relation and locks without changing the save',()=>{
 const s=fixture(55),before=serializeCampaign(s),html=diplomaticRelationsMarkup(s);
 const row=html.match(/<tr data-diplomatic-faction="sunce">([\s\S]*?)<\/tr>/)[1];
 assert.match(row,/>55<\/td>/);assert.match(row,/>1\.2×<\/td>/);
 assert.match(row,/data-diplomatic-action="buyGrain" data-unlocked="true"/);
 assert.match(row,/data-diplomatic-action="border" data-unlocked="true"[^>]*title="换城按城池价值/);
 for(const [key,a]of Object.entries(DIPLOMACY_RELATION_ACTIONS)){assert.ok(html.includes(`<th scope="col">${a.name}</th>`));assert.ok(row.includes(`data-diplomatic-action="${key}"`));}
 assert.equal(serializeCampaign(s),before);
});
test('locked actions reject direct policy and exact-term proposal bypasses; peace and ransom remain open',()=>{
 const s=fixture(0),before=serializeCampaign(s);
 assert.equal(setDiplomaticGoal(s,'trade','sunce'),'通商需交情50');
 assert.equal(serializeCampaign(s),before);
 const base={factions:['cao','sunce'],goal:'auto'};
 assert.equal(diplomaticAccessError(s,{...base,clauses:[{kind:'peace'}]}),null);
 assert.equal(diplomaticAccessError(s,{...base,clauses:[{kind:'prisoner',from:'sunce'}]}),null);
 assert.equal(diplomaticAccessError(s,{...base,clauses:[{kind:'prisoner',from:'sunce'},{kind:'prisoner',from:'cao'}]}),'换俘需交情40');
 const o=diplomaticOfficerCandidates(s,'cao','commerce')[0];assignDiplomat(s,o.unit.id,'commerce',{choice:'now'});
 const a=s.campaign.diplomacy.assignments.find(a=>a.officerId===o.unit.id);
 setDiplomaticGoal(s,'buyGrain');assert.equal(diplomaticCandidates(s,a).filter(c=>c.other==='sunce').length,0);
 const target=lordCity(s,'sunce');
 const proposal=prepareDiplomaticProposal(s,a,{goal:'buyGrain',other:'sunce',clauses:[{kind:'grain',from:'sunce',to:'cao',amount:500}],path:[],targetCity:target.id,score:60,reason:'gate test'});
 assert.equal(proposal,null);assert.equal(a.waiting,'购粮需交情30');
});
test('ordinary friendship increases purchase cost and high friendship improves the actual quote',()=>{
 const s=fixture(55),o=diplomaticOfficerCandidates(s,'cao','commerce')[0],a={faction:'cao',officerId:o.unit.id,homeCity:o.location,direction:'commerce'};
 assert.equal(setDiplomaticGoal(s,'buyGrain','sunce'),null);
 const quote=()=>diplomaticCandidates(s,a).find(c=>c.other==='sunce'&&c.goal==='buyGrain');
 const ordinary=quote();assert.ok(ordinary);
 s.campaign.diplomacy.relations['cao:sunce']=85;const friendly=quote();assert.ok(friendly);
 assert.equal(ordinary.clauses.find(c=>c.kind==='grain').amount,friendly.clauses.find(c=>c.kind==='grain').amount);
 assert.equal(ordinary.clauses.find(c=>c.kind==='gold').amount,Math.ceil(friendly.clauses.find(c=>c.kind==='gold').amount*1.2));
});
