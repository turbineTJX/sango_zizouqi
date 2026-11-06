import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// A requested policy boundary: once one legal worker/direction is found, a
// real staffing transfer must not evaluate every other counterfactual roster.
// This measures the actual controller, not a declaration or a helper export.
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {planStrategicPersonnel,initializeStrategicAI}=await load('strategic-ai.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {s,home,rear,target}=planningFront();target.owner='neutral';target.domestic.owner='neutral';target.units=[];
 s.roads=[[home.id,rear.id]];home.governor='shao';for(const u of home.units)u.wounded=0;
 home.gold=50000;home.grain=60000;rear.gold=50000;rear.grain=60000;
 initializeVision(s);initializeStrategicAI(s);
 const total=s.cities.reduce((n,c)=>n+c.units.reduce((v,u)=>v+u.troops+u.wounded,0),0),stocks=JSON.stringify(s.cities.map(c=>[c.id,c.gold,c.grain,c.manpower])),copy=JSON.parse(serializeCampaign(s));
 let previews=0;
 for(const world of [s,copy]){
  const cities=world.cities;
  world.cities=new Proxy(cities,{get(target,key,receiver){if(key!=='map')return Reflect.get(target,key,receiver);return function(fn,thisArg){
   const caller=new Error().stack.split('\n')[2]||'',result=Array.prototype.map.call(target,fn,thisArg);
   if(caller.includes('strategic-ai.mjs:')&&result.length===target.length&&result.every((c,i)=>c?.id===target[i].id&&Array.isArray(c.units))&&result.filter((c,i)=>c.units.length!==target[i].units.length).length===1)previews++;
   return result;
  };}});
  try{planStrategicPersonnel(world,'yuan');}finally{world.cities=cities;}
 }
 const p=s.campaign.ai.staffing.find(p=>p.cityId===rear.id),traveller=p&&s.campaign.idle.find(o=>o.unit.id===p.officerId);
 const after=s.cities.reduce((n,c)=>n+c.units.reduce((v,u)=>v+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded,0);
 return {
  firstLegalMatchStopsCandidateScan:previews<=2&&!!p,
  realTransferCreated:!!traveller&&traveller.destination===rear.id&&traveller.location===home.id,
  originalGovernorRetained:home.units.some(u=>u.id==='shao'),
  noTroopCreation:after===total,
  noResourceCreation:stocks===JSON.stringify(s.cities.map(c=>[c.id,c.gold,c.grain,c.manpower])),
  deterministic:serializeCampaign(s)===serializeCampaign(copy),
 };
}
