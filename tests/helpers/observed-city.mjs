import {updateVision} from '../../strategic-vision.mjs';
// Controlled visibility for information-boundary mechanism fixtures only.
// Natural campaign audits must obtain sight through actual armies or scouts.
export function observeFixtureCity(s,cityId,faction,days=5){
 const city=s.cities.find(c=>c.id===cityId),record=s.campaign.vision.factions[faction];
 const officer=s.campaign.idle.find(o=>o.faction===faction)?.unit||s.cities.find(c=>c.owner===faction&&c.units.length)?.units[0];
 record.scouted.push({id:record.nextSightId++,officerId:officer.id,x:city.x,y:city.y,location:city.id,travel:null,seenDay:s.campaign.day,expiresDay:s.campaign.day+days});updateVision(s);
}
