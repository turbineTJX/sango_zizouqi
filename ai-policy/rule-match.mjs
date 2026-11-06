import {ACTIONS,DIRECTION_STATS} from '../domestic-designs.mjs';
import {DOMESTIC_RECOMMENDATION_RULES} from '../data/design/domestic-actions.mjs';
import {domesticDirectionTraits} from '../officer-traits.mjs';
import {rankOfficerCandidates} from '../officer-recommendation.mjs';
import {withPlanningQueries} from '../planning-queries.mjs';

const directionActions=new Map();
export function domesticRuleScore(unit,direction){
 if(!directionActions.has(direction))directionActions.set(direction,Object.values(ACTIONS).filter(a=>a.direction===direction));
 return (unit[DIRECTION_STATS[direction]]??0)+(domesticDirectionTraits(unit,directionActions.get(direction)).length?DOMESTIC_RECOMMENDATION_RULES.relatedTraitBonus:0);
}
// Attribute/trait ordering is cheap. Only inspect real work for successive
// matches; stop as soon as the shared eligibility rules accept one officer.
export function orderedDomesticRules(units,direction,adjust=(unit,score)=>score){
 return units.map(unit=>({unit,score:adjust(unit,domesticRuleScore(unit,direction))})).sort((a,b)=>b.score-a.score||a.unit.id.localeCompare(b.unit.id));
}
export function firstDomesticMatch(s,units,city,direction){
 return withPlanningQueries(s,()=>{
  for(const {unit}of orderedDomesticRules(units,direction)){
   const match=rankOfficerCandidates(s,[unit],{task:'domestic',city,direction})[0];
   if(match?.recommendation.available)return match;
  }
  return null;
 });
}
