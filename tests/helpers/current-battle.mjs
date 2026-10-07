import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../../officer-catalog.mjs';
import {makeOfficer,lockDeployment,stepBattle,validateSave,syncCombatForm} from '../../engine.mjs';
import {TROOP_DESIGNS} from '../../data/design/troops.mjs';
import {emptyEquipment} from '../../troop-equipment.mjs';
import {createScenario} from '../../scenarios.mjs';
import {advanceTacticLearning,troopAptitude} from '../../tactic-learning.mjs';
import {unitTactics,TACTICS_BOOK,setStatus} from '../../tactics.mjs';
import {tacticSlot} from '../../tactic-tempo.mjs';

// Choose a real holder before generating the battle. Never grant a test-only kit.
export function tacticHolder(skill,type,exclude=[],requireS=false){
 const equipment=TROOP_DESIGNS[type]?.equipmentSlot,base=equipment==='ship'?'archer':equipment?'halberd':type;
 const source=OFFICER_CATALOG.find(o=>{
  if(exclude.includes(o.id)||requireS&&troopAptitude(o,base)!==3)return false;
  const u=makeOfficer(o.id,3000,0,1);u.type=base;if(equipment){u.equipment={...emptyEquipment(),[equipment]:type};u.formType=type;}advanceTacticLearning(u);
  return u.tactics.includes(skill);
 });
 assert.ok(source,`${type} has no legal holder of ${skill}`);return source.id;
}
export function equipmentEntry(id,type){
 const slot=TROOP_DESIGNS[type]?.equipmentSlot;
 return {id,type:slot==='ship'?'archer':slot?'halberd':type,...(slot?{equipment:{...emptyEquipment(),[slot]:type}}:{}),troops:3000,level:1,retreatAt:null};
}
export function currentBattle(skill,type,{side=0,seed=91,requireS=false,enemyTypes=null}={}){
 const id=tacticHolder(skill,type,[],requireS),others=OFFICER_CATALOG.filter(o=>o.id!==id).slice(0,1+(enemyTypes?.length??2)).map(o=>o.id);
 const entry=equipmentEntry;
 const slot=TROOP_DESIGNS[type]?.equipmentSlot;
 const own=[entry(id,type),entry(others[0],slot==='ship'?'ship':'spear')],enemy=others.slice(1).map((id,i)=>entry(id,slot==='ship'?'ship':enemyTypes?.[i]??(i?'archer':'spear')));
 const state=createScenario('custom-battle',seed,slot==='siege'?0:20,null,{seed,terrain:slot==='ship'?'river':'land',battleKind:slot==='siege'?(side?'defense':'siege'):'field',gateHp:50000,shieldPercent:0,ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;lockDeployment(b);
 const [u,ally]=b.sides[side].units,[target,rear]=b.sides[1-side].units;
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
 Object.assign(u,{x:4,y:3});Object.assign(ally,{x:3,y:3});Object.assign(target,{x:5,y:3});Object.assign(rear,{x:7,y:3});
 if(slot==='siege'){Object.assign(u,{x:side?5:8,y:3});Object.assign(ally,{x:side?6:7,y:2});Object.assign(target,{x:side?3:10,y:3});Object.assign(rear,{x:side?3:10,y:1});if(TROOP_DESIGNS[type].range===4){u.x=side?4:9;target.x=side?2:11;rear.x=side?2:11;}if(TROOP_DESIGNS[type].range===1)Object.assign(u,{x:side?2:11,y:4});}
 if(slot==='siege')for(const v of [ally,target,rear])setStatus(b,v,'root',20);
 syncCombatForm(b,u,slot==='siege'?b.siege.gate:null);for(const v of [ally,target,rear])syncCombatForm(b,v);
 while(u.formReadyTick>b.tick)stepBattle(b);
 assert.ok(u.tactics.includes(skill));validateSave(structuredClone(state));return {state,b,u,ally,target,rear};
}
export function readyCurrent(x,id){
 const skill=unitTactics(x.u).find(t=>t.id===id);assert.ok(skill);x.u.intent=100;
 for(const key of Object.keys(x.u.skillReady))if(TACTICS_BOOK[key]&&tacticSlot(TACTICS_BOOK[key])===tacticSlot(skill))x.u.skillReady[key]=0;
 x.u.skillReady[id]=0;
}
export function resumeCurrent(x,steps=8){
 const copy=validateSave(structuredClone(x.state));
 for(let i=0;i<steps;i++){stepBattle(x.b);stepBattle(copy.battle);}
 assert.deepEqual(x.state,copy);
}
