import {TROOP_DESIGNS} from './data/design/troops.mjs';
// Shared by targeting, simulation and UI; keep all intent sources on one cap.
export const COMBAT = Object.freeze({ stepMs:700, damageScale:1.05, intentCap:100 });
// Calendar pacing is independent of per-hit damage and playback speed.
export const CAMPAIGN_TIME = Object.freeze({stepsPerDay:24,maxBattleDays:30});
// Per basic attack / surviving direct hit. No passive regeneration or decay.
const BASE_INTENT = Object.freeze(Object.fromEntries(Object.entries({
  spear:[3,2], halberd:[3,2], cavalry:[5,1], archer:[3,1],
  crossbow:[5,1], siege:[6,1], ram:[6,1], tower:[6,1], ship:[4,2],
}).map(([type,[attack,hit]])=>[type,Object.freeze({attack,hit})])));
export const TROOP_INTENT=Object.freeze(Object.fromEntries(Object.entries(TROOP_DESIGNS).map(([id,t])=>[id,BASE_INTENT[id]||BASE_INTENT[t.family]])));
export const INTENT_STATE = Object.freeze({defeatLoss:20,nearbyDefeatLoss:10,defeatRadius:2});
// Lower target scores win. Continuity is weaker than one hex of distance;
// it never overrides contact, taunt, focus or a legal nearby finishing blow.
export const TARGETING = Object.freeze({distance:9,health:7,civilianBuilding:32,continuity:4,tower:36,music:24,medical:24,siegeEquipment:16});
export const RULES_VERSION = 116;
