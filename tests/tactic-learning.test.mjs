import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOfficer,newGame,validateSave,configureUnitTactics,lockDeployment,stepBattle,settleBattle} from '../engine.mjs';
import {gainExperience,experienceNeeded} from '../progression.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {LEARNING_RULES,LEARNING_TROOPS,tacticPools,troopAptitude,tacticLearningLimits,learnedTacticIds,initializeTacticLearning,validTacticLearning} from '../tactic-learning.mjs';
import {SPECIAL_TACTICS,unitTactics,validLoadout} from '../tactics.mjs';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {planEnemyArmy} from '../battle-ai.mjs';
import {newCampaign,validateCampaign,serializeCampaign,changeCampaignTroop} from '../strategic-campaign.mjs';

test('八兵种都有至少三个低级候选和一个高级候选，所有战法进入唯一池',()=>{
 for(const type of LEARNING_TROOPS){const p=tacticPools(type);assert.equal(p.low.length+p.high.length,6);assert.ok(p.low.length>=3&&p.high.length>=1);assert.equal(new Set([...p.low,...p.high]).size,6);}
});
test('S在5级两低一高，A在8级两低一高，B在8级三低，C无保底',()=>{
 assert.deepEqual(LEARNING_RULES.guaranteeLevel,[null,8,8,5]);
 for(const source of OFFICER_CATALOG)for(const type of LEARNING_TROOPS){
  const limits=tacticLearningLimits(source,type),level=limits.guarantee??10,p=makeOfficer(source.id,0,0,level,71).tacticLearning.byTroop[type];
  assert.ok(p.low.length<=limits.low&&p.high.length<=limits.high);
  if(limits.guarantee){assert.equal(p.low.length,limits.low,source.id+'/'+type);assert.equal(p.high.length,limits.high);}
 }
 // C has no forced full kit, even at level ten. B never receives a high tactic.
 let incomplete=false;
 for(let seed=0;seed<1000;seed++){
  const c=makeOfficer('cao',0,0,10,seed).tacticLearning.byTroop.ship;
  incomplete ||= c.low.length<3;assert.equal(c.high.length,0);
  const b=makeOfficer('jia',0,0,10,seed).tacticLearning.byTroop.spear;assert.equal(b.low.length,3);assert.equal(b.high.length,0);
 }
 assert.ok(incomplete);
 for(let seed=0;seed<32;seed++){
  const u=makeOfficer('liao',0,0,1,seed);
  for(let level=2;level<=10;level++){
   const old=structuredClone(u.tacticLearning);gainExperience(u,experienceNeeded(u.level));
   for(const type of LEARNING_TROOPS)for(const kind of ['low','high']){
    const learned=u.tacticLearning.byTroop[type][kind];assert.ok(learned.length<=tacticLearningLimits(u,type)[kind]);assert.equal(new Set(learned).size,learned.length);assert.ok(old.byTroop[type][kind].every(id=>learned.includes(id)));
   }
   assert.deepEqual(u.tacticLearning,makeOfficer('liao',0,0,level,seed).tacticLearning);
  }
 }
});
test('1级专属有获得和未获得结果，5级全部必得，普通将没有专属',()=>{
 const starts=Array.from({length:100},(_,seed)=>makeOfficer('liao',0,0,1,seed).tacticLearning.special);
 assert.ok(starts.some(Boolean)&&starts.some(v=>!v));
 for(const id of Object.keys(SPECIAL_TACTICS))for(let seed=0;seed<10;seed++)assert.equal(makeOfficer(id,0,0,5,seed).tacticLearning.special,true);
 for(const p of OFFICER_CATALOG.filter(p=>!SPECIAL_TACTICS[p.id]))assert.equal(makeOfficer(p.id,0,0,10,2).tacticLearning.special,false);
});

