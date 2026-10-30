import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {manageStrategicEconomy,plannedCombatForce,strategicTravelDays,strategicCapabilities}=await load('strategic-ai.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {gateDurability}=await load('building-durability.mjs');
 const {s,home,target}=planningFront();
 // Fixed contact conditions: distant weak gate, real equipment and six units.
 home.grain=60000;home.gold=50000;home.units[0].equipment.siege='ram';
 gateDurability(target).hp=100;home.governor=null;
 s.roadSegments[[home.id,target.id].sort().join(':')]={distance:240};
 initializeVision(s);
 const plain=home.units.map(u=>({...u,equipment:{...u.equipment,siege:null}}));
 const travel=units=>strategicTravelDays(s,plannedCombatForce(s,home,units),[target.id]);
 const gate=units=>Math.max(2,Math.ceil(gateDurability(target).hp/strategicCapabilities(s,plannedCombatForce(s,home,units)).siege));
 assert.ok(travel(home.units)>travel(plain));assert.equal(gate(home.units),gate(plain));
 const clone=structuredClone(s);manageStrategicEconomy(s);manageStrategicEconomy(clone);
 const checks={unhelpfulEngineRemoved:home.units.every(u=>!u.equipment.siege),
  deterministic:serializeCampaign(s)===serializeCampaign(clone),integerStocks:s.cities.every(c=>[c.gold,c.grain,c.manpower].every(Number.isSafeInteger))};
 return checks;
}
