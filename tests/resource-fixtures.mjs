import {syncResourceTotals} from '../city-resources.mjs';
// Give each city a funded or empty store for mechanism fixtures. Standalone
// engine scenarios have their own resource model and keep that fixture setup.
export function fundCities(s,amount){
 if(!s.campaign){s.gold=amount;return;}
 s.cities.forEach(c=>c.gold=amount);syncResourceTotals(s);
}
