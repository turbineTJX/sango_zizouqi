import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';
import {allLearnedTacticIds} from '../tactic-learning.mjs';
import {BUILDING_DESIGNS} from '../data/design/buildings.mjs';
import {buildingCombatState} from '../building-rules.mjs';
import {hexNeighbors,insideHexGrid} from '../hex-grid.mjs';
import {equipmentEntry} from './helpers/current-battle.mjs';

function fixture(side,type='archer',enemyType='archer',enemyTroops=3000){
 const actor=equipmentEntry('dun',type),enemy={...equipmentEntry('wen',enemyType),troops:enemyTroops};
 const state=generateBattle({...defaultCustomBattle(),seed:11173,ownTeam:[side?enemy:actor],enemyTeam:[side?actor:enemy]});
 const b=state.battle;lockDeployment(b);
 const u=b.sides[side].units[0],foe=b.sides[1-side].units[0];
 const place=(a,x,y)=>Object.assign(a,side?{x:13-x,y:7-y}:{x,y});
 place(u,3,3);place(foe,5,3);
 for(const a of [u,foe]){a.intent=0;a.retreatAt=null;a.skillReady=Object.fromEntries(allLearnedTacticIds(a).map(id=>[id,999]));}
 u.cooldown=0;foe.cooldown=999;setStatus(b,foe,'root',200,{sourceId:foe.id,sourceName:foe.name});
 const building=(kind,id,x,y,level=1)=>{
  const a={id,name:BUILDING_DESIGNS[kind].name,kind,type:'building',side:1-side,hp:1000,maxHp:1000,...buildingCombatState(kind,level)};
  place(a,x,y);b.buildings.push(a);return a;
 };
 return {state,b,u,foe,place,building};
}
const hit=(b,u,target)=>b.effects.some(e=>e.from===u.id&&e.to===target.id&&!e.skill&&e.damage>0);
const step=b=>stepBattle(b,{aiSides:[0,1]});

