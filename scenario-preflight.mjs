import {registerCustomScenario,nationalScenario} from './national-scenarios.mjs';
import {withOfficerLibrary} from './officer-catalog.mjs';
import {newCampaign,validateCampaign} from './strategic-campaign.mjs';
export function preflightScenario(document){
 return withOfficerLibrary(document.officerLibrary,()=>{const id=registerCustomScenario(document),spec=nationalScenario(id);validateCampaign(newCampaign(521200,id,spec.factions[0]));return id;});
}
