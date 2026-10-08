import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,fillSlots,validateSave} from '../engine.mjs';
import {canOccupy} from '../battlefield.mjs';
import {equipmentEntry} from '../tests/helpers/current-battle.mjs';
import {BUILDING_DESIGNS} from '../data/design/buildings.mjs';
import {buildingCombatState} from '../building-rules.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

const output='outputs/building-targeting';fs.mkdirSync(output,{recursive:true});
const types=['spear','halberd','cavalry','archer','tower','ram','spear','archer'];
const roster=[['cao','dun','liao','chu','jia','yu','jin','yuanxia'],['shao','yan','wen','he','ju','tian','gao','person-46']];
const cases=[];
for(const seed of [11173,90419])for(const terrain of ['land','hill'])for(const kind of ['field','siege'])for(const facilitySide of [0,1]){
 const team=ids=>ids.map((id,i)=>({...equipmentEntry(id,types[i]),level:5,troops:i<4?4000:2000}));
 const state=generateBattle({...defaultCustomBattle(),seed,terrain,battleKind:kind==='field'?'field':facilitySide?'siege':'defense',gateHp:15000,shieldPercent:0,ownTroopBudget:30000,ownTeam:team(roster[0]),enemyTeam:team(roster[1])});
 const b=state.battle;
 b.buildings=['arrowTower','musicStage','aidCamp','commerce'].map((key,i)=>({id:'facility-'+key,name:BUILDING_DESIGNS[key].name,type:'building',kind:key,side:facilitySide,x:facilitySide?11:2,y:[1,2,6,0][i],hp:2000,maxHp:2000,...buildingCombatState(key,2)}));
 // The ordinary spawn/AI planner must respect the added physical footprints.
 for(const side of [0,1]){
  for(const u of b.sides[side].units)if(u.status==='active'&&!canOccupy(b,u,u.x,u.y)){u.status='reserve';u.x=-1;u.y=-1;}
  fillSlots(b,side,{ai:true});
 }
 assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
 const memory=new Map();let copy=null,towerShots=0,buildingHits=0,healing=0,intent=0,maxPreparation=0,maxExpansion=0;
 try{
  while(!b.result){
   stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
   for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active')){
    const previous=memory.get(u.id),cell=u.x+':'+u.y;
    const prep=u.action==='脱战准备'?(previous?.cell===cell?previous.prep+1:1):0;
    const expansion=u.action==='展开兵器'?(previous?.cell===cell?previous.expansion+1:1):0;
    memory.set(u.id,{cell,prep,expansion});maxPreparation=Math.max(maxPreparation,prep);maxExpansion=Math.max(maxExpansion,expansion);
    assert.ok(prep<=2,u.name+' repeated disengagement');assert.ok(expansion<=8,u.name+' repeated equipment deployment');
   }
   for(const e of b.effects){
    towerShots+=Number(e.from==='facility-arrowTower'&&e.damage>0);
    buildingHits+=Number(e.to.startsWith('facility-')&&e.damage>0);
    healing+=e.from==='facility-aidCamp'?(e.healing||0):0;
    intent+=e.from==='facility-musicStage'?(e.intentRestored||0):0;
   }
   if(b.tick===24)copy=validateSave(structuredClone(state));
   if(copy)assert.deepEqual(copy.battle,b);
  }
  validateSave(state);
 }catch(error){fs.writeFileSync(output+'/failure.json',JSON.stringify(state));throw error;}
 cases.push({seed,terrain,kind,facilitySide,tick:b.tick,result:b.result,towerShots,buildingHits,healing,intent,maxPreparation,maxExpansion,deterministic:!!copy,units:b.sides.map(s=>s.units.map(u=>({id:u.id,type:u.type,equipment:u.equipment,initial:u.initial,hp:u.hp,status:u.status,target:u.passiveState.targetId})))});
}
fs.writeFileSync(output+'/audit.json',JSON.stringify({rulesVersion:RULES_VERSION,scope:'Behavior only; no balance or historical win-rate conclusion.',cases},null,2));
console.log(JSON.stringify({cases:cases.length,buildingHits:cases.reduce((n,c)=>n+c.buildingHits,0),towerShots:cases.reduce((n,c)=>n+c.towerShots,0),healing:cases.reduce((n,c)=>n+c.healing,0),maxPreparation:Math.max(...cases.map(c=>c.maxPreparation)),maxExpansion:Math.max(...cases.map(c=>c.maxExpansion)),deterministic:cases.every(c=>c.deterministic)}));
