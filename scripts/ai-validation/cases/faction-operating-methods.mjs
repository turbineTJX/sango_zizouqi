import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// Declared development reproduction. Ordinary initial resources, roads,
// visibility and battles; no runtime injection, forced war or forced result.
export async function observeOperatingLoop(source,{days=900,seed=417}={}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const api={...await load('national-scenarios.mjs'),...await load('road-network.mjs'),...await load('officer-catalog.mjs')};
 const {buildLocalCampaignInput}=await load('scripts/ai-validation/local-campaign-cases.mjs');
 const input=buildLocalCampaignInput(api,'four-cities');
 if(!api.nationalScenario(input.spec.id))api.registerCampaignAuditScenario(input);
 const {newCampaign,advanceCampaignDay,serializeCampaign,validateCampaign}=await load('strategic-campaign.mjs');
 const s=newCampaign(seed,input.spec.id,'cao',{allAI:true});
 const owners=new Map(s.cities.map(c=>[c.id,c.owner])),seen=new Set(),captures=[],departures=[],uses=[];
 let resources=true,replay=true;
 for(let day=1;day<=days&&!s.finished;day++){
  const copy=day%100===0?validateCampaign(JSON.parse(serializeCampaign(s))):null;
  advanceCampaignDay(s);
  if(copy){advanceCampaignDay(copy);replay&&=serializeCampaign(s)===serializeCampaign(copy);}
  for(const c of s.cities){
   resources&&=['gold','grain','manpower','wounded'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0);
   if(owners.get(c.id)!==c.owner){captures.push({day:s.campaign.day,city:c.id,from:owners.get(c.id),to:c.owner});owners.set(c.id,c.owner);}
  }
  for(const a of s.armies.filter(a=>!a.disbanded&&!a.defense))if(!seen.has(a.id)){seen.add(a.id);departures.push({day:s.campaign.day,faction:a.faction,target:a.target});}
  for(const e of s.campaign.domestic.events)if(e.phase==='complete'&&captures.some(c=>c.city===e.cityId&&c.to===e.faction&&c.day<e.day))uses.push({day:s.campaign.day,city:e.cityId,faction:e.faction});
 }
 const gains=captures.filter(c=>c.from!=='neutral'&&c.to!=='neutral');
 const continued=gains.some(first=>gains.some(next=>next.to===first.to&&next.city!==first.city&&next.day>first.day&&departures.some(d=>d.faction===first.to&&d.target===next.city&&d.day>first.day&&d.day<=next.day)));
 return {day:s.campaign.day,captures,departures,uses,checks:{
  localWar:gains.length>0,
  sustainedOffensive:continued,
  conqueredCityUsed:uses.length>0,
  ordinaryResourcesRemainValid:resources,
  deterministicContinuation:replay
 }};
}
export async function exercise({source,save}){
 if(save){const {validateCampaign}=await import(pathToFileURL(join(source,'strategic-campaign.mjs')));assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);}
 return (await observeOperatingLoop(source)).checks;
}