for(const side of [0,1]){
 test(`侧${side}：自动攻击正在威胁友军的箭塔，不抢拆旁边残损的民用设施`,()=>{
  const {state,b,u,foe,place,building}=fixture(side,'spear');place(foe,7,3);
  const tower=building('arrowTower','tower',4,3),civil=building('commerce','market',4,4);civil.hp=50;
  step(b);assert.ok(hit(b,u,tower));assert.equal(civil.hp,50);assert.equal(u.passiveState.targetId,tower.id);validateSave(state);
 });
 test(`侧${side}：附近市场不会遮蔽正在接近的前排敌军`,()=>{
  const {b,u,foe,building}=fixture(side,'spear','spear');const market=building('commerce','market',4,3);
  for(let i=0;i<5&&!hit(b,u,foe);i++)step(b);
  assert.ok(hit(b,u,foe));assert.equal(market.hp,1000);
 });
 for(const unavailable of ['root','stasis','focus'])test(`侧${side}：${unavailable}不能让无威胁建筑成为首选目标`,()=>{
  const {state,b,u,foe,place,building}=fixture(side);place(foe,9,6);const market=building('commerce','market',4,3);
  if(unavailable==='root')setStatus(b,u,'root',100,{sourceId:u.id,sourceName:u.name});
  if(unavailable==='stasis')setStatus(b,foe,'stasis',100,{sourceId:foe.id,sourceName:foe.name});
  if(unavailable==='focus')Object.assign(b.sides[side],{focus:market.id,focusUntil:100});
  for(let i=0;i<5;i++){step(b);assert.equal(market.hp,1000);assert.notEqual(u.passiveState.targetId,market.id);}validateSave(state);
 });
 test(`侧${side}：只有确实阻断接敌通路的民用设施才会被清障`,()=>{
  const {state,b,u,foe,place,building}=fixture(side,'spear');place(u,0,3);place(foe,3,3);
  const wall=Array.from({length:8},(_,y)=>building('commerce','wall-'+y,2,y));let damaged;
  for(let i=0;i<8&&!damaged;i++){step(b);damaged=wall.find(a=>a.hp<1000);}
  assert.ok(damaged,'封闭通路必须真实拆除障碍');assert.equal(wall.filter(a=>a.hp<1000).length,1);validateSave(state);
 });
 test(`侧${side}：攻城城门保留为目标，无威胁设施仍被忽略`,()=>{
  const entry=id=>equipmentEntry(id,'archer'),state=generateBattle({...defaultCustomBattle(),seed:11173,battleKind:side?'defense':'siege',shieldPercent:0,ownTeam:[entry(side?'wen':'dun')],enemyTeam:[entry(side?'dun':'wen')]}),b=state.battle;lockDeployment(b);
  const u=b.sides[side].units[0],foe=b.sides[1-side].units[0],gate=b.siege.gate;
  Object.assign(u,{x:gate.x+(side?1:-1),y:4,cooldown:0,intent:0,skillReady:Object.fromEntries(allLearnedTacticIds(u).map(id=>[id,999]))});Object.assign(foe,{x:7,y:0});setStatus(b,foe,'stasis',100,{sourceId:foe.id,sourceName:foe.name});
  const market={id:'market',name:'市集',type:'building',kind:'commerce',side:1-side,x:gate.x,y:3,hp:1000,maxHp:1000};b.buildings=[market];step(b);
  assert.ok(hit(b,u,gate));assert.equal(market.hp,1000);validateSave(state);
 });
 for(const kind of ['musicStage','aidCamp'])for(const useful of [false,true])test(`侧${side}：${kind}仅在当前确有${useful?'有效':'无效'}支援时改变攻击优先级`,()=>{
  const {state,b,u,foe,building}=fixture(side);const a=building(kind,'support',4,3);
  if(kind==='musicStage')foe.intent=useful?0:100;
  else if(useful)Object.assign(foe,{hp:2000,battleDamage:1000});
  step(b);assert.ok(hit(b,u,useful?a:foe));assert.equal(hit(b,u,useful?foe:a),false);validateSave(state);
 });
 for(const condition of ['unfinished','retreat','no-beneficiary','out-of-range'])test(`侧${side}：${condition}建筑不分散对实际敌军的火力`,()=>{
  const {b,u,foe,building,place}=fixture(side);const a=building('musicStage','music',4,3);
  if(condition==='unfinished')a.level=0;
  if(condition==='retreat')b.sides[1-side].retreat=true;
  if(condition==='no-beneficiary')foe.withdrawing=true;
  if(condition==='out-of-range'){place(foe,6,3);place(a,2,3);}
  step(b);assert.ok(hit(b,u,foe));assert.equal(a.hp,1000);
 });
 test(`侧${side}：近战牵制优先于拆塔，有效集火则实际脱战绕行并保存接续`,()=>{
  const {state,b,u,foe,place,building}=fixture(side,'spear','spear');place(foe,4,3);const tower=building('arrowTower','tower',6,3);
  step(b);assert.ok(hit(b,u,foe));assert.equal(tower.hp,1000);
  Object.assign(b.sides[side],{focus:tower.id,focusUntil:200});u.cooldown=0;step(b);
  assert.equal(u.action,'脱战准备');assert.equal(u.disengage.targetId,tower.id);
  const resumed=validateSave(structuredClone(state));let preparations=1,damaged=false;
  for(let i=0;i<28&&!b.result&&!damaged;i++){
   step(b);step(resumed.battle);assert.deepEqual(b,resumed.battle);
   preparations+=Number(u.action==='脱战准备');damaged=tower.hp<1000;
  }
  assert.ok(damaged,'实际走到合法位置后攻击建筑');assert.ok(preparations<=2,'不反复准备却不移动');validateSave(state);
 });
 test(`侧${side}：完全被设施封住的箭塔不会引发不可达追逐`,()=>{
  const {state,b,u,foe,place,building}=fixture(side,'spear');place(u,0,0);place(foe,0,3);const tower=building('arrowTower','tower',2,0);
  const cells=hexNeighbors({x:2,y:0}).filter(([x,y])=>insideHexGrid(x,y));
  cells.forEach(([x,y],i)=>building('commerce','wall-'+i,x,y));
  Object.assign(b.sides[side],{focus:tower.id,focusUntil:200});
  for(let i=0;i<8&&!hit(b,u,foe);i++){step(b);assert.notEqual(u.action,'脱战准备');}
  assert.ok(hit(b,u,foe));assert.equal(tower.hp,1000);validateSave(state);
 });
 test(`侧${side}：小幅价值波动保持当前目标，建筑毁坏后立即转火`,()=>{
  const {state,b,u,foe,place,building}=fixture(side);place(foe,7,3);
  const a=building('arrowTower','a',4,3),c=building('arrowTower','c',4,4);
  step(b);assert.ok(hit(b,u,a));a.hp=a.maxHp;c.hp=800;u.cooldown=0;
  step(b);assert.ok(hit(b,u,a),'不会因轻微修复波动来回换目标');a.hp=0;u.cooldown=0;
  step(b);assert.ok(hit(b,u,c));assert.equal(u.passiveState.targetId,c.id);validateSave(state);
 });
 test(`侧${side}：有效嘲讽不被箭塔评分覆盖`,()=>{
  const {state,b,u,foe,building}=fixture(side);const tower=building('arrowTower','tower',4,3);
  setStatus(b,u,'taunt',20,{sourceId:foe.id,sourceName:foe.name});step(b);
  assert.ok(hit(b,u,foe));assert.equal(tower.hp,1000);validateSave(state);
 });
 test(`侧${side}：伤兵已全部救治时，救护营不因剩余战损获得优先级`,()=>{
  const {state,b,u,foe,building}=fixture(side);const camp=building('aidCamp','camp',4,3);
  Object.assign(foe,{hp:2350,battleDamage:1000,healed:350});step(b);
  assert.ok(hit(b,u,foe));assert.equal(camp.hp,1000);validateSave(state);
 });
 test(`侧${side}：救治实际预算为零时，救护营没有当前威胁`,()=>{
  const {state,b,u,foe,building}=fixture(side,'archer','archer',1000);const camp=building('aidCamp','camp',4,3);
  Object.assign(foe,{hp:900,battleDamage:100});setStatus(b,foe,'plague',100,{sourceId:foe.id,sourceName:foe.name,amount:0,potency:1.6});step(b);
  assert.ok(hit(b,u,foe));assert.equal(camp.hp,1000);validateSave(state);
 });
 for(const type of ['ram','tower'])test(`侧${side}：无城门的驻点战可以实际展开${type}拆塔`,()=>{
  const {state,b,u,foe,place,building}=fixture(side,type);place(foe,8,6);const tower=building('arrowTower','tower',type==='ram'?4:6,3);
  assert.ok(!b.siege);step(b);assert.equal(u.formType,type);
  const resumed=validateSave(structuredClone(state));let damaged=false;
  for(let i=0;i<12&&!b.result&&!damaged;i++){step(b);step(resumed.battle);damaged=tower.hp<1000;assert.deepEqual(b,resumed.battle);}
  assert.ok(damaged);assert.equal(u.formType,type);validateSave(state);
 });
}
