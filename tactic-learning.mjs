import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {TACTICS_BOOK,TROOP_TACTICS,INTELLECT_TACTICS,SPECIAL_TACTICS} from './tactics.mjs';

export const LEARNING_RULES=Object.freeze({lowMaxIntent:35,lowChance:[.45,.6,.75,.9],highChance:[0,0,.35,.5],lowLimit:[3,3,2,2],highLimit:[0,0,1,1],guaranteeLevel:[null,8,8,5],specialChance:.25,specialGuaranteedLevel:5});
export const LEARNING_TROOPS=['spear','halberd','cavalry','archer','crossbow','logistics','siege','ship'];
const fields={spear:'spearLv',halberd:'halberdLv',cavalry:'rideLv',archer:'crossbowLv',crossbow:'crossbowLv',siege:'machineLv',ship:'waterLv'};
// The source has no separate bow or logistics aptitude. Bows share crossbow;
// logistics uses politics in four explicit tiers, shown in the learning panel.
export function troopAptitude(u,type=u.type){
 const source=OFFICER_BY_ID[u.id]?.profileSource;
 if(type==='logistics')return Math.min(3,Math.max(0,Math.floor(((source?.politics??u.politics??0)-40)/20)));
 return Math.max(0,Math.min(3,source?.[fields[type]]??0));
}
export function tacticPools(type){
 const all=[...(TROOP_TACTICS[type]||[]),...(INTELLECT_TACTICS[type]||[])];
 return {low:all.filter(id=>TACTICS_BOOK[id].threshold<=LEARNING_RULES.lowMaxIntent),high:all.filter(id=>TACTICS_BOOK[id].threshold>LEARNING_RULES.lowMaxIntent)};
}
export function tacticLearningLimits(u,type=u.type){const apt=troopAptitude(u,type);return {low:LEARNING_RULES.lowLimit[apt],high:LEARNING_RULES.highLimit[apt],guarantee:LEARNING_RULES.guaranteeLevel[apt]};}
function roll(seed,id,level,type,kind){
 let n=2166136261;
 for(const c of `${seed}/${id}/${level}/${type}/${kind}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);n^=n>>>16;
 return (n>>>0)/4294967296;
}
const historyCache=new Map();
export function createTacticLearning(u,seed=521200,level=u.level??1){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(level)||level<1||level>10)throw new Error('战法学习种子或等级无效');
 const key=JSON.stringify([u.id,seed,level,...LEARNING_TROOPS.map(type=>troopAptitude(u,type))]);
 if(historyCache.has(key))return structuredClone(historyCache.get(key));
 const data={seed,level,byTroop:Object.fromEntries(LEARNING_TROOPS.map(type=>[type,{low:[],high:[]}])),special:false};
 for(let at=1;at<=level;at++){
  for(const type of LEARNING_TROOPS){
   const pools=tacticPools(type),apt=troopAptitude(u,type);
   for(const kind of ['low','high']){
    const learned=data.byTroop[type][kind],pool=pools[kind].filter(id=>!learned.includes(id)),limit=LEARNING_RULES[kind+'Limit'][apt],guarantee=LEARNING_RULES.guaranteeLevel[apt];
    if(learned.length>=limit||!pool.length)continue;
    if(guarantee!==null&&at>=guarantee){
     // Complete every missing slot at the promised level, even after all
     // earlier random attempts failed. Never replace already acquired skills.
     while(learned.length<limit&&pool.length)learned.push(pool.splice(Math.floor(roll(seed,u.id,at,type,kind+'-guarantee-'+learned.length)*pool.length),1)[0]);
    }else if(roll(seed,u.id,at,type,kind)<LEARNING_RULES[kind+'Chance'][apt])learned.push(pool[Math.floor(roll(seed,u.id,at,type,kind+'-pick')*pool.length)]);
   }
  }
  if(SPECIAL_TACTICS[u.id]&&(at>=LEARNING_RULES.specialGuaranteedLevel||roll(seed,u.id,at,'special','learn')<LEARNING_RULES.specialChance))data.special=true;
 }
 if(historyCache.size>=4096)historyCache.clear();
 historyCache.set(key,structuredClone(data));return data;
}
export function learnedTacticIds(u){
 const learning=u.tacticLearning;
 if(!learning)return [];
 const pool=learning.byTroop[u.type];
 return [...(learning.special&&SPECIAL_TACTICS[u.id]?[SPECIAL_TACTICS[u.id]]:[]),...pool.low,...pool.high];
}
export function initializeTacticLearning(u,seed=521200){
 u.tacticLearning=createTacticLearning(u,seed);u.tactics=learnedTacticIds(u);return u;
}
export function advanceTacticLearning(u){
 const previous=u.tacticLearning,oldIds=new Set(previous?Object.values(previous.byTroop).flatMap(p=>[...p.low,...p.high]):[]);
 const next=createTacticLearning(u,previous?.seed??521200);
 u.tacticLearning=next;
 const ids=learnedTacticIds(u),order=(u.tactics||[]).filter(id=>ids.includes(id));
 u.tactics=[...order,...ids.filter(id=>!order.includes(id))];
 return [...new Set(Object.values(next.byTroop).flatMap(p=>[...p.low,...p.high]).filter(id=>!oldIds.has(id))),...(!previous?.special&&next.special?[SPECIAL_TACTICS[u.id]]:[])];
}
export function validTacticLearning(u){
 try{return JSON.stringify(u.tacticLearning)===JSON.stringify(createTacticLearning(u,u.tacticLearning.seed));}catch{return false;}
}
