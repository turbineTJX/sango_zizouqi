import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldCampaign} from './helpers/field-campaign.mjs';
import {orderCampaignArmy,beginExecution,advanceCampaignStep,supplyConnection,armyPosition,dailySupply,serializeCampaign,validateCampaign,roadLength} from '../strategic-campaign.mjs';
import {renderSupplyRoute} from '../strategic-movement.mjs';

function column(){
 const s=fieldCampaign(),a=s.armies[0];
 assert.equal(orderCampaignArmy(s,a.id,'guandu'),null);
 beginExecution(s);advanceCampaignStep(s);
 assert.ok(a.travel);
 return {s,a};
}
test('turning around on the same physical road preserves real supply and daily depot withdrawal',()=>{
 const {s,a}=column(),link=supplyConnection(s,a),position=armyPosition(s,a),forward=structuredClone(s);
 assert.ok(link);assert.equal(link.source,'xuchang');
 assert.equal(orderCampaignArmy(s,a.id,a.travel.from,'auto',{scheduled:true,reverse:true}),null);
 assert.deepEqual(armyPosition(s,a),position);
 assert.deepEqual(supplyConnection(s,a),link);
 const points=svg=>[...svg.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 const actual=points(renderSupplyRoute(s,a,link)),expected=points(renderSupplyRoute(forward,forward.armies[0],link));
 assert.equal(actual.length,65);assert.equal(actual.length,expected.length);
 for(let i=0;i<actual.length;i++)for(let axis=0;axis<2;axis++)assert.ok(Math.abs(actual[i][axis]-expected[i][axis])<1e-9);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,forward,restored])dailySupply(state);
 assert.equal(a.supplyIn,forward.armies[0].supplyIn);
 assert.equal(a.supply,forward.armies[0].supply);
 assert.equal(s.cities.find(c=>c.id===link.source).grain,forward.cities.find(c=>c.id===link.source).grain);
 assert.equal(serializeCampaign(s),serializeCampaign(restored));
});
test('empty depots and supply range still prevent delivery after reversal',()=>{
 const {s,a}=column();
 assert.equal(orderCampaignArmy(s,a.id,a.travel.from,'auto',{scheduled:true,reverse:true}),null);
 for(const c of s.cities)c.grain=0;
 assert.equal(supplyConnection(s,a),null);
 const source=s.cities.find(c=>c.id==='xuchang');source.grain=1000;
 assert.ok(supplyConnection(s,a));
 source.x+=1000;
 a.travel.progress=roadLength(s,a.travel.from,a.travel.to)*.5;
 assert.equal(supplyConnection(s,a),null);
});
test('a hostile column cuts only the actual section between the depot and the army in either heading',()=>{
 const {s,a}=column(),t=a.travel,length=roadLength(s,t.from,t.to),enemy=s.armies.find(x=>x.faction!==a.faction);
 // Mechanism fixture: blockers occupy this real road on either side of the column.
 t.progress=length*.5;
 enemy.location=t.to;enemy.travel={from:t.to,to:t.from,road:t.road,progress:length*.75};
 assert.equal(supplyConnection(s,a),null);
 assert.equal(orderCampaignArmy(s,a.id,t.from,'auto',{scheduled:true,reverse:true}),null);
 assert.equal(supplyConnection(s,a),null);
 enemy.travel.progress=length*.25;
 const link=supplyConnection(s,a);assert.ok(link);assert.equal(link.source,'xuchang');
});
