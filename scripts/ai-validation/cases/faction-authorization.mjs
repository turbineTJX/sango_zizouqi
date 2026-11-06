import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 if(save)assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {planStrategicAI}=await load('strategic-ai.mjs');
 const {requestFactionOrder}=await load('strategic-orders.mjs');
 const {s,target}=planningFront();planStrategicAI(s);
 const p=s.campaign.ai.plans.find(p=>p.faction==='yuan'),army=s.armies.find(a=>a.faction==='yuan'&&a.target===target.id);
 const checks={authorizedOperationLaunches:!!p&&p.phase==='attack'&&!!army};
 assert.ok(army,'fixture must contain an actual authorized march');
 const before=serializeCampaign(s),result=requestFactionOrder(s,'yuan',{kind:'hold',armyId:army.id},'now');
 checks.unownedControllerCannotCancel=!!result.error&&serializeCampaign(s)===before;
 // Closing the owner at a real review returns authority to the ordinary
 // command entrance. No fixed date or forbidden return route is involved.
 p.phase='cancelled';p.reserves={};p.requirements=[];
 checks.explicitCancellationReleases=!requestFactionOrder(s,'yuan',{kind:'hold',armyId:army.id},'now').error;
 return checks;
}
