import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG,OFFICER_BY_ID} from '../officer-catalog.mjs';
import {FAMOUS_OFFICERS} from '../famous-officers.mjs';
import {officerTraits} from '../officer-traits.mjs';
import {LEARNING_TROOPS,troopAptitude,learnedTacticIds} from '../tactic-learning.mjs';
import {SPECIAL_TACTICS,validLoadout} from '../tactics.mjs';
import {makeOfficer} from '../engine.mjs';
import {officerStratagems} from '../stratagems.mjs';

test('普通武将默认兵种采用真实最高适性，枪戟分别计算',()=>{
 for(const p of OFFICER_CATALOG.filter(p=>!FAMOUS_OFFICERS[p.id])){
  const best=Math.max(...LEARNING_TROOPS.filter(t=>!['ship'].includes(t)).map(t=>troopAptitude(p,t)));
  assert.equal(troopAptitude(p),best,p.name);
 }
 assert.equal(OFFICER_BY_ID['person-1'].type,'halberd');
 assert.equal(officerTraits({id:'person-1'}).includes('halberdDrill'),false);
});

test('兵种强化特性匹配至少A适性，普通弱将则匹配自身最高适性',()=>{
 const types={spear:['spear'],spearGeneral:['spear'],halberdDrill:['halberd'],halberdGeneral:['halberd'],rider:['cavalry'],cavalryGeneral:['cavalry'],bow:['archer'],bowGeneral:['archer'],crossbow:['crossbow'],rapid:['archer','crossbow'],siegeDrill:['siege'],shipDrill:['ship']};
 for(const p of OFFICER_CATALOG){
  const best=Math.max(...LEARNING_TROOPS.filter(t=>!['halberd','ship'].includes(t)).map(t=>troopAptitude(p,t)));
  for(const id of officerTraits(p)){
   const ts=types[id]||(id.startsWith('hero-')?FAMOUS_OFFICERS[p.id]?.ultimate?.troops:null);
   for(const type of ts||[])assert.ok(troopAptitude(p,type)>=Math.min(2,best),`${p.name}/${id}/${type}`);
  }
 }
});

test('全部专属跨九兵种携带，换兵种保留同一固定记录',()=>{
 for(const [id,special] of Object.entries(SPECIAL_TACTICS)){
  const u=makeOfficer(id,3000,0,5,71),before=structuredClone(u.tacticLearning);
  for(const type of LEARNING_TROOPS){u.type=type;u.tactics=learnedTacticIds(u);assert.ok(u.tactics.includes(special),id+'/'+type);assert.ok(validLoadout(u,u.tactics));assert.deepEqual(u.tacticLearning,before);}
 }
});

test('合资格指挥官军略配合本职，张郃按规则51不再持有军略',()=>{
 assert.deepEqual(officerStratagems('liao'),['haste','assault']);
 assert.deepEqual(officerStratagems('he'),[]);
});
