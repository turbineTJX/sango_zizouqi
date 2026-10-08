import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,commissionProject} from './helpers/auto-domestic-campaign.mjs';
import {assignDomestic,ACTIONS,TECHS,cancelDomestic,grainCapacity} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts,domesticAlertsMarkup} from '../domestic-feedback.mjs';
import {harvestStocks} from '../harvest-summary.mjs';
import {harvestStripMarkup} from '../reward-presentation.mjs';
import {localBuildingLevel} from '../metropolitan-areas.mjs';
import {startTalentProject,resolveTalentOffers,discoverTalent} from '../talent-lifecycle.mjs';
import {importantActivityNode} from '../activity-nodes.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';
import {addCityGold} from '../city-resources.mjs';
import {talentKey,projectNeed} from '../talent-core.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const scene=()=>{const s=peacefulCities(newCampaign(81));const c=s.cities.find(c=>c.id==='xuchang');addCityGold(s,c,40000-c.gold);return s;};
const advance=s=>{for(let i=0;i<60;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);if(s.campaign.activity.nodes.some(n=>n.result?.reward?.kind==='building'))return;}throw Error('No completed facility');};
test('real completed construction snapshots the actual site and levels; viewing and acknowledgement never grant a reward',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),u=cityStaffStatus(s,c).idle[0].unit;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=10000;
 assignDomestic(s,c.id,'commerce',u.id);advance(s);
 const event=s.campaign.activity.nodes.find(n=>n.result?.reward?.kind==='building'),r=event.result.reward;
 assert.equal(r.afterLevel,r.beforeLevel+1);assert.equal(r.afterLevel,localBuildingLevel(c,r.buildingKey,r.siteId));
 const saved=serializeCampaign(s);assert.match(domesticAlertsMarkup(s,[event]),/查看设施/);assert.equal(serializeCampaign(s),saved);
 const stocks=harvestStocks(s);acknowledgeDomesticAlerts(s,[event.id]);assert.deepEqual(harvestStocks(s),stocks);assert.equal(restore(s).campaign.activity.nodes.find(n=>n.id===event.id).result.reward.afterLevel,r.afterLevel);
});
test('signed talent retains actual five attributes and travel status without claiming a fixed arrival date',()=>{
 const s=scene(),p=readyTalent(s),c=s.cities.find(c=>c.id==='xuchang');p.cityId='chenliu';
 const a={officerId:cityStaffStatus(s,c).idle[0].unit.id,action:{key:'hire',targetId:p.id,cost:180}};
 // Legal fully funded offer uses the production signing resolver, not a UI event.
 discoverTalent(s,p.id,'cao');startTalentProject(s,a,c);s.campaign.talent.projects[talentKey(p.id,'cao')].progress=projectNeed(p.id);
 resolveTalentOffers(s,cancelDomestic);const event=s.campaign.activity.nodes.find(n=>n.category==='talent'&&n.phase==='signed'),unit=s.campaign.idle.find(o=>o.unit.id===p.id).unit;
 for(const key of ['leadership','force','intellect','politics','charm'])assert.equal(event.result.reward.stats[key],unit[key]);
 assert.equal(event.result.reward.destination,c.id);assert.equal(event.result.reward.location,'chenliu');assert.ok(!event.text.includes('2天'));
 const saved=serializeCampaign(s),html=domesticAlertsMarkup(s,[event]);assert.match(html,/新入麾下/);assert.match(html,/沿路前往许昌赴任/);assert.match(html,/查看武将/);assert.equal(serializeCampaign(s),saved);restore(s);
});
test('turn receipt uses actual capped credits and treasury delta, persists and cannot duplicate income on inspection',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang');for(const city of s.cities)for(const u of city.units){u.troops=0;u.wounded=0;}
 c.grain=grainCapacity(c);c.manpower=ECONOMY_RULES.capacity.manpowerMax;
 beginExecution(s);const start=s.campaign.activity.nodes.find(n=>n.phase==='harvest-start');while(s.campaign.day<11)advanceCampaignDay(s);
 const receipt=s.campaign.activity.nodes.find(n=>n.phase==='harvest'),row=receipt.result.cities.find(row=>row.id===c.id);
 assert.equal(row.credited.grain,0);assert.equal(row.credited.manpower,0);
 assert.deepEqual(receipt.result.stocks,harvestStocks(s));assert.equal(receipt.result.net.gold,s.gold-start.result.stocks.gold);
 assert.equal(pendingDomesticAlerts(s).some(n=>n.id===receipt.id),false);
 const saved=serializeCampaign(s),markup=harvestStripMarkup(s);assert.match(markup,/第 1 旬收获/);assert.match(markup,/各城金净变化/);assert.equal(serializeCampaign(s),saved);
 const copy=restore(s);assert.equal(harvestStripMarkup(copy),markup);advanceCampaignDay(s);assert.equal(serializeCampaign(s),saved);
});
test('routine persuasion progress and unsuccessful contacts remain recorded without interrupting; real warnings and signed offers still interrupt',()=>{
 for(const phase of ['complete','failure'])assert.equal(importantActivityNode({category:'domestic',phase,key:'hire',result:{actual:12}}),false);
 assert.equal(importantActivityNode({category:'domestic',phase:'complete',key:'hire',result:{actual:12,leveled:true}}),true);
 for(const phase of ['signed','offer-paused','leave-warning'])assert.equal(importantActivityNode({category:'talent',phase,result:{}}),true);
 assert.equal(importantActivityNode({category:'domestic',phase:'failure',key:'build_commerce',result:{}}),true);
});
test('daily research completion creates an important technology card and one harvest gain; partial progress stays quiet',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),u=cityStaffStatus(s,c).idle[0].unit;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);beginExecution(s);
 const assignment=s.campaign.domestic.assignments.find(a=>a.officerId===u.id),targetId=assignment.action.targetId;
 let event;for(let i=0;i<40&&!event;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);event=s.campaign.activity.nodes.find(n=>n.result.reward?.technologyId===targetId&&n.cityId===c.id&&n.faction==='cao');}
 assert.ok(event);assert.ok(c.domestic.techs.includes(targetId));
 assert.equal(importantActivityNode({...event,result:{...event.result,leveled:false}}),true);
 assert.equal(importantActivityNode({...event,result:{actual:40,leveled:false,changed:false}}),false);
 assert.ok(pendingDomesticAlerts(s).some(n=>n.id===event.id));
 const saved=serializeCampaign(s),markup=domesticAlertsMarkup(s,[event]);assert.ok(markup.includes(TECHS[targetId].name));assert.ok(markup.includes(TECHS[targetId].description));assert.equal(serializeCampaign(s),saved);restore(s);
 const bad=JSON.parse(saved);bad.campaign.activity.nodes.find(n=>n.id===event.id).result.reward.technologyId='missing-technology';assert.throws(()=>validateCampaign(bad));
 while(s.campaign.phase!=='planning')advanceCampaignDay(s);
 const receipt=s.campaign.activity.nodes.findLast(n=>n.phase==='harvest');assert.ok(receipt.result.nodeIds.includes(event.id));assert.equal(receipt.result.counts.technologies,1);
 const stocks=harvestStocks(s);acknowledgeDomesticAlerts(s,[event.id]);assert.deepEqual(harvestStocks(s),stocks);assert.ok(!pendingDomesticAlerts(restore(s)).some(n=>n.id===event.id));
});
test('commissioned projects also produce factual facility cards and receipt counts',()=>{
 const s=scene();assert.equal(commissionProject(s,'xuchang','farm'),null);beginExecution(s);while(s.campaign.day<11)advanceCampaignDay(s);
 const event=s.campaign.activity.nodes.find(n=>n.result?.reward?.buildingKey==='farm');assert.ok(event);assert.equal(event.officerId,null);assert.match(domesticAlertsMarkup(s,[event]),/农田/);assert.equal(s.campaign.activity.nodes.find(n=>n.phase==='harvest').result.counts.buildings,1);restore(s);
});
