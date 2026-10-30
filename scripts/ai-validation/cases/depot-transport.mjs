import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exercise({source,save}){
 const load=f=>import(pathToFileURL(join(source,f)));
 const {validateCampaign,serializeCampaign}=await load('strategic-campaign.mjs');
 assert.equal(validateCampaign(JSON.parse(await readFile(save,'utf8'))).campaign.allAI,true);
 const {planningFront}=await load('tests/helpers/strategic-planning.mjs');
 const {planStrategicAI}=await load('strategic-ai.mjs');
 const {makeOfficer}=await load('engine.mjs');
 const {initializeVision}=await load('strategic-vision.mjs');
 const {advancePersonnel}=await load('personnel-movement.mjs');
 const checks={};
 const stocks=s=>s.cities.reduce((n,c)=>n+c.grain,0)+s.campaign.idle.reduce((n,o)=>n+(o.cargo?.grain||0),0)+s.armies.filter(a=>!a.disbanded).reduce((n,a)=>n+a.supply,0);
 const fixture=()=>{const f=planningFront();f.home.grain=3000;f.home.gold=3000;f.rear.grain=60000;f.rear.gold=30000;
  f.rear.units=['person-263','person-420','person-533','person-534','person-536'].map(id=>({...makeOfficer(id,2000,0,3),homeCity:f.rear.id}));initializeVision(f.s);return f;};
 {
  const {s,home,rear}=fixture(),before=stocks(s),clone=structuredClone(s);
  planStrategicAI(s);planStrategicAI(clone);
  const convoy=s.campaign.idle.find(o=>o.destination===home.id&&o.cargo?.grain>0&&o.unit.troops>0);
  checks.preparedTroopsCanTransport=!!convoy;
  checks.conservesGrain=stocks(s)===before;
  checks.deterministic=serializeCampaign(s)===serializeCampaign(clone);
  checks.notInstantDelivery=home.grain===3000;
  checks.leavesSourceDefenders=rear.units.filter(u=>u.troops>0).length>=2;
  if(convoy){const cargo=convoy.cargo.grain;for(let i=0;i<100&&s.campaign.idle.includes(convoy)&&convoy.destination;i++)advancePersonnel(s,convoy);
   checks.actualArrivalDelivers=home.grain===3000+cargo&&home.units.some(u=>u.id===convoy.unit.id);
  }else checks.actualArrivalDelivers=false;
 }
 {
  const {s,home,rear}=fixture();rear.units=rear.units.slice(0,1);rear.governor=rear.units[0].id;initializeVision(s);
  const before=stocks(s);planStrategicAI(s);
  const carrier=s.campaign.idle.find(o=>o.destination===rear.id&&!o.cargo?.grain&&!s.campaign.ai.staffing.some(p=>p.officerId===o.unit.id));
  checks.realCarrierCanReachUnstaffedDepot=!!carrier;
  checks.noFreeCargo=stocks(s)===before;
 }
 return checks;
}
