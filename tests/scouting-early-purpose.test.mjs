import test from 'node:test';
import assert from 'node:assert/strict';
import {gateDurability} from '../building-durability.mjs';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {makeOfficer} from '../engine.mjs';
import {initializeVision} from '../strategic-vision.mjs';
import {planStrategicScouting} from '../strategic-scouting-ai.mjs';
import {scoutAssignments} from '../scouting.mjs';
import {initializeStrategicAI} from '../strategic-ai.mjs';

// A real city/unit front with deliberately separated visibility circles.
function front(){
 const s=newCampaign(513,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];s.campaign.diplomacy.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.project=null;c.gold=50000;c.grain=50000;c.manpower=20000;gateDurability(c).hp=0;}
 const home=s.cities.find(c=>c.id==='ye'),targets=['town-5','town-8','xuchang'].map(id=>s.cities.find(c=>c.id===id));
 Object.assign(home,{owner:'yuan',x:0,y:0});home.domestic.owner='yuan';
 for(const [i,c]of targets.entries()){Object.assign(c,{owner:'cao',x:100,y:i*120});c.domestic.owner='cao';}
 home.units=['shao','yan','wen','he','ju','tian'].map((id,i)=>({...makeOfficer(id,3000,i,3),homeCity:home.id}));
 targets[0].units=['cao','dun','chu'].map((id,i)=>({...makeOfficer(id,1000,i,3),homeCity:targets[0].id}));
 s.roads=targets.map(c=>[home.id,c.id]);
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:70};
 initializeVision(s);initializeStrategicAI(s);return {s,home,targets};
}
const ownTasks=s=>scoutAssignments(s).filter(t=>t.faction==='yuan');

test('prospective front observation needs no troop growth and no approved offensive',()=>{
 const {s,home,targets}=front();for(const u of home.units)u.troops=500;
 for(const target of targets)s.campaign.vision.factions.yuan.cities[target.id]={day:1,owner:target.owner,data:structuredClone(target)};
 planStrategicScouting(s,'yuan');assert.equal(ownTasks(s).length,0);
 const troops=home.units.map(u=>u.troops);
 planStrategicScouting(s,'yuan',{prospectiveTargets:targets.slice(0,2).map(c=>c.id)});
 assert.equal(ownTasks(s).length,2);assert.deepEqual(home.units.map(u=>u.troops),troops);assert.equal(s.campaign.ai.plans.length,0);
 assert.ok(ownTasks(s).every(t=>t.paidGold>0&&t.phase==='outbound'&&t.lastDay===0&&t.progress===0));
});
