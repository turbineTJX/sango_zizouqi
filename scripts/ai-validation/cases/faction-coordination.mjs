import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Synthetic causal handoff case. The separately sealed natural input proves
// source compatibility; this fixture is not a claimed natural battle result.
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 if(save)assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {progressConcentrations}=await load('strategic-concentration.mjs');
 const {plannedOfficer}=await load('strategic-intent.mjs');
 const {requestFactionOrder}=await load('strategic-orders.mjs');
 const {prepareEnemyDomestic}=await load('ai-policy/domestic-staffing.mjs');
 const {s,home,target,rear}=planningFront(),id='yan';
 const p={faction:'yuan',staging:home.id,target:target.id,status:'active',createdDay:1,deadline:21,lastProgressDay:1,finishedDay:null,intendedIds:[id],officerIds:[id],arrivedIds:[id],requirements:[{cityId:home.id,gold:0,grain:0,manpower:0,defensePower:999999}],score:100,full:false,reason:'已实际抵达，等待前线交接'};
 s.campaign.ai.concentrations.push(p);
 const copy=JSON.parse(serializeCampaign(s)),stocks=JSON.stringify(s.cities.map(c=>[c.id,c.gold,c.grain,c.manpower]));
 for(const w of [s,copy])progressConcentrations(w,{power:()=>1,unsafe:()=>false,reviewFaction:'yuan'});
 const checks={transferStepCompletes:p.status==='complete',arrivalKeepsParentOwnership:plannedOfficer(s,id),deterministicHandoff:serializeCampaign(s)===serializeCampaign(copy)};
 const before=serializeCampaign(s),result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,officerIds:[id],target:rear.id,cargo:{gold:0,grain:0,manpower:0},route:[rear.id],safeOnly:true},'after');
 checks.conflictingTransferRejected=!!result.error&&before===serializeCampaign(s);
 prepareEnemyDomestic(copy);checks.optionalAppointmentCannotSteal=!copy.campaign.domestic.assignments.some(a=>a.officerId===id);
 checks.handoffCreatesNoResources=stocks===JSON.stringify(s.cities.map(c=>[c.id,c.gold,c.grain,c.manpower]));
 return checks;
}
