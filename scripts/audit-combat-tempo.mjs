import {writeFileSync,mkdirSync} from 'node:fs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {COMBAT,RULES_VERSION} from '../combat-rules.mjs';
import {CAMPAIGN} from '../strategic-campaign.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';

const changed=['fire','repeat','phalanx','rush','scatter','valor','ram','navalRam'];
const rows=[];
for(const id of ['field','outnumbered','rotation','siege','river'])for(const seed of [1,17,521200]){
  const {battle:b}=createScenario(id,seed);lockDeployment(b);
  const hits=[],first={};let damage12=0;
  while(!b.result){
    stepBattle(b);
    hits.push(...b.effects.filter(e=>e.phase==='impact'&&!e.skill&&e.to!=='siege-gate'&&e.damage>0).map(e=>e.damage));
    const units=b.sides.flatMap(s=>s.units);
    if(b.tick===CAMPAIGN.stepsPerDay)damage12=units.reduce((n,u)=>n+u.battleDamage,0);
    for(const u of units)for(const tactic of changed)if(u.tacticCasts[tactic])first[u.id+':'+tactic]??={id:tactic,tick:b.tick};
  }
  rows.push({id,seed,ticks:b.tick,reason:b.result.reason,damage12,meanHit:Math.round(hits.reduce((a,b)=>a+b,0)/Math.max(1,hits.length)),casts:b.sides.flatMap(s=>s.units).reduce((n,u)=>n+u.skillCasts,0),first:Object.values(first)});
}
mkdirSync('outputs',{recursive:true});
writeFileSync('outputs/tempo-after.json',JSON.stringify({rulesVersion:RULES_VERSION,combat:COMBAT,thresholds:Object.fromEntries(changed.map(id=>[id,TACTICS_BOOK[id].threshold])),rows},null,2));
console.log(JSON.stringify(rows.map(({first,...row})=>row),null,2));
