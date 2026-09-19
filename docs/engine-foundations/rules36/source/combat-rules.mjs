// Shared by targeting, simulation and UI; keep all intent sources on one cap.
export const COMBAT = Object.freeze({ stepMs:700, damageScale:1.05, intentCap:100 });
// Calendar pacing is independent of per-hit damage and playback speed.
export const CAMPAIGN_TIME = Object.freeze({stepsPerDay:24,maxBattleDays:30});
// Per landed basic attack / surviving direct hit; never passive time regeneration.
export const TROOP_INTENT = Object.freeze(Object.fromEntries(Object.entries({
  spear:[6,7], halberd:[5,8], cavalry:[10,3], archer:[6,3],
  crossbow:[10,3], logistics:[10,4], siege:[11,2], ship:[8,5],
}).map(([type,[attack,hit]])=>[type,Object.freeze({attack,hit})])));
export const RULES_VERSION = 36;
