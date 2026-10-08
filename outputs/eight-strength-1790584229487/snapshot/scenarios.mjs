import {OFFICER_BY_ID} from './officer-catalog.mjs';
import {defaultCustomBattle,validateCustomBattle} from './custom-battle.mjs';
import {generateBattle} from './battle-generator.mjs';
import {SCENARIOS} from './scenario-catalog.mjs';
export {SCENARIOS} from './scenario-catalog.mjs';
export function scenarioDraft(id,seed,officerIds=null){
 const config=SCENARIOS.find(s=>s.id===id);if(!config)throw new Error('未知测试战役');
 if(config.custom)return validateCustomBattle({...defaultCustomBattle(),...(seed===undefined?{}:{seed})});
 const draft=structuredClone(config);draft.seed=seed??config.seed;draft.gateHp||=12000;
 if(officerIds!==null){
  if(id!=='officer-lab'||!Array.isArray(officerIds)||officerIds.length<1||officerIds.length>6||new Set(officerIds).size!==officerIds.length||officerIds.some(id=>!OFFICER_BY_ID[id]))throw new Error('试炼阵容须为 1～6 名不同武将');
  draft.ownTeam=officerIds.map(id=>({id,type:OFFICER_BY_ID[id].type,troops:3000,level:10}));
  delete draft.ownTeamRoles;
  const used=new Set([...officerIds,...draft.enemyTeam.map(u=>u.id)]);
  for(const u of draft.enemyTeam)if(officerIds.includes(u.id)){u.id=Object.keys(OFFICER_BY_ID).find(id=>!used.has(id));used.add(u.id);}
  delete draft.enemyTeamRoles;
  if(draft.ownTeam.some(u=>u.type==='ship'))draft.terrain='river';
 }
 return validateCustomBattle(draft);
}
export function createScenario(id,seed,shieldPercent=null,officerIds=null,customDraft=null){
 const config=SCENARIOS.find(s=>s.id===id);if(!config)throw new Error('未知测试战役');
 let draft=customDraft?validateCustomBattle(customDraft):scenarioDraft(id,seed,officerIds);
 draft={...draft,seed:seed??draft.seed,shieldPercent:shieldPercent??draft.shieldPercent};
 return generateBattle(draft,{id,name:config.name,...(id==='officer-lab'?{officerIds:draft.ownTeam.map(u=>u.id)}:{})});
}
