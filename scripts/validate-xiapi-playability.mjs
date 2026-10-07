import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {simulateXiapi,summarize,plans,adaptedPlans,VALIDATION_SEEDS,fixedOwnAI,playerCommand} from './xiapi-player-lab.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {assertDesignTables} from '../design-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';
import {historicalBattleDraft} from '../historical-battle-library.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,issueCommand,validateSave} from '../engine.mjs';
const mode=process.argv[2]||'updated',group=process.argv[3]||'main',count=Number(process.argv[4]||(group==='main'?32:16)),rows=[],summaries=[];
const production=structuredClone(D),previous=JSON.parse(readFileSync('outputs/xiapi-playability/tuning.json','utf8')).before,source=sourceHash();
if(mode==='before')for(const key of ['bondBeauty','bondValor'])Object.assign(D[key],previous[key]);assertDesignTables();
const cases=group==='main'?[
 {plan:plans[0],ratio:1}, {plan:plans.find(p=>p.id==='beauty-north'),ratio:1},
 {plan:adaptedPlans.find(p=>p.id==='concentrated-center'),ratio:1}, {plan:adaptedPlans.find(p=>p.id==='concentrated-center'),ratio:.9},
]:group==='ai'?[{plan:plans[0],ratio:1}]:group==='ablation'?['bondBeauty','bondValor'].map(key=>({plan:adaptedPlans.find(p=>p.id==='concentrated-center'),ratio:.9,disabledBonds:[key]})):[];
mkdirSync('outputs/xiapi-playability',{recursive:true});
function save(){writeFileSync('outputs/xiapi-playability/validation-'+mode+'-'+group+'.json',JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:source,mode,group,productionParameters:production,parameters:structuredClone(D),count,rows,summaries},null,2));}
for(const c of cases){
 const rs=VALIDATION_SEEDS.slice(0,count).map(seed=>simulateXiapi(c.plan,seed,{ratio:c.ratio,disabledBonds:c.disabledBonds,replay:!c.disabledBonds&&seed===VALIDATION_SEEDS[0]}));rows.push(...rs);summaries.push({plan:c.plan.id,ratio:c.ratio,disabledBonds:c.disabledBonds||[],...summarize(rs)});console.log(JSON.stringify(summaries.at(-1)));save();
}
if(group==='mirror'){
 for(const seed of VALIDATION_SEEDS.slice(0,count)){
  const draft=historicalBattleDraft('xiapi');draft.seed=seed;[draft.ownTeam,draft.enemyTeam]=[draft.enemyTeam,draft.ownTeam];[draft.ownTeamRoles,draft.enemyTeamRoles]=[draft.enemyTeamRoles,draft.ownTeamRoles];draft.battleKind='siege';
  const state=generateBattle(draft),b=state.battle;fixedOwnAI(b);lockDeployment(b);validateSave(structuredClone(state));
  while(!b.result)stepBattle(b,{aiSides:[0,1]});
  validateSave(structuredClone(state));rows.push({seed,winner:b.result.winner,reason:b.result.reason,ticks:b.tick,luArmyWon:b.result.winner===1,remaining:b.sides.map(s=>s.units.filter(u=>['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0))});save();
 }
 summaries.push({luArmyWins:rows.filter(r=>r.luArmyWon).length,n:rows.length});console.log(JSON.stringify(summaries.at(-1)));save();
}
