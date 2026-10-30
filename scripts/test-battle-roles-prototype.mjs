// Mechanism fixtures use authored contact positions, shields and readiness.
// Gameplay experiments are separate and never inject these test conditions.
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
const root=resolve(process.argv[2]||'work/battle-roles-prototype/window-v3/runtime');
const load=p=>import(pathToFileURL(join(root,p)));
const E=await load('engine.mjs'),{generateBattle}=await load('battle-generator.mjs');
const {setStatus,shieldAmount,unitTactics}=await load('tactics.mjs');
const {shieldIntentSource}=await load('shield-spirit.mjs');
const {mechanicEntries}=await load('trait-mechanics.mjs');
const {assertDesignTables}=await load('design-catalog.mjs');
const {STRATAGEMS,stratagemProfile}=await load('stratagems.mjs');
const {stratagemAreaTargets}=await load('stratagem-area.mjs');
const {appointBattleRoles}=await load('battle-appointments.mjs');
const passed=[];function test(name,fn){fn();passed.push(name);console.log('PASS '+name);}
const entry=id=>({id,type:'spear',troops:3000,level:10,retreatAt:null});
function scene(side=0){
 const own=['person-567','person-487','jin'].map(entry),foe=['yan','wen'].map(entry);
 const state=generateBattle({seed:992314,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?foe:own,enemyTeam:side?own:foe});const b=state.battle;
 assert.equal(appointBattleRoles(b,b.sides[side].units[0].armyId,{leader:'jin',advisor:'jin'},side),null);
 E.lockDeployment(b);
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;setStatus(b,u,'root',999);u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 const [provider,second,target]=b.sides[side].units,[attacker,other]=b.sides[1-side].units;
 Object.assign(provider,{x:4,y:2});Object.assign(second,{x:3,y:3});Object.assign(target,{x:5,y:3});Object.assign(attacker,{x:6,y:3,cooldown:0});Object.assign(other,{x:11,y:7});
 setStatus(b,target,'shield',20,{amount:3000,source:'fixture',label:'机制测试护盾'});
 return {state,b,side,provider,second,target,attacker,other};
}
function hideProviders(x){Object.assign(x.provider,{x:0,y:0});Object.assign(x.second,{x:0,y:7});}
test('design tables validate with actual shieldIntent processor',()=>assertDesignTables());
for(const side of [0,1]){
 test('real two-hit cavalry tactic grants only one shield-hit income / side '+side,()=>{
  const own=['person-567','jin'].map(entry),foe=[{...entry('yan'),type:'whiteHorse'}];
  const s=generateBattle({seed:8821,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?foe:own,enemyTeam:side?own:foe}),b=s.battle;E.lockDeployment(b);
  const [provider,target]=b.sides[side].units,attacker=b.sides[1-side].units[0];
  Object.assign(provider,{x:3,y:3});Object.assign(target,{x:5,y:3});Object.assign(attacker,{x:6,y:3});
  for(const u of [provider,target,attacker]){setStatus(b,u,'root',999);u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
  assert.ok(unitTactics(attacker).some(s=>s.id==='horse-volley'));attacker.intent=55;attacker.skillReady['horse-volley']=0;
  setStatus(b,target,'shield',20,{amount:3000,source:'fixture'});E.stepBattle(b,{aiSides:[]});
  assert.equal(attacker.tacticCasts['horse-volley'],1);assert.equal(b.effects.filter(e=>e.from===attacker.id&&e.to===target.id&&e.shieldAbsorbed>0).length,2);
  assert.equal(b.effects.filter(e=>e.traitId==='shieldSpirit').length,1);assert.equal(target.hp,3000);E.validateSave(structuredClone(s));
 });
 test('unappointed intrinsic personality restores exactly normal direct-hit intent / side '+side,()=>{
  const x=scene(side),normal=scene(side),control=scene(side);delete normal.target.statuses.shield;hideProviders(normal);hideProviders(control);
  assert.ok(!x.b.sides[side].commanders.some(c=>c.id===x.provider.id||c.id===x.second.id));
  for(const t of [x,normal,control])E.stepBattle(t.b,{aiSides:[]});
  assert.ok(x.target.intent>0);assert.equal(x.target.intent,normal.target.intent);assert.equal(control.target.intent,0);
  assert.equal(x.target.hp,3000);assert.ok(normal.target.hp<3000);
  assert.equal(x.b.effects.filter(e=>e.traitId==='shieldSpirit').length,1,'two nearby holders do not stack');
  E.validateSave(structuredClone(x.state));
 });
 test('partial absorption does not add a second income / side '+side,()=>{
  const x=scene(side),normal=scene(side);setStatus(x.b,x.target,'shield',20,{amount:1,source:'fixture'});delete normal.target.statuses.shield;hideProviders(normal);
  E.stepBattle(x.b,{aiSides:[]});E.stepBattle(normal.b,{aiSides:[]});assert.equal(x.target.intent,normal.target.intent);assert.ok(x.target.hp<3000);assert.equal(x.b.effects.filter(e=>e.traitId==='shieldSpirit').length,0);
 });
 test('cap, true immunity and DOT never generate phantom intent / side '+side,()=>{
  for(const mode of ['cap','immunity','dot']){const x=scene(side);x.second.status='reserve';x.second.x=-1;x.second.y=-1;
   if(mode==='cap')x.target.intent=E.COMBAT.intentCap;
   if(mode==='immunity')setStatus(x.b,x.target,'stasis',4);
   if(mode==='dot'){x.attacker.cooldown=999;setStatus(x.b,x.target,'burn',3,{amount:50,sourceId:x.attacker.id,sourceName:x.attacker.name,sourceSkillName:'火攻'});}
   E.stepBattle(x.b,{aiSides:[]});assert.equal(x.b.effects.filter(e=>e.traitId==='shieldSpirit').length,0,mode);assert.equal(x.target.intent,mode==='cap'?E.COMBAT.intentCap:0);
  }
 });
 test('range, reserve, withdrawal, defeat and control disable the provider / side '+side,()=>{
  for(const mode of ['range','reserve','withdraw','defeat','stun','confuse','stasis','retreat']){
   const x=scene(side);Object.assign(x.second,{x:0,y:7});
   if(mode==='range')Object.assign(x.provider,{x:0,y:0});if(mode==='reserve')x.provider.status='reserve';if(mode==='withdraw')x.provider.withdrawing=true;if(mode==='defeat')x.provider.hp=0;if(['stun','confuse','stasis'].includes(mode))setStatus(x.b,x.provider,mode,4);if(mode==='retreat')x.b.sides[side].retreat=true;
   assert.equal(shieldIntentSource(x.b,x.target),null,mode);
  }
 });
 test('intrinsic personality survives a real save and deterministic continuation / side '+side,()=>{
  const x=scene(side);E.stepBattle(x.b,{aiSides:[]});assert.ok(x.b.effects.some(e=>e.traitId==='shieldSpirit'));
  const copy=E.validateSave(structuredClone(x.state));for(let i=0;i<25;i++){E.stepBattle(x.b,{aiSides:[]});E.stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(x.b,copy.battle);E.validateSave(structuredClone(x.state));
 });
 test('short command consumes real gauge, covers only chosen area and expires / side '+side,()=>{
  const x=scene(side); // Reappointment is prohibited after lock except through the actual council; author before lock instead.
  const own=['person-567','person-487','jin'].map(entry),foe=['yan','wen'].map(entry);
  const s=generateBattle({seed:332,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:side?foe:own,enemyTeam:side?own:foe});const b=s.battle;
  assert.equal(appointBattleRoles(b,b.sides[side].units[0].armyId,{leader:'person-567',advisor:'jin'},side),null);E.lockDeployment(b);
  for(const [i,u]of b.sides.flatMap(a=>a.units).entries()){u.cooldown=999;u.intent=0;setStatus(b,u,'root',999);u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));Object.assign(u,{x:side===u.side?2:11,y:i});}
  const provider=b.sides[side].units[0],target=b.sides[side].units[1],point={x:target.x,y:target.y},resource=side?b.enemyCommand:b;
  const affected=stratagemAreaTargets(b,STRATAGEMS.fortify,point,side).map(u=>u.id);resource.commandProgress=E.COMMAND_RESOURCE.capacity;
  assert.equal(E.issueCommand(b,'fortify',point,side),null);assert.equal(resource.commandProgress,0);
  const profile=stratagemProfile('fortify',{...provider,role:'leader'});
  for(const u of b.sides[side].units)assert.equal(shieldAmount(b,u),affected.includes(u.id)?Math.round(u.maxHp*profile.strength):0);
  const copy=E.validateSave(structuredClone(s));for(let i=0;i<6;i++){E.stepBattle(b,{aiSides:[]});E.stepBattle(copy.battle,{aiSides:[]});}
  assert.ok(b.sides[side].units.every(u=>shieldAmount(b,u)===0));assert.deepEqual(copy.battle,b);
 });
}
test('fixed auto loadouts retain genuine exclusive caps and reject prior version',()=>{
 const s=generateBattle({seed:123,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,ownTeam:[entry('person-99'),entry('person-246')],enemyTeam:[entry('yan'),entry('wen')]});
 for(const u of s.battle.sides[0].units){const special=unitTactics(u).find(t=>t.special);assert.ok(special);assert.equal(special.maxUses,1);assert.equal(special.intentCost,0);}
 const old=structuredClone(s);old.rulesVersion=133;assert.throws(()=>E.validateSave(old),/重新开始/);
});
const out=resolve(root,'..','mechanism-tests.json');writeFileSync(out,JSON.stringify({passed:true,count:passed.length,tests:passed,scope:'Authored mechanism fixtures, not natural playability matches.'},null,2));
console.log(JSON.stringify({passed:passed.length,out}));
