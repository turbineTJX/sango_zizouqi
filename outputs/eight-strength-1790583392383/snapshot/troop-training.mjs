import {TROOP_DESIGNS} from './data/design/troops.mjs';
export const trainingRate=type=>TROOP_DESIGNS[type].goldPerThousand/1000;
export const trainingCost=(type,men)=>Math.ceil(Math.max(0,men)*trainingRate(type));
export const troopFamily=type=>TROOP_DESIGNS[type]?.family||type;
