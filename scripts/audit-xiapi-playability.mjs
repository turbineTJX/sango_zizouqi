import {mkdirSync,writeFileSync} from 'node:fs';
import {simulateXiapi,summarize,plans,adaptedPlans,DEV_SEEDS} from './xiapi-player-lab.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
const source=sourceHash(),parameters=structuredClone(BOND_DESIGNS);
const count=Number(process.argv[2]||4),adapted=process.argv.includes('adapted'),rows=[],summaries=[];mkdirSync('outputs/xiapi-playability',{recursive:true});
for(const plan of adapted?adaptedPlans:plans){const rs=DEV_SEEDS.slice(0,count).map(seed=>simulateXiapi(plan,seed,{replay:seed===DEV_SEEDS[0]}));rows.push(...rs);const summary={plan,...summarize(rs)};summaries.push(summary);console.log(JSON.stringify(summary));writeFileSync('outputs/xiapi-playability/'+(adapted?'adapted':'development')+'.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,parameters,rows,summaries},null,2));}
