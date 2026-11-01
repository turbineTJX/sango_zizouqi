import {newCampaign,serializeCampaign} from './auto-domestic-campaign.mjs';
import {fieldFromCity} from './field-campaign.mjs';
import {makeOfficer} from '../../engine.mjs';
import {initializeStrategicAI,planStrategicAI} from '../../strategic-ai.mjs';
import {initializeVision,updateVision} from '../../strategic-vision.mjs';
import {gateDurability} from '../../building-durability.mjs';

// Constructed military situations, not natural campaign or balance evidence.
export function macroDefenseScene({reserves=0,enemyMen=18000,localMen=1000,junction=false,rearDistance=35}={}){
 const s=newCampaign(817,'heroes-251');s.armies=[];s.campaign.idle=[];s.campaign.domestic.assignments=[];s.campaign.domestic.orders=[];s.campaign.diplomacy.assignments=[];
 for(const c of s.cities){c.owner='neutral';c.domestic.owner='neutral';c.governor=null;c.units=[];c.gold=30000;c.grain=60000;c.manpower=0;c.project=null;gateDurability(c).hp=0;}
 const [home,rear,enemy]=['ye','town-8','town-5'].map(id=>s.cities.find(c=>c.id===id));
 for(const [c,x,owner] of [[home,0,'yuan'],[rear,-8,'yuan'],[enemy,8,'cao']]){Object.assign(c,{x,y:0,owner});c.domestic.owner=owner;}
 const unit=(id,n,c)=>({...makeOfficer(id,n,0,3),homeCity:c.id});
 home.units=[unit('shao',localMen,home)];home.manpower=reserves;
 for(const id of ['ju','tian'])s.campaign.idle.push({unit:unit(id,0,home),faction:'yuan',location:home.id,destination:null,remainingDays:0});
 rear.units=['yan','wen','he','gao','person-72','person-73'].map(id=>unit(id,4500,rear));
 enemy.units=['cao','dun','chu'].map((id,i)=>unit(id,Math.floor(enemyMen/3)+(i<enemyMen%3?1:0),enemy));
 s.campaign.domestic.people=s.campaign.domestic.people.filter(p=>!['shao','ju','tian','yan','wen','he','gao','person-72','person-73','cao','dun','chu'].includes(p.id));
 const node=s.junctions.find(n=>n.kind==='junction');Object.assign(node,{x:4,y:0});
 s.roads=[[home.id,rear.id],...(junction?[[home.id,node.id],[node.id,enemy.id]]:[[home.id,enemy.id]])];
 for(const edge of s.roads)s.roadSegments[[...edge].sort().join(':')]={distance:edge.includes(rear.id)?rearDistance:1};
 const foe=fieldFromCity(s,enemy.id,{target:home.id});
 if(junction){foe.location=node.id;foe.route=[home.id];foe.travel=null;}
 else foe.travel={from:enemy.id,to:home.id,road:'main',progress:0};
 initializeVision(s);initializeStrategicAI(s);
 for(const p of Object.values(s.campaign.diplomacy.policies))p.feeBudget=0;
 return {s,home,rear,enemy,foe,node};
}
const soldiers=s=>s.cities.reduce((n,c)=>n+c.manpower+c.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.armies.reduce((n,a)=>n+a.units.reduce((m,u)=>m+u.troops+u.wounded,0),0)+s.campaign.idle.reduce((n,o)=>n+o.unit.troops+o.unit.wounded+(o.cargo?.manpower||0),0);
const aid=(s,home)=>s.armies.filter(a=>a.faction==='yuan'&&a.homeCity!==home.id&&a.target===home.id).length+s.campaign.domestic.orders.filter(q=>q.faction==='yuan'&&q.kind==='expedition'&&q.cityId!==home.id&&q.target===home.id).length;
export function exerciseMacroDefense(){
 const checks={};
 const first=macroDefenseScene({reserves:20000,enemyMen:2500}),before=soldiers(first.s);planStrategicAI(first.s);
 checks.localMusterFirst=first.home.drafted>0&&first.home.units.length>1&&aid(first.s,first.home)===0;
 checks.soldiersConserved=soldiers(first.s)===before&&first.home.gold>=0&&first.home.manpower>=0;
 const weak=macroDefenseScene();planStrategicAI(weak.s);
 checks.aidBeyondArrival=aid(weak.s,weak.home)>0;
 checks.donorRetainsDefense=weak.rear.units.some(u=>u.troops>0);
 const turn=macroDefenseScene({localMen:4500,enemyMen:1000,rearDistance:1});planStrategicAI(turn.s);const count=aid(turn.s,turn.home);
 turn.foe.units.forEach(u=>u.troops=6000);turn.s.campaign.day=2;updateVision(turn.s);planStrategicAI(turn.s);
 checks.noDailyReplan=aid(turn.s,turn.home)===count;
 turn.s.campaign.day=11;turn.s.turn=2;updateVision(turn.s);planStrategicAI(turn.s);
 checks.nextTurnReassesses=aid(turn.s,turn.home)>count;
 const sortie=macroDefenseScene({localMen:4500,enemyMen:1000,reserves:12000,junction:true});planStrategicAI(sortie.s);
 checks.strongDefenseSorties=sortie.s.armies.some(a=>a.faction==='yuan'&&a.homeCity===sortie.home.id&&a.target===sortie.node.id);
 const original=macroDefenseScene(),copy=JSON.parse(serializeCampaign(original.s));planStrategicAI(original.s);planStrategicAI(copy);
 checks.deterministic=serializeCampaign(original.s)===serializeCampaign(copy);
 return checks;
}
