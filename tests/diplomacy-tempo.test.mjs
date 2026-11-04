import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {diplomaticCandidates,diplomaticOfficerCandidates,prepareDiplomaticProposal,lordCity,setDiplomaticGoal,approveDiplomaticProposal,advanceDiplomacy,evaluateDiplomaticProposal} from '../diplomacy.mjs';
import {DIPLOMACY_WORK} from '../data/design/diplomacy-rules.mjs';
import {observeFixtureCity} from './helpers/observed-city.mjs';
import {isMainCity} from '../city-classification.mjs';
import {factionLord,servingPeople} from '../talent-core.mjs';
import {diplomaticProposalMarkup} from '../diplomacy-view.mjs';
import {NATIONAL_SCENARIOS} from '../national-scenarios.mjs';
import {factionsHostile} from '../diplomacy-relations.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {diplomaticAccessError} from '../diplomatic-access.mjs';
import {updateVision,intelligenceWorld} from '../strategic-vision.mjs';

function borderFixture(faction='cao'){
 const s=newCampaign(81),a=s.cities.find(c=>c.id==='chenliu'),b=s.cities.find(c=>c.id==='ye');
 // Deliberately interleave real neighboring holdings to create an actual
 // connection benefit. Production and ordinary campaign audits stay unmodified.
 [a.owner,b.owner]=[b.owner,a.owner];a.domestic.owner=a.owner;b.domestic.owner=b.owner;
 const other=faction==='cao'?'yuan':'cao';
 s.campaign.diplomacy.relations[['cao','yuan'].sort().join(':')]=100;
 for(const c of s.cities.filter(c=>c.owner===other))observeFixtureCity(s,c.id,faction,100);
 const o=diplomaticOfficerCandidates(s,faction,'negotiation')[0];assert.ok(o);
 const assignment={faction,officerId:o.unit.id,homeCity:o.location,direction:'negotiation',waiting:''};
 return {s,assignment,other};
}

test('unrelated diplomatic priorities never generate city exchanges',()=>{
 const {s,assignment,other}=borderFixture();
 assert.equal(setDiplomaticGoal(s,'border',other),null);
 assert.ok(diplomaticCandidates(s,assignment).some(c=>c.goal==='border'),'the fixture can propose a useful exchange');
 for(const goal of ['auto','friendship','buyGrain','trade','funding','intelligence']){
  assert.equal(setDiplomaticGoal(s,goal,other),null);
  const saved=serializeCampaign(s),candidates=diplomaticCandidates(s,assignment);
  assert.ok(candidates.every(c=>!c.clauses.some(x=>x.kind==='city')),goal);
  assert.equal(serializeCampaign(s),saved);
 }
});

test('AI city exchange is available on any turn when observed geography benefits both sides',()=>{
 for(const turn of [1,6,7,60]){
  const {s,assignment,other}=borderFixture('yuan');assert.equal(setDiplomaticGoal(s,'border',other,{faction:'yuan',scheduled:true}),null);
  s.turn=turn;s.campaign.day=(turn-1)*10+1;for(const c of s.cities.filter(c=>c.owner===other))observeFixtureCity(s,c.id,'yuan',1000);
  const candidate=diplomaticCandidates(s,assignment).find(c=>c.goal==='border');assert.ok(candidate);
  assert.equal(DIPLOMACY_WORK.city.days,30);assert.ok(prepareDiplomaticProposal(s,assignment,candidate));
 }
});

test('city exchange requires visible cities and better road connections for both factions',()=>{
 const {s,assignment,other}=borderFixture();setDiplomaticGoal(s,'border',other);
 assert.ok(diplomaticCandidates(s,assignment).some(c=>c.goal==='border'));
 s.campaign.vision.factions.cao.scouted=[];
 assert.ok(diplomaticCandidates(s,assignment).every(c=>c.goal!=='border'),'hidden cities cannot be offered using stale observation');
 const q=newCampaign(81);q.campaign.diplomacy.relations['cao:yuan']=100;const o=diplomaticOfficerCandidates(q,'cao','negotiation')[0];setDiplomaticGoal(q,'border','yuan');
 for(const c of q.cities.filter(c=>c.owner==='yuan'))observeFixtureCity(q,c.id,'cao');
 assert.ok(diplomaticCandidates(q,{faction:'cao',officerId:o.unit.id,homeCity:lordCity(q,'cao').id,direction:'negotiation'}).every(c=>c.goal!=='border'),'ordinary connected territories have no exchange need');
});

