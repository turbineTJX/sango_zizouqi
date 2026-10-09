import {canOccupy,blockedTerrain} from './battlefield.mjs';

// One placement operation for the UI and either background controller.
export function deployBattleUnit(b,unitId,x,y,side=0){
 if(!b||b.deploymentLocked||b.tick!==0||b.result)return '开战后位置锁定，暂停也不能移动部队';
 if(![0,1].includes(side))return '请选择本方军团';
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<(side?9:0)||x>(side?13:4)||y<0||y>=8)return '请放在本方布阵区';
 if(blockedTerrain(b,x,y))return '城门所在格不能布置部队';
 const unit=b.sides[side].units.find(u=>u.id===unitId&&['active','reserve'].includes(u.status)&&u.hp>0);
 if(unit&&((unit.arrivalTick||0)>b.tick||unit.arrivalConfirmed===false))return '援军尚未抵达，不能上阵';
 if(!unit)return '请选择本方部队';
 if(!canOccupy(b,unit,x,y))return '舰船只能布置在水道，陆军只能布置在陆地或桥面';
 const occupied=b.sides.flatMap(s=>s.units).find(u=>u.status==='active'&&u.x===x&&u.y===y&&u!==unit);
 if(occupied?.side===1-side)return '不能与敌军重叠';
 if(occupied&&unit.status==='active'&&!canOccupy(b,occupied,unit.x,unit.y))return '交换后的部队不符合水陆限制';
 if(occupied){occupied.x=unit.x;occupied.y=unit.y;if(unit.status==='reserve'){occupied.status='reserve';occupied.x=-1;occupied.y=-1;}}
 unit.status='active';unit.x=x;unit.y=y;return null;
}
