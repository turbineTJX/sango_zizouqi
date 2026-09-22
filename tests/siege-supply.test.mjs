import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldCampaign,fieldFromCity} from './helpers/field-campaign.mjs';
import {beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,orderCampaignArmy,splitCampaignArmy,supplyConnection,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';

function nextDays(s,count=2){const end=s.campaign.day+count;for(let i=0;i<20&&s.campaign.day<end;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,end);}

function siege(columns=1){
 const s=fieldCampaign();
 for(const c of s.cities.filter(c=>c.owner==='yuan'))c.kind='gate';
 for(const a of s.armies.filter(a=>a.faction==='yuan'))a.stationary=true;
 const ids=['a1'];for(let i=1;i<columns;i++){const first=s.armies.find(a=>a.id==='a1');assert.equal(splitCampaignArmy(s,'a1',[first.units.at(-1).id]),null);ids.push(s.armies.at(-1).id);}
 for(const id of ids)assert.equal(orderCampaignArmy(s,id,'guandu'),null);beginExecution(s);
 for(let i=0;i<20&&!activeBattles(s).some(r=>r.cityId==='guandu'&&ids.every(id=>r.armyIds.includes(id)));i++){for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);}
 const r=activeBattles(s).find(r=>r.cityId==='guandu');assert.ok(r);assert.equal(r.kind,'siege');
 const a=s.armies.find(a=>a.id==='a1');assert.equal(a.travel,null);
 // Isolate the actual rear depot, so an alternative friendly source cannot hide a cut.
 for(const c of s.cities.filter(c=>c.owner==='cao'&&c.id!=='xuchang'))c.grain=0;
 s.grain=Math.floor(s.cities.filter(c=>c.owner==='cao').reduce((n,c)=>n+c.grain,0));
 return {s,a,r,ids};
}

test('a real siege receives daily grain outside the enemy city and resumes deterministically',()=>{
 const {s,a,r}=siege(),target=s.cities.find(c=>c.id==='guandu');
 assert.equal(target.owner,'yuan');const link=supplyConnection(s,a);
 assert.ok(link);assert.equal(link.source,'xuchang');assert.equal(link.path.at(-1),'guandu');
 a.supply=500;a.supplyIn=0;chooseEncounter(s,r.id,false);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,restored])nextDays(state);
 assert.ok(a.supplyIn>0);assert.equal(a.hunger,0);assert.equal(serializeCampaign(s),serializeCampaign(restored));
 validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('siege supplies stop when the single connecting road is cut',()=>{
 const {s,a,r}=siege(),c=s.cities.find(c=>c.id==='baima'),ids=c.units.filter(u=>u.troops>0&&!u.mission).slice(0,2).map(u=>u.id);assert.equal(ids.length,2);
 s.cities.find(c=>c.id==='guandu').kind='city';
 for(const [i,road] of ['main'].entries()){
  const blocker=fieldFromCity(s,c.id,{ids:[ids[i]]});blocker.location='guandu';blocker.travel={from:'guandu',to:'xuchang',progress:20,road};blocker.route=[];blocker.stationary=true;

 }
 assert.equal(supplyConnection(s,a),null);a.supply=500;a.supplyIn=0;chooseEncounter(s,r.id,false);nextDays(s);
 assert.equal(a.supplyIn,0);assert.ok(a.supply<500);assert.equal(a.hunger,0);
});

test('hostile cities are not supply transit depots and distance still limits siege delivery',()=>{
 const {s,a}=siege(),source=s.cities.find(c=>c.id==='xuchang');
 source.x+=1000;assert.equal(supplyConnection(s,a),null);
 source.x-=1000;s.roads=[['xuchang','baima'],['baima','guandu']];assert.equal(supplyConnection(s,a),null);
});

test('three real siege columns share depot and road capacity instead of multiplying supply',()=>{
 const {s,r,ids}=siege(3);assert.ok(ids.every(id=>r.armyIds.includes(id)));
 const columns=ids.map(id=>s.armies.find(a=>a.id===id));for(const a of columns){a.supply=100;a.supplyIn=0;}
 if(r.awaiting)chooseEncounter(s,r.id,false);nextDays(s);
 assert.ok(columns.every(a=>a.supplyIn>0));
 assert.ok(columns.reduce((n,a)=>n+a.supplyIn,0)<=360);
 assert.ok(columns.reduce((n,a)=>n+supplyConnection(s,a).rate,0)>360,'uncapped requests exceed the shared capacity');
});
