import {battleDays} from './player-time.mjs';

export function customArmyColumns(draft){
 return [{id:'a1',side:0,name:'我军先遣军团',team:draft.ownTeam},
  {id:'a2',side:1,name:'敌军先遣军团',team:draft.enemyTeam},
  ...(draft.reinforcements||[]).map((a,i)=>({...a,id:'a'+(i+3)}))];
}

// Conditions reference real participants. A withdrawn unit is not destroyed.
export function arrivalConditionMet(b,condition){
 const units=b.sides.flatMap(s=>s.units),defeated=u=>u.status==='defeated'&&u.hp===0;
 if(condition?.type==='unit-defeated')return units.some(u=>u.id===condition.unitId&&defeated(u));
 if(condition?.type==='army-defeated'){
  const army=units.filter(u=>u.armyId===condition.armyId);
  return army.length>0&&army.every(defeated);
 }
 return false;
}

export function sameArrivalCondition(a,b){
 if(!a||!b)return a===b;
 return a.type===b.type&&a.unitId===b.unitId&&a.armyId===b.armyId&&Object.keys(a).length===Object.keys(b).length;
}

export function validateArrivalDependencies(draft){
 const columns=customArmyColumns(draft),dependencies=new Map();
 for(const a of columns.filter(a=>a.arrivalCondition)){
  const c=a.arrivalCondition;
  const target=c.type==='unit-defeated'?columns.find(a=>a.team.some(u=>u.id===c.unitId)):
   c.type==='army-defeated'?columns.find(a=>a.id===c.armyId):null;
  if(!target)throw Error('援军到达条件的目标不存在，请重新选择');
  if(target.id===a.id)throw Error('援军到达条件不能引用本军团');
  dependencies.set(a.id,target.id);
 }
 const done=new Set();
 for(const start of dependencies.keys()){
  const path=new Set();let id=start;
  while(dependencies.has(id)&&!done.has(id)){
   if(path.has(id))throw Error('援军到达条件互相等待，请更改条件');
   path.add(id);id=dependencies.get(id);
  }
  for(const id of path)done.add(id);
 }
}

export function arrivalLabel(value,units=[],armies=[]){
 const c=value.arrivalCondition;
 if(c?.type==='unit-defeated')return (units.find(u=>u.id===c.unitId)?.name||'指定部队')+'队被消灭后';
 if(c?.type==='army-defeated')return (armies.find(a=>a.id===c.armyId)?.name||'指定军团')+'全灭后';
 const days=battleDays(value.tick??value.arrivalTick??0);
 return days?'开战后 '+days+' 天':'开局到达';
}

export function battleArrivalLabel(b,value,knownArmies=[]){
 const units=b.sides.flatMap(s=>s.units),commanders=b.sides.flatMap(s=>s.commanders||[]);
 const armies=[...new Set(units.map(u=>u.armyId))].map(id=>({id,name:
  id==='a1'?'我军先遣军团':id==='a2'?'敌军先遣军团':knownArmies.find(a=>a.id===id)?.name||(commanders.find(c=>c.armyId===id&&c.role==='leader')?.name||'援军')+'军团'}));
 return arrivalLabel(value,units,armies);
}

export function removeCustomReinforcement(draft,index){
 if(!Number.isInteger(index)||index<0||index>=(draft.reinforcements||[]).length)return;
 draft.reinforcements.splice(index,1);
 for(const a of draft.reinforcements){
  const c=a.arrivalCondition;if(c?.type!=='army-defeated')continue;
  const number=Number(c.armyId.slice(1));
  if(number===index+3)c.armyId='';
  else if(number>index+3)c.armyId='a'+(number-1);
 }
}