test('city exchanges require multiple original main cities on both sides',()=>{
 for(const blocked of ['cao','yuan']){
  const {s,assignment,other}=borderFixture();setDiplomaticGoal(s,'border',other);
  assert.ok(diplomaticCandidates(s,assignment).some(c=>c.goal==='border'));
  for(const c of s.cities.filter(c=>c.owner===blocked&&isMainCity(c)&&c.id!==lordCity(s,blocked).id)){c.owner='neutral';c.domestic.owner='neutral';observeFixtureCity(s,c.id,assignment.faction);}
  assert.ok(diplomaticCandidates(s,assignment).every(c=>c.goal!=='border'),blocked);
 }
});

function exchangeProposal(){
 const fixture=borderFixture(),{s,assignment,other}=fixture;setDiplomaticGoal(s,'border',other);
 s.campaign.diplomacy.relations['cao:yuan']=80;
 const candidate=diplomaticCandidates(s,assignment).find(c=>c.goal==='border');assert.ok(candidate);
 return {...fixture,candidate};
}

test('direct proposals cannot attach cities to gifts, exchange capitals or bypass city-count requirements',()=>{
 for(const invalid of ['gift','caoCapital','yuanCapital','caoSingle','yuanSingle']){
  const {s,assignment,candidate}=exchangeProposal();
  if(invalid==='gift')candidate.goal='friendship';
  else if(invalid.endsWith('Capital')){const f=invalid.slice(0,-7);candidate.clauses.find(c=>c.kind==='city'&&c.from===f).cityId=lordCity(s,f).id;}
  else {const f=invalid.slice(0,-6);for(const c of s.cities.filter(c=>c.owner===f&&isMainCity(c)&&c.id!==lordCity(s,f).id)){c.owner='neutral';c.domestic.owner='neutral';observeFixtureCity(s,c.id,assignment.faction);}}
  const gold=s.cities.map(c=>c.gold);assert.equal(prepareDiplomaticProposal(s,assignment,candidate),null,invalid);
  assert.deepEqual(s.cities.map(c=>c.gold),gold);assert.equal(s.campaign.diplomacy.proposals.length,0);
 }
});

function moveLord(s,f,cityId){
 const o=servingPeople(s).get(factionLord(s,f)),from=s.cities.find(c=>c.id===o.location),to=s.cities.find(c=>c.id===cityId);
 from.units=from.units.filter(u=>u!==o.unit);to.units.push(o.unit);o.unit.homeCity=to.id;
}

test('approval and signing recheck original territory and both capitals for player and AI',()=>{
 for(const invalid of ['territory','capital'])for(const phase of ['approval','signing']){
  const {s,assignment,candidate}=exchangeProposal(),p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p,assignment.waiting);p.status='pending';
  if(phase==='signing'){assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);assert.equal(approveDiplomaticProposal(s,p.id,p.version,{faction:'yuan',automatic:true}),null);}
  if(invalid==='capital'){const f=phase==='approval'?'cao':'yuan';moveLord(s,f,p.clauses.find(c=>c.kind==='city'&&c.from===f).cityId);}
  else for(const c of s.cities.filter(c=>c.owner==='cao'&&isMainCity(c)&&c.id!==lordCity(s,'cao').id)){c.owner='neutral';c.domestic.owner='neutral';}
  if(phase==='approval'){
   assert.ok(approveDiplomaticProposal(s,p.id,p.version),invalid);
   const ai=structuredClone(s);ai.campaign.allAI=true;
   assert.ok(approveDiplomaticProposal(ai,p.id,p.version,{faction:'cao',automatic:true}),invalid);
   assert.deepEqual(p.approvals,{});
  }else {advanceDiplomacy(s);assert.equal(p.status,'cancelled',invalid);assert.equal(s.campaign.diplomacy.contracts.length,0);}
 }
});

test('handover cancels before evacuating a city that became a capital or the last original main city',()=>{
 for(const invalid of ['capital','territory']){
  const {s,assignment,candidate}=exchangeProposal(),p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p);p.status='pending';
  assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);assert.equal(approveDiplomaticProposal(s,p.id,p.version,{faction:'yuan',automatic:true}),null);
  advanceDiplomacy(s);assert.equal(p.status,'signed');
  if(invalid==='capital')moveLord(s,'cao',p.clauses.find(c=>c.kind==='city'&&c.from==='cao').cityId);
  else for(const c of s.cities.filter(c=>c.owner==='cao'&&isMainCity(c)&&c.id!==lordCity(s,'cao').id)){c.owner='neutral';c.domestic.owner='neutral';}
  const owners=s.cities.map(c=>c.owner),people=s.cities.map(c=>c.units.map(u=>u.id));
  s.campaign.day++;advanceDiplomacy(s);assert.ok(p.failure,invalid);
  assert.ok(p.clauses.filter(c=>c.kind==='city').every(c=>c.status==='failed'));assert.deepEqual(s.cities.map(c=>c.owner),owners);assert.deepEqual(s.cities.map(c=>c.units.map(u=>u.id)),people);
 }
});

