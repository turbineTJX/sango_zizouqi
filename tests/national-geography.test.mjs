import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalTerrain,nationalArtMap} from '../national-map-view.mjs';
import {RIVERS,MOUNTAINS,polyline,waterMarkup} from '../national-geography.mjs';
import {newCampaign} from '../strategic-campaign.mjs';
import {renderJunctions} from '../road-network.mjs';
test('national map and radar share visible geography without mutating campaign state',()=>{
 const s=newCampaign(217,'guandu-200'),before=JSON.stringify(s),html=nationalArtMap(s,{},null);
 for(const river of ['huanghe','changjiang','huaihe'])assert.equal(html.split(`data-river="${river}"`).length-1,2);
 for(const name of ['黄河','长江','淮河','汉水','秦岭','太行山','洞庭湖'])assert.ok(html.includes(name));
 assert.match(html,/mask="url\(#territory-dry-land\)"/);
 assert.equal(JSON.stringify(s),before);
 assert.doesNotMatch(renderJunctions(s),/可绕过|驻军可拦截|用途|可停驻/);
});
test('terrain is deterministic, seasonal, finite and uses rounded river bends',()=>{
 assert.equal(nationalTerrain(),nationalTerrain());assert.notEqual(nationalTerrain('winter'),nationalTerrain('summer'));
 for(const feature of [...RIVERS,...MOUNTAINS]){assert.ok(feature.points.length>1);for(const p of feature.points)assert.ok(p.every(n=>Number.isFinite(n)&&n>=0&&n<=1024));assert.doesNotMatch(polyline(feature.points),/NaN|Infinity/);}
 assert.match(polyline(RIVERS[0].points),/Q/);assert.doesNotMatch(waterMarkup({labels:false,mini:true}),/<text/);
});
