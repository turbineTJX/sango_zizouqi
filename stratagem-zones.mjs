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
  for(const u of stratagemAreaTargets(b,s,zone.point,zone.side)){
   const choices=zoneStatusChoices(b,s,u);
   if(!choices.length)continue;
   const chance=formationChance(s,unitAttributes(u,b).discipline);
   if(random(b)>=chance)continue;
   const key=choices[Math.floor(random(b)*choices.length)];
   const source={sourceId:zone.source.id,sourceName:zone.source.name,sourceSkillName:s.name};
   if(applyStatus(u,key,s.zone.statusSteps,source))onApplied(zone,u,key,chance);
  }
 }
}
