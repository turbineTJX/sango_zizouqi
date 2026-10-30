import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs'),{planStrategicAI}=await load('strategic-ai.mjs'),{initializeVision}=await load('strategic-vision.mjs');
 const {registerStrategicAlgorithm,setStrategicAlgorithms}=await load('strategic-algorithms.mjs');
 const {evaluateCostBenefitV3}=await load('strategic-algorithm-defaults.mjs');
 const {s,home,target}=planningFront();home.gold=50000;home.grain=60000;target.units=[];target.manpower=0;target.gold=0;initializeVision(s);
 const seen=new Set(),cleanup=registerStrategicAlgorithm('offensiveEvaluator',{id:'repair-composition-search-v1',run:input=>{seen.add(input.facts.men);const normal=evaluateCostBenefitV3(input);return {...normal,score:input.facts.men<12000?-1000:normal.score};}});
 try{
  assert.equal(setStrategicAlgorithms(s,{offensiveEvaluator:'repair-composition-search-v1'}),null);
  const before=serializeCampaign(s),copy=JSON.parse(before);planStrategicAI(s);planStrategicAI(copy);
  const p=s.campaign.ai.plans.find(p=>p.faction==='yuan');
  return {rejectedPrefixesDoNotExhaustSearch:seen.has(12000),viableLaterRosterLaunches:!!p&&p.officerIds.length>=4,
   deterministic:serializeCampaign(s)===serializeCampaign(copy),respectsCorpsLimit:s.armies.every(a=>a.units.length<=10),
   noTroopCreation:s.cities.flatMap(c=>c.units).concat(s.armies.flatMap(a=>a.units),s.campaign.idle.map(o=>o.unit)).reduce((n,u)=>n+u.troops+u.wounded,0)===18000};
 }finally{cleanup();}
}
