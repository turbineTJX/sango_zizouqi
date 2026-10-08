import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {strategicHUD} from '../strategic-hud.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';

test('map sidebar exposes faction-wide commands independently of selected city',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s);
 const own=strategicHUD(s,{city:'xuchang'}),enemy=s.cities.find(c=>c.owner!=='cao');
 assert.match(own,/aria-label="势力命令"/);assert.match(own,/统一内政/);assert.match(own,/外交/);assert.match(own,/战役/);
 assert.doesNotMatch(own,/data-task="expedition"/);
 assert.equal(strategicHUD(s,{city:enemy.id}),own);assert.equal(JSON.stringify(s),before);
});

test('army presentation stays anchored to the real army and provides a portrait fallback',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang'),before=JSON.stringify(s);
 const html=armyMapMarkers(s,{army:a.id});
 assert.match(html,/data-map-army-anchor/);assert.match(html,/data-map-army-card/);
 assert.ok(html.includes(`data-campaign-army="${a.id}"`));assert.match(html,/army-map-initial/);
 assert.equal(JSON.stringify(s),before);
});

test('marching company faces its road destination and reports real segment progress',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang');
 a.target='luoyang';a.route=['luoyang'];a.travel={from:'xuchang',to:'luoyang',progress:27.5,road:'main'};
 const before=JSON.stringify(s),html=armyMapMarkers(s,{army:a.id});
 assert.match(html,/army-march-company.*scale\(-1 1\)/);assert.match(html,/往 洛阳/);assert.match(html,/行军 · 50%/);
 assert.equal(JSON.stringify(s),before);
});
