import {makeOfficer,combatUnit} from '../../engine.mjs';
import {initializeTacticLearning} from '../../tactic-learning.mjs';
export function appointTestCommanders(state,leader,advisor){
 const army=state.armies[0];
 for(const id of new Set([leader,advisor]))if(!army.units.some(u=>u.id===id)){
  const index=army.units.findLastIndex(u=>![leader,advisor].includes(u.id));
  army.units[index]=initializeTacticLearning(makeOfficer(id,3000,index,5),state.seed);
 }
 army.leader=leader;army.advisor=advisor;army.deputy=army.units.find(u=>u.id!==leader)?.id??null;
}

// Isolated command/effect fixtures still need a real living provider. Put any
// added unit away from the fixed contact and suppress its unrelated actions.
export function appointBattleTestCommander(b,id,role='advisor',side=0){
 const team=b.sides[side];let u=team.units.find(u=>u.id===id);
 if(!u){
  u=combatUnit(initializeTacticLearning(makeOfficer(id,3000,0,5),b.seed),'command-fixture-'+id,side,80);
  if(team.units.filter(u=>u.status==='active').length<6){
   const x=side?13:0,y=[7,6,5,4,3,2,1,0].find(y=>!b.sides.some(s=>s.units.some(v=>v.status==='active'&&v.x===x&&v.y===y)));
   Object.assign(u,{status:'active',x,y,cooldown:999});u.statuses.phalanx={until:999};u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));
  }
  team.units.push(u);
 }
 team.commanders.push({id:u.id,name:u.name,role,armyId:u.armyId,leadership:u.leadership,intellect:u.intellect});
 return u;
}
