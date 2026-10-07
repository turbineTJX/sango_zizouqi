import {REGRESSION_DRAFTS} from './battle-drafts.mjs';
import {generateBattle} from '../../battle-generator.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../../custom-battle.mjs';
import {OFFICER_BY_ID} from '../../officer-catalog.mjs';
export const SCENARIOS=[{id:'custom-battle',...validateCustomBattle(defaultCustomBattle())},...REGRESSION_DRAFTS];
export function scenarioDraft(id,seed,officerIds=null){
 const original=id==='custom-battle'?defaultCustomBattle():SCENARIOS.find(x=>x.id===id);
 if(!original)throw Error('Unknown regression draft '+id);
 const d=structuredClone(original);d.seed=seed??d.seed;
 if(officerIds!==null){
 if(id!=='officer-lab'||!Array.isArray(officerIds)||!officerIds.length||officerIds.length>6||new Set(officerIds).size!==officerIds.length||officerIds.some(id=>!Object.hasOwn(OFFICER_BY_ID,id)))throw Error('Invalid fixture officers');
 d.ownTeam=officerIds.map(id=>({id,type:OFFICER_BY_ID[id].type,troops:3000,level:10}));delete d.ownTeamRoles;delete d.enemyTeamRoles;
 const used=new Set([...officerIds,...d.enemyTeam.map(u=>u.id)]);for(const u of d.enemyTeam)if(officerIds.includes(u.id)){u.id=Object.keys(OFFICER_BY_ID).find(id=>!used.has(id));used.add(u.id);}
 if(d.ownTeam.some(u=>u.type==='ship'))d.terrain='river';
 }
 return validateCustomBattle(d);
}
export function createScenario(id,seed,shieldPercent=null,officerIds=null,customDraft=null){
 const d=customDraft?validateCustomBattle(customDraft):scenarioDraft(id,seed,officerIds);
 return generateBattle({...d,seed:seed??d.seed,shieldPercent:shieldPercent??d.shieldPercent});
}