test('ordinary opening diplomacy does not casually offer cities',()=>{
 for(const scenario of NATIONAL_SCENARIOS){const s=newCampaign(81,scenario.id);s.campaign.allAI=true;
  for(const f of Object.keys(s.campaign.diplomacy.policies)){const o=diplomaticOfficerCandidates(s,f,'negotiation')[0];if(!o)continue;
   assert.ok(diplomaticCandidates(s,{faction:f,officerId:o.unit.id,homeCity:o.location,direction:'negotiation'}).every(c=>!c.clauses.some(c=>c.kind==='city')),scenario.id+':'+f);
  }
 }
});

test('gift details identify settlement cities separately from the actual offered terms',()=>{
 const {s,assignment,candidate}=exchangeProposal();candidate.goal='friendship';candidate.clauses=[{kind:'gold',from:'yuan',to:'cao',amount:150,gift:true}];
 const p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p);const before=serializeCampaign(s),html=diplomaticProposalMarkup(s,p);
 assert.equal((html.match(/class="diplomatic-settlement-site"/g)||[]).length,2);
 assert.match(html,/收支地点：/);assert.doesNotMatch(html,/移交城池/);assert.equal(serializeCampaign(s),before);
});

test('war does not block useful city exchanges and exchanging land does not silently end the war',()=>{
 for(const war of [true,false]){
  const {s,assignment,candidate}=exchangeProposal();s.campaign.diplomacy.wars['cao:yuan'].active=war;
  const current=diplomaticCandidates(s,assignment).find(c=>c.goal==='border');assert.ok(current);
  assert.ok(current.clauses.every(c=>!['peace','nonaggression'].includes(c.kind)));
  const p=prepareDiplomaticProposal(s,assignment,current);assert.ok(p);p.status='pending';
  assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);assert.equal(approveDiplomaticProposal(s,p.id,p.version,{faction:'yuan',automatic:true}),null);
  advanceDiplomacy(s);assert.equal(p.status,'signed');assert.equal(factionsHostile(s,'cao','yuan'),war);
 }
});

function cessionFixture(){
 const fixture=exchangeProposal(),{s,candidate}=fixture;s.campaign.diplomacy.relations['cao:yuan']=0;
 candidate.goal='peace';candidate.clauses=[candidate.clauses.find(c=>c.kind==='city'&&c.from==='cao'),{kind:'peace',from:'cao',to:'yuan',duration:30,after:[1]},{kind:'nonaggression',from:'cao',to:'yuan',duration:30,after:[1]},{kind:'nonaggression',from:'yuan',to:'cao',duration:30,after:[1]}];
 return fixture;
}

test('one-sided land for peace uses the peace threshold, protects capitals and permits a one-main-city recipient',()=>{
 const {s,assignment,candidate}=cessionFixture();
 for(const c of s.cities.filter(c=>c.owner==='yuan'&&isMainCity(c)&&c.id!==lordCity(s,'yuan').id)){c.owner='neutral';c.domestic.owner='neutral';observeFixtureCity(s,c.id,'cao');}
 assert.equal(diplomaticAccessError(s,{...candidate,factions:['cao','yuan']}),null);
 const city=candidate.clauses[0].cityId;candidate.clauses[0].cityId=lordCity(s,'cao').id;
 assert.equal(prepareDiplomaticProposal(s,assignment,candidate),null,'a peace promise cannot buy the capital');
 candidate.clauses[0].cityId=city;
 const p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p,assignment.waiting);assert.match(diplomaticProposalMarkup(s,p),/割地停战/);
});

test('invalid city concessions or early peace cannot be hidden under a peace heading',()=>{
 for(const invalid of ['noPeace','earlyPeace']){
  const {s,assignment,candidate}=cessionFixture();
  if(invalid==='noPeace')candidate.clauses=candidate.clauses.filter(c=>c.kind!=='peace');
  else delete candidate.clauses.find(c=>c.kind==='peace').after;
  assert.equal(prepareDiplomaticProposal(s,assignment,candidate),null,invalid);
 }
 const {s,assignment,candidate}=cessionFixture(),p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p);p.status='pending';
 assert.equal(approveDiplomaticProposal(s,p.id,p.version),null);assert.equal(approveDiplomaticProposal(s,p.id,p.version,{faction:'yuan',automatic:true}),null);
 advanceDiplomacy(s);assert.equal(p.status,'signed');assert.ok(p.clauses.filter(c=>['peace','nonaggression'].includes(c.kind)).every(c=>c.status==='waiting'));assert.ok(factionsHostile(s,'cao','yuan'));
 moveLord(s,'cao',p.clauses[0].cityId);s.campaign.day++;advanceDiplomacy(s);
 assert.equal(p.status,'failed');assert.ok(factionsHostile(s,'cao','yuan'));assert.equal(s.cities.find(c=>c.id===p.clauses[0].cityId).owner,'cao');
});

