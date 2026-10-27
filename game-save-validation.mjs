import {validateCampaign} from './strategic-campaign.mjs';
import {validateSave as validateBattleSave} from './engine.mjs';
export function validateGameSave(value){
 if(value?.testScenario){if(value.campaign)throw Error('试炼与战略存档类型不一致');return validateBattleSave(value);}
 return validateCampaign(value);
}
