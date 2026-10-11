import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {unitTactics,hasStatus,setStatus,TACTICS_BOOK,tacticOpening,famousIntentTargets} from '../tactics.mjs';
import {tacticUseLimit} from '../tactic-tempo.mjs';

const id=name=>OFFICER_CATALOG.find(o=>o.name===name).id;
function scene(names,side=0,seed=17){
 const entry=([name,type])=>({id:id(name),type,troops:3000,level:10,retreatAt:null});
 const own=names.map(entry),enemy=[['李典','spear'],['文聘','halberd'],['蒋济','archer']].map(entry);
 const state=createScenario('custom-battle',seed,0,null,{seed,terrain:'land',mapId:'plain-open',battleKind:'field',shieldPercent:0,ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;assert.equal(lockDeployment(b),null);
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
 b.sides[side].units.forEach((u,i)=>Object.assign(u,{x:i?3:4,y:i===2?2:3}));
 b.sides[1-side].units.forEach((u,i)=>Object.assign(u,{x:i===2?6:5,y:i===1?2:3}));
 return {state,b,own:b.sides[side].units,enemy:b.sides[1-side].units};
}
function cast(x,u){const s=unitTactics(u)[0];u.intent=s.threshold;u.skillReady[s.id]=0;stepBattle(x.b);assert.equal(u.tacticCasts[s.id],1);return s;}
function resume(x){const copy=validateSave(structuredClone(x.state));for(let i=0;i<8;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.state,copy);}

test('张飞先制造真实混乱，关羽使用已有窗口追击，双方相同并可续战',()=>{
 for(const side of [0,1]){
  let checked=false;
  for(let seed=1;seed<=30&&!checked;seed++){
   const x=scene([['张飞','spear'],['关羽','spear'],['刘备','spear']],side,seed),[zhang,guan]=x.own;
   cast(x,zhang);const target=x.enemy.find(t=>hasStatus(x.b,t,'confuse'));if(!target)continue;
   assert.ok(target.statuses.confuse.until-x.b.tick>=6);
   assert.equal(tacticOpening(x.b,TACTICS_BOOK['unique-person-99'],target).setup,true);
   Object.assign(guan,{x:target.x-1,y:target.y});Object.assign(zhang,{x:2,y:4});
   cast(x,guan);assert.ok(x.b.effects.some(e=>e.from===guan.id&&e.openingTrigger==='setup'));
   resume(x);checked=true;
  }
  assert.ok(checked,'must observe an actual successful control');
 }
});
test('司马懿同次削战意、疲弱及破甲，为张郃实际物理进攻铺垫',()=>{
 for(const side of [0,1]){
  const x=scene([['司马懿','spear'],['张郃','spear']],side),target=x.enemy[0];target.intent=80;
  cast(x,x.own[0]);assert.ok(target.intent<80);assert.ok(hasStatus(x.b,target,'weaken'));assert.ok(hasStatus(x.b,target,'armorBreak'));
  const [sima,zhang]=x.own;Object.assign(sima,{x:3,y:3});Object.assign(zhang,{x:4,y:3});zhang.cooldown=0;stepBattle(x.b);
  assert.ok(x.b.effects.some(e=>e.from===zhang.id&&e.damage>0));resume(x);
 }
});
test('孙策鼓舞所属军团两名队友，帮助周瑜达到门槛，并排除后备与自身',()=>{
 for(const side of [0,1]){
  const x=scene([['孙策','cavalry'],['周瑜','archer'],['太史慈','archer'],['程普','spear']],side),[sun,zhou,tai,far]=x.own;
  Object.assign(far,{x:0,y:0});zhou.intent=80;tai.intent=20;cast(x,sun);
  assert.equal(sun.intent,60);assert.ok(zhou.intent>=100);assert.ok(tai.intent>20);assert.equal(far.intent,0);
  const s=unitTactics(zhou)[0];zhou.skillReady[s.id]=0;stepBattle(x.b);assert.equal(zhou.tacticCasts[s.id],1);resume(x);
 }
});
test('庞统无火源即可连接存活敌军，黄忠后续命中真实传导并保存同组比例',()=>{
 for(const side of [0,1]){
  const x=scene([['庞统','halberd'],['黄忠','archer']],side),[pang,huang]=x.own;cast(x,pang);
  assert.ok(x.enemy.every(t=>hasStatus(x.b,t,'link')&&!hasStatus(x.b,t,'burn')));
  assert.equal(new Set(x.enemy.map(t=>t.statuses.link.group)).size,1);assert.ok(x.enemy.every(t=>t.statuses.link.fraction===.35));
  assert.equal(x.b.effects.filter(e=>e.text==='连环传导').length,0,'opening cast must not conduct itself');
  cast(x,huang);const transfer=x.b.effects.filter(e=>e.text==='连环传导'&&e.damage>0),direct=x.b.effects.filter(e=>e.from===huang.id&&e.damage>0&&e.text!=='连环传导');
  assert.ok(transfer.length>0&&transfer.length<=2,'a hit conducts once to at most two other members');
  assert.ok(transfer.reduce((n,e)=>n+e.damage,0)<=Math.round(direct.reduce((n,e)=>n+e.damage,0)*.35),'total conduction is bounded and nonrecursive');resume(x);
 }
});
test('孙策优先补足可用门槛，不鼓舞耗尽、后备、异军或无需战意的队友',()=>{
 const x=scene([['孙策','cavalry'],['周瑜','archer'],['太史慈','archer'],['程普','spear']]),[sun,zhou,tai,helper]=x.own,s=unitTactics(sun)[0];
 zhou.intent=80;tai.intent=20;helper.intent=0;
 for(const t of unitTactics(helper))helper.tacticCasts[t.id]=tacticUseLimit(helper,t);
 assert.deepEqual(new Set(famousIntentTargets(x.b,sun,s).map(u=>u.id)),new Set([zhou.id,tai.id]));
 for(const t of unitTactics(zhou))zhou.tacticCasts[t.id]=tacticUseLimit(zhou,t);
 tai.intent=100;assert.deepEqual(famousIntentTargets(x.b,sun,s),[]);
 helper.tacticCasts={};helper.status='reserve';assert.deepEqual(famousIntentTargets(x.b,sun,s),[]);
 helper.status='active';helper.armyId='other-arrived-army';assert.deepEqual(famousIntentTargets(x.b,sun,s),[]);
});
test('连环不覆盖已有组，单目标、死者、魔免及无敌不能加入新组，仍消费施法次数',()=>{
 for(const protection of ['existing','single','dead','magicImmune','commandInvincible']){
  const x=scene([['庞统','halberd'],['黄忠','archer']]),[a,b,c]=x.enemy;
  if(protection==='existing')setStatus(x.b,a,'link',20,{group:'original',fraction:.2});
  if(protection==='single'){Object.assign(b,{x:12,y:1});Object.assign(c,{x:12,y:6});}
  if(protection==='dead'){a.hp=1;b.hp=1;}
  if(['magicImmune','commandInvincible'].includes(protection)){setStatus(x.b,a,protection,20);setStatus(x.b,b,protection,20);}
  cast(x,x.own[0]);
  if(protection==='existing'){assert.equal(a.statuses.link.group,'original');assert.ok(b.statuses.link&&c.statuses.link);assert.notEqual(b.statuses.link.group,'original');}
  else if(protection==='dead'){assert.equal(b.hp,0);assert.equal(hasStatus(x.b,b,'link'),false);}
  else assert.ok(x.enemy.every(t=>!hasStatus(x.b,t,'link')),protection);
 }
});
test('朱然真实火攻先行后陆逊乘灼烧；火烧连营自己新增的灼烧不触发加成',()=>{
 const s=TACTICS_BOOK['unique-person-603'];assert.equal(tacticOpening({tick:0},s,{intent:0,statuses:{}}).scale,0);
 for(const side of [0,1]){
  const x=scene([['陆逊','archer'],['朱然','spear']],side),[lu,zhu]=x.own;
  Object.assign(lu,{x:3,y:3});Object.assign(zhu,{x:4,y:3});zhu.cooldown=0;stepBattle(x.b);
  const burned=x.enemy.find(t=>hasStatus(x.b,t,'burn'));assert.ok(burned,'actual Fire bond basic attack prepares the target');
  assert.equal(tacticOpening(x.b,s,burned).scale,.65);cast(x,lu);
  assert.ok(x.b.effects.some(e=>e.from===lu.id&&e.openingTrigger==='setup'));resume(x);
 }
});
