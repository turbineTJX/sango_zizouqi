import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_CITIES,terrainDrawing} from '../strategic-map-art.mjs';
import {art,sanitizePack} from '../art-assets.mjs';
import {newCampaign,roadLength,orderCampaignArmy,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {mapArmyPosition,mapBattlePosition,strategicArtMap} from '../art-strategic-map.mjs';
const anchors=MAP_CITIES;
const url='/local-art/files/'+'a'.repeat(24)+'.png';
test('national map keeps simulation/save untouched and uses one projection for cities, roads, army and encounter',()=>{
 const s=newCampaign(),a=s.armies.find(a=>a.faction==='cao');const target=s.roads.find(edge=>edge.includes(a.location)).find(id=>id!==a.location);
 assert.equal(orderCampaignArmy(s,a.id,target),null);beginExecution(s);advanceCampaignDay(s);
 const before=JSON.stringify(s),pack=art.pack,enabled=art.enabled;
 try{art.enabled=true;art.pack=sanitizePack({version:1,id:'test',worldMap:{width:1024,height:1024,images:{summer:url},cities:anchors}});
  const text=strategicArtMap(s,{},a);assert.ok(text.includes('drawn-terrain'));assert.ok(text.includes(`translate(${MAP_CITIES.xuchang.x} ${MAP_CITIES.xuchang.y})`));assert.ok(text.includes('strategy-road'));
  const pos=mapArmyPosition(s,a,anchors);assert.ok(Number.isFinite(pos.x)&&Number.isFinite(pos.y));
  if(a.travel){const start=anchors[a.travel.from],end=anchors[a.travel.to],p=a.travel.progress/roadLength(s,a.travel.from,a.travel.to);assert.equal(pos.x,start.x+(end.x-start.x)*p);assert.deepEqual(mapBattlePosition(s,{kind:'field',armies:[structuredClone(a)]},anchors),pos);}
  assert.deepEqual(mapBattlePosition(s,{kind:'siege',cityId:'xuchang'},anchors),anchors.xuchang);
  assert.equal(JSON.stringify(s),before);
  art.enabled=false;assert.ok(strategicArtMap(s,{},a).includes('drawn-terrain'));
 }finally{art.pack=pack;art.enabled=enabled;}
});
test('redrawn terrain works without external artwork and all seasons are distinct',()=>{
 const pack=art.pack,enabled=art.enabled;try{art.enabled=true;art.pack=sanitizePack({version:1,id:'test',worldMap:{width:1024,height:1024,images:{summer:url},cities:{xuchang:{x:Infinity,y:3}}}});assert.deepEqual(art.pack.worldMap.cities,{});assert.ok(strategicArtMap(newCampaign(),{},null).includes('drawn-terrain'));assert.notEqual(terrainDrawing('winter'),terrainDrawing('summer'));assert.equal(terrainDrawing('summer'),terrainDrawing('summer'));}finally{art.pack=pack;art.enabled=enabled;}
});
