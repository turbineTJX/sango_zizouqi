import test from 'node:test';
import assert from 'node:assert/strict';
import {bondSummary,bondsMarkup,personalBondsMarkup,battleBondsMarkup,openingBondUnits,bondDetail,bondContributors} from '../bond-display.mjs';
import {sideBonds} from '../bonds.mjs';
const unit=(id,status,points)=>({id,name:id,status,hp:2000,troops:2000,bondGrowth:{levels:{bondGuard:points}}});
test('display uses the engine in-field sums and updates after substitution',()=>{
 const a=unit('a','active',2),r=unit('r','reserve',3),d={...unit('d','active',3),isDecoy:true},b={sides:[{units:[a,r,d]},{units:[]}]};
 const before=JSON.stringify(b);
 assert.equal(bondSummary([],b)[0].points,sideBonds(b,0).bondGuard.points);
 assert.equal(bondSummary([],b)[0].next,3);
 assert.match(battleBondsMarkup(b,0),/军阵/);assert.match(battleBondsMarkup(b,0),/2\/3/);
 assert.doesNotMatch(battleBondsMarkup(b,0),/敌军羁绊/);
 assert.equal(bondDetail(bondSummary([],b)[0]).groups[0].rows.length,3);
 assert.equal(JSON.stringify(b),before);
 a.status='withdrawn';r.status='active';
 assert.equal(bondSummary([],b)[0].points,3);
 assert.deepEqual(bondSummary([],b)[0].members,['r +3']);
 r.hp=0;assert.equal(bondSummary([],b).length,0);
});
test('draft preview excludes zero troops and decoys and shows opening levels',()=>{
 const a=unit('a','reserve',3),b=unit('b','reserve',3),c={...unit('c','active',3),hp:0};
 assert.equal(bondSummary([a,b,c])[0].points,6);
 assert.match(bondsMarkup([a,b,c]),/首发羁绊/);
 assert.doesNotMatch(bondsMarkup([a,b,c]),/bond-effect|bond-tooltip|bond-thresholds/);
 assert.match(personalBondsMarkup({id:'unknown',level:1}),/军阵0/);
});

test('opening preview follows first flags and shared commander capacity; reserves cannot inflate tier',()=>{
 const units=Array.from({length:10},(_,i)=>({...unit('u'+i,'reserve',1),first:i>=4}));
 assert.deepEqual(openingBondUnits(units).map(u=>u.id),units.slice(4).map(u=>u.id));
 assert.equal(openingBondUnits(units,{leader:'cao'}).length,7);
 const html=bondsMarkup(units);
 assert.match(html,/6\/12/);assert.doesNotMatch(html,/bond-tooltip|bond-members|bond-thresholds/);
 const detail=bondDetail(bondSummary(openingBondUnits(units))[0]);
 assert.ok(detail.groups[0].rows.some(r=>r[0]==='6 点 · 当前'));
 assert.ok(detail.groups[0].rows.some(r=>r[0]==='12 点'));
 assert.match(html,/军阵/);assert.match(JSON.stringify(detail),/阵位/);
 assert.doesNotMatch(JSON.stringify(detail),/定位|稀缺性|组阵取舍|贡献部队|当前状态|完整效果|成长/);
 assert.match(bondsMarkup(units,{army:{leader:'cao'}}),/7\/12/);
 assert.match(bondsMarkup(units.map(u=>({...u,bondGrowth:{levels:{bondGuard:2}}}))),/12\/12/);
 assert.match(bondsMarkup([unit('only','active',1)]),/1\/3/);
 assert.doesNotMatch(personalBondsMarkup({id:'unknown',level:1}),/当前 \/ 上限|军阵0 \//);
});
test('contributor portraits use the same actual holders and points as the battle summary, including inactive tiers',()=>{
 const a=unit('a','active',2),r=unit('r','reserve',3),dead={...unit('dead','active',2),hp:0},decoy={...unit('decoy','active',3),isDecoy:true},gone=unit('gone','withdrawn',2),b={tick:1,sides:[{units:[a,r,dead,decoy,gone]},{units:[]}]};
 const before=JSON.stringify(b);assert.deepEqual(bondContributors([],b,0,'bondGuard'),[{id:'a',name:'a',points:2}]);assert.equal(bondSummary([],b)[0].tier,0);assert.match(battleBondsMarkup(b,0),/data-bond-contributors/);assert.equal(JSON.stringify(b),before);
 a.status='withdrawn';r.status='active';assert.deepEqual(bondContributors([],b,0,'bondGuard'),[{id:'r',name:'r',points:3}]);assert.equal(bondContributors([],b,0,'bondValor').length,0);
});
test('opening portraits exclude the bench and unreached reinforcements, while hidden enemies use unknown portraits',()=>{
 const units=Array.from({length:9},(_,i)=>({...unit('u'+i,'reserve',1),first:i<6}));units[8].arrivalTick=10;
 assert.deepEqual(bondContributors(openingBondUnits(units),null,0,'bondGuard').map(u=>u.id),units.slice(0,6).map(u=>u.id));
 const secret={...unit('secret','active',2),name:'吕布',side:1,statuses:{stealth:{until:9}}},b={tick:1,sides:[{units:[]},{units:[secret]}]};assert.deepEqual(bondContributors([],b,1,'bondGuard'),[{id:null,name:'未侦察部队',points:2}]);assert.doesNotMatch(battleBondsMarkup(b,1),/吕布|secret/);delete secret.statuses.stealth;assert.equal(bondContributors([],b,1,'bondGuard')[0].id,'secret');
});
