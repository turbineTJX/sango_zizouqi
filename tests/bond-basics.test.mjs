import test from 'node:test';
import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {sideBonds,bondAttributes,bondIntentIncomeFactor,bondHitIntentDenialChance} from '../bonds.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {intentIncome} from '../passives.mjs';
import {unitTactics,setStatus,hasStatus,shieldAmount} from '../tactics.mjs';
import {bondReference} from '../bond-reference.mjs';
import {bondContributors} from '../bond-display.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

const teams={
 bondPower:['孙坚','纪灵','孟获','祝融','兀突骨','沙摩柯'],
 bondArmor:['于禁','曹真','朱异','留赞','田予','胡烈'],
 bondHaste:['颜良','文丑','徐荣','马腾','吕玲绮','鲍三娘'],
 bondSpirit:['曹叡','孙权','刘虞','刘焉','何进','曹丕'],
 bondSuppress:['张宝','张梁','程远志','波才','邓茂','龚都']
};
const id=name=>Object.values(O).find(o=>o.name===name).id;
function scene(key,{count=6,side=0,type='archer',enemyNames=['刘禅','刘璋','韩玄','刘度']}={}){
 const make=names=>names.map(name=>({id:id(name),type,level:10,troops:4000})),own=make(teams[key].slice(0,count)),foes=make(enemyNames);
 const state=createScenario('custom-battle',9901,20,null,{seed:9901,terrain:'land',ownTeam:side?foes:own,enemyTeam:side?own:foes}),b=state.battle;lockDeployment(b);
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 const us=b.sides[side].units,es=b.sides[1-side].units,u=us[0],enemy=es[0];
 us.forEach((v,i)=>Object.assign(v,{x:i?0:4,y:i?i-1:3}));es.forEach((v,i)=>Object.assign(v,{x:i?13:type==='archer'?6:5,y:i?i:3}));
 if(side)for(const v of [...us,...es])v.x=13-v.x;
 return {state,b,u,us,es,enemy,side};
}
const hits=x=>x.b.effects.filter(e=>e.from===x.u.id&&!e.skill&&!e.ongoing);
const basic=x=>{x.u.cooldown=0;stepBattle(x.b);return hits(x);};
const withdraw=u=>Object.assign(u,{status:'withdrawn',x:-1,y:-1});
// A temporary attribute comparison removes just the new effect, never a stored
// unit, fixed kit or cast. The real battle continues with the official growth.
function without(u,key){const copy={...u,bondGrowth:{...u.bondGrowth,levels:{...u.bondGrowth.levels}}};delete copy.bondGrowth.levels[key];return copy;}

