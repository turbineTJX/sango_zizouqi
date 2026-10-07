import {fieldCampaign,fieldFromCity} from './field-campaign.mjs';
import {initializeTacticLearning} from '../../tactic-learning.mjs';
import {initializeTalent} from '../../talent-lifecycle.mjs';
import {beginExecution,advanceCampaignDay,activeBattles,chooseEncounter} from '../../strategic-campaign.mjs';
import {lockDeployment} from '../../engine.mjs';
import {roadDistance,roadCost,movementPoints} from '../../strategic-movement.mjs';

// Real, distinct prepared units in legal columns already travelling on one road.
// Only initial road progress is fixed; arrivals use the normal strategic mover.
export function reinforcementCampaign({manual=true}={}){
 const s=fieldCampaign(117),a=s.armies.find(a=>a.id==='a1'),enemy=s.armies.find(a=>a.id==='a2');
 const extra=['xuchang','chenliu'].map(id=>fieldFromCity(s,id,{ids:s.cities.find(c=>c.id===id).units.map(u=>u.id)}));
 const reinforcements=[s.armies.find(a=>a.id==='a3'),...extra];
 const unused=s.armies.filter(x=>![a,enemy,...reinforcements].includes(x));
 for(const x of unused)s.cities.find(c=>c.id===x.location).units.push(...x.units);
 s.armies=[a,enemy,...reinforcements];a.leader=a.units.find(u=>u.id!=='cao').id;
 for(const x of s.armies)for(const u of x.units){u.type='halberd';u.retreatAt=null;initializeTacticLearning(u,s.seed);}
 const length=roadDistance(s,'xuchang','guandu'),speed=movementPoints(a)*length/roadCost(s,'xuchang','guandu');
 for(const [i,x]of [a,...reinforcements].entries()){
  x.location='xuchang';x.route=['guandu'];x.target='guandu';
  x.travel={from:'xuchang',to:'guandu',road:'main',progress:length*.7-speed*(i+.5)};
 }
 enemy.location='guandu';enemy.route=['xuchang'];enemy.target='xuchang';
 enemy.travel={from:'guandu',to:'xuchang',road:'main',progress:length*.3};
 initializeTalent(s);beginExecution(s);advanceCampaignDay(s);
 const r=activeBattles(s).find(r=>r.armyIds.includes(a.id));
 if(!r)throw Error('Expected a real road encounter');
 chooseEncounter(s,r.id,manual);if(manual)lockDeployment(r.battle);
 return {s,r,reinforcements};
}
