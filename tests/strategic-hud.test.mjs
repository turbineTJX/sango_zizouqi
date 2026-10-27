import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {strategicHUD} from '../strategic-hud.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {campaignDate} from '../national-scenarios.mjs';
import {campaignJournalMarkup} from '../strategic-view.mjs';

test('record dates use the scenario calendar across periods, months and years without changing state',()=>{
 const s=newCampaign(203,'red-cliffs-208'),before=JSON.stringify(s);
 for(const [day,date]of [[1,'208年1月1日'],[10,'208年1月10日'],[11,'208年1月11日'],[30,'208年1月30日'],[31,'208年2月1日'],[360,'208年12月30日'],[361,'209年1月1日']])assert.equal(campaignDate(s,{day}),date);
 assert.equal(campaignDate(s,{turn:2,period:true}),'208年1月中旬');assert.equal(campaignDate(s,{turn:37,period:true}),'209年1月上旬');
 assert.equal(JSON.stringify(s),before);
 const legacy=newCampaign(1);assert.equal(campaignDate(legacy,{day:1}),'200年1月1日');
});

test('journal categories preserve records and dates while excluding foreign domestic events',()=>{
 const s=newCampaign(203,'red-cliffs-208');
 s.campaign.domestic.events.unshift({day:31,phase:'proposal-approved',faction:'cao',cityId:'xuchang',text:'本方提案已同意'},{day:31,phase:'start',faction:'yuan',cityId:'ye',text:'不可见的外国内政'});
 const before=JSON.stringify(s),domestic=campaignJournalMarkup(s,'domestic');
 assert.match(domestic,/208年2月1日/);assert.match(domestic,/本方提案已同意/);assert.doesNotMatch(domestic,/不可见的外国内政|呈案|准奏/);
 for(const tab of ['all','domestic','personnel','battle','orders'])assert.match(campaignJournalMarkup(s,tab),new RegExp('data-journal-tab="'+tab+'"'));
 assert.equal(JSON.stringify(s),before);
});

test('map sidebar exposes faction-wide commands independently of selected city',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s);
 const own=strategicHUD(s,{city:'xuchang'}),enemy=s.cities.find(c=>c.owner!=='cao');
 assert.match(own,/aria-label="势力命令"/);assert.match(own,/data-action="faction-domestic"[^>]*>内政<\/button>/);assert.doesNotMatch(own,/统一内政|势力事务|data-action="campaign-affairs"/);assert.match(own,/外交/);assert.match(own,/战役/);
 assert.match(own,/200年1月上旬/);assert.doesNotMatch(own,/第 1 旬/);
 assert.doesNotMatch(own,/执行本旬|安排行动|时间推进中|<small>势力命令/);
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

test('marching company faces its road destination and is anchored to real segment progress',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang');
 a.target='town-44';a.route=['town-44'];a.location='luoyang';a.travel={from:'luoyang',to:'town-44',progress:10,road:'main'};
 const before=JSON.stringify(s),html=armyMapMarkers(s,{army:a.id});
 assert.match(html,/army-march-company.*scale\(1 1\)/);assert.match(html,/洛阳 → 虎牢关/);assert.match(html,/，行军，/);
 const from=s.cities.find(c=>c.id==='luoyang'),to=s.junctions.find(c=>c.id==='town-44');
 const distance=s.roadSegments[['luoyang','town-44'].sort().join(':')].distance,p=a.travel.progress/distance;
 assert.ok(html.includes(`data-x="${from.x+(to.x-from.x)*p}" data-y="${from.y+(to.y-from.y)*p}"`));
 assert.equal(JSON.stringify(s),before);
});