test('保底能一次补齐多个缺额，而不是只多抽一次',()=>{
 for(const [id,type,at,low,high] of [['cao','spear',5,2,1],['ju','archer',8,2,1],['jia','spear',8,3,0]]){
  let found=false;
  for(let seed=0;seed<10000&&!found;seed++){
   const before=makeOfficer(id,0,0,at-1,seed).tacticLearning.byTroop[type];
   if(before.low.length>=low-1)continue;
   const after=makeOfficer(id,0,0,at,seed).tacticLearning.byTroop[type];
   assert.equal(after.low.length,low);assert.equal(after.high.length,high);assert.ok(before.low.every(x=>after.low.includes(x)));found=true;
  }
  assert.ok(found,id+' has a real unlucky history before the guarantee');
 }
});
test('同种子身份等级结果相同，不同种子随机；换兵种不重抽，玩家只能重排',()=>{
 const s=newGame(71),u=s.armies[0].units[0];
 assert.deepEqual(u.tacticLearning,newGame(71).armies[0].units[0].tacticLearning);
 assert.notDeepEqual(u.tacticLearning,newGame(72).armies[0].units[0].tacticLearning);
 const record=structuredClone(u.tacticLearning);
 for(const type of LEARNING_TROOPS){u.type=type;u.tactics=learnedTacticIds(u);assert.equal(configureUnitTactics(s,u.id,[...u.tactics].reverse()),null);assert.ok(configureUnitTactics(s,u.id,[...u.tactics,'not-learned']));assert.deepEqual(u.tacticLearning,record);}
 u.type='spear';u.tactics=learnedTacticIds(u);validateSave(s);
 const broken=structuredClone(s);broken.armies[0].units[0].tacticLearning.byTroop.spear.low.push('fire');assert.throws(()=>validateSave(broken),/学习/);
 delete broken.armies[0].units[0].tacticLearning;assert.throws(()=>validateSave(broken),/学习/);
 const old=structuredClone(s);old.rulesVersion=39;assert.throws(()=>validateSave(old));
});
test('AI不替换所学战法，专属不挤掉三普通，四槽能自动施放并确定性续战',()=>{
 const entry=(id,type)=>({id,type,level:10,troops:3000});
 const s=createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',ownTeam:[entry('liao','cavalry'),entry('chu','spear')],enemyTeam:[entry('shao','spear'),entry('wen','cavalry')]}),b=s.battle;
 for(const side of b.sides)for(const u of side.units){assert.equal(unitTactics(u).length,SPECIAL_TACTICS[u.id]?4:3);assert.ok(validLoadout(u,u.tactics));}
 const learning=structuredClone(b.sides[1].units.map(u=>({tactics:u.tactics,learning:u.tacticLearning})));planEnemyArmy(b);assert.deepEqual(b.sides[1].units.map(u=>({tactics:u.tactics,learning:u.tacticLearning})),learning);
 lockDeployment(b);for(let i=0;i<20&&!b.result;i++)stepBattle(b);const restored=validateSave(structuredClone(s));
 while(!b.result){stepBattle(b);stepBattle(restored.battle);}assert.deepEqual(b,restored.battle);validateSave(s);
 assert.ok(b.sides.flatMap(s=>s.units).some(u=>u.tacticCasts[SPECIAL_TACTICS[u.id]]>0));
 settleBattle(s);validateSave(s);
});
test('跨多级与逐级学习一致，升级存档与战略换兵种保持记录',()=>{
 const u=makeOfficer('jia',0,0,1,99),v=structuredClone(u);gainExperience(u,4500);for(let i=1;i<10;i++)gainExperience(v,experienceNeeded(v.level));assert.deepEqual(u.tacticLearning,v.tacticLearning);assert.equal(u.tactics.length,4);
 const c=newCampaign(9),a=c.armies.find(a=>a.faction==='cao'&&a.location==='xuchang'),o=a.units[0],record=structuredClone(o.tacticLearning);assert.equal(changeCampaignTroop(c,a.id,o.id,'spear'),null);assert.deepEqual(o.tacticLearning,record);validateCampaign(JSON.parse(serializeCampaign(c)));
});
test('所有预设战役生成合法学习记录，旧人工配装不绕过学习',()=>{
 for(const config of SCENARIOS){const s=createScenario(config.id,71);validateSave(s);for(const u of s.battle.sides.flatMap(s=>s.units)){assert.ok(validTacticLearning(u));assert.ok(validLoadout(u,u.tactics));}}
});
