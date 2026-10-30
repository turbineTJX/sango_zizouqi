import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 const {planStrategicAI}=await load('strategic-ai.mjs');
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {updateVision}=await load('strategic-vision.mjs');
 const natural=validateCampaign(JSON.parse(await readFile(save,'utf8')));
 // A saved, launched expedition from the natural campaign. The sole mechanism
 // perturbation is a previously approved 1.1 combat margin, not extra troops.
 const p=natural.campaign.ai.plans.find(p=>p.phase==='attack');assert.ok(p);
 p.military.requiredAdvantage=1.1;natural.campaign.ai.lastPlanDay=0;
 const bytes=serializeCampaign(natural),copy=validateCampaign(JSON.parse(bytes));
 planStrategicAI(natural);planStrategicAI(copy);
 const checks={committedMarginDoesNotRise:p.military.requiredAdvantage<=1.1,
  deterministic:serializeCampaign(natural)===serializeCampaign(copy)};
 const {s,target}=planningFront();planStrategicAI(s);
 const attack=s.campaign.ai.plans.find(p=>p.faction==='yuan');assert.equal(attack.phase,'attack');
 const revision=s.campaign.ai.factions.yuan.strategy.revision;
 target.units.forEach(u=>u.troops=100000);s.campaign.day++;updateVision(s);planStrategicAI(s);
 checks.newThreatStillCancels=attack.phase==='cancelled'&&/优势/.test(attack.reason);
 checks.noDailyReroll=s.campaign.ai.factions.yuan.strategy.revision===revision;
 return checks;
}