test('a severe visible threat can produce land for peace while a quiet opening and hidden or unrelated armies cannot',()=>{
 const {s,assignment,other}=borderFixture();s.campaign.diplomacy.relations['cao:yuan']=0;setDiplomaticGoal(s,'peace',other);
 const peace=()=>diplomaticCandidates(s,assignment).find(c=>c.goal==='peace');
 assert.ok(peace());assert.ok(peace().clauses.every(c=>c.kind!=='city'));
 // Mobilize an actual foreign unit and reduce our own garrisons without
 // creating soldiers; the removed men remain in their original city stocks.
 for(const c of s.cities.filter(c=>c.owner==='cao'))for(const u of c.units){const keep=Math.min(u.troops,10);c.manpower+=u.troops-keep;u.troops=keep;}
 const foreign=s.cities.find(c=>c.owner===other&&c.units.some(u=>u.id!==factionLord(s,other)&&u.troops>0)),unit=foreign.units.find(u=>u.id!==factionLord(s,other)&&u.troops>0),army=fieldFromCity(s,foreign.id,{ids:[unit.id]});
 army.location=lordCity(s,'cao').id;observeFixtureCity(s,army.location,'cao',100);
 const saved=serializeCampaign(s),proposal=peace();assert.ok(proposal?.clauses.some(c=>c.kind==='city'));assert.equal(serializeCampaign(s),saved);
 const assessment=evaluateDiplomaticProposal(s,{...proposal,factions:['cao',other]},'cao');assert.ok(assessment.approve);
 army.location=foreign.id;s.campaign.vision.factions.cao.scouted=[];updateVision(s);
 assert.ok(!intelligenceWorld(s,'cao').armies.some(a=>a.id===army.id));assert.ok(peace().clauses.every(c=>c.kind!=='city'));
 army.location=lordCity(s,'cao').id;observeFixtureCity(s,army.location,'cao',100);
 s.campaign.diplomacy.wars['cao:yuan'].active=false;assert.equal(peace(),undefined);
 s.campaign.diplomacy.wars['cao:yuan'].active=true;army.faction='neutral';assert.ok(peace().clauses.every(c=>c.kind!=='city'));
});

test('city transactions use value and compensation rather than a hard friendship threshold',()=>{
 const {s,assignment,candidate}=exchangeProposal();s.campaign.diplomacy.relations['cao:yuan']=0;
 assert.equal(setDiplomaticGoal(s,'border','yuan'),null);
 const offer={...candidate,clauses:structuredClone(candidate.clauses),factions:['cao','yuan']},before=serializeCampaign(s),cheap=evaluateDiplomaticProposal(s,offer,'yuan');
 assert.equal(cheap.approve,false);assert.equal(serializeCampaign(s),before);
 const capital=lordCity(s,'cao');capital.gold+=100000;
 candidate.clauses.push({kind:'gold',from:'cao',to:'yuan',amount:50000});
 assert.ok(evaluateDiplomaticProposal(s,{...candidate,factions:['cao','yuan']},'yuan').approve,'a sufficient real payment can overcome low friendship');
 const p=prepareDiplomaticProposal(s,assignment,candidate);assert.ok(p,assignment.waiting);
 assert.ok(p.clauses.some(c=>c.kind==='gold'&&c.amount===50000));assert.ok(p.clauses.filter(c=>c.kind==='city').every(c=>s.cities.find(t=>t.id===c.cityId).owner===c.from));
 s.campaign.diplomacy.relations['cao:yuan']=100;
 assert.ok(evaluateDiplomaticProposal(s,offer,'yuan').score>cheap.score,'friendship affects the quote, rather than access');
});

test('city prices include actual retained inventory and completed development',()=>{
 const {s,candidate}=exchangeProposal(),offer={...candidate,factions:['cao','yuan']},city=s.cities.find(c=>c.id===candidate.clauses.find(c=>c.kind==='city'&&c.from==='cao').cityId),base=evaluateDiplomaticProposal(s,offer,'cao').cost;
 city.gold+=1000;assert.ok(evaluateDiplomaticProposal(s,offer,'cao').cost>=base+1000);
 const stock=evaluateDiplomaticProposal(s,offer,'cao').cost;city.commerce++;assert.ok(evaluateDiplomaticProposal(s,offer,'cao').cost>stock);
});
