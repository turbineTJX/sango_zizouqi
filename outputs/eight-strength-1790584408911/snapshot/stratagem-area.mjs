import {HEX_GRID,hexCenter,insideHexGrid} from './hex-grid.mjs';
import {isTargetable} from './engagement.mjs';
import {CONTROL_STATUSES,statusOn} from './battle-status-rules.mjs';
import {traitImmune} from './trait-mechanics.mjs';

export const AREA_HEIGHT=HEX_GRID.height*2/Math.sqrt(3);
export const areaPosition=u=>{const p=hexCenter(u.x,u.y);return {x:p.x*HEX_GRID.width,y:p.y*AREA_HEIGHT};};
export const isAreaStratagem=s=>['circle','rectangle','unit'].includes(s?.scope?.shape);
export const validStratagemPoint=p=>!!p&&insideHexGrid(p.x,p.y)&&(p.rotation===undefined||p.rotation===0||p.rotation===90);
export function stratagemAreaContains(s,point,u){
 if(!isAreaStratagem(s)||!validStratagemPoint(point)||!insideHexGrid(u.x,u.y))return false;
 if(s.scope.shape==='unit')return point.x===u.x&&point.y===u.y;
 const a=areaPosition(point),b=areaPosition(u),dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y),r=s.scope;
 return r.shape==='circle'?dx*dx+dy*dy<=r.radius*r.radius+1e-9:dx<=(point.rotation===90?r.height:r.width)/2+1e-9&&dy<=(point.rotation===90?r.width:r.height)/2+1e-9;
}
export function stratagemScopeText(s){
 const r=s.scope;
 if(r?.shape==='unit')return '单支友军';
 if(r?.shape==='circle')return `圆形半径${r.radius}格`;
 if(r?.shape==='rectangle')return `矩形${r.width}×${r.height}格，可旋转`;
 return r?.shape==='reserve'?'预备队效果':'全军效果';
}
export function stratagemAreaTargets(b,s,point,side=0){
 if(!validStratagemPoint(point))return [];
 return b.sides[s.side===1?1-side:side].units.filter(u=>u.status==='active'&&u.hp>0&&isTargetable(b,u)&&stratagemAreaContains(s,point,u));
}
export function stratagemHasEffect(b,s,u){
 if(s.effect==='rapidAdvance')return !statusOn(b,u,'rapidAdvance');
 if(s.effect==='magicImmunity')return !statusOn(b,u,'magicImmune');
 if(s.side===1&&statusOn(b,u,'magicImmune'))return false;
 if(s.zone)return zoneStatusChoices(b,s,u).length>0;
 if(s.effect==='heal')return u.hp<u.maxHp&&Math.floor(((u.battleDamage??u.initial-u.hp)-(u.battleDeserted||0))*.35)>(u.healed||0);
 if(s.effect==='demoralize')return u.intent>0;
 return true;
}
export function zoneStatusChoices(b,s,u){
 if(statusOn(b,u,'magicImmune'))return [];
 return (s.zone?.statuses||[]).filter(key=>!statusOn(b,u,key)&&!traitImmune(u,key)&&!(CONTROL_STATUSES.includes(key)&&statusOn(b,u,'resolve')));
}
// Only placement is optimized; the command priority is decided separately.
// Useful unit count, never troop strength or damage prediction; ties keep stable order.
export function chooseStratagemPoint(b,s,side){
 if(!isAreaStratagem(s))return null;
 const units=b.sides[s.side===1?1-side:side].units;
 const useful=units.filter(u=>u.status==='active'&&u.hp>0&&insideHexGrid(u.x,u.y)&&isTargetable(b,u)&&stratagemHasEffect(b,s,u)&&
   (s.effect!=='firestorm'||!((u.statuses?.burn?.until||0)>b.tick)));
 if(!useful.length)return null;
 const centers=useful.map(u=>({x:u.x,y:u.y}));
 for(let y=0;y<HEX_GRID.rows;y++)for(let x=0;x<HEX_GRID.cols;x++)centers.push({x,y});
 let best=null,count=0;
 for(const center of centers)for(const rotation of s.scope.shape==='rectangle'?[0,90]:[0]){
   const point={...center,rotation},covered=useful.filter(u=>stratagemAreaContains(s,point,u)).length;
   if(covered>count){best=point;count=covered;}
 }
 return best;
}
