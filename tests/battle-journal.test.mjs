import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {recordBattleEffects} from '../battle-journal.mjs';
import {appendBattleLog,BATTLE_LOG_LIMIT} from '../battle-log.mjs';
import {unitTactics,setStatus} from '../tactics.mjs';
function scene(){
 const entry=(id,type)=>({id,type,troops:3000,level:1,retreatAt:null});
 const s=createScenario('custom-battle',14,20,null,{seed:14,terrain:'land',ownTeam:[entry('person-668','crossbow')],enemyTeam:[entry('shao','spear')]});
 const b=s.battle;lockDeployment(b);const a=b.sides[0].units[0],d=b.sides[1].units[0];
 for(const u of [a,d]){u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(t=>[t.id,999]));setStatus(b,u,'root',999);}
 Object.assign(a,{x:4,y:3,cooldown:0});Object.assign(d,{x:6,y:3});return {s,b,a,d};
}
test('real ordinary attack and trait results enter saved journal once and retain sources',()=>{
 const {s,b,a,d}=scene(),hp=d.hp;setStatus(b,a,'despair',20);stepBattle(b);
 assert.ok(b.logs.some(l=>l.kind==='attack'&&l.text.includes(a.name+'「普攻」')&&l.text.includes(String(hp-d.hp))));
 assert.ok(b.logs.some(l=>l.kind==='trait'&&l.text.includes('济军')));
 const prior=structuredClone(b.logs);recordBattleEffects(b);assert.deepEqual(b.logs,prior);
 const copy=validateSave(structuredClone(s));assert.deepEqual(copy.battle.logs,b.logs);
 for(let i=0;i<12&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);
});
test('journal bounds are shared by routine battle messages and structured results',()=>{
 const b={tick:9,logs:[]};for(let i=0;i<400;i++)appendBattleLog(b,'记录 '+i,i%2?'attack':'event');
 assert.equal(b.logs.length,BATTLE_LOG_LIMIT);assert.equal(b.logs[0].text,'记录 399');
});
test('hidden enemy trait is not disclosed in persistent journal',()=>{
 const {b,d}=scene();setStatus(b,d,'stealth',20);b.effects=[{from:d.id,to:d.id,side:1,skill:true,abilityKind:'trait',traitEffective:true,name:d.name,label:'锦帆',damage:0}];
 const before=b.logs.length;recordBattleEffects(b);assert.equal(b.logs.length,before);
});
