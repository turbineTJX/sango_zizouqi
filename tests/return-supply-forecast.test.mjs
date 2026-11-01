import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFront} from './helpers/strategic-planning.mjs';
import {cityForce} from '../city-units.mjs';
import {updateVision} from '../strategic-vision.mjs';
import {forecastRouteSupply} from '../strategic-route-supply.mjs';
import {serializeCampaign} from '../strategic-campaign.mjs';

test('restored return supply still rejects a camp that exhausts fixed carried grain',()=>{
 const {s,home,target,rear}=planningFront();
 home.grain=50000;rear.grain=0;target.grain=0;
 const unit=home.units[0];unit.troops=1000;unit.type='cavalry';unit.equipment.siege=null;
 const junction={id:'bridge-junction',kind:'junction',name:'测试路口',x:4,y:0};
 s.junctions=[junction];s.roads=[[home.id,junction.id],[junction.id,target.id]];
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:91};
 updateVision(s);
 // Fixed baggage deliberately does not scale up when the ration consumers grow.
 // Four 42-day legs leave a 2-day camp at 170 days, or 12 days at 180.
 const army={...cityForce(home),cityForce:false,units:[unit],roadPolicy:'main',supplyCapacity:300};
 const route=[junction.id,target.id];
 for(const troops of [1000,3000]){
  unit.troops=troops;const before=serializeCampaign(s);
  assert.equal(forecastRouteSupply(s,army,route,170,{attack:true}).feasible,true);
  const longer=forecastRouteSupply(s,army,route,180,{attack:true});
  assert.equal(longer.feasible,troops===1000);
  assert.ok(longer.delivered>0);
  if(longer.feasible)assert.ok(longer.sourceRequirements.every(r=>r.cityId===home.id));
  assert.equal(serializeCampaign(s),before,'forecast must not advance or consume the real campaign');
 }
});
