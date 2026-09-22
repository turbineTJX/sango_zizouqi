import {BATTLE_PRESETS} from './data/design/battles.mjs';
export const TACTICAL_CAMPAIGNS=BATTLE_PRESETS.filter(s=>s.campaign&&!s.historical);
export const scenarioTroops=(s,side)=>(side?s.enemyTeam:s.ownTeam).reduce((n,u)=>n+u.troops,0);
