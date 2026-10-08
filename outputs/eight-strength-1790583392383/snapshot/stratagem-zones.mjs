import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
import {stratagemAreaTargets,zoneStatusChoices} from './stratagem-area.mjs';
import {unitAttributes} from './unit-stats.mjs';

export function formationChance(definition,discipline){
 const z=definition.zone;
 return Math.max(z.minChance,Math.min(z.maxChance,z.chanceScale/(z.chanceScale+Math.max(0,discipline))));
}
// One visit per active zone/target at the round-start phase. RNG is the battle RNG.
export function tickStratagemZones(b,{random,applyStatus,onApplied}){
 b.stratagemZones=b.stratagemZones.filter(z=>z.until>b.tick);
 for(const zone of b.stratagemZones){
  const s=STRATAGEM_DESIGNS[zone.key];
  const occupants=stratagemAreaTargets(b,s,zone.point,zone.side);
  (b.auditZoneRounds??=[]).push({tick:b.tick,side:zone.side,count:occupants.length,ids:occupants.map(u=>u.id)});
  for(const u of occupants){
   const choices=zoneStatusChoices(b,s,u);
   const observation={tick:b.tick,id:u.id,side:u.side,discipline:unitAttributes(u,b).discipline,choices:[...choices],applied:false};
   (b.auditEight??=[]).push(observation);
   if(!choices.length)continue;
   const chance=formationChance(s,unitAttributes(u,b).discipline);
   const roll=random(b);Object.assign(observation,{chance,roll});
   if(roll>=chance)continue;
   const key=choices[Math.floor(random(b)*choices.length)];
   observation.selected=key;
   if(b.auditEightMode==='suppressed')continue;
   const source={sourceId:zone.source.id,sourceName:zone.source.name,sourceSkillName:s.name};
   if(applyStatus(u,key,s.zone.statusSteps,source)){observation.applied=true;onApplied(zone,u,key,chance);}
  }
 }
}
