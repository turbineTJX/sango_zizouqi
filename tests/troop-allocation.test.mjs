import test from 'node:test';
import assert from 'node:assert/strict';
import {troopAllocationLimit,allocateUnitTroops} from '../troop-allocation.mjs';
import {makeOfficer} from '../engine.mjs';
test('troop slider budget reserves other drafts and rejects shortages without mutation',()=>{
 const u=makeOfficer('cao',1000,0,5),v=makeOfficer('liao',1000,1,5),c={units:[u,v],manpower:3000,domestic:{reserved:500},barracks:10,drafted:0,grain:20000},s={gold:10000};
 assert.equal(troopAllocationLimit(s,c,u,{},c.units),3500);
 assert.equal(troopAllocationLimit(s,c,u,{liao:2000},c.units),2500);
 const before=JSON.stringify([s,c]);assert.ok(allocateUnitTroops(s,c,['cao','liao'],{cao:3000,liao:2000}));assert.equal(JSON.stringify([s,c]),before);
 assert.ok(allocateUnitTroops(s,c,['cao'],{cao:999}));
 assert.equal(allocateUnitTroops(s,c,['cao','liao'],{cao:2500,liao:2000}),null);assert.equal(c.manpower,500);assert.equal(c.grain,17500);assert.equal(s.gold,9125);
 assert.equal(allocateUnitTroops(s,c,['cao'],{cao:1000}),null);assert.equal(c.manpower,2000);
});
