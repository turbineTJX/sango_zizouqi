import test from 'node:test';import assert from 'node:assert/strict';import{createScenario}from'../scenarios.mjs';import{lockDeployment,stepBattle,validateSave}from'../engine.mjs';import{grantBondEntries}from'../bonds.mjs';import{OFFICER_DESIGNS as O}from'../data/design/officers.mjs';import{equipmentEligible}from'../bond-equipment.mjs';
const id=name=>Object.values(O).find(o=>o.name===name).id;const team=rows=>rows.map(([name,type='spear'])=>({id:id(name),type,troops:4000,level:10}));
const scene=(own,enemy=[['曹仁'],['张飞'],['曹操']])=>createScenario('custom-battle',8484,20,null,{seed:8484,terrain:'land',ownTeam:team(own),enemyTeam:team(enemy)});
test('first entry distinguishes troop, holder and combined eligibility without extra tactic slots or uses',()=>{
 const s=scene([['黄忠','archer'],['太史慈','spear'],['刘备','crossbow'],['诸葛亮','archer'],['庞统','halberd'],['乐进','spear']]),b=s.battle,units=b.sides[0].units,find=n=>units.find(u=>u.id===id(n)),before=units.map(u=>structuredClone({tactics:u.tactics,casts:u.tacticCasts}));assert.ok(units.every(u=>!u.statuses.attackOrb));lockDeployment(b);
 assert.equal(find('黄忠').statuses.attackOrb.skillId,'fire');assert.equal(find('刘备').statuses.attackOrb.skillId,'fire');assert.equal(find('太史慈').statuses.attackOrb,undefined);assert.equal(find('诸葛亮').statuses.attackOrb.skillId,'curse');assert.equal(find('庞统').statuses.attackOrb.skillId,'curse');assert.equal(find('乐进').statuses.heavyAttack.charges,1);assert.deepEqual(units.map(u=>({tactics:u.tactics,casts:u.tacticCasts})),before);
 const snapshot=structuredClone(units.map(u=>u.bondEquipment));delete find('刘备').statuses.attackOrb;grantBondEntries(b);assert.equal(find('刘备').statuses.attackOrb,undefined);assert.deepEqual(units.map(u=>u.bondEquipment),snapshot);
 const restored=validateSave(structuredClone(s));assert.deepEqual(restored,s);for(const key of ['attackOrb','heavyAttack']){const bad=structuredClone(s),u=bad.battle.sides[0].units.find(u=>u.statuses[key]);u.statuses[key].charges=4;assert.throws(()=>validateSave(bad));}
});
test('vanguard strength follows field tier while heavy attacks also require an eligible troop',()=>{
 const s=scene([['乐进','spear'],['甘宁','halberd'],['曲义','crossbow']]);lockDeployment(s.battle);const us=s.battle.sides[0].units;assert.equal(us[0].statuses.heavyAttack.charges,3);assert.equal(us[1].statuses.heavyAttack.charges,3);assert.equal(us[2].statuses.heavyAttack,undefined);assert.equal(us[2].bondEntry.power,.4);assert.equal(equipmentEligible(us[2],'bondVanguard'),false);
});
test('real battles on both sides consume entry equipment and resume with identical control and charge records',()=>{
 for(const side of [0,1]){const armed=[['乐进','spear'],['甘宁','halberd'],['曲义','crossbow'],['诸葛亮','spear'],['黄忠','archer']],enemy=[['曹仁'],['张飞'],['曹操'],['关羽'],['吕布']];const s=scene(side?enemy:armed,side?armed:enemy),b=s.battle;lockDeployment(b);const copy=validateSave(structuredClone(s));let heavy=false,orb=false;
 for(let i=0;i<160&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);orb ||= b.effects.some(e=>e.attackOrb&&b.sides[side].units.some(u=>u.id===e.from));heavy ||= b.sides[side].units.filter(u=>[id('乐进'),id('甘宁')].includes(u.id)).some(u=>(u.statuses.heavyAttack?.charges||0)<3);}
 assert.ok(heavy);assert.ok(orb);assert.deepEqual(s,copy);assert.doesNotThrow(()=>validateSave(structuredClone(s)));
 }
});
import {setStatus}from'../tactics.mjs';
test('heavy attack uses one budget across contacts, increases physical damage and respects control protection',()=>{
 const make=()=>{const s=scene([['乐进','spear'],['甘宁','halberd'],['曲义','crossbow']],[['曹仁'],['张飞']]),b=s.battle;lockDeployment(b);for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));u.intent=0;u.retreatAt=null;}const u=b.sides[0].units[0],t=b.sides[1].units[0];Object.assign(u,{x:4,y:3,cooldown:0});Object.assign(t,{x:5,y:3});Object.assign(b.sides[1].units[1],{x:4,y:4});return{s,b,u,t};};
 const x=make(),y=structuredClone(x.s);delete y.battle.sides[0].units[0].statuses.heavyAttack;setStatus(x.b,x.t,'resolve',4);setStatus(y.battle,y.battle.sides[1].units[0],'resolve',4);stepBattle(x.b);stepBattle(y.battle);const hits=b=>b.effects.filter(e=>e.from===x.u.id&&!e.skill&&!e.ongoing&&e.damage>0);assert.ok(hits(x.b).length);assert.equal(x.u.statuses.heavyAttack.charges,2);assert.equal(x.t.statuses.confuse,undefined);const total=b=>hits(b).reduce((n,e)=>n+e.damage,0);assert.ok(Math.abs(total(x.b)/total(y.battle)-1.5)<.05);
 const z=make();setStatus(z.b,z.t,'shield',5,{amount:2000,source:'test',label:'测试护盾'});stepBattle(z.b);assert.equal(z.u.statuses.heavyAttack.charges,2);assert.ok(z.t.statuses.confuse);assert.ok(z.t.statuses.resolve);
});
