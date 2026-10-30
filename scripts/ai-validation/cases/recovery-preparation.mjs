import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Fixed mechanism perturbations are separate from the two unmodified natural
// continuation windows. Do not label this fixture a natural conquest result.
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 const natural=validateCampaign(JSON.parse(await readFile(save,'utf8')));
 assert.equal(natural.campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {evaluateOffensive,offensiveFacts}=await load('strategic-ai.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {assessRecoveryCapacity,recoveryFailureReason}=await load('strategic-recovery.mjs');
 let fixture;
 for(let enemy=1200;enemy<=3000&&!fixture;enemy+=100){
  const f=planningFront();f.target.gold=0;f.target.manpower=0;f.target.units.forEach(u=>u.troops=enemy);initializeVision(f.s);
  const p={faction:'yuan',staging:f.home,target:f.target,groups:[{c:f.home,units:f.home.units.slice(0,3),days:0}],assaultDays:1,siegeDays:2};
  const funded=evaluateOffensive(f.s,p);
  if(!funded.accepted||funded.advantage>=1.7||funded.advantage<=1.3)continue;
  for(let grain=3000;grain<15000;grain+=250){
   f.home.grain=grain;const blocked=evaluateOffensive(f.s,p);
   if(blocked.recovery.feasible||!blocked.recovery.rows.every(r=>r.repairable)||blocked.recovery.rows.some(r=>r.shortfall.gold||r.shortfall.manpower))continue;
   const facts=offensiveFacts(f.s,p).facts;
   if(!facts.supply.feasible||!facts.sourcesSupplied)continue;
   const row=blocked.recovery.rows[0],before=grain;f.home.grain+=row.shortfall.grain;
   const repaired=evaluateOffensive(f.s,p);f.home.grain=before;
   if(repaired.accepted){fixture={...f,p,blocked,repaired,facts};break;}
  }
 }
 assert.ok(fixture,'Must reproduce a resource-only obstacle whose exact deficit is sufficient');
 const {s,home,p,blocked,repaired,facts}=fixture,bytes=serializeCampaign(s);
 const checks={repairableDeficitReachesPreparation:blocked.reason===recoveryFailureReason(blocked.recovery),unfundedNeverLaunches:!blocked.accepted,
  resourcesRemainReal:serializeCampaign(s)===bytes,restoredResourcesAdmit:repaired.accepted};
 const copy=JSON.parse(bytes),q={...p,staging:copy.cities.find(c=>c.id===home.id),target:copy.cities.find(c=>c.id===p.target.id)};
 q.groups=[{c:q.staging,units:q.staging.units.slice(0,3),days:0}];
 checks.deterministic=JSON.stringify(evaluateOffensive(copy,q))===JSON.stringify(blocked);
 // Missing future capacity and unknown enemies cannot be repaired by a label.
 home.manpower=0;home.gold=0;const poor=evaluateOffensive(s,p);checks.poorNeverLaunches=!poor.accepted;
 const impossible=assessRecoveryCapacity({...facts.recoveryInputs,cities:facts.recoveryInputs.cities.map(c=>({...c,quota:0,nextQuota:0}))},blocked.estimatedLosses);
 checks.quotaStillBinding=!impossible.feasible&&impossible.rows.some(r=>!r.repairable);
 return checks;
}
