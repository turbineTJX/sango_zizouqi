import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {routeTo} from '../tactics.mjs';
import {defenseLine,shouldReturnToDefense,insideDefenseLine} from '../defense-line.mjs';

for(const side of [0,1])test(`防守方 ${side} 接近界外射手反击并确定性续战`,()=>{
 const defender=[{id:'person-46',type:'spear',troops:3000,level:1}];
 const attacker=[{id:'person-512',type:'archer',troops:3000,level:1}];
 const state=createScenario('custom-battle',123,20,null,{seed:123,terrain:'land',battleKind:side===0?'defense':'siege',gateHp:60000,limit:480,ownTeam:side===0?defender:attacker,enemyTeam:side===0?attacker:defender});
 const b=state.battle,d=b.sides[side].units[0],a=b.sides[1-side].units[0];
 b.sides[side].tactic='defensive';
 const place=(u,x,y)=>Object.assign(u,side===1?{x,y}:{x:13-x,y:7-y});
 place(d,9,3);place(a,7,3);lockDeployment(b);
 assert.ok(routeTo(b,d,a,112,{charging:false})?.length);
 const resumed=validateSave(structuredClone(state));let counter=false,leftLine=false;
 for(let n=0;n<30&&!b.result;n++){
  stepBattle(b);stepBattle(resumed.battle);
  leftLine ||= side===0?d.x>4:d.x<9;
  counter ||= b.effects.some(e=>e.from===d.id&&e.to===a.id&&e.damage>0);
 }
 assert.ok(leftLine,'允许离开后排接敌');assert.ok(counter,'实际造成反击伤害');
 assert.deepEqual(resumed.battle,b);
 place(a,1,0);place(d,9,3);
 assert.equal(defenseLine(b,d,a)(side===1?{x:8,y:3}:{x:5,y:4}),false,'远处敌人不触发出击');
 place(d,8,3);
 assert.equal(shouldReturnToDefense(b,d),true,'射手远离原防区后应回守');
 const copy=validateSave(structuredClone(state));
 for(let n=0;n<15&&!b.result&&!insideDefenseLine(d);n++){stepBattle(b);stepBattle(copy.battle);}
 assert.ok(insideDefenseLine(d),'实际沿合法道路返回防区');
 assert.deepEqual(copy.battle,b);
 // An exposed friendly cannot relay the guard area forward to another shooter.
 place(d,8,3);place(a,4,3);
 const exposed={...structuredClone(d),id:'exposed',x:side===1?6:7,y:side===1?3:4};
 b.sides[side].units.push(exposed);
 assert.equal(shouldReturnToDefense(b,d),true,'不保护远离原防区的友军而继续扩展追击');
 assert.equal(defenseLine(b,d,a)(side===1?{x:5,y:3}:{x:8,y:4}),false,'不能追到远方射手身旁');
});
