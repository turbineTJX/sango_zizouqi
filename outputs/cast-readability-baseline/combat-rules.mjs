// Shared by targeting, simulation and UI; keep all intent sources on one cap.
export const COMBAT = Object.freeze({ stepMs:700, damageScale:.7, intentCap:100, tacticGap:0, tacticCooldownScale:1 });
// Per landed basic attack / surviving direct hit; never passive time regeneration.
export const TROOP_INTENT = Object.freeze(Object.fromEntries(Object.entries({
  spear:[6,7], halberd:[5,8], cavalry:[10,3], archer:[6,3],
  crossbow:[10,3], logistics:[10,4], siege:[11,2], ship:[8,5],
}).map(([type,[attack,hit]])=>[type,Object.freeze({attack,hit})])));
export const RULES_VERSION = 22;
