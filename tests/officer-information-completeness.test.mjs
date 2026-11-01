import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,launchExpedition} from './helpers/auto-domestic-campaign.mjs';
import {campaignOfficers} from '../strategic-roster.mjs';
import {factionDirectoryMarkup,factionDirectoryRows} from '../faction-directory.mjs';
import {campaignInfoDetail,campaignInfoMarkup,campaignInfoIndex} from '../campaign-info.mjs';
import {officerDetailMarkup} from '../officer-roster.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {aptitudesMarkup} from '../aptitude-display.mjs';
import {troopAptitude} from '../tactic-learning.mjs';
import {troopTypes} from '../troop-equipment.mjs';
import {TROOPS} from '../engine.mjs';
const families=['spear','halberd','cavalry','archer'],grades=['C','B','A','S'];
const readAptitudes=html=>[...html.matchAll(/data-aptitude-family="([^"]+)">([^<]+)<b>([^<]+)<\/b>/g)].map(m=>[m[1],m[3]]);

test('catalog and current officers expose the four gameplay aptitudes, without obsolete siege or naval ranks',()=>{
 for(const u of OFFICER_CATALOG){
  const html=officerDetailMarkup(u.id);
  assert.deepEqual(readAptitudes(html),families.map(id=>[id,grades[u.aptitudes[id]]]));
 }
 const custom={id:'unregistered-officer',type:'spear',aptitudes:{spear:0,halberd:1,cavalry:2,archer:3}};
 assert.deepEqual(readAptitudes(aptitudesMarkup(custom)),[['spear','C'],['halberd','B'],['cavalry','A'],['archer','S']]);
 for(const type of troopTypes())assert.equal(troopAptitude({...custom,type}),custom.aptitudes[TROOPS[type].family]);
});

test('roster aptitude columns sort by actual rank in both directions without changing the campaign',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s),people=campaignOfficers(s);
 for(const family of families)for(const direction of ['asc','desc']){
  const html=factionDirectoryMarkup(s,'officer',{tab:'aptitudes',sort:family,direction});
  const ids=[...html.matchAll(/data-action="faction-object" data-kind="officer" data-id="([^"]+)"/g)].map(m=>m[1]);
  const actual=ids.map(id=>troopAptitude(people.find(r=>r.unit.id===id).unit,family));
  assert.equal(ids.length,people.length);
  assert.deepEqual(actual,[...actual].sort((a,b)=>direction==='asc'?a-b:b-a));
 }
 assert.equal(JSON.stringify(s),before);
});

test('information categories stay separate, display live loyalty and do not invent a troop for unprepared officers',()=>{
 const s=newCampaign(203,'guandu-200'),ix=campaignInfoIndex(s),u=ix.unit[0].unit,unprepared=ix.officer.find(r=>!r.prepared);
 s.campaign.domestic.loyalty[u.id]=61;const before=JSON.stringify(s);
 for(const [page,ids]of [['能力',['attributes']],['兵种适性',['aptitudes']],['特性',['traits']],['羁绊',['bonds']]]){
  const html=campaignInfoMarkup(s,{type:'officer',id:u.id,page,objectOnly:true}).body;
  assert.deepEqual([...html.matchAll(/data-info-section="([^"]+)"/g)].map(m=>m[1]),ids);
  if(page==='兵种适性')assert.deepEqual(readAptitudes(html),families.map(id=>[id,grades[troopAptitude(u,id)]]));
  if(page==='能力')assert.match(html,/<dt>忠诚<\/dt><dd>61<\/dd>/);
 }
 assert.ok(!campaignInfoDetail(s,'officer',unprepared.unit.id).sections.some(x=>x.id==='troops'||x.id==='combat'));
 assert.ok(campaignInfoDetail(s,'unit',u.id).sections.some(x=>x.id==='combat'));
 const bonds=factionDirectoryMarkup(s,'officer',{tab:'bonds'});
 assert.match(bonds,/data-kind="bond"/);assert.doesNotMatch(bonds,/data-kind="trait"/);
 for(const row of factionDirectoryRows(s,'unit')){
  const unit=ix.unit.find(r=>r.unit.id===row.id).unit;
  assert.equal(row.type,TROOPS[unit.type].name);assert.equal(row.aptitude,troopAptitude(unit));
 }
 assert.equal(JSON.stringify(s),before);
});

test('every generated information section is reachable through a visible dossier page for all five object types',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id);
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:'chenliu',policy:'auto'}),null);
 const before=JSON.stringify(s),ix=campaignInfoIndex(s);
 for(const type of ['city','army','unit','officer','faction']){
  const entry=ix[type][0],id=entry.unit?.id||entry.id;
  const detail=campaignInfoDetail(s,type,id),body=campaignInfoMarkup(s,{type,id,objectOnly:true}).body;
  const pages=[...body.matchAll(/data-action="campaign-info-page" data-page="([^"]+)"/g)].map(m=>m[1]);
  const shown=new Set(pages.flatMap(page=>[...campaignInfoMarkup(s,{type,id,page,objectOnly:true}).body.matchAll(/data-info-section="([^"]+)"/g)].map(m=>m[1])));
  for(const section of detail.sections)assert.ok(shown.has(section.id),`${type}: ${section.title} is unreachable`);
 }
 assert.equal(JSON.stringify(s),before);
});
