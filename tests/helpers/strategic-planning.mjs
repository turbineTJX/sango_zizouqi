import {newCampaign} from './auto-domestic-campaign.mjs';
import {makeOfficer} from '../../engine.mjs';
import {gateDurability} from '../../building-durability.mjs';
import {initializeVision} from '../../strategic-vision.mjs';
import {initializeStrategicAI} from '../../strategic-ai.mjs';

// Fixed legal contact conditions for mechanism tests; no balance conclusion.
export function planningFront(){
 const s=newCampaign(513,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];s.campaign.diplomacy.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.grain=20000;c.gold=6000;c.manpower=20000;c.project=null;gateDurability(c).hp=0;}
 const [home,target,rear]=['ye','town-5','town-8'].map(id=>s.cities.find(c=>c.id===id));
 for(const [c,x,owner]of [[home,0,'yuan'],[target,8,'cao'],[rear,-8,'yuan']]){Object.assign(c,{x,y:0,owner});c.domestic.owner=owner;}
 s.roads=[[home.id,target.id],[home.id,rear.id]];for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:7.5};
 home.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:home.id}));
 target.units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:target.id}));
 initializeVision(s);initializeStrategicAI(s);return {s,home,target,rear};
}
