import {newCampaign,disbandCityUnits} from '../../strategic-campaign.mjs';
import {fieldFromCity,approachDestination} from './field-campaign.mjs';

// Legal near-contact fixture: all preparation uses current city units/resources.
// Skip unrelated AI planning so the test exercises the arrival emergency itself.
export function siegeMobilizationFixture({allAI=true,target=allAI?'ye':'xuchang',zeroPrepared=false}={}){
 const s=newCampaign(31,'guandu-200','cao',{allAI}),c=s.cities.find(c=>c.id===target),source=target==='xuchang'?'ye':'xuchang';
 if(zeroPrepared){for(const u of c.units){c.manpower+=u.troops;u.troops=0;}}
 else {const error=disbandCityUnits(s,c.id,c.units.map(u=>u.id),{scheduled:true,faction:c.owner});if(error)throw Error(error);}
 const a=fieldFromCity(s,source),edge=s.roads.find(pair=>pair.includes(c.id));
 a.location=edge.find(id=>id!==c.id);a.route=[c.id];a.target=c.id;approachDestination(s,a,0);
 s.campaign.phase='executing';s.campaign.ai.lastPlanDay=s.campaign.day;s.campaign.diplomacy.lastDay=s.campaign.day;
 return {s,c,a};
}
