import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay} from './auto-domestic-campaign.mjs';
import {assignDomestic,assignmentFor,ACTIONS} from '../../domestic.mjs';
import {fundCities} from '../resource-fixtures.mjs';
import {cityTechnologyProfile} from '../../city-technology.mjs';

export const advanceWatchtowerDay=s=>{if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);assert.equal(advanceCampaignDay(s).dayEnded,true);};
export function watchtowerConstructionFixture(faction='cao'){
 const s=newCampaign(81,'guandu-200'),c=s.cities.find(c=>c.id===(faction==='cao'?'xuchang':'jinyang'));
 fundCities(s,100000);
 for(const city of s.cities)if(city.owner!==faction)for(const u of city.units)u.troops=0;
 c.domestic.techs=['taxation','cultivation','militaryRegistry','militaryHouseholds','militarySupply',...cityTechnologyProfile(c).troops];
 for(const [key,a]of Object.entries(ACTIONS))if(a.direction==='technology'&&key!=='research')c.domestic.cooldowns[key]=1000;
 const u=c.units.find(u=>!u.cityGuard&&u.id!==c.governor);
 assert.equal(assignDomestic(s,c.id,'technology',u.id,{faction}),null);assert.equal(beginExecution(s),null);
 assert.equal(assignmentFor(s,u.id).action.targetId,'watchtower');return {s,c,u};
}
