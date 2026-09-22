import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,newGame,validateSave,configureUnitTactics,lockDeployment,stepBattle,settleBattle} from '../engine.mjs';
import {gainMerit,meritNeeded} from '../progression.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {LEARNING_TROOPS,tacticPools,troopAptitude,tacticLearningLimits,learnedTacticIds,smallTacticCategory,createTacticLearning,validTacticLearning} from '../tactic-learning.mjs';
import {SPECIAL_TACTICS,TACTICS_BOOK,unitTactics,validLoadout} from '../tactics.mjs';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {newCampaign,validateCampaign,serializeCampaign,changeCityTroop} from '../strategic-campaign.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';

test('每兵种固定武技小战法、谋略小战法和大战法各一项',()=>{
 for(const type of LEARNING_TROOPS){const p=tacticPools(type);assert.equal(p.low.length,2,type);assert.equal(p.high.length,1,type);assert.deepEqual(p.low.map(id=>TACTICS_BOOK[id].category).sort(),['force','intellect']);assert.equal(new Set([...p.low,...p.high]).size,3);}
});
test('832名武将全部兵种和等级遵守S三项、A两项、B/C一项，种子不影响配置',()=>{
 for(const source of OFFICER_CATALOG){
  const a=makeOfficer(source.id,1000,0,1,0),b=makeOfficer(source.id,1000,0,10,4294967295);
  assert.deepEqual(a.tacticLearning,b.tacticLearning,source.name);
  for(const type of LEARNING_TROOPS){
   const p=a.tacticLearning.byTroop[type],apt=troopAptitude(source,type);
   assert.equal(p.low.length+p.high.length,[1,1,2,3][apt],source.name+'/'+type);
   assert.equal(p.high.length,apt>=2?1:0);
   if(apt<3)assert.equal(TACTICS_BOOK[p.low[0]].category,smallTacticCategory(source));
  }
 }
});
test('属性比较按智武、政统、魅力50边界选择，不受等级或随机数影响',()=>{
 for(const [stats,expected] of [
  [{force:80,intellect:79,leadership:1,politics:100,charm:100},'force'],
  [{force:79,intellect:80,leadership:100,politics:1,charm:0},'intellect'],
  [{force:80,intellect:80,leadership:71,politics:70,charm:100},'force'],
  [{force:80,intellect:80,leadership:70,politics:71,charm:0},'intellect'],
  [{force:80,intellect:80,leadership:70,politics:70,charm:49},'force'],
  [{force:80,intellect:80,leadership:70,politics:70,charm:50},'intellect'],
 ]){assert.equal(smallTacticCategory(stats),expected);const r=createTacticLearning({...stats,aptitudes:{spear:1}});assert.equal(TACTICS_BOOK[r.byTroop.spear.low[0]].category,expected);}
});
test('仅确认16人拥有专属，一级即可跨九兵种携带且不挤占普通名额',()=>{
 const expected='曹操 刘备 孙策 关羽 张飞 赵云 马超 黄忠 吕布 张辽 诸葛亮 庞统 郭嘉 司马懿 周瑜 陆逊'.split(' ').sort();
 assert.deepEqual(OFFICER_CATALOG.filter(p=>SPECIAL_TACTICS[p.id]).map(p=>p.name).sort(),expected);
 for(const source of OFFICER_CATALOG){const u=makeOfficer(source.id,1000,0,1);assert.equal(u.tacticLearning.special,!!SPECIAL_TACTICS[u.id]);for(const type of LEARNING_TROOPS){u.type=type;u.tactics=learnedTacticIds(u);assert.equal(u.tactics.length,[1,1,2,3][troopAptitude(u)]+Number(!!SPECIAL_TACTICS[u.id]));assert.ok(validLoadout(u,u.tactics));if(SPECIAL_TACTICS[u.id])assert.ok(u.tactics.includes(SPECIAL_TACTICS[u.id]));}}
});
test('固定记录校验拒绝额外战法、篡改和旧规则存档',()=>{
 const s=newGame(71),u=s.armies[0].units[0],before=structuredClone(u.tacticLearning);
 for(const type of LEARNING_TROOPS){u.type=type;u.tactics=learnedTacticIds(u);assert.ok(configureUnitTactics(s,u.id,[...u.tactics,'not-fixed']));assert.deepEqual(u.tacticLearning,before);}
 u.type='spear';u.tactics=learnedTacticIds(u);validateSave(s);
 const broken=structuredClone(s);broken.armies[0].units[0].tacticLearning.byTroop.spear.low.push('fire');assert.throws(()=>validateSave(broken),/学习|配置/);
 delete broken.armies[0].units[0].tacticLearning;assert.throws(()=>validateSave(broken),/学习|配置/);
 const old=structuredClone(s);old.rulesVersion=RULES_VERSION-1;assert.throws(()=>validateSave(old));
});
test('AI保持固定战法，真实非均分战斗和存档续战一致',()=>{
 const entry=(id,type,troops)=>({id,type,level:1,troops});
 const s=createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[entry('liao','cavalry',5000),entry('chu','spear',1000)],enemyTeam:[entry('shao','spear',3000),entry('wen','cavalry',3000)]}),b=s.battle;
 const before=structuredClone(b.sides[1].units.map(u=>({tactics:u.tactics,record:u.tacticLearning})));planEnemyArmy(b);assert.deepEqual(b.sides[1].units.map(u=>({tactics:u.tactics,record:u.tacticLearning})),before);
 lockDeployment(b);for(let i=0;i<20&&!b.result;i++)stepBattle(b);const copy=validateSave(structuredClone(s));
 while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);validateSave(s);
 assert.ok(b.sides.flatMap(s=>s.units).some(u=>Object.values(u.tacticCasts).some(n=>n>0)));
 settleBattle(s);validateSave(s);
});
test('升级不授予或更换战法，战略改编和存读档维持固定记录',()=>{
 const u=makeOfficer('jia',1000,0,1,99),before=structuredClone(u.tacticLearning),ids=[...u.tactics];
 const growth=gainMerit(u,Array.from({length:9},(_,i)=>meritNeeded(i+1)).reduce((a,b)=>a+b,0));assert.equal(u.level,10);assert.deepEqual(growth.unlocked,[]);assert.deepEqual(u.tacticLearning,before);assert.deepEqual(u.tactics,ids);
 const c=newCampaign(9),a=c.cities.find(c=>c.id==='xuchang'),o=a.units[0],record=structuredClone(o.tacticLearning);assert.equal(changeCityTroop(c,a.id,o.id,'spear'),null);assert.deepEqual(o.tacticLearning,record);validateCampaign(JSON.parse(serializeCampaign(c)));
});
test('所有预设共用固定配置生成器，没有场景专属授予或随机学习',()=>{
 for(const config of SCENARIOS){const s=createScenario(config.id,71);validateSave(s);for(const u of s.battle.sides.flatMap(s=>s.units)){assert.ok(validTacticLearning(u));assert.ok(validLoadout(u,u.tactics));}}
});


