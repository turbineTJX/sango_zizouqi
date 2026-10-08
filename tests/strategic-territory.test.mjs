import test from 'node:test';
import assert from 'node:assert/strict';
import {cityRegion,territoryRegions} from '../strategic-territory.mjs';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {nationalArtMap} from '../national-map-view.mjs';

test('display regions remain inside the map and nearest-city half planes',()=>{
 const s=newCampaign(1,'guandu-200'),before=JSON.stringify(s);
 for(const city of s.cities){
  const points=cityRegion(city,s.cities);assert.ok(points.length>=3);
  for(const [x,y] of points){
   assert.ok(x>=-1e-7&&y>=-1e-7&&x<=1024+1e-7&&y<=1024+1e-7);
   for(const other of s.cities)assert.ok((x-city.x)**2+(y-city.y)**2<=(x-other.x)**2+(y-other.y)**2+1e-6);
  }
 }
 territoryRegions(s.cities);assert.equal(JSON.stringify(s),before);
});
test('ownership changes update the display without invalidating region geometry',()=>{
 const s=newCampaign(1,'guandu-200'),ui={city:'xuchang'},regions=territoryRegions(s.cities),before=nationalArtMap(s,ui);
 s.cities.find(c=>c.id==='xuchang').owner='yuan';
 assert.equal(territoryRegions(s.cities),regions);assert.notEqual(nationalArtMap(s,ui),before);
 assert.match(nationalArtMap(s,{city:'xuchang',mapTerritoryHidden:true}),/hide-territory/);
});
