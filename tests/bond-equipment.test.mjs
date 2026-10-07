import test from 'node:test';import assert from 'node:assert/strict';import{createScenario}from'../scenarios.mjs';import{lockDeployment,stepBattle,validateSave}from'../engine.mjs';import{grantBondEntries}from'../bonds.mjs';import{OFFICER_DESIGNS as O}from'../data/design/officers.mjs';import{equipmentEligible}from'../bond-equipment.mjs';
const id=name=>Object.values(O).find(o=>o.name===name).id;const team=rows=>rows.map(([name,type='spear'])=>({id:id(name),type,troops:4000,level:10}));
const scene=(own,enemy=[['曹仁'],['张飞'],['曹操']])=>createScenario('custom-battle',8484,20,null,{seed:8484,terrain:'land',ownTeam:team(own),enemyTeam:team(enemy)});
test('wisdom holders receive one-shot curse equipment without additional tactic uses',()=>{
 const s=scene([['诸葛亮','archer'],['庞统','halberd'],['黄忠','archer'],['乐进','spear']]),b=s.battle,us=b.sides[0].units;
 const before=us.map(u=>structuredClone({tactics:u.tactics,casts:u.tacticCasts}));lockDeployment(b);
 assert.equal(us[0].statuses.attackOrb.skillId,'curse');assert.equal(us[1].statuses.attackOrb.skillId,'curse');
 assert.equal(us[2].statuses.attackOrb,undefined);assert.ok(us.every(u=>!u.statuses.heavyAttack));
 assert.deepEqual(us.map(u=>({tactics:u.tactics,casts:u.tacticCasts})),before);
 const snapshot=structuredClone(us[0].bondEquipment);delete us[0].statuses.attackOrb;grantBondEntries(b);assert.equal(us[0].statuses.attackOrb,undefined);assert.deepEqual(us[0].bondEquipment,snapshot);
 const bad=structuredClone(s);bad.battle.sides[0].units[1].statuses.attackOrb.charges=99;assert.throws(()=>validateSave(bad));
 assert.doesNotThrow(()=>validateSave(structuredClone(s)));
});
test('both sides consume wisdom equipment and resume identical combat records',()=>{
 for(const side of [0,1]){
 const armed=[['诸葛亮'],['庞统'],['郭嘉'],['黄忠','archer']],foe=[['曹仁'],['张飞'],['曹操'],['关羽']];
 const s=scene(side?foe:armed,side?armed:foe),b=s.battle;lockDeployment(b);const copy=validateSave(structuredClone(s));let orb=false;
 for(let i=0;i<160&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);orb ||= b.effects.some(e=>e.attackOrb&&b.sides[side].units.some(u=>u.id===e.from));}
 assert.ok(orb);assert.deepEqual(s,copy);assert.doesNotThrow(()=>validateSave(structuredClone(s)));
 }
});
