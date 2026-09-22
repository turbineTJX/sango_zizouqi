import {cityForce} from '../../city-units.mjs';
import {peacefulCities} from './field-campaign.mjs';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter} from '../../strategic-campaign.mjs';
import {ACTIONS,assignDomestic,assignmentFor} from '../../domestic.mjs';
function advance(s,target){for(let i=0;i<500&&s.campaign.day<target;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const r of activeBattles(s).filter(r=>r.awaiting))chooseEncounter(s,r.id,false);advanceCampaignDay(s);}assert.equal(s.campaign.day,target);}
export function busyFixture(seed=19){
 const s=newCampaign(seed);peacefulCities(s);s.gold=40000;
 const c=s.cities.find(c=>c.id==='xuchang'),army=cityForce(c),id=army.units[1].id;
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=10000;
 assert.equal(assignDomestic(s,c.id,'technology',id),null);advance(s,11);assert.ok(assignmentFor(s,id).action);return {s,c,army,id};
}
