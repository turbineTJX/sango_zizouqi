import {hexDistance,insideHexGrid} from './hex-grid.mjs';
import {tacticShapeCells} from './tactic-positioning.mjs';
import {isTargetable} from './engagement.mjs';
import {decoyTargets} from './battle-status-rules.mjs';

export function createTacticAim(b,u,s,target,range){
 const point={x:target.x,y:target.y},origin={x:u.x,y:u.y};
 return {skillId:s.id,targetId:target.id,origin,point,range,cells:tacticShapeCells(b,origin,s,point,range),startedAt:b.tick,resolveAt:b.tick+s.geometry.delay};
}
export function tacticAimTargets(b,u,aim,s){
 const keys=new Set(aim.cells.map(p=>`${p.x},${p.y}`));
 return b.sides[1-u.side].units.concat(decoyTargets(b,1-u.side)).filter(t=>t.status==='active'&&t.hp>0&&isTargetable(b,t)&&keys.has(`${t.x},${t.y}`))
  .sort((a,c)=>Number(c.id===aim.targetId)-Number(a.id===aim.targetId)||hexDistance(aim.point,a)-hexDistance(aim.point,c)||a.id.localeCompare(c.id)).slice(0,s.geometry.maxTargets);
}
export function validTacticAim(b,u,aim,book){
 if(aim===undefined||aim===null)return true;
 if(!aim||Object.keys(aim).sort().join(',')!=='cells,origin,point,range,resolveAt,skillId,startedAt,targetId')return false;
 const s=book[aim.skillId];
 if(!s?.geometry||!Number.isInteger(aim.startedAt)||aim.startedAt<0||aim.startedAt>b.tick||aim.resolveAt!==aim.startedAt+s.geometry.delay||aim.resolveAt<=b.tick||!Number.isInteger(aim.range)||aim.range<1||aim.range>8)return false;
 if(![aim.origin,aim.point].every(p=>p&&Object.keys(p).sort().join(',')==='x,y'&&insideHexGrid(p.x,p.y))||u.status!=='active'||u.hp<=0||u.withdrawing||u.x!==aim.origin.x||u.y!==aim.origin.y)return false;
 if(!b.sides[1-u.side].units.some(t=>t.id===aim.targetId)||(u.tacticCasts[aim.skillId]||0)<1)return false;
 if(!Array.isArray(aim.cells)||!aim.cells.length||!aim.cells.some(p=>p.x===aim.point.x&&p.y===aim.point.y))return false;
 // A building may have been destroyed since the aim was locked. The stored
 // geometry may be a blocked prefix/subset, never a new or extended area.
 const canonical=tacticShapeCells({...b,buildings:[],siege:undefined},aim.origin,s,aim.point,aim.range);
 const expected=s.geometry.kind==='line'?canonical.slice(0,aim.cells.length):canonical.filter(p=>aim.cells.some(c=>c.x===p.x&&c.y===p.y));
 return JSON.stringify(aim.cells)===JSON.stringify(expected);
}