test('five new common rosters reach maximum with six actual troops while personal label and point budgets stay bounded',()=>{
 assert.equal(Object.keys(D).length,31);assert.equal(Object.values(D).filter(d=>d.grade==='basic').length,25);
 for(const [key,names]of Object.entries(teams)){
  const holders=Object.entries(A).filter(([,a])=>a[key]);assert.ok(holders.length>=20);assert.equal(holders.filter(([,a])=>a[key]===3).length,1);
  assert.ok(holders.every(([,a])=>Object.keys(a).length>=1&&Object.keys(a).length<=2&&Object.values(a).reduce((n,v)=>n+v,0)<=6));
  assert.ok(names.slice(0,5).reduce((n,name)=>n+A[id(name)][key],0)<D[key].thresholds.at(-1));
  for(const side of [0,1]){const x=scene(key,{side});assert.equal(sideBonds(x.b,side)[key].tier,3);assert.equal(bondContributors([],x.b,side,key).length,6);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
 }
});

test('attack, defense and attack speed affect actual derived attributes at each live tier on both sides',()=>{
 for(const key of ['bondPower','bondArmor','bondHaste'])for(const side of [0,1])for(const [tier,count]of [1,3,6].entries()){
  const x=scene(key,{side,count}),d=D[key],before=unitAttributes(without(x.u,key),x.b),after=unitAttributes(x.u,x.b);
  assert.equal(sideBonds(x.b,side)[key].tier,tier+1);assert.ok(Math.abs(after[d.stat]/before[d.stat]-1-d.values[tier])<1e-10);
  if(key==='bondHaste')assert.ok(Math.abs(after.attackInterval-before.attackInterval/(1+d.values[tier]))<1e-10);
  const points=sideBonds(x.b,side)[key].points;for(const v of x.us.slice(1))withdraw(v);assert.ok(sideBonds(x.b,side)[key].points<=points);
  x.u.status='reserve';assert.equal(bondAttributes(x.b,x.u)[d.stat]?.some(m=>m.label.startsWith(d.name))||false,false);
 }
});

test('Strong Attack raises real basic damage and Iron Wall reduces real received physical damage',()=>{
 for(const key of ['bondPower','bondArmor'])for(const side of [0,1]){
  const full=scene(key,{side}),lower=scene(key,{side});for(const u of lower.us.slice(1))withdraw(u);
  const act=x=>{if(key==='bondPower')return basic(x)[0].damage;x.enemy.cooldown=0;stepBattle(x.b);return x.b.effects.find(e=>e.from===x.enemy.id&&e.to===x.u.id&&!e.ongoing).damage;};
  const a=act(full),c=act(lower);assert.ok(a>0&&c>0);assert.ok(key==='bondPower'?a>c:a<c);
  assert.doesNotThrow(()=>validateSave(structuredClone(full.state)));assert.doesNotThrow(()=>validateSave(structuredClone(lower.state)));
 }
});

test('Rapid Attack increases naturally executed attacks without granting an extra action or changing tactic timers',()=>{
 const full=scene('bondHaste',{type:'cavalry'}),lower=scene('bondHaste',{type:'cavalry'});for(const u of lower.us.slice(1))withdraw(u);
 for(const x of [full,lower])x.u.cooldown=0;
 const counts=[0,0];for(let tick=0;tick<12;tick++)for(const [i,x]of [full,lower].entries()){stepBattle(x.b);counts[i]+=hits(x).filter(e=>e.damage>0).length;assert.ok(hits(x).length<=1);assert.ok(Object.values(x.u.skillReady).every(n=>n===999));}
 assert.ok(counts[0]>counts[1]);assert.equal(full.u.skillCasts,0);assert.equal(lower.u.skillCasts,0);
});

test('Spirit boosts actual attack and received-hit income at all three tiers, including either faction',()=>{
 for(const side of [0,1])for(const [tier,count]of [1,3,6].entries()){
  const x=scene('bondSpirit',{side,count,type:'spear'}),factor=1+D.bondSpirit.incomeBonus[tier],base=intentIncome(x.u);
  assert.equal(bondIntentIncomeFactor(x.b,x.u),factor);assert.equal(intentIncome(x.u,x.b).attack,base.attack*factor);
  basic(x);assert.equal(x.u.intent,Math.round(base.attack*factor));assert.equal(x.enemy.intent,intentIncome(x.enemy).hit);
  x.u.cooldown=999;x.u.intent=0;x.enemy.cooldown=0;stepBattle(x.b);assert.equal(x.u.intent,Math.round(base.hit*factor));
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('Spirit rounds after existing suppression and keeps the shared attack income to one budget',()=>{
 const x=scene('bondSpirit',{type:'spear'});Object.assign(x.es[1],{x:4,y:4});setStatus(x.b,x.u,'intentSuppression',6,{fraction:.3,sourceId:x.enemy.id,sourceName:x.enemy.name,sourceSkillName:'抑气'});
 const expected=Math.round(intentIncome(x.u,x.b).attack*.7);basic(x);assert.equal(hits(x).length,2);assert.equal(x.u.intent,expected);assert.equal(x.u.passiveState.shots,1);
 const cap=scene('bondSpirit');cap.u.intent=99;basic(cap);assert.equal(cap.u.intent,100);
});

test('actual fixed friendly rally is not amplified by Spirit',()=>{
 const run=lower=>{const x=scene('bondSpirit'),caster=x.us[1];Object.assign(caster,{x:4,y:2});if(lower)for(const u of x.us.slice(2))withdraw(u);primeTactic(caster,'rally');stepBattle(x.b);assert.equal(caster.tacticCasts.rally,1);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));return x.u.intent;};
 const full=run(false),lower=run(true);assert.ok(full>0);assert.equal(full,lower);
});

test('full Intercept prevents only the current received-hit income, including a Spirit holder, but retains enemy attack income',()=>{
 for(const side of [0,1]){
  const x=scene('bondSuppress',{side,enemyNames:teams.bondSpirit});assert.equal(sideBonds(x.b,1-side).bondSpirit.tier,3);
  const denied=Math.round(intentIncome(x.enemy,x.b).hit);basic(x);const hit=hits(x)[0];assert.ok(hit.damage>0);assert.equal(hit.intentDenied,denied);assert.equal(hit.intentBlock,'截气');assert.equal(x.enemy.intent,0);
  assert.equal(x.u.intent,intentIncome(x.u).attack);x.u.cooldown=999;x.enemy.cooldown=0;stepBattle(x.b);assert.equal(x.enemy.intent,Math.round(intentIncome(x.enemy,x.b).attack));
  assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('lower Intercept tiers can both succeed and fail with seeded, independently resolved hits',()=>{
 for(const [i,count]of [1,3].entries()){
  let blocked=0,allowed=0;
  for(let seed=1;seed<=40;seed++){const x=scene('bondSuppress',{count});x.b.seed=Math.imul(seed,134775813)>>>0;assert.equal(bondHitIntentDenialChance(x.b,x.u,x.enemy),D.bondSuppress.chance[i]);x.enemy.intent=40;basic(x);if(hits(x)[0].intentDenied){blocked++;assert.equal(x.enemy.intent,40);}else{allowed++;assert.equal(x.enemy.intent,40+intentIncome(x.enemy).hit);}}
  assert.ok(blocked&&allowed);
 }
 const contact=scene('bondSuppress',{type:'spear'});Object.assign(contact.es[1],{x:4,y:4});basic(contact);assert.equal(hits(contact).length,2);assert.ok(hits(contact).every(e=>e.intentDenied===intentIncome(contact.enemy).hit));assert.equal(contact.u.intent,intentIncome(contact.u).attack);
});

test('Intercept cannot proc from full shields, DOT, tactics, decoys, allies or sources outside the field',()=>{
 const shielded=scene('bondSuppress');setStatus(shielded.b,shielded.enemy,'shield',4,{amount:4000,source:'fixture',label:'护盾'});basic(shielded);assert.ok(shieldAmount(shielded.b,shielded.enemy)>0);assert.equal(hits(shielded)[0].intentDenied,undefined);assert.equal(shielded.enemy.intent,0);
 const fire=scene('bondSuppress');fire.enemy.intent=40;setStatus(fire.b,fire.enemy,'burn',3,{amount:5,sourceId:fire.u.id,sourceName:fire.u.name,sourceSkillName:'火攻'});stepBattle(fire.b);assert.ok(fire.enemy.hp<4000);assert.equal(fire.enemy.intent,40);assert.ok(!fire.b.effects.some(e=>e.intentDenied));
 const tactic=scene('bondSuppress');tactic.enemy.intent=40;primeTactic(tactic.u,'scatter');stepBattle(tactic.b);assert.equal(tactic.u.tacticCasts.scatter,1);assert.ok(tactic.b.effects.some(e=>e.from===tactic.u.id&&e.skill&&e.damage>0));assert.equal(tactic.enemy.intent,40+intentIncome(tactic.enemy).hit);assert.ok(!tactic.b.effects.some(e=>e.intentDenied));
 const x=scene('bondSuppress');assert.equal(bondHitIntentDenialChance(x.b,x.u,{...x.enemy,isDecoy:true}),0);assert.equal(bondHitIntentDenialChance(x.b,x.u,x.us[1]),0);withdraw(x.u);assert.equal(bondHitIntentDenialChance(x.b,x.u,x.enemy),0);
});

test('Interception records only an actually blocked amount and full Valor protects lower-intent harmful sources',()=>{
 const capped=scene('bondSuppress');capped.enemy.intent=100;basic(capped);assert.equal(capped.enemy.intent,100);assert.ok(!capped.b.effects.some(e=>e.intentDenied));
 const partial=scene('bondSuppress',{type:'spear',enemyNames:teams.bondSpirit});partial.enemy.intent=99;basic(partial);assert.equal(hits(partial)[0].intentDenied,1);assert.equal(partial.enemy.intent,99);
 const valor=scene('bondSuppress',{enemyNames:['吕布','赵云','典韦','许褚','马超']});valor.enemy.intent=90;valor.u.intent=10;assert.equal(bondHitIntentDenialChance(valor.b,valor.u,valor.enemy),0);basic(valor);assert.equal(valor.enemy.hp,4000);assert.equal(valor.enemy.intent,90);assert.ok(!valor.b.effects.some(e=>e.intentDenied));
});

test('income and denial follow live tiers and in-field qualification without sharing new bonuses with nonholders',()=>{
 for(const key of ['bondSpirit','bondSuppress']){
  const x=scene(key),rule=()=>key==='bondSpirit'?bondIntentIncomeFactor(x.b,x.u):bondHitIntentDenialChance(x.b,x.u,x.enemy);
  assert.equal(rule(),key==='bondSpirit'?2.5:1);assert.equal(bondIntentIncomeFactor(x.b,x.enemy),1);withdraw(x.us[1]);assert.equal(rule(),key==='bondSpirit'?2:.6);for(const u of x.us.slice(2))withdraw(u);assert.equal(rule(),key==='bondSpirit'?1.5:.3);
  withdraw(x.u);assert.equal(rule(),key==='bondSpirit'?1:0);
 }
});

test('current saves resume amplified incomes and denial RNG identically and reject outdated growth and invalid designs',()=>{
 for(const key of Object.keys(teams))for(const side of [0,1]){
  const x=scene(key,{side});basic(x);const resumed=validateSave(structuredClone(x.state));for(let i=0;i<12;i++){stepBattle(x.b);stepBattle(resumed.battle);}assert.deepEqual(x.b,resumed.battle);
  const old=structuredClone(x.state);old.rulesVersion--;assert.throws(()=>validateSave(old),/当前规则版本/);
  const growth=structuredClone(x.state);delete growth.battle.sides[side].units[0].bondGrowth.levels[key];assert.throws(()=>validateSave(growth),/羁绊/);
 }
 for(const [key,field,value]of [['bondSpirit','incomeBonus',[.5,1,NaN]],['bondSuppress','chance',[.3,.6,.9]],['bondPower','stat','defense']]){const bad=structuredClone(DESIGN_TABLES);bad.bonds[key][field]=value;assert.ok(validateDesignTables(bad).some(e=>/昂扬|截气|基础数值/.test(e)));}
 for(const key of Object.keys(teams))assert.match(JSON.stringify(bondReference(key)),/2 点|4 点|8 点/);
});
