import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 if(save)assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs'),{initializeVision}=await load('strategic-vision.mjs');
 const {progressConcentrations}=await load('strategic-concentration.mjs'),{planStrategicAI}=await load('strategic-ai.mjs'),{plannedOfficer}=await load('strategic-intent.mjs');
 const {requestFactionOrder}=await load('strategic-orders.mjs');
 const {s,home,rear,target}=planningFront();home.units=home.units.slice(0,2);home.units.forEach(u=>u.wounded=0);target.units.forEach(u=>{u.troops=8000;u.wounded=0;});initializeVision(s);
 s.campaign.ai.concentrations.push({faction:'yuan',staging:home.id,target:target.id,status:'active',createdDay:1,deadline:21,lastProgressDay:1,finishedDay:null,intendedIds:['yan'],officerIds:['yan'],arrivedIds:['yan'],requirements:[{cityId:home.id,gold:0,grain:0,manpower:0,defensePower:999999}],score:100,full:false,reason:'已完成本步移动但不足以立即进攻'});
 progressConcentrations(s,{power:()=>1,unsafe:()=>false,reviewFaction:'yuan'});
 const copy=JSON.parse(serializeCampaign(s));for(const w of [s,copy])planStrategicAI(w);
 const checks={retainsRealFrontDuty:plannedOfficer(s,'yan'),doesNotLaunchUnfundedAttack:!s.campaign.ai.plans.some(p=>p.faction==='yuan'&&p.phase==='attack'),deterministic:serializeCampaign(s)===serializeCampaign(copy)};
 const before=serializeCampaign(s),result=requestFactionOrder(s,'yuan',{kind:'transfer',cityId:home.id,target:rear.id,officerIds:['yan'],cargo:{gold:0,grain:0,manpower:0},route:[rear.id],safeOnly:true},'after');
 checks.nextModuleCannotReverse=!!result.error&&serializeCampaign(s)===before;
 // Remove the actual border objective, then let the next legal review release
 // it. The duty must not become a fixed cooldown or permanent person lock.
 for(const w of [copy]){w.cities.find(c=>c.id===target.id).owner='yuan';w.cities.find(c=>c.id===target.id).domestic.owner='yuan';w.campaign.day=11;w.turn=2;initializeVision(w);planStrategicAI(w);}
 checks.finishedFrontReleases=!copy.campaign.ai.coordination.missions.some(m=>!['complete','cancelled','failed'].includes(m.status)&&m.officerIds.includes('yan'));
 return checks;
}
