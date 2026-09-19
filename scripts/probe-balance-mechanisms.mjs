import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createScenario} from '../scenarios.mjs';
import {officerStratagems,battleStratagems,unitAttributes} from '../engine.mjs';
import {unit} from './custom-playability-lib.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {TROOPS} from '../unit-stats.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {powerFactor} from '../tactic-power.mjs';

const make=(ownTeam,enemyTeam)=>createScenario('custom-battle',123,20,null,{terrain:'land',seed:123,ownTeam,enemyTeam});
const enemy=[unit('person-396','cavalry',6000),unit('person-641','spear',500),unit('person-123','logistics',500)];
const shape=s=>s.battle.sides[1].units.map(u=>({id:u.id,name:u.name,troops:u.initial,type:u.type,x:u.x,y:u.y,tactics:u.tactics}));
const plans=['cavalry','archer','spear'].map(type=>({opponentType:type,plan:shape(make(['cao','dun','yuanxia'].map(id=>unit(id,type)),enemy))}));
assert.deepEqual(plans[0].plan,plans[1].plan);assert.deepEqual(plans[1].plan,plans[2].plan);
const support=plans[0].plan.find(u=>u.type==='logistics'),core=plans[0].plan.find(u=>u.type==='cavalry');
const advisor=make([unit('person-99','cavalry',6000),unit('person-512','crossbow',1500),unit('liao','cavalry',1500)],[unit('shao','spear',6000)]);
const advisorProbe={roster:advisor.armies[0].units.map(u=>({id:u.id,name:u.name,intellect:u.intellect,known:officerStratagems(u.id)})),leader:advisor.armies[0].leader,advisor:advisor.armies[0].advisor,armyCommands:battleStratagems(advisor.battle)};
assert.equal(advisorProbe.advisor,'person-512');assert.equal(advisorProbe.armyCommands.length,0);assert.ok(officerStratagems('liao').length>0);
const levelProbes=[];
for(const level of [5,10])for(const type of ['cavalry','spear']){
 const s=make([unit('person-396',type,3000,level)],[unit('shao','spear')]),u=s.battle.sides[0].units[0],a=unitAttributes(u,s.battle);
 levelProbes.push({level,type,modifiers:Object.fromEntries(Object.entries(a.breakdown).map(([k,v])=>[k,v.modifiers]))});
}
const supportFloor=[1,100,500,3000].map(troops=>({troops,power:(80+71*1.4+74*.6)*troops/3000,factor:powerFactor((80+71*1.4+74*.6)*troops/3000)}));
const dps=Object.entries(TROOPS).map(([type,t])=>({type,name:t.name,leadership:80,attack:t.attack+80*1.6,interval:t.interval,nominalDps:(t.attack+80*1.6)/t.interval,defense:t.defense+80*.65}));
const data={plans,supportCoreDistance:hexDistance(support,core),advisorProbe,levelProbes,supportFloor,dps};
const out=new URL('../docs/balance-diagnosis/',import.meta.url);mkdirSync(out,{recursive:true});writeFileSync(new URL('mechanisms.json',out),JSON.stringify(data,null,2));
console.log(JSON.stringify({samePlanForThreeEnemies:true,supportCoreDistance:data.supportCoreDistance,advisor:advisorProbe,supportFloor,dps},null,2));
