import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';
import {sideBonds} from '../bonds.mjs';
import {unitTactics,setStatus,shieldAmount} from '../tactics.mjs';
import {tacticUseLimit} from '../tactic-tempo.mjs';

const id=name=>Object.values(O).find(o=>o.name===name).id;
function scene(names,side=0){
 const team=names.map(([name,type,troops=1000])=>({id:id(name),type,troops,level:10,retreatAt:null}));
 const foe=[['文聘','spear'],['臧霸','halberd'],['袁涣','archer']].map(([name,type])=>({id:id(name),type,troops:3000,level:10,retreatAt:null}));
 const s=createScenario('custom-battle',8191,0,null,{seed:8191,terrain:'land',mapId:'plain-open',battleKind:'field',shieldPercent:0,ownTeam:side?foe:team,enemyTeam:side?team:foe}),b=s.battle;
 assert.equal(lockDeployment(b),null);
 for(const u of b.sides.flatMap(x=>x.units)){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
 b.sides[side].units.forEach((u,i)=>Object.assign(u,{x:4,y:i===0?1:i===1?3:2}));
 b.sides[1-side].units.forEach((u,i)=>Object.assign(u,{x:i===0?6:10,y:i===0?3:i+1}));
 return {s,b,us:b.sides[side].units,es:b.sides[1-side].units};
}
function resume(x){const copy=validateSave(structuredClone(x.s));for(let i=0;i<8&&!x.b.result;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.s,copy);}
const exhaust=u=>{for(const t of unitTactics(u))u.tacticCasts[t.id]=tacticUseLimit(u,t);};

test('美女与李典使用正式两种羁绊，郭淮保留克骑并实际获得护卫',()=>{
 for(const n of ['小乔','大乔','甄氏'])assert.deepEqual(A[id(n)],{bondBeauty:1,bondSong:2});
 assert.deepEqual(A[id('郭淮')],{bondEscort:1,bondAntiHorse:3});
 assert.deepEqual(A[id('李典')],{bondGuard:1,bondAntiHorse:1});
 assert.deepEqual(A[id('貂蝉')],{bondBeauty:2});
});

test('一千兵小乔真实普攻支援两格外周瑜，不要求倾国激活，双方保存续战相同',()=>{
 for(const side of [0,1]){
  const x=scene([['周瑜','archer',5000],['小乔','archer']],side),[core,support]=x.us;
  assert.deepEqual(sideBonds(x.b,side).bondBeauty,{points:1,tier:0});
  core.intent=97;support.cooldown=0;stepBattle(x.b);
  assert.equal(core.intent,100);assert.ok(x.b.effects.some(e=>e.from===support.id&&e.to===core.id&&e.label==='战歌'&&e.intentGained===3));
  assert.ok(!x.b.effects.some(e=>e.label==='倾国'));
  const t=unitTactics(core)[0];core.skillReady[t.id]=0;stepBattle(x.b);assert.equal(core.tacticCasts[t.id],1);resume(x);
 }
});

test('大乔与甄氏也以公共战歌支援合法主核，不按配偶或指定姓名结算',()=>{
 for(const side of [0,1])for(const [main,supportName,type] of [['孙策','大乔','cavalry'],['曹操','甄氏','spear'],['张辽','甄氏','cavalry']]){
  const x=scene([[main,type,5000],[supportName,'archer']],side),[core,support]=x.us;
  const threshold=unitTactics(core)[0].threshold;core.intent=threshold-3;support.cooldown=0;stepBattle(x.b);
  assert.equal(core.intent,threshold);assert.ok(x.b.effects.some(e=>e.label==='战歌'&&e.from===support.id&&e.to===core.id));resume(x);
 }
});

test('战歌优先补足尚有次数的门槛，耗尽战法者不抢走启动支援',()=>{
 for(const side of [0,1]){
  const x=scene([['周瑜','archer',5000],['小乔','archer'],['孙登','archer']],side),[core,support,idle]=x.us;
  core.intent=97;idle.intent=0;support.cooldown=0;stepBattle(x.b);assert.equal(core.intent,100);assert.equal(idle.intent,0);
  core.intent=97;idle.intent=18;exhaust(core);support.cooldown=0;stepBattle(x.b);
  assert.equal(core.intent,97);assert.equal(idle.intent,21);assert.ok(x.b.effects.some(e=>e.label==='战歌'&&e.to===idle.id));resume(x);
 }
});

test('战歌无待补门槛时仍按最低战意援助，不改变固定战法施放顺序',()=>{
 const x=scene([['周瑜','archer',5000],['小乔','archer'],['孙登','archer']]),[core,support,idle]=x.us;
 exhaust(core);exhaust(idle);core.intent=80;idle.intent=30;support.cooldown=0;stepBattle(x.b);
 assert.equal(idle.intent,33);assert.equal(core.intent,80);assert.equal(Object.values(support.tacticCasts).reduce((n,x)=>n+x,0),0);resume(x);
});

test('战歌排除三格外、后备、避战与离场友军，控制中的提供者不能支援',()=>{
 for(const condition of ['far','reserve','stasis','departed','controlled']){
  const x=scene([['周瑜','archer',5000],['小乔','archer']]),[core,support]=x.us;core.intent=97;support.cooldown=0;
  if(condition==='far')core.y=0;
  if(condition==='reserve')core.status='reserve';
  if(condition==='stasis')setStatus(x.b,core,'stasis',8);
  if(condition==='departed')core.status='departed';
  if(condition==='controlled')setStatus(x.b,support,'confuse',8);
  stepBattle(x.b);assert.equal(core.intent,97,condition);assert.ok(!x.b.effects.some(e=>e.label==='战歌'),condition);
 }
});

test('二乔共同激活倾国第一档，真实离场后降档，单队不虚增倾国点数',()=>{
 for(const side of [0,1]){
  const x=scene([['周瑜','archer',5000],['小乔','archer'],['大乔','archer']],side);
  assert.deepEqual(sideBonds(x.b,side).bondBeauty,{points:2,tier:1});assert.deepEqual(sideBonds(x.b,side).bondSong,{points:4,tier:1});
  x.us[2].status='reserve';assert.deepEqual(sideBonds(x.b,side).bondBeauty,{points:1,tier:0});assert.deepEqual(sideBonds(x.b,side).bondSong,{points:2,tier:1});
 }
});

test('郭淮护卫真实受损司马懿，护盾不救伤、不增加兵力，双方均可续战',()=>{
 for(const side of [0,1]){
  const x=scene([['司马懿','archer',5000],['郭淮','halberd']],side),[core,support]=x.us;
  Object.assign(core,{x:4,y:2,hp:2000,battleDamage:3000});stepBattle(x.b);
  assert.equal(shieldAmount(x.b,core),500);assert.equal(core.hp,2000);assert.ok(x.b.effects.some(e=>e.label==='护卫'&&e.from===support.id&&e.to===core.id));
  const ready=support.bondState.escortReady;stepBattle(x.b);assert.equal(support.bondState.escortReady,ready);resume(x);
 }
});