test('16名将一级专属在九兵种下通过真实自动施放、次数与冷却流程',()=>{
 for(const [id,special] of Object.entries(SPECIAL_TACTICS))for(const type of LEARNING_TROOPS){
  const entry=id=>({id,type,troops:3000,level:1});
  const state=createScenario('custom-battle',713,20,null,{seed:713,terrain:type==='ship'?'river':'land',ownTeam:[entry(id),entry('dun')],enemyTeam:[entry('wen')]});
  const b=state.battle,[u,ally]=b.sides[0].units,[enemy]=b.sides[1].units,skill=TACTICS_BOOK[special];
  // Fixed legal contact and wounded support target isolate eligibility from pathfinding.
  Object.assign(u,{x:4,y:3,intent:skill.threshold,cooldown:999});
  Object.assign(ally,{x:3,y:3,hp:1500,battleDamage:1500,healed:0,intent:0,cooldown:999});
  Object.assign(enemy,{x:5,y:3,intent:100,cooldown:999});
  for(const a of [u,ally,enemy])a.skillReady=Object.fromEntries(a.tactics.map(key=>[key,999]));
  u.skillReady[special]=0;assert.equal(lockDeployment(b),null);
  stepBattle(b);
  assert.equal(u.tacticCasts[special],1,id+'/'+type);
  assert.ok(u.skillReady[special]>b.tick,id+'/'+type+' cooldown');
 }
});
