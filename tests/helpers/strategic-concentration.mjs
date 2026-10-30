import {planningFront} from './strategic-planning.mjs';
import {makeOfficer} from '../../engine.mjs';
import {OFFICER_BY_ID} from '../../officer-catalog.mjs';
import {gateDurability} from '../../building-durability.mjs';
import {initializeVision} from '../../strategic-vision.mjs';
import {initializeStrategicAI} from '../../strategic-ai.mjs';

// Legal contact fixture; not natural campaign or balance evidence.
export function concentratedFront({rearDistance=1,oneDepot=false}={}){
 const {s,home,target,rear}=planningFront(),sources=[home,rear,...s.cities.filter(c=>![home,target,rear].includes(c)).slice(0,2)];
 const enemyIds=new Set(target.units.map(u=>u.id)),ids=Object.keys(OFFICER_BY_ID).filter(id=>!enemyIds.has(id));let at=0;
 for(const [i,c]of sources.entries()){
  Object.assign(c,{owner:'yuan',x:-i*8,y:0,gold:80000,grain:100000,manpower:30000,granary:6});c.domestic.owner='yuan';gateDurability(c).hp=100000;
  c.units=Array.from({length:oneDepot?(i===0?36:0):i===0?1:7},(_,n)=>({...makeOfficer(ids[at++],3000,n,3),homeCity:c.id}));
 }
 target.units.forEach(u=>u.troops=oneDepot?6500:3500);target.gold=0;target.manpower=0;target.commerce=10;
 s.roads=[[home.id,target.id],...sources.slice(1).map(c=>[c.id,home.id])];
 for(const e of s.roads)s.roadSegments[[...e].sort().join(':')]={distance:e.includes(target.id)?1:rearDistance};
 for(const policy of Object.values(s.campaign.diplomacy.policies))policy.feeBudget=0;
 s.campaign.allAI=true;s.turn=61;s.campaign.day=601;initializeVision(s);initializeStrategicAI(s);
 return {s,home,target,sources};
}
