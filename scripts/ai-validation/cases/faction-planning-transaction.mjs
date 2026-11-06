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
 const {runFactionPlanning}=await load('ai-policy/action-runtime.mjs');
 const {s}=planningFront(),before=serializeCampaign(s),copy=JSON.parse(before);
 let isolated=false;
 runFactionPlanning(s,draft=>{planStrategicAI(draft);isolated=serializeCampaign(s)===before;});
 runFactionPlanning(copy,draft=>planStrategicAI(draft));
 const checks={allDecisionsAreProposals:isolated,deterministic:serializeCampaign(s)===serializeCampaign(copy),realOperationPreserved:s.armies.some(a=>a.faction==='yuan'&&!a.disbanded)};
 const broken=planningFront().s,original=serializeCampaign(broken);
 try{runFactionPlanning(broken,draft=>{planStrategicAI(draft);throw Error('interrupted proposal');});}catch{}
 checks.failedProposalLeavesWorldUntouched=serializeCampaign(broken)===original;
 const invalid=planningFront().s,initial=serializeCampaign(invalid);let rejected=false;
 try{runFactionPlanning(invalid,draft=>{draft.cities[0].gold=-1;});}catch{rejected=true;}
 checks.overspendingProposalRejected=rejected&&serializeCampaign(invalid)===initial;
 return checks;
}
