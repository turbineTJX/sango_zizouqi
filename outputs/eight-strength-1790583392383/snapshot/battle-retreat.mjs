export const validRetreatAt=value=>value===null||Number.isSafeInteger(value)&&value>=0;
export const retreatLabel=value=>value===null?'不自动撤离':`剩余兵力 ≤ ${value} 人`;
export function beginUnitRetreat(b,u){
 if(u.withdrawing||u.status!=='active'||u.hp<=0||b.sides[u.side].retreat)return false;
 if(u.retreatAt===null||!validRetreatAt(u.retreatAt)||u.hp>u.retreatAt)return false;
 u.withdrawing=true;u.cast=null;u.disengage=null;u.action='撤离';
 b.logs.unshift({tick:b.tick,text:`${u.name}剩余兵力 ${Math.round(u.hp)}，达到撤离人数 ${u.retreatAt}，开始撤离。`});b.logs.length=Math.min(b.logs.length,70);
 return true;
}
