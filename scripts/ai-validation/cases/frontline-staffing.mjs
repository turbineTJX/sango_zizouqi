import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {planStrategicPersonnel,strategicCityBudget}=await load('strategic-ai.mjs');
 const {personnelCityProfile}=await load('strategic-personnel.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {s,home,rear}=planningFront();home.governor=home.units[0].id;
 home.gold=50000;home.grain=60000;rear.gold=50000;rear.grain=60000;
 initializeVision(s);
 assert.equal(personnelCityProfile(s,home).role,'front');assert.equal(personnelCityProfile(s,rear).role,'rear');
 assert.deepEqual(strategicCityBudget(s,rear).budget.fundingShortages,{gold:0,grain:0});
 const before=home.units.map(u=>u.id),total=home.units.reduce((n,u)=>n+u.troops+u.wounded,0),copy=structuredClone(s);
 planStrategicPersonnel(s,'yuan');planStrategicPersonnel(copy,'yuan');
 const checks={frontArmyRetained:before.every(id=>home.units.some(u=>u.id===id)),
  deterministic:serializeCampaign(s)===serializeCampaign(copy),
  noTroopCreation:home.units.reduce((n,u)=>n+u.troops+u.wounded,0)+s.campaign.idle.filter(o=>before.includes(o.unit.id)).reduce((n,o)=>n+o.unit.troops+o.unit.wounded,0)===total};
 // A quiet rear-to-rear allocation must remain available through real travel.
 const peaceful=planningFront();peaceful.target.owner='neutral';peaceful.target.domestic.owner='neutral';peaceful.target.units=[];
 peaceful.s.roads=[[peaceful.home.id,peaceful.rear.id]];peaceful.home.governor=peaceful.home.units[0].id;initializeVision(peaceful.s);
 planStrategicPersonnel(peaceful.s,'yuan');checks.peacefulStaffingWorks=peaceful.s.campaign.ai.staffing.some(p=>p.cityId===peaceful.rear.id);
 return checks;
}
