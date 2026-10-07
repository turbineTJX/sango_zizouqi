import {mkdirSync,writeFileSync} from 'node:fs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const rows=[];
for(const id of ['field','eight-arms','river','siege','rotation','officer-lab'])for(const seed of [1,17,521200]){
  const state=createScenario(id,seed,20,id==='officer-lab'?['person-661','person-246','person-603','person-404','yu','shao']:null),b=state.battle;
  lockDeployment(b);const first=new Map();let openingLoss=0;
  while(!b.result){
    stepBattle(b);
    for(const u of b.sides.flatMap(s=>s.units))for(const [tactic,count]of Object.entries(u.tacticCasts))if(count){
      const key=u.side+':'+u.id+':'+tactic;
      if(!first.has(key))first.set(key,{unit:u.id,side:u.side,tactic,name:TACTICS_BOOK[tactic].name,tick:b.tick,intent:u.intent});
    }
    if(b.tick===12)openingLoss=b.sides.flatMap(s=>s.units).reduce((n,u)=>n+u.battleDamage,0);
  }
  rows.push({id,seed,ticks:b.tick,reason:b.result.reason,winner:b.result.winner,openingLoss,first:[...first.values()]});
}
const file=process.argv[2]||'outputs/intent-tiers-after.json';
mkdirSync('outputs',{recursive:true});
writeFileSync(file,JSON.stringify({rulesVersion:RULES_VERSION,tactics:Object.fromEntries(Object.entries(TACTICS_BOOK).map(([id,s])=>[id,{name:s.name,threshold:s.threshold,cooldown:s.cooldown}])),rows},null,2));
console.log(file,rows.length+' real battles');
