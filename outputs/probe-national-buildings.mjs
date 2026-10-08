import {newCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
console.time('national');const s=newCampaign(81,'guandu-200');console.log('loaded',s.cities.length);beginExecution(s);console.log('began');advanceCampaignDay(s);console.log('advanced',s.campaign.day);console.timeEnd('national');
