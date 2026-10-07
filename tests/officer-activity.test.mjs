import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,transferOfficer,launchExpedition} from '../strategic-campaign.mjs';
import {officerActivities,recordOfficerActivities,officerActivityDays,validateOfficerActivities} from '../officer-activity.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {assignDomestic,ACTIONS,cancelDomestic} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {citySceneState,citySceneMarkup,cityBuildingCard} from '../city-scene.mjs';
import {campaignInfoMarkup} from '../campaign-info.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';

function fixture(){const s=peacefulCities(newCampaign(81,'guandu-200')),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);return {s,c};}
test('all officers receive complete daily coverage, unchanged days compress and history survives save and reload',()=>{
 const {s}=fixture();assert.equal(Object.keys(s.campaign.activity.records).length,Object.keys(OFFICER_BY_ID).length);
 const absent=s.campaign.domestic.people.find(p=>p.status==='EXCLUDED'||p.status==='NOT_DEBUTED'||p.status==='DEAD').id;
 const old=s.campaign.activity.records[absent].length;
 beginExecution(s);for(let i=0;i<3;i++)advanceCampaignDay(s);
 assert.equal(s.campaign.day,4);assert.equal(s.campaign.activity.records[absent].length,old);
 assert.deepEqual(officerActivityDays(s,absent).rows.map(r=>r.day),[4,3,2,1]);assert.ok(officerActivityDays(s,absent).rows.every(r=>r.actions.length));
 const loaded=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(loaded.campaign.activity,s.campaign.activity);
 const bad=structuredClone(s);bad.campaign.activity.records[absent][0].snapshot.siteId='imaginary-city';assert.throws(()=>validateOfficerActivities(bad),/行动记录无效/);
});
test('real construction, daily changes, interrupted work and read-only portrait/detail views share the same state',()=>{
 const {s,c}=fixture(),u=cityStaffStatus(s,c).idle[0].unit;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='commerce'&&key!=='build_commerce')c.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);beginExecution(s);
 const assignment=s.campaign.domestic.assignments.find(a=>a.officerId===u.id),site=s.cities.find(n=>n.id===(assignment.action.siteId||c.id))||s.junctions.find(n=>n.id===assignment.action.siteId);
 const before=JSON.stringify(s),model=citySceneState(s,site),district=model.districts.find(d=>d.key==='commerce');
 assert.ok(district.officers.some(o=>o.id===u.id));assert.match(citySceneMarkup(model),new RegExp('data-city-officer="'+u.id+'"'));
 assert.match(cityBuildingCard(model,'commerce'),/在此办事/);assert.match(campaignInfoMarkup(s,{type:'officer',id:u.id,page:'行动记录'}).body,/每日行动记录/);assert.equal(JSON.stringify(s),before);
 assert.ok(officerActivityDays(s,u.id).rows[0].actions.some(a=>a.code==='domestic'&&a.siteId===site.id));
 advanceCampaignDay(s);cancelDomestic(s,u.id);recordOfficerActivities(s);
 assert.equal(citySceneState(s,site).districts.find(d=>d.key==='commerce').officers.some(o=>o.id===u.id),false);
 const days=officerActivityDays(s,u.id);assert.ok(days.rows.find(r=>r.day===1).actions.some(a=>a.action==='建设市场'));
 assert.equal(days.rows[0].actions.at(-1).buildingKey,null);
});
test('travel, armies, external missions and captive locations override appointments and never leave phantom building portraits',()=>{
 const {s,c}=fixture(),u=cityStaffStatus(s,c).idle[0].unit;
 assert.equal(transferOfficer(s,u.id,'chenliu'),null);recordOfficerActivities(s);
 const o=s.campaign.idle.find(o=>o.unit.id===u.id),travel=officerActivities(s).get(u.id);
 assert.equal(travel.fromId,c.id);assert.equal(travel.toId,o.journey.route[0]);assert.equal(travel.buildingKey,null);assert.match(travel.action,/调任|运输/);
 const ids=c.units.slice(0,2).map(u=>u.id);assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[0],deputy:null,target:'chenliu',policy:'auto'}),null);
 assert.equal(officerActivities(s).get(ids[0]).code,'army');assert.equal(officerActivities(s).get(ids[0]).buildingKey,null);
 const another=cityStaffStatus(s,c).idle[0].unit;
 another.mission={faction:'cao',location:'chenliu',homeCity:c.id,route:[],phase:'work',progress:0};
 assert.equal(officerActivities(s).get(another.id).siteId,'chenliu');assert.equal(officerActivities(s).get(another.id).buildingKey,'hall');
 another.mission.phase='return';another.mission.route=['xuchang'];assert.equal(officerActivities(s).get(another.id).buildingKey,null);
 const free=s.campaign.domestic.people.find(p=>p.status==='FREE');free.status='CAPTIVE';free.fate={originalFaction:'cao'};free.cityId='chenliu';
 assert.equal(officerActivities(s).get(free.id).code,'captive');assert.equal(officerActivities(s).get(free.id).siteId,'chenliu');
});
