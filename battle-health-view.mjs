import {recoverableWounded} from './tactics.mjs';

// Read the existing casualty rules; the bar never creates a healing allowance.
export function battleHealth(u){
 const maximum=Math.max(0,u.maxHp??u.initial??0),current=Math.max(0,Math.min(maximum,u.hp||0));
 const wounded=['gate','building'].includes(u.type)?0:recoverableWounded({...u,hp:current,maxHp:maximum,initial:u.initial??maximum});
 const recoverable=current+wounded,denominator=Math.max(1,maximum);
 return {current,wounded,recoverable,maximum,currentPercent:current/denominator*100,recoverablePercent:recoverable/denominator*100};
}
export const battleHealthText=h=>`${h.current} / ${h.recoverable} / ${h.maximum}（当前兵 / 可恢复上限 / 原上限）`;
export const battleHealthStyle=h=>`--troop-health:${h.currentPercent}%;--troop-recoverable:${h.recoverablePercent}%;`;
