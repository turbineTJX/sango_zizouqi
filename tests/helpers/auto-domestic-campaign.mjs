// Isolate baseline mechanism and economy checks from incidental events.
// Mechanism fixtures that exercise ongoing simulation explicitly delegate paid
// domestic work. Approval-specific tests import the real default directly.
export * from '../../strategic-campaign.mjs';
import {newCampaign as createCampaign} from '../../strategic-campaign.mjs';
import {setDomesticAutoApprove} from '../../domestic.mjs';
export function newCampaign(...args){const s=createCampaign(...args);setDomesticAutoApprove(s,true);s.campaign.domestic.incidents.enabled=false;return s;}
