import {hexDistance,sideCell,insideHexGrid} from './hex-grid.mjs';
import {combatType,combatFamily} from './troop-equipment.mjs';
import {TROOP_DESIGNS} from './data/design/troops.mjs';
import {FORMATION} from './combat-rules.mjs';
const onField=u=>u&&u.status==='active'&&u.hp>0&&!u.isDecoy;
const local=u=>sideCell(u,u.side);
const range=u=>TROOP_DESIGNS[combatType(u)]?.range||1;
const line=u=>['spear','halberd'].includes(combatFamily(u));
const order=(u,a,c)=>{const p=sideCell(a,u.side),q=sideCell(c,u.side);return p.y-q.y||p.x-q.x||a.id.localeCompare(c.id);};
function derive(b,u){
 const allies=b.sides[u.side].units.filter(v=>v!==u&&onField(v)),p=local(u);
 const guardFor=v=>{
  if(!line(v))return null;
  const q=local(v);
  return b.sides[u.side].units.filter(a=>a!==v&&onField(a)&&range(a)>1&&q.x<=local(a).x&&hexDistance(v,a)===1)
   .sort((a,c)=>local(c).x-local(a).x||hexDistance(v,a)-hexDistance(v,c)||order(v,a,c))[0]||null;
 };
 const screen=range(u)>1?allies.filter(v=>range(v)===1&&!guardFor(v)&&local(v).x>p.x&&Math.abs(local(v).y-p.y)<=1&&hexDistance(u,v)<=2)
  .sort((a,c)=>Number(local(a).y!==p.y)-Number(local(c).y!==p.y)||hexDistance(u,a)-hexDistance(u,c)||order(u,a,c))[0]:null;
 const intent=allies.filter(v=>local(v).y===p.y&&local(v).x>p.x&&local(v).x-p.x<=2).sort((a,c)=>local(a).x-local(c).x)[0];
 const frontRows=allies.filter(v=>line(v)&&!guardFor(v)).map(v=>local(v).y);
 const upper=frontRows.length?Math.min(...frontRows):3,lower=frontRows.length?Math.max(...frontRows):4;
 return {origin:{x:u.x,y:u.y},createdAt:b.tick,troop:combatType(u),screenId:screen?.id||null,intentId:intent?.id||null,
  careIds:allies.filter(v=>local(v).x===p.x&&hexDistance(u,v)===1).sort((a,c)=>order(u,a,c)).map(v=>v.id),
  guardId:guardFor(u)?.id||null,flank:combatFamily(u)==='cavalry'?(p.y<upper?'upper':p.y>lower?'lower':null):null};
}
export function deploymentBehaviorFor(b,u){return u.deploymentBehavior||(!b.deploymentLocked&&onField(u)?derive(b,u):null);}
export function formationUnitView(b,u){return u.deploymentBehavior?u:{...u,deploymentBehavior:deploymentBehaviorFor(b,u)};}
export function establishFormation(b,u){if(onField(u)&&!u.deploymentBehavior)u.deploymentBehavior=derive(b,u);}
export function lockFormation(b){for(const s of b.sides)for(const u of s.units)establishFormation(b,u);}
export function formationPeer(b,u,kind){
 const d=deploymentBehaviorFor(b,u),id=d?.[kind+'Id'];
 const target=id&&b.sides[u.side].units.find(v=>v.id===id);
 return onField(target)&&!target.withdrawing&&!target.disengage&&hexDistance(u,target)<=FORMATION.localRange?target:null;
}
export function preferFormation(b,u,kind,pool){
 const d=deploymentBehaviorFor(b,u),ids=kind==='intent'?[d?.intentId]:(d?.careIds||[]);
 return [...pool].sort((a,c)=>Number(ids.includes(c.id)&&hexDistance(u,c)<=FORMATION.localRange)-Number(ids.includes(a.id)&&hexDistance(u,a)<=FORMATION.localRange));
}
export function validDeploymentBehavior(b,u){
 const d=u.deploymentBehavior;
 if(!d)return !b.deploymentLocked||u.status!=='active';
 if(Object.keys(d).sort().join(',')!=='careIds,createdAt,flank,guardId,intentId,origin,screenId,troop')return false;
 if(!d.origin||Object.keys(d.origin).sort().join(',')!=='x,y'||!insideHexGrid(d.origin.x,d.origin.y)||!Number.isInteger(d.createdAt)||d.createdAt<0||d.createdAt>b.tick||!TROOP_DESIGNS[d.troop])return false;
 if(d.createdAt===0&&sideCell(d.origin,u.side).x>4)return false;
 if(![null,'upper','lower'].includes(d.flank)||!Array.isArray(d.careIds)||d.careIds.length>2||new Set(d.careIds).size!==d.careIds.length)return false;
 const ids=[d.screenId,d.intentId,d.guardId,...d.careIds];
 return ids.every(id=>id===null||typeof id==='string'&&id!==u.id&&b.sides[u.side].units.some(v=>v.id===id&&(v.arrivalTick||0)<=d.createdAt&&(!v.deploymentBehavior||v.deploymentBehavior.createdAt<=d.createdAt)));
}
