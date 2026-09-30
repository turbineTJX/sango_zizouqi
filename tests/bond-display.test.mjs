import test from 'node:test';
import assert from 'node:assert/strict';
import {bondSummary,bondsMarkup,personalBondsMarkup,battleBondsMarkup} from '../bond-display.mjs';
import {sideBonds} from '../bonds.mjs';
const unit=(id,status,points)=>({id,name:id,status,hp:2000,troops:2000,bondGrowth:{levels:{bondHorse:points}}});
test('display uses the engine in-field sums and updates after substitution',()=>{
 const a=unit('a','active',2),r=unit('r','reserve',3),d={...unit('d','active',3),isDecoy:true},b={sides:[{units:[a,r,d]},{units:[]}]};
 const before=JSON.stringify(b);
 assert.equal(bondSummary([],b)[0].points,sideBonds(b,0).bondHorse.points);
 assert.equal(bondSummary([],b)[0].next,4);
 assert.match(battleBondsMarkup(b),/距 4 点差 2/);
 assert.equal(JSON.stringify(b),before);
 a.status='withdrawn';r.status='active';
 assert.equal(bondSummary([],b)[0].points,3);
 assert.deepEqual(bondSummary([],b)[0].members,['r +3']);
 r.hp=0;assert.equal(bondSummary([],b).length,0);
});
test('draft preview excludes zero troops and decoys and is explicitly potential',()=>{
 const a=unit('a','reserve',3),b=unit('b','reserve',3),c={...unit('c','active',3),hp:0};
 assert.equal(bondSummary([a,b,c])[0].points,6);
 assert.match(bondsMarkup([a,b,c]),/羁绊潜力/);
 assert.match(bondsMarkup([a,b,c]),/实际效果以战场在场部队为准/);
 assert.match(personalBondsMarkup({id:'unknown',level:1}),/军阵 0 \/ 1/);
});
