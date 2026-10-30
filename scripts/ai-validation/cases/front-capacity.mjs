import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {manageStrategicEconomy,planStrategicAI}=await load('strategic-ai.mjs');
 const {makeOfficer}=await load('engine.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {ECONOMY_RULES}=await load('data/design/economy-rules.mjs');
 const checks={};
 const fixture=turn=>{const f=planningFront();f.s.turn=turn;f.s.campaign.day=(turn-1)*10+1;f.home.grain=60000;f.home.gold=30000;
  const units=['person-263','person-420','person-533'].map(id=>({...makeOfficer(id,0,0,3),homeCity:f.home.id}));
  for(const u of units)f.s.campaign.idle.push({unit:u,faction:'yuan',location:f.home.id,destination:null,remainingDays:0});
  f.s.campaign.domestic.people=f.s.campaign.domestic.people.filter(p=>!units.some(u=>u.id===p.id));initializeVision(f.s);return {...f,units};};
 const men=s=>s.cities.reduce((n,c)=>n+c.manpower+c.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded,0);
 {
  const {s,home,units}=fixture(61),before=men(s),copy=structuredClone(s);manageStrategicEconomy(s);manageStrategicEconomy(copy);
  checks.lateRealRosterCanExpand=home.units.length>6;
  checks.carrierStillAvailable=s.campaign.idle.some(o=>units.some(u=>u.id===o.unit.id));
  checks.noFreeMen=men(s)===before;checks.deterministic=serializeCampaign(s)===serializeCampaign(copy);
 }
 {
  const {s,home}=fixture(20);manageStrategicEconomy(s);checks.earlyLimitPreserved=home.units.length<=6;
 }
 {
  const {s,home,target}=planningFront();s.turn=21;s.campaign.day=201;home.grain=60000;home.gold=30000;target.units.forEach(u=>u.troops=10000);
  s.roadSegments[[home.id,target.id].sort().join(':')]={distance:240};initializeVision(s);planStrategicAI(s);
  const need=s.campaign.ai.cities[home.id].grainNeed,capacity=ECONOMY_RULES.capacity.grainBase+home.granary*ECONOMY_RULES.capacity.grainPerGranary;
  checks.forwardDepotCoversLongMarch=need>3600;checks.stockTargetWithinCapacity=need<=capacity;checks.noStockGift=home.grain<=60000;
 }
 return checks;
}
