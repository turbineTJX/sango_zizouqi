import {bondLineup} from './helpers/bond-lineups.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';import {BOND_ASSIGNMENTS as A,BOND_TRIPLE_OFFICERS as triples} from '../data/design/bond-assignments.mjs';import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {bondDamage,bondProtection,bondAttributes,sideBonds} from '../bonds.mjs';import {bondOverview,bondReference,bondTierText} from '../bond-reference.mjs';
import {unitAttributes} from '../unit-stats.mjs';import {createScenario} from '../scenarios.mjs';import {lockDeployment,stepBattle,validateSave,deployUnit} from '../engine.mjs';import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
const id=n=>Object.values(O).find(o=>o.name===n).id;
const team=(names,type='spear')=>names.map(name=>({id:id(name),level:10,troops:4000,type}));
const scene=(names,side=0,type='spear')=>{names=bondLineup(({公孙瓒:'bondSwift',郝昭:'bondBulwark',黄忠:'bondVolley',夏侯惇:'bondLastStand'})[names[0]],names.filter(n=>!['黄忠','韩当'].includes(n)||names[0]==='黄忠'));const own=team(names,type),enemy=team(['曹操','刘备','关羽','张飞']);const s=createScenario('custom-battle',9181,20,null,{seed:9181,terrain:'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy});lockDeployment(s.battle);return s;};
test('rarity uses twenty-five common pools and six specified scarce rosters, with fewer than ten triple-label exceptions',()=>{
 assert.equal(Object.values(D).filter(d=>d.grade==='basic').length,25);assert.equal(Object.values(D).filter(d=>d.grade==='advanced').length,6);
 assert.ok(Object.entries(A).every(([id,a])=>Object.keys(a).length>=1&&Object.keys(a).length<=(triples.includes(id)?3:2)));
 assert.ok(Object.values(A).filter(a=>Object.keys(a).length===3).length<10);
 for(const [key,d]of Object.entries(D)){const holders=Object.entries(A).filter(([,a])=>a[key]);if(d.grade==='advanced'){assert.ok(holders.length>=3&&holders.length<=8);assert.deepEqual(holders.map(([id])=>id).sort(),[...d.roster].sort());}else assert.ok(holders.length>=20);}
 assert.equal(D.bondBeauty.grade,'advanced');assert.equal(D.bondGuard.grade,'basic');
 const bad=structuredClone(DESIGN_TABLES);const plain=id('王肃');bad.bondAssignments[plain]={bondScholar:1,bondSteady:1,bondMuster:1};assert.ok(validateDesignTables(bad).some(e=>e.includes('指定稀有武将可有三种')));
 const inflated=structuredClone(DESIGN_TABLES);inflated.bondAssignments[plain].bondWisdom=1;assert.ok(validateDesignTables(inflated).some(e=>e.includes('指定稀有武将')));
 const invalid=structuredClone(DESIGN_TABLES);invalid.bonds.bondLastStand.grade='rare';assert.ok(validateDesignTables(invalid).some(e=>e.includes('定位')));
 assert.deepEqual(bondOverview().groups.map(g=>g.rows.length),[25,6]);
 assert.match(JSON.stringify(bondReference('bondValor')),/战意严格低于自身/);assert.match(JSON.stringify(bondReference('bondValor')),/治疗、护盾和增益正常生效/);assert.match(JSON.stringify(bondReference('bondBeauty')),/削减命中目标14战意/);assert.match(JSON.stringify(bondReference('bondBeauty')),/全场在场敌军各有40%/);
});
test('simple synergies retain real limits: Swift changes move without removing root or adding range',()=>{
 const s=scene(['公孙瓒','张燕','曹彰','马岱'],0,'cavalry'),b=s.battle,u=b.sides[0].units[0],plain=unitAttributes(u);
 assert.equal(sideBonds(b,0).bondSwift.tier,3);assert.equal(unitAttributes(u,b).move,plain.move);
 for(const v of b.sides.flatMap(a=>a.units)){v.intent=0;v.cooldown=999;v.skillReady=Object.fromEntries(v.tactics.map(id=>[id,999]));}
 stepBattle(b);assert.ok(Math.abs(unitAttributes(u,b).move/plain.move-1.5)<.0001);
 assert.equal(unitAttributes(u,b).range,plain.range);u.statuses.root={until:100};assert.equal(unitAttributes(u,b).move,0);
 u.status='reserve';assert.equal(bondAttributes(b,u).move,undefined);
});
test('Bulwark mitigates physical damage but never strategy or dots, and removed holders stop counting',()=>{
 const s=scene(['郝昭','曹仁','王平','张任']),b=s.battle,u=b.sides[0].units[0];
 assert.equal(bondProtection(b,u,'force'),.84);assert.equal(bondProtection(b,u,'basic'),.84);assert.equal(bondProtection(b,u,'intellect'),1);assert.equal(bondProtection(b,u,'dot'),1);
 b.sides[0].units[3].status='reserve';assert.equal(sideBonds(b,0).bondBulwark.tier,2);assert.equal(bondProtection(b,u,'force'),.9);
});
test('Volley depends on actual hex distance and direct damage, including both sides',()=>{
 for(const side of [0,1]){const s=scene(['黄忠','太史慈','甘宁','韩当'],side),b=s.battle,u=b.sides[side].units[0],t=b.sides[1-side].units[0];
 Object.assign(u,{x:4,y:3});Object.assign(t,{x:6,y:3});assert.equal(bondDamage(b,u,t,'force'),1.2);assert.equal(bondDamage(b,u,t,'dot'),1);
 t.x=5;assert.equal(bondDamage(b,u,t,'force'),1);assert.equal(bondDamage(b,u,{...t,type:'gate',x:6},'force'),1);assert.equal(bondDamage(b,u,{...t,isDecoy:true,x:6},'force'),1);
 }
});
test('Last Stand follows live strength boundaries and cannot rescue an over-threshold lethal hit',()=>{
 const s=scene(['夏侯惇','魏延','周泰','庞德']),b=s.battle,u=b.sides[0].units[0];assert.equal(sideBonds(b,0).bondLastStand.tier,3);
 u.hp=u.maxHp*.4+1;assert.equal(bondAttributes(b,u).attack,undefined);const protection=bondProtection(b,u,'force');
 u.hp=u.maxHp*.4;assert.equal(bondAttributes(b,u).attack[0].factor,1.4);assert.equal(bondProtection(b,u,'force'),protection*.8);assert.equal(bondProtection(b,u,'dot'),1);
 u.hp++;assert.equal(bondAttributes(b,u).attack,undefined);u.hp=0;assert.equal(bondAttributes(b,u).attack,undefined);
 assert.match(bondTierText(D.bondLastStand,2),/40%/);
});
test('new synergies operate through direct engine attacks and resume deterministically on either side',()=>{
 for(const side of [0,1]){
 const s=scene(['夏侯惇','魏延','周泰','庞德','黄忠','韩当'],side,'crossbow'),b=s.battle;
 for(const u of b.sides.flatMap(a=>a.units)){u.retreatAt=null;u.cooldown=999;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
 const u=b.sides[side].units[0],t=b.sides[1-side].units[0];Object.assign(u,{x:4,y:3,cooldown:0,hp:1600,battleDamage:2400});Object.assign(t,{x:6,y:3});
 const copy=validateSave(structuredClone(s)),healthy=validateSave(structuredClone(s)),base=healthy.battle.sides[side].units[0];base.hp=1601;base.battleDamage=2399;
 stepBattle(b);stepBattle(copy.battle);stepBattle(healthy.battle);
 const hit=x=>x.effects.find(e=>e.from===u.id&&e.to===t.id&&e.damage>0)?.damage;assert.ok(hit(b)>0);assert.ok(Math.abs(hit(b)/hit(healthy.battle)-1.4)<.02,'Last Stand must raise actual damage at the boundary');
 for(let i=0;i<20&&!b.result;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(s,copy);assert.doesNotThrow(()=>validateSave(structuredClone(s)));
 }
});
test('Bulwark reduces real physical basic hits, rather than only changing preview values',()=>{
 const s=scene(['郝昭','曹仁','王平','张任']),b=s.battle;
 for(const u of b.sides.flatMap(a=>a.units)){u.cooldown=999;u.retreatAt=null;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
 const defender=b.sides[0].units[0],attacker=b.sides[1].units[0];Object.assign(defender,{x:4,y:3});Object.assign(attacker,{x:5,y:3,cooldown:0});
 const baseline=structuredClone(s);for(const u of baseline.battle.sides[0].units)delete u.bondGrowth.levels.bondBulwark; // Single-effect control only; not a saved game.
 stepBattle(b);stepBattle(baseline.battle);const hit=x=>x.effects.find(e=>e.from===attacker.id&&e.to===defender.id&&e.damage>0)?.damage;
 assert.ok(hit(b)>0);assert.ok(Math.abs(hit(b)/hit(baseline.battle)-.84)<.02);
});
