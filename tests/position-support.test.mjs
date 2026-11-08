import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {TACTICS_BOOK,basicSupportTargets,expandedSupportTargets,supportPositionPreview,unitTactics} from '../tactics.mjs';
import {positionedSupportTargets} from '../tactic-positioning.mjs';
import {deploymentSupportModel,deploymentSupportInfo,supportDeploymentView} from '../deployment-support.mjs';
import {sideCell} from '../hex-grid.mjs';
import {tacticHolder} from './helpers/current-battle.mjs';
function scene(skill='rally',type='archer',side=0){
 const caster=tacticHolder(skill,type,[],true),ids=OFFICER_CATALOG.filter(u=>u.id!==caster).slice(0,6).map(u=>u.id);
 const entry=(id,type='spear')=>({id,type,level:10,troops:3000});
 const own=[entry(caster,type),...ids.slice(0,2).map(id=>entry(id))],foe=ids.slice(2).map(id=>entry(id));
 const state=generateBattle({...defaultCustomBattle(),seed:616171,mapId:'plain-open',ownTeam:side?foe:own,enemyTeam:side?own:foe});
 const b=state.battle,[u,a,c]=b.sides[side].units;
 for(const [v,p]of [[u,{x:2,y:3}],[a,{x:3,y:3}],[c,{x:2,y:4}]])Object.assign(v,sideCell(p,side));
 return {state,b,u,a,c};
}
test('rally preview shares real positional priority on both sides and skips an exhausted preferred recipient',()=>{
 for(const side of [0,1]){
  const {b,u,a,c}=scene('rally','archer',side);a.intent=40;c.intent=0;
  const before=structuredClone(b),r=supportPositionPreview(b,u).find(r=>r.skill.id==='rally');
  assert.equal(r.preferred[0],a);assert.equal(basicSupportTargets(b,u,TACTICS_BOOK.rally)[0],a);assert.deepEqual(b,before);
  a.tacticCasts=Object.fromEntries(unitTactics(a).map(s=>[s.id,s.maxUses]));
  assert.equal(basicSupportTargets(b,u,TACTICS_BOOK.rally)[0],c);
  a.intent=100;c.intent=100;
  assert.equal(basicSupportTargets(b,u,TACTICS_BOOK.rally).length,0);
  assert.equal(supportPositionPreview(b,u).find(r=>r.skill.id==='rally').preferred[0],a,'positional forecast remains visible at full intent');
 }
});
test('healing uses the column when useful and falls back when that ally has no wounds',()=>{
 const {b,u,a,c}=scene();Object.assign(a,{x:2,y:4});Object.assign(c,{x:3,y:3});
 for(const v of [a,c]){v.hp=2400;v.battleDamage=600;v.healed=0;}
 assert.equal(expandedSupportTargets(b,u,TACTICS_BOOK.bandage)[0],a);
 a.hp=a.maxHp;a.battleDamage=0;
 assert.equal(expandedSupportTargets(b,u,TACTICS_BOOK.bandage)[0],c);
 c.status='reserve';assert.equal(expandedSupportTargets(b,u,TACTICS_BOOK.bandage).length,0);
});
test('the initial first forward ally remains preferred over a farther ally near a tactic gate, on both sides',()=>{
 for(const side of [0,1]){
  const {b,u,a,c}=scene('rally','archer',side);
  Object.assign(a,sideCell({x:3,y:3},side));Object.assign(c,sideCell({x:4,y:3},side));
  a.intent=0;c.intent=Math.min(...unitTactics(c).filter(s=>!s.passive).map(s=>Math.max(s.threshold,s.intentCost)))-1;
  assert.ok(c.intent>0&&c.intent<=85);
  const row=supportPositionPreview(b,u).find(r=>r.skill.id==='rally');
  assert.deepEqual(new Set(row.preferred.map(v=>v.id)),new Set([a.id]));
  assert.equal(basicSupportTargets(b,u,TACTICS_BOOK.rally)[0],a);
 }
});
test('position tiers prioritize same row first and retain need ranking regardless of distance, without mutating candidate order',()=>{
 const u={id:'u',x:1,y:3,side:0},same={id:'same',x:4,y:3},near={id:'near',x:2,y:4},far={id:'far',x:4,y:2};
 const pool=[far,near,same],before=structuredClone(pool);
 assert.deepEqual(positionedSupportTargets(u,{supportPosition:'front'},pool),[same,far,near]);assert.deepEqual(pool,before);
});
test('deployment swap forecast updates both positions without changing save or consuming resources',()=>{
 const {b,u,a,c}=scene(),before=structuredClone(b),draft={battleId:b.id,unitId:a.id,x:c.x,y:c.y};
 const view=supportDeploymentView(b,draft);assert.equal(view.sides[0].units.find(v=>v.id===c.id).x,a.x);
 const model=deploymentSupportModel(b,u.id,'rally',draft);
 assert.equal(model.row.preferred[0].id,c.id);assert.doesNotMatch(deploymentSupportInfo(model),/优先候选|当前有需要|支援预览|<small>|<b>/);assert.deepEqual(b,before);
 assert.equal(supportDeploymentView(b,{...draft,x:13}),b);
});
test('previews do not include decoys, reserves, departing allies or out-of-range friends',()=>{
 const {b,u,a,c}=scene();a.withdrawing=true;c.status='reserve';
 assert.equal(supportPositionPreview(b,u).find(r=>r.skill.id==='rally').preferred.length,0);
 c.status='active';c.isDecoy=true;assert.equal(supportPositionPreview(b,u).find(r=>r.skill.id==='rally').preferred.length,0);
 delete c.isDecoy;c.x=10;assert.equal(supportPositionPreview(b,u).find(r=>r.skill.id==='rally').preferred.length,0);
});
test('actual battle after repeated previews resumes deterministically under new rules',()=>{
 const {state,b,u}=scene();for(let i=0;i<5;i++)deploymentSupportModel(b,u.id);
 assert.equal(lockDeployment(b),null);for(let i=0;i<15&&!b.result;i++)stepBattle(b,{aiSides:[]});
 const copy=validateSave(structuredClone(state));for(let i=0;i<20&&!b.result;i++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(state,copy);
});
