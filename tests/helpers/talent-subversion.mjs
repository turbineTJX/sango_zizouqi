import assert from 'node:assert/strict';
import {newCampaign} from './auto-domestic-campaign.mjs';
import {ACTIONS,assignDomestic} from '../../domestic.mjs';
import {isLord} from '../../talent-core.mjs';
import {cityPersonnel} from '../../city-personnel.mjs';
import {peacefulCities} from './field-campaign.mjs';
import {fundCities} from '../resource-fixtures.mjs';

// Controlled mechanism/UI inputs only. Natural audits use original scenarios.
export function subversionFixture(faction='cao',seed=15){
 const s=peacefulCities(newCampaign(seed));fundCities(s,100000);
 const rival=faction==='cao'?'yuan':'cao',home=s.cities.find(c=>c.id===(faction==='cao'?'xuchang':'guandu')),city=s.cities.find(c=>c.id===(faction==='cao'?'guandu':'xuchang'));
 const target=s.campaign.idle.find(o=>o.faction===rival&&!isLord(s,o.unit.id,rival)&&!s.cities.some(c=>c.governor===o.unit.id));
 target.location=city.id;target.destination=null;s.campaign.domestic.loyalty[target.unit.id]=99;
 s.armies.forEach(a=>a.stationary=true);return {s,faction,rival,home,city,target};
}
export function subversionActor(f){
 const {s,home,faction}=f,actor=cityPersonnel(s,home.id).filter(o=>!isLord(s,o.unit.id,faction)).sort((a,b)=>b.unit.charm-a.unit.charm||a.unit.id.localeCompare(b.unit.id))[0];
 for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='talent'&&key!=='disaffect')home.domestic.cooldowns[key]=100000;
 assert.equal(assignDomestic(s,home.id,'talent',actor.unit.id,{scheduled:true,faction}),null);return actor;
}
