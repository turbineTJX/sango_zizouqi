import {CAMPAIGN_TIME} from './combat-rules.mjs';
export const battleDays=steps=>Math.ceil(Math.max(0,steps)/CAMPAIGN_TIME.stepsPerDay);
export const battleDay=steps=>Math.floor(Math.max(0,steps)/CAMPAIGN_TIME.stepsPerDay)+1;
export const battleTimeText=b=>b.deploymentLocked?`交战第 ${Math.min(battleDay(b.tick),battleDays(b.maxTicks||240))} 天 · ${b.holdUntil?'坚守目标':'最多'} ${battleDays(b.holdUntil||b.maxTicks||240)} 天`:'战前布阵';
export const battleSteps=days=>Math.round(Math.max(0,days)*CAMPAIGN_TIME.stepsPerDay);
