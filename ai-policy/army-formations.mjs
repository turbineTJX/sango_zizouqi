import {STRATEGIC_PLANNING_RULES as R} from '../data/design/strategic-planning-rules.mjs';
import {ECONOMY_RULES} from '../data/design/economy-rules.mjs';

// Build complete formations BEFORE assessing a joint operation. Never turn
// an unfilled tail into an extra army or borrow soldiers from a different city.
export function jointFormations(groups,limit,{compact=false}={}){
 const result=[];
 for(const g of groups){
  if(!g.units.length||g.units.some(u=>!(u.troops>0)))return null;
  const count=Math.ceil(g.units.length/limit),smallest=Math.floor(g.units.length/count);
  // Ordinary six-unit columns keep their full frontage. A compact formation
  // under the ten-unit packing may use four or five developed units, but it
  // must still field the soldiers of six ordinary prepared units. Headcount
  // alone must neither authorize six empty units nor reject five real veterans.
  if(smallest<(compact&&limit>R.tempo.columnUnits?4:R.tempo.columnUnits))return null;
  for(let i=0,at=0;i<count;i++){
   const size=smallest+(i<g.units.length%count?1:0);
   const units=g.units.slice(at,at+size);if(size<R.tempo.columnUnits&&units.reduce((n,u)=>n+u.troops,0)<R.tempo.columnUnits*ECONOMY_RULES.ai.cityTroopTarget)return null;
   result.push({c:g.c,units});at+=size;
  }
 }
 return result;
}
