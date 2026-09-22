import {cityForce} from '../city-units.mjs';
import {peacefulCities,invadeFromGuandu,expeditionFrom} from './helpers/field-campaign.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {recruitCityUnits,launchExpedition,newCampaign,appointGovernor,cityGovernor,cityIncome,createCampaignArmy,recruitCampaign,splitCampaignArmy,mergeCampaignArmies,orderCampaignArmy,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {DIRECTIONS,ACTIONS,assignDomestic,assignmentFor} from '../domestic.mjs';
import {residentOfficer,cityPersonnel} from '../city-personnel.mjs';
import {campaignOfficers,pickerReason} from '../strategic-roster.mjs';
import {issueCommand} from '../engine.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function peaceful(seed=81){const s=newCampaign(seed);peacefulCities(s);s.gold=40000;return s;}
function advance(s,to){for(let i=0;i<500&&s.campaign.day<to;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,to);}

test('prepared officers can take every civil direction and govern without duplicating their units',()=>{
 const s=peaceful(),a=cityForce(s.cities.find(c=>c.id==='xuchang')),u=a.units[1],c=s.cities.find(c=>c.id===a.location);
 for(const direction of Object.keys(DIRECTIONS))assert.equal(assignDomestic(s,c.id,direction,u.id),null);
 assert.equal(appointGovernor(s,c.id,u.id),null);assert.strictEqual(cityGovernor(s,c).unit,u);
 assert.equal(cityPersonnel(s,c.id).filter(o=>o.unit.id===u.id).length,1);
 const row=campaignOfficers(s).find(r=>r.unit.id===u.id);assert.match(row.duty,/太守/);assert.match(row.duty,/人才负责人/);assert.ok(row.cityUnit);
 assert.equal(pickerReason(s,row,{task:'domestic',city:c.id,direction:'commerce'}),'');
 assert.equal(s.campaign.idle.some(o=>o.unit.id===u.id),false);restore(s);
});

test('compiling, recruiting, splitting and merging preserve appointments; an actual march order ends only departing duties',()=>{
 const s=peaceful(),c=s.cities.find(c=>c.id==='xuchang'),o=s.campaign.idle.find(o=>o.location===c.id),a=cityForce(c);
 assert.equal(appointGovernor(s,c.id,o.unit.id),null);assert.equal(assignDomestic(s,c.id,'commerce',o.unit.id),null);
 const appointment=assignmentFor(s,o.unit.id),income=cityIncome(s,c);
 assert.equal(createCampaignArmy(s,c.id,[o.unit.id]),null);assert.strictEqual(assignmentFor(s,o.unit.id),appointment);assert.equal(c.governor,o.unit.id);assert.deepEqual(cityIncome(s,c),income);restore(s);
 assert.equal(recruitCityUnits(s,c.id,[o.unit.id]),null);assert.strictEqual(assignmentFor(s,o.unit.id),appointment);assert.equal(s.armies.length,0);
 const stay=c.units.find(u=>u.id!==o.unit.id);assert.equal(assignDomestic(s,c.id,'agriculture',stay.id),null);
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:[o.unit.id],leader:o.unit.id,advisor:o.unit.id,deputy:null,target:'chenliu',policy:'auto'}),null);
 assert.equal(assignmentFor(s,o.unit.id),undefined);assert.equal(c.governor,null);assert.ok(assignmentFor(s,stay.id));assert.equal(residentOfficer(s,o.unit.id),undefined);restore(s);
 assert.ok(assignDomestic(s,c.id,'commerce',o.unit.id));assert.ok(appointGovernor(s,c.id,o.unit.id));
});

test('an unfilled prepared unit keeps its civil job, earns governor growth, and continues deterministically',()=>{
 const s=peaceful(),o=s.campaign.idle.find(o=>o.location==='xuchang'),id=o.unit.id;
 assert.equal(assignDomestic(s,'xuchang','commerce',id),null);assert.equal(appointGovernor(s,'xuchang',id),null);assert.equal(createCampaignArmy(s,'xuchang',[id]),null);
 assert.equal(residentOfficer(s,id).unit.troops,0);advance(s,6);const copy=restore(s);advance(s,31);advance(copy,31);
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.ok(assignmentFor(s,id));assert.equal(s.campaign.talent.records[id].workedDays,30);
 assert.ok(s.campaign.domestic.events.some(e=>e.officerId===id&&['complete','failure'].includes(e.phase)));
 assert.ok(residentOfficer(s,id).unit.level>1||residentOfficer(s,id).unit.merit>0);restore(s);
});

test('appointed prepared units actually defend the city, interrupt work under siege and retain civil appointments',()=>{
 const s=peaceful(19),c=s.cities.find(c=>c.id==='xuchang'),a=cityForce(c),u=a.units[1];
 for(const [k,d] of Object.entries(ACTIONS))if(d.direction==='technology'&&k!=='build_workshop')c.domestic.cooldowns[k]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);assert.equal(appointGovernor(s,c.id,u.id),null);
 const civilian=s.campaign.idle.find(o=>o.location===c.id).unit;assert.equal(assignDomestic(s,c.id,'commerce',civilian.id),null);
 const enemy=invadeFromGuandu(s);enemy.route=['xuchang'];enemy.target='xuchang';beginExecution(s);
 for(let i=0;i<10&&!activeBattles(s).some(r=>r.cityId===c.id);i++)advanceCampaignDay(s);
 const r=activeBattles(s).find(r=>r.cityId===c.id);assert.ok(r);assert.equal(r.kind,'siege');
 assert.ok(r.battle.sides[1-r.attackSide].units.some(x=>x.id===u.id));assert.equal(c.governor,u.id);assert.ok(assignmentFor(s,u.id));restore(s);
 assert.equal(assignmentFor(s,u.id).action,null);assert.ok(s.campaign.domestic.workHistory[u.id].some(h=>h.status==='interrupted'));const gold=s.gold;
 chooseEncounter(s,r.id,false);advanceCampaignDay(s);assert.equal(assignmentFor(s,u.id).action,null);assert.equal(s.gold,gold);assert.equal(c.governor,u.id);
 assert.ok(assignmentFor(s,civilian.id).action?.paused);assert.ok(!s.campaign.domestic.workHistory[civilian.id]?.some(h=>h.status==='interrupted'));
 const copy=restore(s),r2=copy.campaign.battles.find(x=>x.id===r.id);
 assert.equal(issueCommand(r.battle,'retreat',null,r.attackSide),null);assert.equal(issueCommand(r2.battle,'retreat',null,r2.attackSide),null);
 for(const game of [s,copy]){for(let i=0;i<800&&!game.campaign.battles.find(x=>x.id===r.id).settled;i++){if(game.campaign.phase==='planning')beginExecution(game);advanceCampaignStep(game);}assert.ok(game.campaign.battles.find(x=>x.id===r.id).settled);}
 assert.equal(serializeCampaign(s),serializeCampaign(copy));assert.equal(c.owner,'cao');assert.equal(c.governor,u.id);assert.ok(assignmentFor(s,u.id));
 advance(s,s.campaign.day+11);assert.ok(assignmentFor(s,u.id));restore(s);
});
