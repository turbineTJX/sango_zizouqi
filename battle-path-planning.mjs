import {hexDistance,approachNeighbors,insideHexGrid,sideCell} from './hex-grid.mjs';
import {canOccupy,canTraverseTerrain,terrainMoveFactor} from './battlefield.mjs';
import {battleBuildings} from './building-rules.mjs';
import {unitAttributes} from './unit-stats.mjs';
import {isTargetable,canStrikeFrom,interceptorsAt,holdsLine} from './engagement.mjs';
import {defenseLine,insideDefenseLine} from './defense-line.mjs';
import {formationPeer} from './formation-behavior.mjs';
const active=u=>u.status==='active'&&u.hp>0&&!u.withdrawing;
export function planBattleRoute(b,u,target,{retreat=false,supportRange=null,ignoredBuildings=null,returning=false,range=unitAttributes(u,b).range,goalOverride=null}={}){
 const stats=unitAttributes(u,b),occupied=new Set(b.sides.flatMap(s=>s.units).filter(v=>v!==u&&v.status==='active').map(v=>v.x+','+v.y));
 const inLine=retreat?()=>true:returning?p=>u.side===0?p.x<=Math.max(4,u.x):p.x>=Math.min(9,u.x):defenseLine(b,u,target);
 const goal=goalOverride|| (returning?p=>insideDefenseLine(u,p):retreat?p=>p.x===(u.side===0?0:13):p=>inLine(p)&&hexDistance(p,target)<=(supportRange??range)&&(supportRange!==null||hexDistance(p,target)>=(stats.minRange||0)&&canStrikeFrom(b,u,target,p)));
 const queue=[{x:u.x,y:u.y,path:[],cost:0}],costs=new Map([[u.x+','+u.y,0]]);
 let contactRoute=null,contactCost=Infinity;
 while(queue.length){
  queue.sort((a,c)=>a.cost-c.cost);const node=queue.shift();
  if(node.cost>costs.get(node.x+','+node.y)+1e-9)continue;
  if(goal(node))return {route:node.path,contactRoute,cost:node.cost};
  const intercept=interceptorsAt(b,u,node,retreat||!!u.disengage);
  if(intercept.some(e=>!u.disengage?.guards.includes(e.id))||node.path.length>0&&u.disengage&&intercept.length){
   if(node.cost<contactCost){contactRoute=node.path;contactCost=node.cost;}continue;
  }
  for(const [x,y] of approachNeighbors(node,target,u.side)){
   if(!insideHexGrid(x,y)||!retreat&&!inLine({x,y})||occupied.has(x+','+y))continue;
   const cleared=ignoredBuildings&&canTraverseTerrain(b,u,x,y)&&battleBuildings(b).some(a=>a.hp>0&&a.x===x&&a.y===y&&ignoredBuildings.has(a.id));
   if(!canOccupy(b,u,x,y)&&!cleared)continue;
   if(!node.path.length&&u.disengage){const guards=b.sides[1-u.side].units.filter(e=>u.disengage.guards.includes(e.id)&&holdsLine(b,e));if(guards.length&&guards.reduce((n,e)=>n+hexDistance({x,y},e),0)<=guards.reduce((n,e)=>n+hexDistance(u,e),0))continue;}
   const cost=node.cost+1/Math.max(.01,terrainMoveFactor(b,{...u,x:node.x,y:node.y})),key=x+','+y;
   if(cost>=(costs.get(key)??Infinity)-1e-9)continue;
   costs.set(key,cost);queue.push({x,y,cost,path:[...node.path,{x,y}]});
  }
 }
 return {route:null,contactRoute,cost:Infinity};
}
export function routeMovementCost(b,u,path){
 let cost=0,from=u;
 for(const p of path){cost+=1/Math.max(.01,terrainMoveFactor(b,{...u,x:from.x,y:from.y}));from=p;}
 return cost;
}
export function formationGuardOrder(b,u){
 const protectedUnit=formationPeer(b,u,'guard');if(!protectedUnit)return null;
 const threats=b.sides[1-u.side].units.filter(e=>active(e)&&isTargetable(b,e)&&hexDistance(e,protectedUnit)<=2)
  .map(target=>({target,path:planBattleRoute(b,target,protectedUnit)}))
  .filter(p=>p.path.route!==null||hexDistance(u,p.target)===1)
  .sort((a,c)=>a.path.cost-c.path.cost||hexDistance(u,a.target)-hexDistance(u,c.target)||a.target.id.localeCompare(c.target.id));
 for(const {target} of threats){
  if(hexDistance(u,target)<=unitAttributes(u,b).range&&canStrikeFrom(b,u,target))return {target,route:[],protectedUnit};
  const path=planBattleRoute(b,u,target,{goalOverride:p=>hexDistance(p,protectedUnit)<=1&&hexDistance(p,target)<=unitAttributes(u,b).range&&canStrikeFrom(b,u,target,p)});
  if(path.route?.length)return {target,route:path.route,protectedUnit};
 }
 if(hexDistance(u,protectedUnit)>1){const p=planBattleRoute(b,u,protectedUnit,{supportRange:1});return {target:null,route:p.route||[],protectedUnit};}
 return {target:null,route:[],protectedUnit};
}
export function formationRearRoute(b,u,target){
 const screen=formationPeer(b,u,'screen');if(!screen||unitAttributes(u,b).range<=1)return null;
 const stats=unitAttributes(u,b),front=sideCell(screen,u.side);
 return planBattleRoute(b,u,target,{goalOverride:p=>sideCell(p,u.side).x<front.x&&hexDistance(p,screen)>=1&&hexDistance(p,screen)<=2&&hexDistance(p,target)>=stats.minRange&&hexDistance(p,target)<=stats.range&&canStrikeFrom(b,u,target,p)}).route;
}
