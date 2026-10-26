import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {ensureWatchtowerPosition,watchtowerPositionValid,regionalWatchtower} from '../regional-watchtower.mjs';
import {assignDomestic,cancelDomestic,beginDomesticTurn,domesticRandom} from '../domestic.mjs';
import {completeTechnologyBuilding,buildingDurability,campaignBattleBuildings} from '../building-durability.mjs';
import {visionSources,pointVisible,updateVision,watchtowerObservations,intelligenceWorld} from '../strategic-vision.mjs';
import {nationalArtMap} from '../national-map-view.mjs';
import {technologyMarkup} from '../technology-view.mjs';
import {citySceneMarkup,citySceneState} from '../city-scene.mjs';
import {regionalWatchtowersMarkup} from '../regional-watchtower-view.mjs';

import {watchtowerConstructionFixture as fixture,advanceWatchtowerDay as tick} from './helpers/regional-watchtower.mjs';

test('every town can place a regional tower on land, outside settlements, using only public geography and saved RNG',()=>{
 for(const seed of [81,1029,5052]){
  const s=newCampaign(seed,'guandu-200'),copy=structuredClone(s);
  for(const c of copy.cities)if(c.owner!=='cao'){c.grain=999999;c.owner='neutral';c.units=[];}
  for(const c of s.cities){
   const p=ensureWatchtowerPosition(s,c,()=>domesticRandom(s)),other=copy.cities.find(n=>n.id===c.id);
   assert.ok(watchtowerPositionValid(s,c,p),c.name);assert.notDeepEqual({x:p.x,y:p.y},{x:c.x,y:c.y});
   assert.deepEqual(ensureWatchtowerPosition(copy,other,()=>domesticRandom(copy)),p);
   assert.deepEqual(ensureWatchtowerPosition(s,c,()=>{throw Error('must not reroll');}),p);
  }
 }
});

test('paid player and AI research builds a regional tower at its saved worksite and reloads deterministically',()=>{
 for(const faction of ['cao','yuan']){
  const {s,c}=fixture(faction),position=structuredClone(c.domestic.watchtowerPosition);
  assert.ok(position);assert.equal(c.domestic.research.spent,400);assert.equal(regionalWatchtower(c).phase,'construction');
  assert.ok(!visionSources(s,faction).some(v=>v.kind==='watchtower'));updateVision(s);
  const before=serializeCampaign(s);
  nationalArtMap(s,{city:c.id});technologyMarkup(s,c);regionalWatchtowersMarkup(s);intelligenceWorld(s,faction);
  assert.equal(serializeCampaign(s),before,'viewing construction cannot draw another position or advance work');
  const resumed=validateCampaign(JSON.parse(before));
  for(let i=0;i<2;i++){tick(s);tick(resumed);}assert.equal(serializeCampaign(s),serializeCampaign(resumed));
  let days=0;while(!c.domestic.techs.includes('watchtower')&&days++<50)tick(s);
  assert.ok(days<50);assert.deepEqual(c.domestic.watchtowerPosition,position);
  const source=visionSources(s,faction).find(v=>v.kind==='watchtower'&&v.cityId===c.id);
  assert.equal(source.radius,32);assert.equal(source.x,position.x);assert.equal(source.y,position.y);
  assert.equal(visionSources(s,faction).find(v=>v.kind==='city'&&v.id===c.id).radius,22);
  assert.doesNotMatch(citySceneMarkup(citySceneState(s,c)),/data-city-watchtower=/,'the town does not contain a duplicate tower');
  assert.ok(!campaignBattleBuildings(s,c.id,1).some(b=>b.kind==='watchtower'),'a distant tower is not fabricated inside a siege');
  assert.match(regionalWatchtowersMarkup(intelligenceWorld(s,faction)),/data-region-watchtower=/);validateCampaign(JSON.parse(serializeCampaign(s)));
 }
});

test('upgrades, damage, restoration and a change of owner keep the regional tower at the same actual point',()=>{
 const s=newCampaign(81,'guandu-200'),c=s.cities.find(c=>c.id==='jinyang');c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower',s);
 const position=structuredClone(c.domestic.watchtowerPosition),seed=s.campaign.domestic.seed;
 c.domestic.techs.push('beaconNetwork');completeTechnologyBuilding(c,'beaconNetwork',s);
 assert.equal(s.campaign.domestic.seed,seed);assert.deepEqual(c.domestic.watchtowerPosition,position);
 assert.equal(visionSources(s,'yuan').find(v=>v.kind==='watchtower').radius,38);
 const a=buildingDurability(c,'watchtower');a.hp=0;assert.ok(!visionSources(s,'yuan').some(v=>v.kind==='watchtower'));
 a.hp=1;assert.equal(visionSources(s,'yuan').find(v=>v.kind==='watchtower').radius,38);
 c.owner='cao';assert.ok(!visionSources(s,'yuan').some(v=>v.kind==='watchtower'));assert.equal(visionSources(s,'cao').find(v=>v.kind==='watchtower').x,position.x);
 assert.deepEqual(c.domestic.watchtowerPosition,position);
});

test('foreign regional towers remain hidden, and observed towers retain their dated state after leaving sight',()=>{
 const s=newCampaign(81,'guandu-200'),c=s.cities.find(c=>c.id==='jinyang');c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower',s);
 const tower=regionalWatchtower(c);assert.ok(!pointVisible(s,tower,'cao'));updateVision(s);
 assert.ok(!watchtowerObservations(s).some(r=>r.data.cityId===c.id));
 s.campaign.vision.factions.cao.scouted.push({id:1,officerId:'cao',...tower,location:'xuchang',seenDay:1,expiresDay:2});
 updateVision(s);assert.equal(watchtowerObservations(s).find(r=>r.data.cityId===c.id).data.radius,32);
 s.campaign.day=2;buildingDurability(c,'watchtower').hp=0;updateVision(s);
 const last=watchtowerObservations(s).find(r=>r.data.cityId===c.id);
 assert.equal(last.day,1);assert.equal(last.visible,false);assert.equal(last.data.radius,32);assert.equal(last.data.hp,1000);
});

test('an interrupted regional tower resumes at the original worksite without another construction payment',()=>{
 const {s,c,u}=fixture(),position=structuredClone(c.domestic.watchtowerPosition),gold=c.gold;
 cancelDomestic(s,u.id);assert.equal(assignDomestic(s,c.id,'technology',u.id,{scheduled:true}),null);beginDomesticTurn(s);
 assert.deepEqual(c.domestic.watchtowerPosition,position);assert.equal(c.gold,gold);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('bounded placement still finds coastal land when random samples miss, and invalid positions are rejected',()=>{
 const s=newCampaign(81,'guandu-200');
 for(const c of s.cities){assert.ok(ensureWatchtowerPosition(s,c,()=>0),c.name);assert.ok(watchtowerPositionValid(s,c,c.domestic.watchtowerPosition));}
 const c=s.cities.find(c=>c.id==='xuchang');c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower',s);updateVision(s);
 const raw=serializeCampaign(s);validateCampaign(JSON.parse(raw));
 const bad=JSON.parse(raw);bad.cities.find(n=>n.id===c.id).domestic.watchtowerPosition.x=2000;assert.throws(()=>validateCampaign(bad),/瞭望塔位置/);
 const missing=JSON.parse(raw);missing.cities.find(n=>n.id===c.id).domestic.watchtowerPosition=null;assert.throws(()=>validateCampaign(missing),/瞭望塔缺少/);
 const old=JSON.parse(raw);old.campaign.domestic.version=23;assert.throws(()=>validateCampaign(old),/内政存档版本/);
});
