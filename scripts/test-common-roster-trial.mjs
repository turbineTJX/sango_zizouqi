// Authored mechanism fixtures, distinct from natural matched battles.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime=resolve(process.argv[2]||'work/common-roster-trial/combined/runtime'),load=p=>import(pathToFileURL(join(runtime,p)));
const E=await load('engine.mjs'),{generateBattle}=await load('battle-generator.mjs');
const {unitAttributes}=await load('unit-stats.mjs'),{unitTactics,setStatus,TACTICS_BOOK}=await load('tactics.mjs');
const {appointBattleRoles}=await load('battle-appointments.mjs'),{assertDesignTables}=await load('design-catalog.mjs');
const {offensiveSoldiers}=await load('offensive-soldiers.mjs');
const passed=[];function test(name,fn){fn();passed.push(name);console.log('PASS '+name);}
test('modified design data has an actual legal processor',()=>assertDesignTables());
const entry=(id,type='spear')=>({id,type,troops:3000,level:5,retreatAt:null});
function scene(side=0,caster='person-99',type='spear'){
 const own=[entry(caster,type),entry('jin')],foe=[entry('person-55','archer'),entry('person-567','halberd')];
 const state=generateBattle({seed:887726,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?foe:own,enemyTeam:side?own:foe}),b=state.battle;
 assert.equal(appointBattleRoles(b,b.sides[1-side].units[0].armyId,{leader:'person-55',advisor:'person-567'},1-side),null);assert.equal(E.lockDeployment(b),null);
 const [u,ally]=b.sides[side].units,[target,back]=b.sides[1-side].units,x=n=>side?13-n:n;
 for(const v of b.sides.flatMap(s=>s.units)){v.cooldown=999;v.intent=0;v.skillReady=Object.fromEntries(unitTactics(v).map(s=>[s.id,999]));setStatus(b,v,'root',999);}
 Object.assign(u,{x:x(4),y:3});Object.assign(ally,{x:x(1),y:6});Object.assign(target,{x:x(5),y:3});Object.assign(back,{x:x(9),y:6});return {state,b,u,ally,target,back,side};
}
function launch(p,id){const s=TACTICS_BOOK[id];assert.ok(unitTactics(p.u).some(t=>t.id===id));p.u.intent=s.threshold;p.u.skillReady[id]=0;E.stepBattle(p.b,{aiSides:[]});assert.equal(p.u.tacticCasts[id],1);return s;}
function resume(p,steps=6){const copy=E.validateSave(structuredClone(p.state));for(let i=0;i<steps;i++){E.stepBattle(p.b,{aiSides:[]});E.stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(p.state,copy);E.validateSave(structuredClone(p.state));}
for(const side of [0,1]){
 test('partial casualties preserve more attack but never create soldiers, support or supply / '+side,()=>{
  const p=scene(side),full=unitAttributes(p.u,p.b);p.u.hp=1500;p.u.battleDamage=1500;
  const before=structuredClone(p.state),partial=unitAttributes(p.u,p.b),blind=unitAttributes(p.u,p.b,{ignoreBonds:true});
  assert.ok(partial.attack>full.attack*.5&&partial.attack<full.attack);assert.equal(partial.supportPower,full.supportPower*.5);assert.equal(p.u.hp,1500);assert.equal(blind.attack,partial.attack);assert.deepEqual(p.state,before);resume(p);
 });
 test('equal initial armies and a small fresh army get no free power / '+side,()=>{
  const p=scene(side);assert.equal(offensiveSoldiers(p.u),3000);assert.equal(offensiveSoldiers({...p.u,initial:1000,hp:1000}),1000);assert.equal(offensiveSoldiers({troops:1500}),1500);assert.equal(offensiveSoldiers({...p.u,hp:0}),0);
 });
 if(TACTICS_BOOK['unique-person-99'].geometry){
  for(const [id,caster,type]of [['unique-person-99','person-99','spear'],['unique-person-246','person-246','archer']])test('actual signature winds up, saves then resolves exactly once / '+id+' / '+side,()=>{
   const p=scene(side,caster,type);const hp=p.target.hp;launch(p,id);assert.equal(p.u.tacticAim.resolveAt-p.b.tick,2);assert.equal(p.target.hp,hp);E.validateSave(structuredClone(p.state));resume(p,2);assert.ok(p.target.hp<hp);assert.equal(p.u.tacticCasts[id],1);
  });
  test('real aimed military disrupt interrupts a spent automatic action / '+side,()=>{
   const p=scene(side);launch(p,'unique-person-99');const res=side?p.b:p.b.enemyCommand;res.commandProgress=E.COMMAND_RESOURCE.capacity;
   assert.equal(E.issueCommand(p.b,'disrupt',{x:p.u.x,y:p.u.y},1-side,{ai:false}),null);assert.equal(res.commandProgress,0);const hp=p.target.hp;
   E.stepBattle(p.b,{aiSides:[]});assert.equal(p.u.tacticAim,null);assert.ok(p.b.effects.some(e=>e.from===p.u.id&&e.missed));assert.equal(p.u.tacticCasts['unique-person-99'],1);assert.equal(p.target.hp,hp);resume(p);
  });
  test('leaving an aimed area makes it miss and cannot refund the action / '+side,()=>{
   const p=scene(side);launch(p,'unique-person-99');const hp=p.target.hp;Object.assign(p.target,{x:7,y:6});resume(p,2);assert.equal(p.target.hp,hp);assert.ok(p.b.effects.some(e=>e.from===p.u.id&&e.missed));assert.equal(p.u.tacticCasts['unique-person-99'],1);
  });
 }
}
test('previous trial save versions are rejected',()=>{const p=scene();p.state.rulesVersion=9133;assert.throws(()=>E.validateSave(p.state),/重新开始/);});
if(E.COMMAND_RESOURCE.initial)test('opening preparation belongs equally to both sides and is never restored on reload or reappointment',()=>{
 const state=generateBattle({seed:99128,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:[entry('jin'),entry('person-567')],enemyTeam:[entry('yan'),entry('person-55')]}),b=state.battle;
 assert.equal(b.commandProgress,4500);assert.equal(b.enemyCommand.commandProgress,4500);
 b.commandProgress=1234;b.enemyCommand.commandProgress=2345;
 assert.equal(appointBattleRoles(b,b.sides[0].units[0].armyId,{leader:'jin',advisor:'person-567'},0),null);
 assert.equal(b.commandProgress,1234);assert.equal(E.lockDeployment(b),null);assert.equal(b.commandProgress,1234);
 const copy=E.validateSave(structuredClone(state));assert.equal(copy.battle.commandProgress,1234);assert.equal(copy.battle.enemyCommand.commandProgress,2345);
 for(let i=0;i<35;i++){E.stepBattle(b,{aiSides:[0,1]});E.stepBattle(copy.battle,{aiSides:[0,1]});}assert.deepEqual(b,copy.battle);E.validateSave(structuredClone(state));
});
writeFileSync(join(runtime,'../new-mechanisms.json'),JSON.stringify({passed:true,count:passed.length,tests:passed},null,2));
