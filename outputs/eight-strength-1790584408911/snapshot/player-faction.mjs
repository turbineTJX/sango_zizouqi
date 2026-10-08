import {NATIONAL_FACTIONS} from './national-scenarios.mjs';
import {OFFICER_BY_ID} from './officer-catalog.mjs';
// Battles outside a strategic campaign use the original Cao-side convention.
export const playerFaction = state => state?.campaign?.playerFaction ?? 'cao';
export function playerHome(state) {
 const faction=playerFaction(state),lord=NATIONAL_FACTIONS[faction]?.leaderSourceId;
 const ownsLord=u=>lord!==undefined&&OFFICER_BY_ID[u.id]?.sourceId===lord;
 const home=state.cities.find(c=>c.owner===faction&&(c.units?.some(ownsLord)||state.campaign?.idle.some(o=>o.faction===faction&&o.location===c.id&&ownsLord(o.unit))));
 return home?.id ?? state.cities.find(c=>c.owner===faction&&c.kind==='city')?.id ?? state.cities.find(c=>c.owner===faction)?.id ?? state.cities[0]?.id;
}
