import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,transferOfficer} from '../strategic-campaign.mjs';
import {newCommand,selectCommandPoint,editCommandWaypoint,changeCommandUnit,commandRoute,commandMarkup} from '../strategic-command.mjs';
import {personnelRouteDays,advancePersonnel} from '../personnel-movement.mjs';

test('reselecting the destination preserves the edited route; explicit reset restores the default',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'expedition','town-8'),original=serializeCampaign(s);
 assert.equal(selectCommandPoint(s,p,'town-5'),null);const direct=[...p.route];
 assert.equal(editCommandWaypoint(s,p,.5,'town-57'),true);const draft=structuredClone(p);
 assert.equal(selectCommandPoint(s,p,'town-5'),null);assert.deepEqual(p,draft);
 assert.equal(selectCommandPoint(s,p,'town-5',{resetRoute:true}),null);assert.deepEqual(p.route,direct);assert.deepEqual(p.waypoints,[]);
 assert.equal(serializeCampaign(s),original);
});

test('unchanged troop fields do not enroll extra units or erase the destination and waypoints',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'expedition','xuchang'),u=s.cities.find(c=>c.id===p.city).units[0];
 selectCommandPoint(s,p,'chenliu');const draft=structuredClone(p),before=serializeCampaign(s);
 for(const [field,value]of [['troops',String(u.troops)],['type',u.type],['siege',u.equipment?.siege||''],['ship',u.equipment?.ship||'']]){
  assert.equal(changeCommandUnit(s,p,u.id,field,value),null);assert.deepEqual(p,draft);
 }
 assert.equal(serializeCampaign(s),before);
});

test('transport preview uses actual carrier speed and relay handoff days without changing the campaign',()=>{
 for(const relay of [null,'xuchang'])for(const grain of [0,47]){
  const s=newCampaign(203,'guandu-200'),p=newCommand(s,'transfer','luoyang');
  p.selected=['person-195'];p.destination='chenliu';p.step='target';p.cargo.grain=grain;p.relay=grain?relay:null;
  const unit=s.cities.find(c=>c.id===p.city).units.find(u=>u.id===p.selected[0]),route=commandRoute(s,p);
  const before=serializeCampaign(s),days=personnelRouteDays(s,{unit,location:p.city,destination:p.destination,cargo:p.cargo},route.route,{relay:p.relay});
  assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,new RegExp('预计 '+days+' 天抵达'));
  assert.equal(serializeCampaign(s),before);
  assert.equal(transferOfficer(s,unit.id,p.destination,{cargo:p.cargo,relay:p.relay}),null);
  const carrier=s.campaign.idle.find(o=>o.unit.id===unit.id);let actual=0;
  while(carrier.destination&&actual<30){advancePersonnel(s,carrier);actual++;}
  assert.equal(carrier.destination,null);assert.equal(actual,days,JSON.stringify({relay:p.relay,grain,days,actual}));
 }
});
