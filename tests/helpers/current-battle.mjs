import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../../officer-catalog.mjs';
import {makeOfficer,lockDeployment,stepBattle,validateSave} from '../../engine.mjs';
import {createScenario} from '../../scenarios.mjs';
import {advanceTacticLearning,troopAptitude} from '../../tactic-learning.mjs';
import {unitTactics} from '../../tactics.mjs';

// Choose a real holder before generating the battle. Never grant a test-only kit.
export function tacticHolder(skill,type,exclude=[],requireS=false){
 const source=OFFICER_CATALOG.find(o=>{
  if(exclude.includes(o.id)||requireS&&troopAptitude(o,type)!==3)return false;
  const u=makeOfficer(o.id,3000,0,1);u.type=type;advanceTacticLearning(u);
  return u.tactics.includes(skill);
 });
 assert.ok(source,`${type} has no legal holder of ${skill}`);return source.id;
}
export function currentBattle(skill,type,{side=0,seed=91,requireS=false,enemyTypes=null}={}){
 const id=tacticHolder(skill,type,[],requireS),others=OFFICER_CATALOG.filter(o=>o.id!==id).slice(0,1+(enemyTypes?.length??2)).map(o=>o.id);
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const own=[entry(id,type),entry(others[0],type==='ship'?'ship':'spear')],enemy=others.slice(1).map((id,i)=>entry(id,type==='ship'?'ship':enemyTypes?.[i]??(i?'archer':'spear')));
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:type==='ship'?'river':'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;lockDeployment(b);
 const [u,ally]=b.sides[side].units,[target,rear]=b.sides[1-side].units;
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));}
 Object.assign(u,{x:4,y:3});Object.assign(ally,{x:3,y:3});Object.assign(target,{x:5,y:3});Object.assign(rear,{x:7,y:3});
 assert.ok(u.tactics.includes(skill));validateSave(structuredClone(state));return {state,b,u,ally,target,rear};
}
export function readyCurrent(x,id){
 assert.ok(unitTactics(x.u).some(t=>t.id===id));x.u.intent=100;x.u.skillReady[id]=0;
}
export function resumeCurrent(x,steps=8){
 const copy=validateSave(structuredClone(x.state));
 for(let i=0;i<steps;i++){stepBattle(x.b);stepBattle(copy.battle);}
 assert.deepEqual(x.state,copy);
}
