import test from 'node:test';
import assert from 'node:assert/strict';
import {pointVisible,directPointVisible,visionSources,armyVisible,armyIntelligence,updateVision,fogMarkup} from '../strategic-vision.mjs';
import {metropolitanRegions,regionContains} from '../metropolitan-region-data.mjs';
import {cityLocationMarkup} from '../city-scene.mjs';

function fixture(faction='cao'){
 const other=faction==='cao'?'yuan':'cao';
 const city=(id,x,owner,size='large')=>({id,name:id,kind:'city',citySize:size,x,y:200,owner,units:[]});
 const cities=[city('west',100,faction),city('east',300,faction),city('foreign-town',550,other,'small'),city('foreign',700,other)];
 const prefecture={id:'prefecture',name:'府',kind:'junction',x:240,y:420};
 const record=()=>({cities:{},armies:{},scouted:[],battles:[],chronicle:[]});
 return {cities,junctions:[prefecture],roads:[['west','east'],['west','prefecture'],['prefecture','foreign-town'],['foreign-town','foreign']],roadSegments:{'foreign:foreign-town':{distance:1000}},armies:[],
  campaign:{scenarioId:'territorial-fixture',playerFaction:faction,day:1,battles:[],vision:{factions:{cao:record(),yuan:record()}}}};
}

test('adjacent owned town areas and governed prefectures give continuous sight for either faction',()=>{
 for(const faction of ['cao','yuan']){
  const s=fixture(faction),before=JSON.stringify(s),sources=visionSources(s,faction),regions=metropolitanRegions(s);
  for(let x=100;x<=300;x+=5)assert.ok(pointVisible(s,{x,y:200},faction,sources),'no gap between adjacent owned towns at '+x);
  const p=s.junctions[0],region=regions.find(r=>r.id===p.id);
  assert.equal(region.ownerId,'west');assert.ok(regionContains(region,p));
  assert.ok(sources.every(v=>Math.hypot(v.x-p.x,v.y-p.y)>v.radius),'the prefecture lies outside every city circle');
  assert.ok(pointVisible(s,p,faction));assert.ok(directPointVisible(s,p,faction));
  assert.equal(regions.find(r=>r.id==='foreign-town').centerId,'west');
  assert.ok(!pointVisible(s,s.cities[2],faction),'a foreign small town does not inherit its metropolis owner’s sight');
  assert.ok(!pointVisible(s,s.cities[3],faction));
  const fog=fogMarkup(s);
  for(const id of ['west','east','prefecture'])assert.ok(fog.includes(`data-vision-region="${id}"`));
  assert.ok(!fog.includes('data-vision-region="foreign-town"'));assert.ok(!fog.includes('data-vision-region="foreign"'));
  assert.equal(JSON.stringify(s),before,'territory and fog queries are read-only');
  assert.deepEqual(visionSources(JSON.parse(before),faction),sources,'reload derives the same sight without a saved geometry cache');
  s.cities[3].owner=faction;
  assert.ok(!pointVisible(s,s.cities[2],faction),'friendly areas on both sides do not fill a foreign enclave');
 }
});

test('territorial sight observes real enemies, loses the area on capture and retains dated observations',()=>{
 for(const faction of ['cao','yuan']){
  const s=fixture(faction),enemy={id:'a1',faction:faction==='cao'?'yuan':'cao',location:'prefecture',units:[{id:'enemy',troops:1000}],route:['secret'],target:'secret'};
  s.armies.push(enemy);assert.ok(armyVisible(s,enemy,faction));updateVision(s);
  assert.equal(armyIntelligence(s,enemy.id,faction).day,1);assert.equal(armyIntelligence(s,enemy.id,faction).data.units[0].troops,1000);
  s.cities[0].owner=enemy.faction;s.campaign.day=2;enemy.units[0].troops=500;updateVision(s);
  assert.ok(!pointVisible(s,s.junctions[0],faction));assert.ok(!armyVisible(s,enemy,faction));
  assert.ok(!fogMarkup(s).includes('data-vision-region="prefecture"'));
  assert.equal(armyIntelligence(s,enemy.id,faction).day,1);assert.equal(armyIntelligence(s,enemy.id,faction).data.units[0].troops,1000);
  assert.ok(pointVisible(s,s.junctions[0],enemy.faction),'the new owner receives the same territorial sight');
 }
});

test('unscouted town scenery uses only public geography and never exposes facilities or construction',()=>{
 const c={id:'west',kind:'city',citySize:'large',province:'兖州',x:100,y:200},markup=cityLocationMarkup(c);
 assert.match(markup,/class="map-city-model city-location-model"/);assert.match(markup,/class="town-foundation /);
 assert.doesNotMatch(markup,/data-city-model|data-map-building|data-city-building|scaffold|watchtower/);
 assert.equal(cityLocationMarkup({...c,owner:'yuan',gold:99999,grain:23456,walls:5,commerce:5,project:{key:'walls',progress:10},domestic:{techs:['watchtower']}}),markup);
});
