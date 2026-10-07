import {defaultCustomBattle,validateCustomBattle} from './custom-battle.mjs';
import {generateBattle} from './battle-generator.mjs';
export {SCENARIOS} from './scenario-catalog.mjs';
export function scenarioDraft(id,seed){
 if(id!=='custom-battle')throw new Error('战役预设已移除，请使用自定义编辑器');
 return validateCustomBattle({...defaultCustomBattle(),...(seed===undefined?{}:{seed})});
}
export function createScenario(id,seed,shieldPercent=null,officerIds=null,customDraft=null){
 if(id!=='custom-battle')throw new Error('战役预设已移除，请使用自定义编辑器');
 const draft=customDraft?validateCustomBattle(customDraft):scenarioDraft(id,seed);
 return generateBattle({...draft,seed:seed??draft.seed,shieldPercent:shieldPercent??draft.shieldPercent});
}
