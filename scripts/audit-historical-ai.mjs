import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {HISTORICAL_BATTLES,historicalBattleDraft} from '../historical-battle-library.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave,issueCommand} from '../engine.mjs';
import {fixedOwnAI,playerCommand,DEV_SEEDS} from './xiapi-player-lab.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
const rows=[],count=Number(process.argv[2]||4),mode=process.argv[3]||'updated',source=sourceHash();mkdirSync('outputs/xiapi-playability',{recursive:true});
if(mode==='before'){const previous=JSON.parse(readFileSync('outputs/xiapi-playability/tuning.json','utf8')).before;for(const key of ['bondBeauty','bondValor'])Object.assign(BOND_DESIGNS[key],previous[key]);}
for(const history of HISTORICAL_BATTLES){
 for(const seed of DEV_SEEDS.slice(0,count)){
  const draft=historicalBattleDraft(history.id);draft.seed=seed;const state=generateBattle(draft),b=state.battle;fixedOwnAI(b);lockDeployment(b);validateSave(structuredClone(state));
  while(!b.result)stepBattle(b,{aiSides:[0,1]});
  validateSave(structuredClone(state));rows.push({id:history.id,name:history.name,seed,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,gate:b.siege?.gate.hp,remaining:b.sides.map(s=>s.units.filter(u=>['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0))});
 }
 const rs=rows.filter(r=>r.id===history.id);console.log(history.id,JSON.stringify({ownWins:rs.filter(r=>r.winner===0).length,enemyWins:rs.filter(r=>r.winner===1).length,draws:rs.filter(r=>r.winner===null).length,n:rs.length}));writeFileSync('outputs/xiapi-playability/historical-ai-'+mode+'.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,mode,rows},null,2));
}
