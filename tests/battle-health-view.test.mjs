import test from 'node:test';
import assert from 'node:assert/strict';
import {battleHealth,battleHealthText} from '../battle-health-view.mjs';

test('injury bar keeps the original scale and only converts recoverable wounds into current troops',()=>{
 const u={hp:600,maxHp:1000,initial:1000,battleDamage:400,healed:0},before=JSON.stringify(u);
 const injured=battleHealth(u);
 assert.deepEqual(injured,{current:600,wounded:140,recoverable:740,maximum:1000,currentPercent:60,recoverablePercent:74});
 assert.equal(battleHealthText(injured),'600 / 740 / 1000（当前兵 / 可恢复上限 / 原上限）');
 const healing=battleHealth({...u,hp:700,healed:100}),healed=battleHealth({...u,hp:740,healed:140});
 assert.equal(healing.recoverable,740);assert.equal(healing.wounded,40);assert.equal(healed.recoverable,740);assert.equal(healed.wounded,0);
 assert.equal(JSON.stringify(u),before,'viewing never changes casualty or healing data');
});

test('previous healing, cumulative rounding and desertion use the actual recoverable wound pool',()=>{
 assert.equal(battleHealth({hp:400,maxHp:1000,battleDamage:800,healed:200}).recoverable,480);
 assert.equal(battleHealth({hp:980,maxHp:1000,battleDamage:20}).wounded,7);
 const desertion=battleHealth({hp:600,maxHp:1000,battleDamage:400,battleDeserted:100});
 assert.equal(desertion.wounded,105);assert.equal(desertion.recoverable,705,'deserters never become recoverable wounds');
});

test('full troops and buildings have no recoverable injury segment',()=>{
 assert.equal(battleHealth({hp:1000,maxHp:1000}).recoverablePercent,100);
 assert.equal(battleHealth({hp:600,maxHp:1000,type:'gate'}).wounded,0);
 assert.equal(battleHealth({hp:600,maxHp:1000,type:'building'}).recoverable,600);
 assert.ok(Object.values(battleHealth({hp:0,maxHp:0})).every(Number.isFinite));
});
