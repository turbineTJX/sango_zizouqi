import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewSiteMarkup} from '../map-overview-art.mjs';
import {overviewSymbolBlend} from '../map-detail-level.mjs';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {nationalArtMap} from '../national-map-view.mjs';

test('national zoom uses simple symbols and returns smoothly to physical buildings',()=>{
 const view=size=>({width:size,height:size*1.8});
 assert.equal(overviewSymbolBlend(view(560)),0);assert.equal(overviewSymbolBlend(view(720)),0);
 assert.equal(overviewSymbolBlend(view(1024)),1);assert.equal(overviewSymbolBlend(view(900)),1);
 assert.equal(overviewSymbolBlend(view(810)),.5);
 for(const edge of [720,900])assert.ok(Math.abs(overviewSymbolBlend(view(edge+.01))-overviewSymbolBlend(view(edge-.01)))<.001);
});

test('cities, prefectures, passes and ports have distinct symbols without miniature textures',()=>{
 const shapes=new Set();
 for(const place of [{kind:'city',citySize:'large'},{kind:'city',citySize:'small'},{kind:'junction'},{kind:'gate'},{kind:'port'}]){
  const html=overviewSiteMarkup(place);assert.match(html,/data-map-overview-glyph/);assert.doesNotMatch(html,/<image|filter|assets\//);
  shapes.add(html.match(/data-overview-shape="([^"]+)"/)[1]);
 }
 assert.equal(shapes.size,5);
});

test('every real location retains its own source and icon without modifying a save',()=>{
 const s=newCampaign(81,'guandu-200'),before=serializeCampaign(s),html=nationalArtMap(s,{city:'xuchang'});
 assert.equal((html.match(/data-map-overview-glyph=/g)||[]).length,s.cities.length+s.junctions.length);
 assert.equal((html.match(/data-map-overview-glyph="city"/g)||[]).length,76);
 assert.match(html,/data-city-model/);assert.match(html,/data-city-scene/);
 assert.equal(serializeCampaign(s),before);
});
