import {canOccupy,blockedTerrain} from './battlefield.mjs';
import {hexDistance,sideCell,compareSideCells} from './hex-grid.mjs';

const council=b=>b&&!b.result&&(!b.deploymentLocked&&b.tick===0||b.reinforcementCouncil==='open');
export const validReserveEntryPoint=(b,u,p)=>p===null||!!p&&Object.keys(p).sort().join(',')==='x,y'&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=(u.side===1?9:0)&&p.x<=(u.side===1?13:4)&&p.y>=0&&p.y<8&&canOccupy(b,u,p.x,p.y)&&!blockedTerrain(b,p.x,p.y);
export function configureReserveEntry(b,id,point,side=0){
 if(!council(b))return '只能在战前会议或援军军议设置入场位置';
 if(![0,1].includes(side))return '请选择本方军团';
 const u=b.sides[side].units.find(u=>u.id===id&&u.status==='reserve'&&u.hp>0&&!u.withdrawing);
 if(!u)return '请选择本方后备部队';
 if(u.arrivalConfirmed===false||(u.arrivalTick||0)>b.tick)return '援军尚未抵达，不能设置入场位置';
 if(!validReserveEntryPoint(b,u,point))return '请选择本方布阵区内符合水陆限制的入场位置';
 u.reserveEntry=point&&{x:point.x,y:point.y};return null;
}
export function previewReserveEntry(b,id,x,y,side=0){
 if(!b)return {error:'请选择战场'};
 const copy=structuredClone(b),point=x===null?null:{x,y},error=configureReserveEntry(copy,id,point,side);
 return error?{error}:{kind:'entry',battleId:b.id,unitId:id,...(point||{x:null,y:null})};
}
export const defaultReserveEntryPoint=u=>sideCell({x:({front:3,middle:2,back:1,left:3,right:3}[u.formation]??2),y:u.formation==='left'?1:u.formation==='right'?6:3},u.side);
export function reserveEntryCells(b,u){
 const point=u.reserveEntry||defaultReserveEntryPoint(u);
 const occupied=b.sides.flatMap(s=>s.units).filter(v=>v.status==='active'&&v.hp>0);
 const cells=[];
 for(let y=0;y<8;y++)for(let x=u.side===1?9:0;x<=(u.side===1?13:4);x++){
  if(canOccupy(b,u,x,y)&&!blockedTerrain(b,x,y)&&!occupied.some(v=>v.x===x&&v.y===y))cells.push({x,y});
 }
 return cells.sort((a,c)=>hexDistance(point,a)-hexDistance(point,c)||Math.abs(point.y-a.y)-Math.abs(point.y-c.y)||compareSideCells(a,c,u.side));
}
// Basic role defaults, with no bond, combo, opponent, or future-state search.
// Both background controllers submit the same operation available to a human.
export function planReserveEntriesAI(b,side){
 if(!council(b))return;
 for(const u of b.sides[side].units.filter(u=>u.status==='reserve'&&u.hp>0&&u.reserveEntry==null&&u.arrivalConfirmed!==false&&(u.arrivalTick||0)<=b.tick)){
  const {x,y}=defaultReserveEntryPoint(u);
  const cells=[];
  for(let row=0;row<8;row++)for(let col=side===1?9:0;col<=(side===1?13:4);col++)if(validReserveEntryPoint(b,u,{x:col,y:row}))cells.push({x:col,y:row});
  cells.sort((a,c)=>hexDistance({x,y},a)-hexDistance({x,y},c)||Math.abs(y-a.y)-Math.abs(y-c.y)||compareSideCells(a,c,side));
  if(cells[0]){const error=configureReserveEntry(b,u.id,cells[0],side);if(error)throw Error(error);}
 }
}
