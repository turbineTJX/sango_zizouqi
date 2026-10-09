import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,activeBattles,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {assignDomestic,ACTIONS,cancelDomestic} from '../domestic.mjs';
import {cityStaffStatus,pendingDomesticAlerts,acknowledgeDomesticAlerts,domesticAlertsMarkup} from '../domestic-feedback.mjs';
import {officerActivityDays,recordOfficerActivities} from '../officer-activity.mjs';
import {siteActivityDays} from '../activity-nodes.mjs';
import {officerActivityMarkup,siteActivityMarkup} from '../officer-activity-view.mjs';
import {readyTalent} from './helpers/talent.mjs';
import {resolveOfficerLoss,fateRoll} from '../officer-fates.mjs';
import {peacefulCities,fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';

const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
function buildFixture(){const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang'),u=cityStaffStatus(s,c).idle[0].unit;fundCities(s,40000);for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=1000;assignDomestic(s,c.id,'commerce',u.id);beginExecution(s);return {s,c,u};}
test('reports select exact daily facts independently of the capped event queue, acknowledgement preserves the record',()=>{
 const {s,u}=buildFixture();assert.equal(pendingDomesticAlerts(s).filter(e=>e.officerId===u.id).length,0);
 for(let i=0;i<35&&!pendingDomesticAlerts(s).some(e=>e.officerId===u.id&&e.phase==='complete');i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const node=pendingDomesticAlerts(s).find(e=>e.officerId===u.id&&e.phase==='complete');assert.ok(node);assert.strictEqual(s.campaign.activity.nodes.find(n=>n.id===node.id),node);
 const day=officerActivityDays(s,u.id,{beforeDay:node.day}).rows[0];assert.equal(day.actions.find(a=>a.nodeId===node.id).action,node.text);
 assert.match(officerActivityMarkup(s,u.id,node.day,node.id),/activity-selected/);assert.match(domesticAlertsMarkup(s,[node]),/查看当日记录/);
 s.campaign.domestic.events=[];assert.ok(pendingDomesticAlerts(s).includes(node));
 acknowledgeDomesticAlerts(s,pendingDomesticAlerts(s).map(e=>e.id));assert.ok(!pendingDomesticAlerts(s).length);
 const saved=restore(s);assert.ok(!pendingDomesticAlerts(saved).length);assert.equal(saved.campaign.activity.nodes.find(n=>n.id===node.id).text,node.text);
 const before=serializeCampaign(saved);officerActivityMarkup(saved,u.id,node.day,node.id);siteActivityMarkup(saved,node.siteId,node.day,node.id);assert.equal(serializeCampaign(saved),before);
 saved.campaign.domestic.events.push({id:999,important:true,read:false,faction:'cao',text:'unrelated queue'});assert.equal(pendingDomesticAlerts(saved).length,0);
 saved.campaign.domestic.events=[];const bad=structuredClone(saved);bad.campaign.activity.nodes.push(structuredClone(bad.campaign.activity.nodes[0]));assert.throws(()=>restore(bad),/行动记录无效/);
});
test('an interrupted construction is recorded as interruption, never inferred as completion',()=>{
 const {s,u}=buildFixture();cancelDomestic(s,u.id,'调任');recordOfficerActivities(s);
 const node=pendingDomesticAlerts(s).find(n=>n.officerId===u.id&&n.phase==='cancel');assert.ok(node);assert.match(node.text,/中止/);
 const actions=officerActivityDays(s,u.id).rows[0].actions;assert.ok(actions.some(a=>a.nodeId===node.id));assert.equal(actions.at(-1).buildingKey,null);assert.equal(pendingDomesticAlerts(s).some(n=>n.phase==='complete'),false);restore(s);
});
test('city disasters and talent discoveries have daily source records without inventing a reporting officer',()=>{
 const s=peacefulCities(newCampaign(5)),c=s.cities.find(c=>c.id==='xuchang');c.domestic.opportunities.push({kind:'mold',expires:1,amount:200,saved:0});beginExecution(s);advanceCampaignDay(s);
 const cityNode=pendingDomesticAlerts(s).find(n=>n.phase==='event'&&n.cityId===c.id&&n.result.loss===200);assert.ok(cityNode);assert.equal(cityNode.officerId,null);
 assert.ok(siteActivityDays(s,c.id,{beforeDay:cityNode.day}).rows[0].actions.some(a=>a.nodeId===cityNode.id));
 const p=readyTalent(s,c.id),talentNode=pendingDomesticAlerts(s).find(n=>n.category==='talent'&&n.officerId===p.id&&n.phase==='discovered');assert.ok(talentNode);
 assert.equal(officerActivityDays(s,p.id).rows[0].actions.find(a=>a.nodeId===talentNode.id).action,talentNode.text);restore(s);
});
test('personnel fate and empty-city occupation are real daily milestones with faction and place',()=>{
 const s=peacefulCities(newCampaign(23)),c=s.cities.find(c=>c.id==='xuchang'),unit=c.units[0];let key;
 for(let i=0;i<10000;i++)if(fateRoll(s,'milestone:'+i)<.02){key='milestone:'+i;break;}
 assert.equal(resolveOfficerLoss(s,{unit,faction:'cao',location:c.id,enemy:'yuan',eventId:key}),'DEAD');recordOfficerActivities(s);
 const fate=pendingDomesticAlerts(s).find(n=>n.category==='personnel'&&n.officerId===unit.id);assert.equal(fate.phase,'DEAD');assert.equal(fate.siteId,c.id);assert.equal(officerActivityDays(s,unit.id).rows[0].actions.find(a=>a.nodeId===fate.id).action,fate.text);restore(s);
 const a=fieldFromCity(s,c.id,{target:'guandu'}),target=s.cities.find(c=>c.id==='guandu');target.garrison=0;target.manpower=0;target.gold=0;beginExecution(s);approachDestination(s,a);
 for(let i=0;i<5&&target.owner!==a.faction;i++)advanceCampaignDay(s);
 const capture=pendingDomesticAlerts(s).find(n=>n.category==='occupation'&&n.cityId===target.id);assert.ok(capture);assert.equal(capture.officerId,a.leader);assert.equal(target.owner,'cao');assert.equal(s.campaign.battles.length,0);restore(s);
});
test('actual battle settlement writes one outcome per side and links it to participating officers',()=>{
 const s=newCampaign(17);fieldFromCity(s,'xuchang',{target:'guandu'});fieldFromCity(s,'guandu',{target:'xuchang'});beginExecution(s);
 for(let i=0;i<200&&!s.campaign.battles.some(r=>r.settled);i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}
 const battle=s.campaign.battles.find(r=>r.settled);assert.ok(battle);
 const nodes=s.campaign.activity.nodes.filter(n=>n.category==='battle'&&n.result.battleId===battle.id);assert.equal(nodes.length,2);
 const node=nodes.find(n=>n.faction==='cao');assert.ok(pendingDomesticAlerts(s).includes(node));assert.ok(officerActivityDays(s,node.officerId,{beforeDay:node.day}).rows[0].actions.some(a=>a.nodeId===node.id));
 const count=s.campaign.activity.nodes.length;restore(s);assert.equal(s.campaign.activity.nodes.length,count);
});
