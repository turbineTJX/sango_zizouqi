import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,armyPosition} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {operationMapView,centeredMapView,clampMapView,LOCAL_MAP_SIZE,mapDetailLevel,metropolitanMemberView,metropolitanOverviewView} from '../strategic-map-camera.mjs';
import {metropolitanMembers} from '../metropolitan-areas.mjs';
import {metropolitanMapGroups} from '../metropolitan-map.mjs';
import {nationalArtMap} from '../national-map-view.mjs';

test('national map starts locally and allows an explicit national overview',()=>{
 const s=newCampaign(1,'guandu-200'),before=JSON.stringify(s),ui={city:'xuchang'};
 const {view,focus}=operationMapView(s,ui);assert.equal(view.width,LOCAL_MAP_SIZE);assert.equal(view.x+view.width/2,focus.x);assert.equal(view.y+view.height/2,focus.y);assert.equal(mapDetailLevel(view),'metropolis');
 const html=nationalArtMap(s,ui);assert.match(html,/data-strategy-radar/);assert.match(html,/data-map-view="national"/);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(clampMapView({x:-1,y:1000,width:1024,height:1024}),{x:0,y:0,width:1024,height:1024});
});

test('zoom detail advances from metropolis to settlements to interiors and reverses at the same boundaries',()=>{
 const sizes=[1024,560,421,420,300,171,170,64,32],expected=['metropolis','metropolis','metropolis','settlements','settlements','settlements','interior','interior','interior'];
 assert.deepEqual(sizes.map(size=>mapDetailLevel({width:size*1.7,height:size})),expected);
 assert.deepEqual([...sizes].reverse().map(size=>mapDetailLevel({width:size,height:size*2})),[...expected].reverse());
});
test('opening a metropolis fits its real members at settlement scale on both desktop and portrait screens',()=>{
 const s=newCampaign(1,'guandu-200'),c=s.cities.find(c=>c.id==='jinyang'),members=metropolitanMembers(s,c),before=JSON.stringify(s);
 for(const aspect of [1.6,1,.46]){
  const view=metropolitanMemberView(members,aspect);assert.equal(mapDetailLevel(view),'settlements');
  for(const n of members)assert.ok(n.x>=view.x&&n.x<=view.x+view.width&&n.y>=view.y&&n.y<=view.y+view.height,n.name);
  assert.equal(mapDetailLevel(metropolitanOverviewView(c,aspect)),'metropolis');
 }
 const groups=metropolitanMapGroups(s),group=groups.find(g=>g.center.id===c.id);assert.deepEqual(group.members.map(n=>n.id),members.map(n=>n.id));assert.deepEqual(group.counts,{small:1,gate:1,port:1});
 assert.equal(JSON.stringify(s),before);
});
test('manual radar navigation persists through rendering; changing operation city recenters',()=>{
 const s=newCampaign(1,'guandu-200'),ui={city:'xuchang'};operationMapView(s,ui);
 ui.mapCameraManual=true;ui.strategicMapView=centeredMapView({x:180,y:800});const expected={...ui.strategicMapView};
 assert.deepEqual(operationMapView(s,ui).view,expected);
 ui.city='town-9';const {view,focus}=operationMapView(s,ui);assert.deepEqual(view,centeredMapView(focus,view.width,view.height));assert.ok(focus.x>=view.x&&focus.x<=view.x+view.width);assert.equal(ui.mapCameraManual,false);
});
test('army focus uses its actual position and manual navigation suspends following',()=>{
 const s=newCampaign(1,'guandu-200'),a=fieldFromCity(s,'xuchang');a.travel={from:'xuchang',to:a.route[0]||'luoyang',progress:12,road:'main'};
 const ui={city:'xuchang',army:a.id,strategyTab:'army'},p=armyPosition(s,a),v=operationMapView(s,ui,a).view;
 assert.equal(v.x+v.width/2,p.x);assert.equal(v.y+v.height/2,p.y);
 ui.mapCameraManual=true;ui.strategicMapView=centeredMapView({x:180,y:800});const expected={...ui.strategicMapView};a.travel.progress+=3;
 assert.deepEqual(operationMapView(s,ui,a).view,expected);
 ui.mapCameraManual=false;assert.notDeepEqual(operationMapView(s,ui,a).view,expected);
});


test('battle selection centers the actual battle point instead of the previous city',()=>{
 const s=newCampaign(1,'guandu-200'),ui={city:'xuchang'};operationMapView(s,ui);
 s.campaign.battles.push({id:'focus-test',point:{x:600,y:700},name:'野战',settled:false});
 Object.assign(ui,{strategyTab:'battle',directoryBattle:'focus-test',mapFocusKey:null});
 const {focus,view}=operationMapView(s,ui);assert.equal(focus.key,'battle:focus-test');assert.equal(view.x+view.width/2,600);assert.equal(view.y+view.height/2,700);
});
