// Isolate baseline mechanism and economy checks from incidental events.
// Continuous audits and existing UI fixtures explicitly choose automatic
// approval. The playable campaign defaults to reviewing each paid proposal.
export * from '../strategic-campaign.mjs';
import {newCampaign as createCampaign} from '../strategic-campaign.mjs';
import {setDomesticAutoApprove} from '../domestic.mjs';
export function newCampaign(...args){const s=createCampaign(...args);setDomesticAutoApprove(s,true);s.campaign.domestic.incidents.enabled=false;return s;}
