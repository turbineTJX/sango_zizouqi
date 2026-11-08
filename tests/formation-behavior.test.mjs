import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave,unitAttributes} from '../engine.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {hexDistance,sideCell} from '../hex-grid.mjs';
import {hasStatus,setStatus,unitTactics,basicSupportTargets,TACTICS_BOOK} from '../tactics.mjs';
import {interceptorsAt,meleeTargetPool} from '../engagement.mjs';
import {deploymentBehaviorFor} from '../formation-behavior.mjs';
import {deploymentSupportModel,deploymentSupportOverlay} from '../deployment-support.mjs';
import {currentBattle} from './helpers/current-battle.mjs';
const id=name=>OFFICER_CATALOG.find(u=>u.name===name).id;
const own=[['周瑜','archer',5000],['王粲','archer',2000],['文聘','halberd',3000],['陈武','halberd',3000],['李典','spear',2500],['曹性','archer',2500]];
const foe=[['张绣','cavalry',3000],['臧霸','cavalry',3000],['张任','spear',3000],['韩当','archer',3000],['严颜','archer',3000],['陈登','archer',3000]];
const points=[[3,3],[2,3],[4,2],[4,4],[3,4],[2,5]];
function scene(side=0,locked=true){
 const entry=([name,type,troops])=>({id:id(name),type,troops,level:10,retreatAt:null});
 const state=generateBattle({...defaultCustomBattle(),seed:719221,limit:480,mapId:'plain-open',events:[],shieldPercent:0,ownTroopBudget:18000,ownTeam:(side?foe:own).map(entry),enemyTeam:(side?own:foe).map(entry)});
 const b=state.battle;
 own.forEach((u,i)=>{const p=sideCell({x:points[i][0],y:points[i][1]},side);assert.equal(deployBattleUnit(b,id(u[0]),p.x,p.y,side),null);});
 if(locked)assert.equal(lockDeployment(b),null);
 return {state,b,side,units:b.sides[side].units,main:b.sides[side].units.find(u=>u.id===id('周瑜')),aid:b.sides[side].units.find(u=>u.id===id('王粲')),guard:b.sides[side].units.find(u=>u.id===id('李典'))};
}
function pauseSkills(b){for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.cooldown=999;}}
test('real mixed formation assigns a rear guard, front screen and mage intent recipient on both sides',()=>{
 for(const side of [0,1]){
  const x=scene(side);assert.equal(x.guard.deploymentBehavior.guardId,x.main.id);assert.equal(x.aid.deploymentBehavior.intentId,x.main.id);
  assert.equal(x.main.deploymentBehavior.screenId,id('文聘'));assert.equal(x.units.find(u=>u.id===id('文聘')).deploymentBehavior.guardId,null);
  validateSave(structuredClone(x.state));
 }
});
test('cavalry flank is relative to the infantry line rather than the far map edge',()=>{
 const unit=(id,type,x,y)=>({id,type,x,y,hp:3000,status:'active',side:0});
 const b={tick:0,deploymentLocked:false,sides:[{units:[unit('a','spear',4,3),unit('b','halberd',4,4),unit('r','cavalry',4,2)]},{units:[]}]},r=b.sides[0].units[2];
 assert.equal(deploymentBehaviorFor(b,r).flank,'upper');r.y=3;assert.equal(deploymentBehaviorFor(b,r).flank,null);r.y=5;assert.equal(deploymentBehaviorFor(b,r).flank,'lower');
});
test('deployment preview is read only and dragging the aid changes its future recipient',()=>{
 const x=scene(0,false),before=structuredClone(x.state),model=deploymentSupportModel(x.b,x.guard.id);
 assert.match(deploymentSupportOverlay(model),/data-formation-peer/);assert.deepEqual(x.state,before);
 const p=deploymentBehaviorFor(x.b,x.aid);assert.equal(p.intentId,x.main.id);
 assert.equal(deployBattleUnit(x.b,x.aid.id,2,5),null);
 assert.equal(deploymentBehaviorFor(x.b,x.aid).intentId,null);
});
test('intent support reaches its positional mage even when a frontliner is closer to a tactic gate',()=>{
 const x=scene();pauseSkills(x.b);
 x.main.intent=40;x.units.find(u=>u.id===id('文聘')).intent=24;
 assert.equal(basicSupportTargets(x.b,x.aid,TACTICS_BOOK.rally)[0].id,x.main.id);
 x.aid.intent=15;x.aid.skillReady.rally=0;stepBattle(x.b,{aiSides:[]});
 assert.ok(x.b.effects.some(e=>e.from===x.aid.id&&e.to===x.main.id&&e.label==='振旅'&&e.intentRestored>0));
 const exhausted=unitTactics(x.main);for(const t of exhausted)x.main.tacticCasts[t.id]=t.maxUses;
 assert.notEqual(basicSupportTargets(x.b,x.aid,TACTICS_BOOK.rally)[0]?.id,x.main.id);
});
test('a rear spear stays with its mage instead of joining the initial advance',()=>{
 const x=scene();pauseSkills(x.b);
 for(let i=0;i<8;i++){stepBattle(x.b,{aiSides:[]});assert.match(x.guard.action,/留守/);assert.ok(x.guard.x<=x.main.x);assert.ok(hexDistance(x.guard,x.main)<=2);}
});
test('spear interception stops a charging cavalry while ordinary halberd interception can be bypassed',()=>{
 for(const side of [0,1]){
  const x=scene(side),rider=x.b.sides[1-side].units[0],spear=x.guard,halberd=x.units.find(u=>u.id===id('文聘'));
  Object.assign(rider,{x:spear.x+1,y:spear.y});setStatus(x.b,rider,'phase',5);
  assert.ok(interceptorsAt(x.b,rider).some(u=>u.id===spear.id));
  assert.deepEqual(meleeTargetPool(x.b,rider,[spear,halberd]).map(u=>u.id),[spear.id]);
  setStatus(x.b,spear,'disrupted',5);assert.ok(!interceptorsAt(x.b,rider).some(u=>u.id===spear.id));
 }
});
test('ordinary ranged attacks select a nearer frontliner before a reachable rear',()=>{
 const x=scene();pauseSkills(x.b);const [front,rear]=x.b.sides[1].units;
 Object.assign(front,{x:6,y:3});Object.assign(rear,{x:7,y:3});
 x.main.cooldown=0;stepBattle(x.b,{aiSides:[]});
 assert.ok(x.b.effects.some(e=>e.from===x.main.id&&e.to===front.id&&e.damage>0&&!e.skill));
});
test('normal movement and boosted cavalry never move more than one hex per action',()=>{
 const x=scene();pauseSkills(x.b);const rider=x.b.sides[1].units[0];setStatus(x.b,rider,'haste',40);
 assert.ok(unitAttributes(rider,x.b).move<=1);
 for(let n=0;n<18;n++){
  const before=new Map(x.b.sides.flatMap(s=>s.units).map(u=>[u.id,{x:u.x,y:u.y}]));
  stepBattle(x.b,{aiSides:[]});
  for(const u of x.b.sides.flatMap(s=>s.units))if(u.status==='active')assert.ok(hexDistance(before.get(u.id),u)<=1,u.name);
 }
});
test('a real rush pays once, advances over turns, and resumes deterministically mid-route',()=>{
 const x=currentBattle('rush','cavalry',{enemyTypes:['halberd','archer']});
 Object.assign(x.target,{x:7,y:3});Object.assign(x.rear,{x:9,y:5});setStatus(x.b,x.target,'root',30);x.u.intent=100;x.u.skillReady.rush=0;
 stepBattle(x.b,{aiSides:[]});assert.ok(x.u.movementAim);assert.equal(x.u.tacticCasts.rush,1);
 const copy=validateSave(structuredClone(x.state)),hp=x.target.hp;let observedMovement=false;
 for(let i=0;i<12&&x.u.movementAim;i++){
  const p={x:x.u.x,y:x.u.y};stepBattle(x.b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});
  assert.ok(hexDistance(p,x.u)<=1);if(hexDistance(p,x.u))observedMovement=true;
 }
 assert.ok(observedMovement);assert.equal(x.u.movementAim,null);assert.equal(x.u.tacticCasts.rush,1);assert.ok(x.target.hp<hp);assert.deepEqual(x.state,copy);
});
test('an interrupted rush does not refund its charge or hit the old target',()=>{
 const x=currentBattle('rush','cavalry',{enemyTypes:['halberd','archer']});Object.assign(x.target,{x:7,y:3});x.u.intent=100;x.u.skillReady.rush=0;
 stepBattle(x.b,{aiSides:[]});assert.ok(x.u.movementAim);const hp=x.target.hp;setStatus(x.b,x.u,'root',4);
 stepBattle(x.b,{aiSides:[]});assert.equal(x.u.movementAim,null);assert.equal(x.u.tacticCasts.rush,1);assert.equal(x.target.hp,hp);
 assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.missed&&e.text==='突进中断'));
});
test('save rejects a forged cross-side formation peer and a nonadjacent rush path',()=>{
 const x=scene(),copy=structuredClone(x.state);copy.battle.sides[0].units[0].deploymentBehavior.screenId=copy.battle.sides[1].units[0].id;
 assert.throws(()=>validateSave(copy),/布阵职责/);
 const r=currentBattle('rush','cavalry',{enemyTypes:['halberd','archer']});Object.assign(r.target,{x:7,y:3});r.u.intent=100;r.u.skillReady.rush=0;stepBattle(r.b,{aiSides:[]});
 const bad=structuredClone(r.state),u=bad.battle.sides[0].units.find(v=>v.id===r.u.id);u.movementAim.path[0]={x:12,y:7};
 assert.throws(()=>validateSave(bad),/突进路线/);
});
