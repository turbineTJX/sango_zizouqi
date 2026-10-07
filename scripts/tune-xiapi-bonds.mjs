import {mkdirSync,writeFileSync} from 'node:fs';
import {simulateXiapi,summarize,plans,adaptedPlans,DEV_SEEDS} from './xiapi-player-lab.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {assertDesignTables} from '../design-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
const frozen=structuredClone(D),source=sourceHash(),count=Number(process.argv[2]||4),ratio=Number(process.argv[3]||.8),selected=process.argv[4]?.split(','),rows=[],summaries=[];
const candidates={current:{},beauty:{bondBeauty:{intentDrain:[8,11,14],statusChance:[.3,.35,.4]}},valor:{bondValor:{values:[.15,.25,.35],immunityChance:[.3,.45,1]}},escort:{bondEscort:{shieldFraction:[.15,.2,.25]}},joint:{bondBeauty:{intentDrain:[8,11,14],statusChance:[.3,.35,.4]},bondValor:{values:[.15,.25,.35],immunityChance:[.3,.45,1]}}};
const checks=[{plan:plans[0],ratio:1},{plan:plans.find(p=>p.id==='beauty-north'),ratio:1},{plan:adaptedPlans.find(p=>p.id==='concentrated-center'),ratio}];
mkdirSync('outputs/xiapi-playability',{recursive:true});
for(const [candidate,patches]of Object.entries(candidates)){
 if(selected&&!selected.includes(candidate))continue;
 for(const key of Object.keys(D))Object.assign(D[key],structuredClone(frozen[key]));for(const [key,patch]of Object.entries(patches))Object.assign(D[key],patch);assertDesignTables();
 for(const {plan,ratio}of checks){const rs=DEV_SEEDS.slice(0,count).map(seed=>({...simulateXiapi(plan,seed,{ratio}),candidate}));rows.push(...rs);summaries.push({candidate,plan:plan.id,ratio,...summarize(rs)});console.log(JSON.stringify(summaries.at(-1)));writeFileSync('outputs/xiapi-playability/tuning-'+count+'-'+ratio+'-'+(selected?.join('-')||'all')+'.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,candidates,before:{bondBeauty:frozen.bondBeauty,bondValor:frozen.bondValor,bondEscort:frozen.bondEscort},rows,summaries},null,2));}
}
