import {DIRECTIONS,DIRECTION_STATS} from '../domestic-designs.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {ACTIONS,actionChance,actionCandidates} from '../domestic.mjs';
import {domesticAbility,cooperationProfile} from '../domestic-cooperation.mjs';
import {officerRecommendation} from '../officer-recommendation.mjs';
import {campaignRosterMarkup} from '../strategic-roster.mjs';
const stats=['leadership','force','intellect','politics','charm'];

test('every work action uses exactly its one primary stat, including zero',()=>{
 assert.deepEqual(new Set(Object.values(ACTIONS).map(d=>d.stat)),new Set(stats));
 const s=newCampaign(42),c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id).unit;
 for(const def of Object.values(ACTIONS)){
  const primary=def.stat,base={...u,...Object.fromEntries(stats.map(k=>[k,40]))};
  for(const key of stats){
   const changed={...base,[key]:80},a=actionChance(s,c,base,def),b=actionChance(s,c,changed,def);
   if(key===primary)assert.ok(b>a,def.name+' must use '+key);else assert.equal(b,a,def.name+' must ignore '+key);
  }
  assert.equal(domesticAbility({...base,[primary]:0},def),0);
 }
});

test('helper effectiveness and recommendation ignore secondary stats for all five jobs',()=>{
 const s=newCampaign(43),c=s.cities.find(c=>c.id==='xuchang'),people=s.campaign.idle.filter(o=>o.location===c.id),u=people[0].unit,helper=people[1].unit;
 c.governor=null;
 for(const [key,def] of Object.entries(ACTIONS)){
  const direction=def.direction;
  c.domestic.cooldowns=Object.fromEntries(Object.keys(ACTIONS).filter(k=>k!==key).map(k=>[k,10000]));
  c.drill=1;c.walls=1;c.clinic=1;c.grain=10000;
  Object.assign(u,Object.fromEntries(stats.map(k=>[k,60])));Object.assign(helper,Object.fromEntries(stats.map(k=>[k,60])));
  const p={task:'domestic',city:c.id,direction},before=officerRecommendation(s,u,p),choices=actionCandidates(s,{cityId:c.id,direction,officerId:u.id,lastKey:null,failures:0}),coop=cooperationProfile(s,u,helper,def);
  for(const key of stats.filter(k=>k!==def.stat)){u[key]=95;helper[key]=95;}
  if(choices.length)assert.deepEqual(officerRecommendation(s,u,p),before,direction+' recommendation');
  assert.deepEqual(actionCandidates(s,{cityId:c.id,direction,officerId:u.id,lastKey:null,failures:0}),choices,direction+' candidate effects');
  assert.deepEqual(cooperationProfile(s,u,helper,def),coop,direction+' cooperation');
 }
});

test('domestic picker displays only its relevant primary stat in the appointment table',()=>{const s=newCampaign(44),labels={leadership:'统率',force:'武力',intellect:'智力',politics:'政治',charm:'魅力'};for(const [direction,key]of Object.entries(DIRECTION_STATS)){const html=campaignRosterMarkup(s,{personnel:{city:'xuchang'}},{task:'domestic',city:'xuchang',direction,selected:[]});assert.ok(html.includes(labels[key]));assert.ok(html.includes('data-personnel-choice'));for(const other of Object.keys(labels).filter(k=>k!==key))assert.ok(!html.includes('data-sort-key="'+other+'"'));}});


test('six independent appointment directions each have exactly one stat',()=>{
 assert.equal(Object.keys(DIRECTIONS).length,6);assert.equal(DIRECTIONS.commerce,'商业');assert.equal(DIRECTIONS.agriculture,'农业');
 for(const direction of Object.keys(DIRECTIONS))assert.deepEqual(new Set(Object.values(ACTIONS).filter(a=>a.direction===direction).map(a=>a.stat)),new Set([DIRECTION_STATS[direction]]));
 assert.equal(ACTIONS.heal.direction,'technology');assert.equal(ACTIONS.exercise.direction,'martial');assert.equal(ACTIONS.fortify.direction,'military');
});
