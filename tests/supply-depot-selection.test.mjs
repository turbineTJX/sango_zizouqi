import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,supplyConnection,roadLength} from '../strategic-campaign.mjs';
import {withPlanningQueries} from '../planning-queries.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';

function depotPair(){
 const s=newCampaign(217,'guandu-200'),a=fieldFromCity(s,'xuchang');
 s.cities=s.cities.filter(c=>['xuchang','chenliu'].includes(c.id));
 for(const c of s.cities){c.owner='cao';c.grain=10000;c.granary=0;c.units=[];}
 s.armies=[a];s.junctions=[];s.roads=[['xuchang','chenliu']];
 s.roadSegments={'chenliu:xuchang':{distance:100,terrain:'land'}};
 return {s,a,left:s.cities.find(c=>c.id==='xuchang'),right:s.cities.find(c=>c.id==='chenliu')};
}

test('depot choice uses delivery rate before proximity and refreshes after stock changes',()=>{
 const {s,a,right}=depotPair();right.granary=20;
 assert.equal(supplyConnection(s,a).source,'chenliu','a distant developed depot out-delivers the nearby small depot');
 right.grain=0;
 assert.equal(supplyConnection(s,a).source,'xuchang','an emptied depot cannot retain the previous selection');
});

test('equal-rate depots keep the source id tie break and its actual forward path',()=>{
 const {s,a}=depotPair(),mid='depot-test-junction';
 s.junctions=[{id:mid,kind:'junction',x:0,y:0}];s.roads=[['xuchang',mid],['chenliu',mid]];
 s.roadSegments={'depot-test-junction:xuchang':{distance:30,terrain:'land'},'chenliu:depot-test-junction':{distance:30,terrain:'land'}};
 a.location=mid;
 const link=supplyConnection(s,a);assert.equal(link.source,'chenliu');assert.deepEqual(link.path,['chenliu',mid]);
});

test('two hypothetical marching offsets in one read scope choose their own physical depot',()=>{
 const {s,a}=depotPair(),length=roadLength(s,'xuchang','chenliu'),force=f=>({...a,travel:{from:'xuchang',to:'chenliu',road:'main',progress:length*f}}),before=JSON.stringify(s);
 withPlanningQueries(s,()=>{
  assert.equal(supplyConnection(s,force(.1)).source,'xuchang');
  assert.equal(supplyConnection(s,force(.9)).source,'chenliu');
  assert.equal(supplyConnection(s,force(.1)).source,'xuchang');
 });
 assert.equal(JSON.stringify(s),before);
});
