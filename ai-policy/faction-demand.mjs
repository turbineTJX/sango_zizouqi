import {cityBudget} from '../city-budget.mjs';
import {cityNeedsAgriculture,cityNeedsCommerce} from '../economy.mjs';
import {personnelCityProfile} from '../strategic-personnel.mjs';
import {cityPersonnel} from '../city-personnel.mjs';
import {assignmentFor} from '../domestic.mjs';
import {technologyStaffTarget} from '../technology-research-staff.mjs';

// Maturity is an operating fact, not a year, faction size or headcount. A
// solvent rear depot covers both its real recurring load and recorded bills.
export function rearOperatingSurplus(s,c){
 if(personnelCityProfile(s,c).role!=='rear'||c.hunger||c.domestic.research||c.project)return false;
 const b=cityBudget(s,c,{includeWork:false});
 return !b.shortages.gold&&!b.shortages.grain&&b.income.gold>=b.costs.gold&&b.income.grain>=b.costs.grain;
}
export function frontlineDemand(s,faction){
 return s.cities.filter(c=>c.owner===faction&&personnelCityProfile(s,c).role==='front').filter(c=>{
  const people=cityPersonnel(s,c.id).filter(o=>!o.unit.mission&&!o.unit.scouting&&!o.destination);
  const jobs=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id&&people.some(o=>o.unit.id===a.officerId));
  return cityNeedsAgriculture(s,c)&&!jobs.some(a=>a.direction==='agriculture')||cityNeedsCommerce(s,c)&&!jobs.some(a=>a.direction==='commerce')||c.manpower>0&&!jobs.some(a=>a.direction==='military');
 });
}
export function basicRearStaff(s,c,{includeWork=true}={}){
 const keep=new Set(c.governor?[c.governor]:[]),jobs=s.campaign.domestic.assignments.filter(a=>a.cityId===c.id);
 for(const a of jobs)if(includeWork&&a.action||a.proposal)keep.add(a.officerId);
 // Existing production and governance each retain a qualified real worker;
 // extra workers are adjustable only while actual front demand exists.
 for(const direction of [cityNeedsAgriculture(s,c)?'agriculture':null,cityNeedsCommerce(s,c)?'commerce':null,c.order<80?'martial':null].filter(Boolean)){
  const candidates=jobs.filter(a=>a.direction===direction).sort((a,b)=>Number(keep.has(b.officerId))-Number(keep.has(a.officerId))||a.officerId.localeCompare(b.officerId));
  if(candidates.length)keep.add(candidates[0].officerId);
 }
 const researchers=jobs.filter(a=>a.direction==='technology');
 // An affordable advanced establishment is a real qualification requirement.
 if(c.domestic.research||researchers.some(a=>a.proposal))for(const a of researchers.slice(0,technologyStaffTarget(c)))keep.add(a.officerId);
 return keep;
}
export function mayReleaseRearWorker(s,c,id,{afterWork=false,operationalDemand=false}={}){
 if(!rearOperatingSurplus(s,c)||!operationalDemand&&!frontlineDemand(s,c.owner).length||id===c.governor)return false;
 const a=assignmentFor(s,id);if(a?.proposal)return false;
 if(a?.action&&!afterWork)return false;
 const keep=basicRearStaff(s,c,{includeWork:!afterWork});
 // Paid work is wait-before-transfer, never a permission to interrupt it.
 if(keep.has(id))return false;
 return true;
}
export function rearOptionalHiring(s,c){return rearOperatingSurplus(s,c)&&frontlineDemand(s,c.owner).length>0;}
