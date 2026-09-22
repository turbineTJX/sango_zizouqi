import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DESIGN_TABLES,validateDesignTables,assertDesignTables} from '../design-catalog.mjs';
const cwd=fileURLToPath(new URL('..',import.meta.url));
test('design validation rejects invalid references, unsupported effects and misspelled fields',()=>{
 assert.deepEqual(validateDesignTables(),[]);
 for(const [edit,needle] of [
  [d=>d.assignments.cao.traits.push('missing-trait'),'assignments.cao.traits'],
  [d=>d.domesticActions.exercise.stat='politics','同方向全部事务必须使用该方向唯一主属性'],
  [d=>d.traits.merchant.name='善经营','特性名称须为两个汉字'],
  [d=>d.tactics.thrust.name='突刺术','战法名称须为两个或四个汉字'],
  [d=>d.stratagems.assault.name='进攻','军略名称须为四个汉字'],
  [d=>d.tactics.thrust.effect='unimplemented','tactics.thrust.effect'],
  [d=>d.troops.spear.atack=200,'未接入字段 atack'],
  [d=>d.traits.unimplemented={name:'未实现',description:'只写文字',domain:'battle'},'新特技须先接入效果处理器'],
  [d=>d.officers.cao.aptitudes.spear=4,'officers.cao.aptitudes.spear'],
  [d=>d.cities.push({...d.cities[0]}),'重复据点ID'],
  [d=>d.cities.shift(),'道路引用不存在的据点'],
  [d=>d.assignments.dun.stratagems=['cao-wuchao'],'专属军略归属不符'],
 ]){const d=structuredClone(DESIGN_TABLES);edit(d);assert.ok(validateDesignTables(d).some(s=>s.includes(needle)),needle);assert.throws(()=>assertDesignTables(d),/设计表校验失败/);}
});
test('editing design records drives real unit creation, learning, army attributes, commands and cities',()=>{
 // Isolated module graph emulates editing data before loading the application,
 // without changing workspace files or contaminating other tests.
 const code=`
 import assert from 'node:assert/strict';
 import {TROOP_DESIGNS} from './data/design/troops.mjs';
 import {OFFICER_DESIGNS} from './data/design/officers.mjs';
 import {TRAIT_DESIGNS} from './data/design/traits.mjs';
 import {TACTIC_DESIGNS} from './data/design/tactics.mjs';
 import {STRATAGEM_DESIGNS} from './data/design/stratagems.mjs';
 import {CITY_DESIGNS,DEMO_CITY_DESIGNS} from './data/design/cities.mjs';
 import {OFFICER_ASSIGNMENTS} from './data/design/assignments.mjs';
 TROOP_DESIGNS.spear.attack=123;
 OFFICER_DESIGNS.cao.leadership=95;OFFICER_DESIGNS.cao.aptitudes.spear=3;
 OFFICER_DESIGNS.cao.formation='middle';
 TRAIT_DESIGNS.armyDiscipline.stats.discipline=.2;
 TACTIC_DESIGNS.thrust.cooldown=77;
 STRATAGEM_DESIGNS.assault.duration=33;
 CITY_DESIGNS[0].name='设计验证据点';DEMO_CITY_DESIGNS[0].name='设计验证入门';
 OFFICER_ASSIGNMENTS.cao.traits=['armyDiscipline'];
 const e=await import('./engine.mjs'),{passiveAttributes}=await import('./passives.mjs'),{troopAptitude}=await import('./tactic-learning.mjs'),{nationalWorld}=await import('./national-scenarios.mjs');
 const u=e.makeOfficer('cao');assert.equal(u.leadership,95);assert.equal(u.formation,'middle');assert.equal(troopAptitude(u,'spear'),3);
 assert.equal(e.unitAttributes(u).breakdown.attack.base,123);
 assert.equal(e.TACTICS_BOOK.thrust.cooldown,77);assert.equal(e.STRATAGEMS.assault.duration,33);
 assert.equal(nationalWorld('heroes-251').cities[0].name,'设计验证据点');
 const s=e.newGame(99);assert.equal(s.cities[0].name,'设计验证入门');
 e.orderArmy(s,'a1','guandu');e.advanceTurn(s);assert.equal(e.startBattle(s),null);e.lockDeployment(s.battle);
 const ally=s.battle.sides[0].units.find(u=>u.id==='dun');assert.ok(passiveAttributes(s.battle,ally).discipline.some(m=>m.label.includes('治军 +20%')));
 const copy=e.validateSave(JSON.parse(JSON.stringify(s)));for(let i=0;i<10;i++){e.stepBattle(s.battle);e.stepBattle(copy.battle);}assert.deepEqual(copy.battle,s.battle);
 console.log('runtime table edits verified');
 `;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd,encoding:'utf8'}),/runtime table edits verified/);
});
test('generated overview tables stay synchronized with the authoritative records',()=>{
 assert.match(execFileSync(process.execPath,['scripts/design-tables.mjs','verify'],{cwd,encoding:'utf8'}),/同步检查通过/);
});
