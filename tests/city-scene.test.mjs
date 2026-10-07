import {setBuildingLevel} from './building-fixtures.mjs';
import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {assignDomestic,cancelDomestic,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {citySceneState,citySceneMarkup,cityCompactMarkup,cityBuildingInfo} from '../city-scene.mjs';
import {clampMapView,operationMapView,MIN_MAP_SIZE} from '../strategic-map-camera.mjs';
import {nationalArtMap} from '../national-map-view.mjs';
import {peacefulCities} from './helpers/field-campaign.mjs';
import {cityIntelligence} from '../strategic-vision.mjs';

function construction(){
 const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,40000);
 for(const [k,d] of Object.entries(ACTIONS))if(d.direction==='commerce'&&k!=='build_commerce')c.domestic.cooldowns[k]=1000;
 const u=cityStaffStatus(s,c).idle[0].unit;assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);
 return {s,c,u};
}
test('a real domestic project appears as construction, completes as an expanded city, and survives saving',()=>{
 const {s,c}=construction(),initial=citySceneState(s,c),exterior=cityCompactMarkup(initial),interior=citySceneMarkup(initial);
 beginExecution(s);const active=citySceneState(s,c);assert.equal(active.project.key,'commerce');assert.equal(active.levels.commerce,initial.levels.commerce);
 assert.match(citySceneMarkup(active),/city-scaffold/);assert.notEqual(cityCompactMarkup(active),exterior);
 for(let i=0;i<60&&c.commerce===initial.levels.commerce;i++){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 assert.equal(c.commerce,initial.levels.commerce+1);
 const finished=citySceneState(s,c);assert.equal(finished.project,null);assert.notEqual(citySceneMarkup(finished),interior);
 assert.notEqual(cityCompactMarkup(finished),exterior);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.deepEqual(citySceneState(restored,restored.cities.find(t=>t.id===c.id)),finished);
});
test('interrupted construction keeps its real progress and never looks completed',()=>{
 const {s,c,u}=construction();beginExecution(s);advanceCampaignDay(s);advanceCampaignDay(s);
 const before=citySceneState(s,c);assert.ok(before.project.progress>0);cancelDomestic(s,u.id);
 const paused=citySceneState(s,c);assert.equal(paused.project.paused,true);assert.equal(paused.project.progress,before.project.progress);assert.equal(paused.levels.commerce,before.levels.commerce);
 assert.match(citySceneMarkup(paused),/is-paused/);assert.match(cityBuildingInfo(paused,'commerce').rows.find(r=>r[0]==='工程')[1],/停工/);
});
test('all nine facilities reflect real levels, stocks, gate damage and active income effects without modifying state',()=>{
 const s=newCampaign(1,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang');c.grain=0;setBuildingLevel(c,'walls',c.walls,c.id,{hp:500});setBuildingLevel(c,'commerce',5);setBuildingLevel(c,'farm',4);
 c.domestic.effects=[{key:'gold',power:.2,untilTurn:3},{key:'grain',power:.2,untilTurn:0}];
 const before=JSON.stringify(s),model=citySceneState(s,c),markup=citySceneMarkup(model);
 assert.equal(model.districts.length,9);assert.equal(model.grainFill,0);assert.ok(model.gateCondition<.7);assert.match(markup,/city-gate-crack/);
 assert.equal(model.districts.find(d=>d.key==='commerce').busy,true);assert.equal(model.districts.find(d=>d.key==='farm').busy,false);
 assert.match(cityBuildingInfo(model,'walls').rows.find(r=>r[0]==='耐久')[1],/^500 \/ /);
 assert.equal(JSON.stringify(s),before);
});
test('national camera reaches building scale and retains it on rerender, while every city has a live scene source',()=>{
 const s=newCampaign(1,'guandu-200'),ui={city:'xuchang'},before=JSON.stringify(s);operationMapView(s,ui);
 ui.strategicMapView={x:490,y:315,width:64,height:64};ui.mapCameraManual=true;
 assert.equal(operationMapView(s,ui).view.width,64);assert.equal(clampMapView({x:-5,y:1030,width:1,height:1}).width,MIN_MAP_SIZE);
 const markup=nationalArtMap(s,ui);assert.match(markup,/data-map-view="city"/);assert.equal((markup.match(/data-city-scene/g)||[]).length,s.cities.filter(c=>cityIntelligence(s,c.id).data).length+s.junctions.filter(n=>['gate','port'].includes(n.kind)).length);assert.equal(JSON.stringify(s),before);
});
