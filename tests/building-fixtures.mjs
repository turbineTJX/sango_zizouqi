import {buildingUnitHp} from '../building-durability.mjs';
// Explicit completed facilities for mechanism fixtures, including their physical state.
export function setBuildingLevel(c,key,level,siteId=c.id,{hp=null}={}){
 const old=siteId===c.id?c[key]-c.domestic.buildingSites[key].length:c.domestic.buildingSites[key].filter(id=>id===siteId).length;
 c[key]+=level-old;
 if(siteId!==c.id)c.domestic.buildingSites[key]=[...c.domestic.buildingSites[key].filter(id=>id!==siteId),...Array(level).fill(siteId)];
 const maxHp=(key==='walls'&&siteId===c.id?12000:0)+level*buildingUnitHp(key);
 if(maxHp)c.buildings[key][siteId]={hp:hp??maxHp,maxHp};else delete c.buildings[key][siteId];
}
