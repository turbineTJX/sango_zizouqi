import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import {equipmentTypes,combatType} from '../troop-equipment.mjs';
import {tacticPools} from '../tactic-learning.mjs';
import {TACTICS_BOOK,setStatus} from '../tactics.mjs';
import {stepBattle,syncCombatForm} from '../engine.mjs';
import {hexDistance} from '../hex-grid.mjs';
for(const type of [...equipmentTypes('siege'),...equipmentTypes('ship')])for(const id of [...tacticPools(type).low,...tacticPools(type).high])for(const side of [0,1])test(`${type}/${id}: carried form really resolves on side ${side} and resumes`,()=>{
 const x=currentBattle(id,type,{side,requireS:true,enemyTypes:id==='cutRange'?['archer','archer']:null}),s=TACTICS_BOOK[id];
 x.ally.hp=600;x.ally.battleDamage=2400;x.ally.intent=0;x.u.cooldown=999;
 if(type==='ram'||type==='heavyRam'){Object.assign(x.target,{x:x.u.x,y:3});Object.assign(x.rear,{x:side?0:13,y:0});}
 if(id==='navalRam'){Object.assign(x.u,{x:2,y:3});Object.assign(x.ally,{x:1,y:3});Object.assign(x.target,{x:4,y:3});Object.assign(x.rear,{x:9,y:4});syncCombatForm(x.b,x.u);}
 for(const v of [x.target,x.rear,x.ally])syncCombatForm(x.b,v);
 for(const v of [x.target,x.rear])if(id!=='navalRam')setStatus(x.b,v,'root',20);
 assert.equal(combatType(x.u),type);readyCurrent(x,id);stepBattle(x.b);
 assert.equal(x.u.tacticCasts[id],1);assert.ok(x.b.effects.some(e=>e.from===x.u.id&&e.label===s.name));
 assert.ok(hexDistance(x.u,x.target)>=0);resumeCurrent(x);
});
