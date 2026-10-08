import {remedy} from '../battle-status-rules.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE,validateSave,unitAttributes} from '../engine.mjs';
import {setStatus,hasStatus,NEGATIVE_STATUSES,readyTactic} from '../tactics.mjs';
import {STRATAGEMS,selectStratagemSource} from '../stratagems.mjs';
import {chooseStratagemPoint,stratagemAreaTargets,zoneStatusChoices} from '../stratagem-area.mjs';
import {areaPreview} from '../stratagem-area-view.mjs';
import {interceptorsAt,meleeTargetPool} from '../engagement.mjs';
import {commandProtectionDuration,commandBlocksDamage} from '../command-protection.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

function charged(seed=7311,early=false){
 const entry=id=>({id,type:'spear',level:10,troops:5000});
 // The immunity probe needs incoming spells: omit Guo Jia's group suppression
 // from that fixture so it does not prevent the event under test from occurring.
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:['cao',early?'jin':'person-366','yu',early?'person-290':'jin','liao','dun','chu'].map(entry),enemyTeam:['shao','wen','yan','tian','gao','person-246',early?'person-226':'person-290'].map(id=>({...entry(id),type:['wen','yan'].includes(id)?'cavalry':'spear'})),ownTeamRoles:{leader:'cao',advisor:early?'person-290':'person-366'}});
 for(const u of state.battle.sides.flatMap(s=>s.units))u.retreatAt=null;
 lockDeployment(state.battle);
 while(!state.battle.result&&state.battle.commandProgress<COMMAND_RESOURCE.capacity)stepBattle(state.battle);
 assert.equal(state.battle.result,null);assert.equal(state.battle.commandProgress,COMMAND_RESOURCE.capacity);
 return state;
}
test('号令如山由真实充能施放，逐队军纪决定时长，仅覆盖在场部队',()=>{
 const state=charged(),b=state.battle,active=b.sides[0].units.filter(u=>u.status==='active');
 const power=selectStratagemSource(b.sides[0].commanders,'cao-wuchao').power;
 const durations=new Map(active.map(u=>[u.id,commandProtectionDuration(unitAttributes(u,b).discipline,power)]));
 assert.equal(issueCommand(b,'cao-wuchao'),null);assert.equal(b.commandProgress,0);
 for(const u of active){assert.equal(u.statuses.magicImmune.until,b.tick+durations.get(u.id)+1);assert.ok(!NEGATIVE_STATUSES.some(k=>k!=='hunger'&&hasStatus(b,u,k)));}
 assert.ok(b.sides[0].units.filter(u=>u.status==='reserve').every(u=>!u.statuses.magicImmune));
 assert.equal(b.sides[1].disruptUntil,undefined);assert.equal(chooseEnemyCommand(b,['cao-wuchao'],STRATAGEMS,0),null);
 const copy=validateSave(structuredClone(state));for(let n=0;n<Math.max(...durations.values())+1;n++){stepBattle(b);stepBattle(copy.battle);assert.deepEqual(b,copy.battle);}
 assert.ok(active.every(u=>!hasStatus(b,u,'magicImmune')));
});
test('魔免阻止全部异常与八阵；只让物理普攻伤害通过，到期恢复',()=>{
 const b=charged().battle;assert.equal(issueCommand(b,'cao-wuchao'),null);const u=b.sides[0].units[0];
 for(const key of NEGATIVE_STATUSES.filter(k=>k!=='hunger')){assert.equal(setStatus(b,u,key,3,{sourceId:b.sides[1].units[0].id,amount:20}),false,key);assert.equal(hasStatus(b,u,key),false);}
 assert.deepEqual(zoneStatusChoices(b,STRATAGEMS['zhuge-eight'],u),[]);
 for(const spec of [{skill:true},{intellectual:true},{secondary:true},{skill:true,intellectual:true}])assert.ok(commandBlocksDamage(b,u,spec));
 assert.equal(commandBlocksDamage(b,u,{}),false);
 b.tick=u.statuses.magicImmune.until;assert.equal(commandBlocksDamage(b,u,{skill:true}),false);assert.notEqual(setStatus(b,u,'slow',3),false);assert.ok(hasStatus(b,u,'slow'));
 assert.deepEqual([0,50,100,150,300].map(n=>commandProtectionDuration(n)),[4,6,8,10,12]);
});
test('真实交战中魔免部队仍遭普攻，战法与持续伤害不扣兵，确定性续战一致',()=>{
 let basic=0,blocked=0;
 for(const seed of [7311,7313,7317]){
  const state=charged(seed,true),b=state.battle;
  // Lower intent income changes spell timing. Use a naturally earned incoming
  // thrust window so this tests protection, not the old charging schedule.
  while(!b.result&&!b.sides[1].units.some(u=>u.status==='active'&&readyTactic(b,u,unitAttributes(u,b).range)?.skill.effect==='thrust'))stepBattle(b);
  assert.equal(b.result,null);assert.equal(issueCommand(b,'cao-wuchao'),null);const copy=validateSave(structuredClone(state));
  for(let n=0;n<6&&!b.result;n++){
   stepBattle(b);stepBattle(copy.battle);assert.deepEqual(b,copy.battle);
   for(const e of b.effects){const u=b.sides[0].units.find(u=>u.id===e.to);if(!u||!hasStatus(b,u,'magicImmune')||e.side!==1)continue;
    if(e.text==='魔免')blocked++;
    if(e.damage>0){assert.equal(e.skill,false);assert.equal(e.damageKind,'force');basic++;}
   }
  }
 }
 assert.ok(basic>0);assert.ok(blocked>0);
});
test('疾风迅雷覆盖范围友军，空范围不消费，预览高亮与AI一致',()=>{
 const state=charged(),b=state.battle,s=STRATAGEMS['swift'],point=chooseStratagemPoint(b,s,0),target=stratagemAreaTargets(b,s,point,0)[0];
 remedy(b,target,'breakFormation');delete target.statuses.root;const before=unitAttributes(target,b);assert.ok(issueCommand(b,'swift',{x:0,y:0}));assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
 assert.ok(areaPreview(b,s,{point}).targetIds.includes(target.id));assert.equal(issueCommand(b,'swift',point),null);
 assert.ok(b.sides[0].units.filter(u=>hasStatus(b,u,'rapidAdvance')).length>=1);assert.equal(target.statuses.rapidAdvance.until,b.tick+b.lastCommand.source.duration+1);
 assert.equal(b.sides[0].hasteUntil,undefined);const after=unitAttributes(target,b);assert.equal(after.move,before.move+1);assert.equal(after.attackInterval,before.attackInterval*.75);
 assert.notDeepEqual(chooseStratagemPoint(b,s,0),point);
 const copy=validateSave(structuredClone(state));for(let n=0;n<26&&!b.result;n++){stepBattle(b);stepBattle(copy.battle);assert.deepEqual(b,copy.battle);}
});
test('神速无视ZOC但保留目标合法性；攻速及移速同类取高不叠加',()=>{
 const b=charged().battle,u=b.sides[0].units.find(u=>u.status==='active'),enemy=b.sides[1].units.find(u=>u.status==='active');
 Object.assign(u,{x:5,y:3});Object.assign(enemy,{x:6,y:3});enemy.statuses={};enemy.withdrawing=false;enemy.disengage=null;
 assert.ok(interceptorsAt(b,u).length);remedy(b,u,'breakFormation');delete u.statuses.root;const stats=unitAttributes(u,b);setStatus(b,u,'rapidAdvance',24);
 assert.deepEqual(interceptorsAt(b,u),[]);assert.deepEqual(meleeTargetPool(b,u,[enemy]),[enemy]);
 setStatus(b,u,'haste',4);setStatus(b,u,'attackHaste',4,{fraction:.2});const buff=unitAttributes(u,b);assert.equal(buff.move,stats.move+1);assert.equal(buff.attackInterval,stats.attackInterval*.75);
});
test('敌方自然充能使用同一魔免及范围神速规则，固定优先序不变成收益评分',()=>{
 const entry=id=>({id,type:'spear',level:10,troops:5000});
 for(const [leader,key,status] of [['cao','cao-wuchao','magicImmune'],['person-366','swift','rapidAdvance']]){
  const state=createScenario('custom-battle',7331,20,null,{seed:7331,terrain:'land',ownTeam:['shao','wen','yan'].map(entry),enemyTeam:[leader,'yu','liao'].map(entry),enemyTeamRoles:{leader,advisor:leader}}),b=state.battle;
  for(const u of b.sides.flatMap(s=>s.units))u.retreatAt=null;lockDeployment(b);
  while(!b.result&&!b.enemyCommand.lastCommand)stepBattle(b);
  assert.equal(b.enemyCommand.lastCommand?.key,key);assert.equal(b.enemyCommand.commandProgress,0);
  const affected=b.sides[1].units.filter(u=>hasStatus(b,u,status));assert.equal(affected.length,status==='rapidAdvance'?stratagemAreaTargets(b,STRATAGEMS.swift,b.enemyCommand.lastCommand.target,1).length:b.sides[1].units.filter(u=>u.status==='active').length);
  assert.ok(b.sides[0].units.every(u=>!hasStatus(b,u,status)));validateSave(state);
 }
});
