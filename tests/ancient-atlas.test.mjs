import test from 'node:test';
import assert from 'node:assert/strict';
import {ATLAS_REFERENCE,ATLAS_CITY_POINTS,ATLAS_JUNCTION_POINTS,atlasPoint,atlasPosition} from '../data/design/ancient-atlas.mjs';
import {CITY_DESIGNS} from '../data/design/cities.mjs';
import {NATIONAL_MAP} from '../data/national-map.mjs';
import {ROAD_NETWORK_DESIGN} from '../data/design/road-network.mjs';
import {ROAD_DISTANCE_DESIGNS} from '../data/design/road-distances.mjs';
import {newCampaign,validateCampaign,serializeCampaign} from '../strategic-campaign.mjs';
import {nationalArtMap,nationalTerrain} from '../national-map-view.mjs';
import {roadDistance} from '../strategic-movement.mjs';
import {edgeKey} from '../road-network.mjs';
import {RIVERS,LAKES,LAND_PATH,polyline} from '../national-geography.mjs';

test('the supplied atlas projects all places and junctions without stretching the scan',()=>{
 assert.equal(Object.keys(ATLAS_CITY_POINTS).length,123);assert.equal(Object.keys(ATLAS_JUNCTION_POINTS).length,23);
 const origin=atlasPoint([0,0]),east=atlasPoint([100,0]),south=atlasPoint([0,100]);assert.ok(Math.abs(east[0]-origin[0]-south[1]+origin[1])<.11);
 assert.equal(atlasPoint([0,ATLAS_REFERENCE.height])[1],1024);
 for(const c of CITY_DESIGNS){const expected=atlasPosition(ATLAS_CITY_POINTS[c.id]);assert.deepEqual({x:c.x,y:c.y},expected);assert.deepEqual({x:NATIONAL_MAP.cities.find(n=>n.id===c.id).x,y:NATIONAL_MAP.cities.find(n=>n.id===c.id).y},expected);assert.ok(c.x>0&&c.x<1024&&c.y>0&&c.y<1024);}
 for(const [key,ps] of Object.entries(ATLAS_JUNCTION_POINTS))assert.deepEqual(ROAD_NETWORK_DESIGN.nodePositions[key],atlasPoint(ps));
 const at=id=>CITY_DESIGNS.find(c=>c.id===id);
 assert.ok(at('town-40').x<at('town-37').x&&at('town-40').y>at('town-37').y);
 assert.ok(at('town-18').x<at('luoyang').x&&at('luoyang').x<at('xuchang').x);
 assert.ok(at('town-23').x<at('town-24').x&&at('town-23').y<at('town-25').y);
});
test('atlas reprojection preserves every authored travel length and supports current deterministic saves',()=>{
 for(const scenario of ['guandu-200','heroes-251']){
  const s=newCampaign(217,scenario);assert.equal(s.cities.length,76);assert.equal(s.junctions.length,70);assert.equal(s.roads.length,280);
  assert.equal(Object.keys(ROAD_DISTANCE_DESIGNS).length,s.roads.length);
  for(const [a,b] of s.roads)assert.equal(roadDistance(s,a,b),ROAD_DISTANCE_DESIGNS[edgeKey(a,b)]);
  const saved=serializeCampaign(s);assert.equal(serializeCampaign(validateCampaign(JSON.parse(saved))),saved);
  s.campaign.version=28;assert.throws(()=>validateCampaign(s),/重新开始/);
 }
});
test('all map scales share coast and rivers; terrain has no scanned ownership or period labels',()=>{
 const s=newCampaign(217,'guandu-200'),html=nationalArtMap(s,{city:'xuchang'}),terrain=nationalTerrain();
 assert.ok(html.split(LAND_PATH).length>=4);
 for(const r of RIVERS)assert.equal(html.split(`data-river="${r.id}"`).length-1,2);
 assert.ok(html.includes('id="radar-land"'));
 for(const lake of LAKES)assert.ok(html.includes(`<path d="${lake.d}" fill="black"/>`));
 assert.doesNotMatch(terrain,/<image|西晋|鲜卑|沃野|敦煌/);
 for(const r of RIVERS)assert.doesNotMatch(polyline(r.points),/NaN|Infinity/);
 assert.equal(nationalTerrain('invalid'),nationalTerrain('summer'));
});
