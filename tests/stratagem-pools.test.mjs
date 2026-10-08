import test from 'node:test';
import assert from 'node:assert/strict';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {STRATAGEMS,STRATAGEM_POOL,officerStratagems,stratagemEligible,stratagemLimit,commanderStratagems,selectStratagemSource,stratagemProfile} from '../stratagems.mjs';
import {validateDesignTables,DESIGN_TABLES} from '../design-catalog.mjs';
import {nationalWorld,nationalRoster} from '../national-scenarios.mjs';
test('fifteen unified strategies use explicit character rosters; intellect and level never grant repertoire',()=>{
 assert.equal(STRATAGEM_POOL.length,15);
 let count=0;for(const u of OFFICER_CATALOG){const keys=officerStratagems(u.id);assert.equal(new Set(keys).size,keys.length);assert.ok(keys.length<=stratagemLimit(u.id));
  if(keys.length){count++;assert.equal(keys.length,u.id==='person-290'?2:1);}
  for(const key of keys){const s=STRATAGEMS[key];assert.ok(s.roster.includes(u.id));assert.equal(s.pool,undefined);assert.equal(s.owner,undefined);}
  for(const role of ['leader','advisor'])assert.deepEqual(commanderStratagems({...u,role,level:10,intellect:100}),keys);
 }
 assert.equal(count,49);assert.ok(OFFICER_CATALOG.some(u=>u.intellect>=90&&!stratagemEligible(u.id)));assert.ok(OFFICER_CATALOG.some(u=>u.intellect<70&&stratagemEligible(u.id)));
 for(const name of ['张飞','甘宁','王平'])assert.deepEqual(officerStratagems(OFFICER_CATALOG.find(u=>u.name===name).id),[]);
 for(const name of ['孙策','陆逊','吕蒙','钟会','张角','张宝','张梁','张鲁','阎圃','蒯良','蒯越','许攸','逢纪','张昭','张纮'])assert.ok(officerStratagems(OFFICER_CATALOG.find(u=>u.name===name).id).length,name);
 for(const id of ['person-433','chu','person-516','person-186','person-212'])assert.deepEqual(officerStratagems(id),[]);
 assert.deepEqual(officerStratagems('toString'),[]);assert.deepEqual(commanderStratagems({id:'person-290',role:'deputy'}),[]);
 for(const key of STRATAGEM_POOL)assert.deepEqual(STRATAGEMS[key].roster.slice().sort(),OFFICER_CATALOG.filter(u=>officerStratagems(u.id).includes(key)).map(u=>u.id).sort());
});
test('validator rejects expansion by attribute, wrong exclusive ownership and short cooldown',()=>{
 for(const edit of [d=>{d.assignments['person-212'].stratagems=['fortify'];},d=>{d.assignments.jia.stratagems=['cao-wuchao'];},d=>{d.stratagems.invincible.cooldown=4;}]){const d=structuredClone(DESIGN_TABLES);edit(d);assert.ok(validateDesignTables(d).length);}
});
test('strategies are spread across real factions including religious forces; recruitment preserves personal commands',()=>{
 const opening=new Map(nationalRoster('all-heroes-251',nationalWorld('all-heroes-251').cities).map(p=>[p.id,p.faction]));
 for(const key of STRATAGEM_POOL){
  const factions=new Set(STRATAGEMS[key].roster.map(id=>opening.get(id)).filter(Boolean));
  assert.ok(factions.size>=(['cao-wuchao','zhou-redcliffs'].includes(key)?1:2),STRATAGEMS[key].name+' is too concentrated in the actual opening');
 }
 assert.deepEqual(officerStratagems('person-255'),['heal']);
 assert.deepEqual(officerStratagems('person-226'),['ward']);
 for(const id of ['person-255','person-226','person-601','person-520','ju'])for(const faction of ['cao','yuan','force-2','sunce']){
  assert.deepEqual(commanderStratagems({...OFFICER_CATALOG.find(u=>u.id===id),role:'advisor',faction}),officerStratagems(id));
 }
});
test('same name chooses one eligible source and only leadership and intellect scale it',()=>{
 const weak={id:'person-637',role:'leader',leadership:50,intellect:50},strong={id:'shao',role:'advisor',leadership:90,intellect:90};
 assert.equal(selectStratagemSource([weak,strong],'fortify').id,'shao');assert.deepEqual(selectStratagemSource([strong,strong],'fortify'),selectStratagemSource([strong],'fortify'));
 const commander={...weak,leadership:95,intellect:60},adviser={...weak,leadership:60,intellect:95};
 assert.ok(stratagemProfile('fortify',commander).strength>stratagemProfile('fortify',adviser).strength);
 for(const key of ['heal','zhou-redcliffs','refresh','storm'])assert.ok(stratagemProfile(key,adviser).strength>stratagemProfile(key,commander).strength);
 assert.ok(stratagemProfile('cleanse',adviser).resolve>stratagemProfile('cleanse',commander).resolve);
 for(const key of Object.keys(STRATAGEMS)){assert.deepEqual(stratagemProfile(key,{...weak,force:1,politics:1,charm:1}),stratagemProfile(key,{...weak,force:100,politics:100,charm:100}));assert.ok(STRATAGEMS[key].cooldown>stratagemProfile(key,{...weak,leadership:100,intellect:100}).duration);}
});
