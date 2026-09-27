import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,armyPosition} from '../strategic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {operationMapView,centeredMapView,clampMapView} from '../strategic-map-camera.mjs';
import {nationalArtMap} from '../national-map-view.mjs';

test('national map starts locally and allows an explicit national overview',()=>{
 const s=newCampaign(1,'guandu-200'),before=JSON.stringify(s),ui={city:'xuchang'};
 const {view,focus}=operationMapView(s,ui);assert.equal(view.width,360);assert.equal(view.x+180,focus.x);assert.equal(view.y+180,focus.y);
 const html=nationalArtMap(s,ui);assert.match(html,/data-strategy-radar/);assert.match(html,/data-map-view="national"/);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(clampMapView({x:-1,y:1000,width:1024,height:1024}),{x:0,y:0,width:1024,height:1024});
});
test('manual radar navigation persists through rendering; changing operation city recenters',()=>{
 const s=newCampaign(1,'guandu-200'),ui={city:'xuchang'};operationMapView(s,ui);
 ui.mapCameraManual=true;ui.strategicMapView=centeredMapView({x:180,y:800});const expected={...ui.strategicMapView};
 assert.deepEqual(operationMapView(s,ui).view,expected);
 ui.city='town-9';const {view,focus}=operationMapView(s,ui);assert.equal(view.x+view.width/2,focus.x);assert.equal(ui.mapCameraManual,false);
});
test('army focus uses its actual position and manual navigation suspends following',()=>{
 const s=newCampaign(1,'guandu-200'),a=fieldFromCity(s,'xuchang');a.travel={from:'xuchang',to:a.route[0]||'luoyang',progress:12,road:'main'};
 const ui={city:'xuchang',army:a.id,strategyTab:'army'},p=armyPosition(s,a),v=operationMapView(s,ui,a).view;
 assert.equal(v.x+v.width/2,p.x);assert.equal(v.y+v.height/2,p.y);
 ui.mapCameraManual=true;ui.strategicMapView=centeredMapView({x:180,y:800});const expected={...ui.strategicMapView};a.travel.progress+=3;
 assert.deepEqual(operationMapView(s,ui,a).view,expected);
 ui.mapCameraManual=false;assert.notDeepEqual(operationMapView(s,ui,a).view,expected);
});
