import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// The input is an archived natural campaign. Only the protection branches below
// perturb its clock/intent/unsafe callback; those branches are mechanism checks.
export async function exercise({source,save}){
 const load=file=>import(pathToFileURL(join(source,file)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 const {progressConcentrations,activeConcentration}=await load('strategic-concentration.mjs');
 const {strategicPower}=await load('strategic-ai.mjs'),{cityForce}=await load('city-units.mjs');
 const bytes=await readFile(save,'utf8');
 const fixture=()=>{const s=validateCampaign(JSON.parse(bytes)),p=activeConcentration(s,'force-7');assert.ok(p);return {s,p,c:s.cities.find(c=>c.id===p.staging)};};
 const options=s=>({power:c=>strategicPower(s,cityForce(c)),unsafe:()=>false});
 const {s,p,c}=fixture(),before=serializeCampaign(s),copy=validateCampaign(JSON.parse(before));
 assert.equal(p.officerIds.length,5);
 assert.ok(p.intendedIds.every(id=>p.officerIds.includes(id)&&p.arrivedIds.includes(id)&&c.units.some(u=>u.id===id)));
 assert.ok(strategicPower(s,cityForce(c))<p.requirements[0].defensePower,'Natural old-estimate mismatch must be present');
 progressConcentrations(s,options(s));assert.equal(p.status,'active','Arrivals must wait for the turn review');
 progressConcentrations(s,{...options(s),reviewFaction:p.faction});
 progressConcentrations(copy,options(copy));progressConcentrations(copy,{...options(copy),reviewFaction:p.faction});
 assert.equal(serializeCampaign(s),serializeCampaign(copy),'Save/reload must make the same decision');
 const old=JSON.parse(before);assert.deepEqual(s.cities,old.cities);assert.deepEqual(s.armies,old.armies);assert.deepEqual(s.campaign.idle,old.campaign.idle);
 const checks={arrivedCompletes:p.status==='complete'};
 {
  const {s,p}=fixture();p.lastProgressDay=s.campaign.day-10;
  progressConcentrations(s,options(s));checks.arrivedWaitsForReview=p.status==='active';
  progressConcentrations(s,{...options(s),reviewFaction:p.faction});
  checks.arrivedWaitsForReview&&=p.status==='complete';
 }
 {
  const {s,p}=fixture(),deadline=p.deadline;s.campaign.day=deadline+1;
  progressConcentrations(s,{...options(s),reviewFaction:p.faction});
  checks.deadlinePreserved=p.status==='cancelled'&&p.deadline===deadline;
 }
 {
  const {s,p,c}=fixture(),other=s.cities.find(x=>x.owner===p.faction&&x.id!==c.id&&x.units.length);
  p.intendedIds.push(other.units[0].id);progressConcentrations(s,{...options(s),reviewFaction:p.faction});
  checks.unissuedExcluded=p.status==='active';
 }
 {
  const {s,p}=fixture(),cities=structuredClone(s.cities);
  progressConcentrations(s,{...options(s),reviewFaction:p.faction,unsafe:()=>true});
  checks.unsafeCancels=p.status==='cancelled';assert.deepEqual(s.cities,cities);
 }
 return checks;
}
