import test from 'node:test';
import assert from 'node:assert/strict';
import {STRATAGEMS,stratagemProfile} from '../stratagems.mjs';
import {issueCommand,stepBattle,COMMAND_RESOURCE,validateSave,battleStratagemSource,lockDeployment} from '../engine.mjs';
import {createScenario} from '../scenarios.mjs';
import {setStatus,hasStatus,shieldAmount,unitTactics} from '../tactics.mjs';
import {remedy} from '../battle-status-rules.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {areaPreview} from '../stratagem-area-view.mjs';
import {combinationAiTarget} from '../stratagem-combinations.mjs';
import {stratagemAiFixture,militaryResource,freezeAiProbe} from './helpers/stratagem-ai.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';

const keys=Object.keys(STRATAGEMS).filter(k=>STRATAGEMS[k].combination);
function charged(key,side=0){
 const s=stratagemAiFixture(key,side,14331),b=s.battle,r=militaryResource(b,side);
 for(let n=0;n<180&&r.commandProgress<COMMAND_RESOURCE.capacity;n++)stepBattle(b,{aiSides:[]});
 assert.equal(r.commandProgress,COMMAND_RESOURCE.capacity);assert.equal(b.result,null);return s;
}
function cast(s,key,side=0){const b=s.battle,p=chooseStratagemPoint(b,STRATAGEMS[key],side);assert.ok(p);assert.equal(issueCommand(b,key,p,side,{ai:false}),null);return b.sides[side].stratagemEvents.at(-1);}

for(const key of keys)for(const side of [0,1])test(key+' pays and applies the same bounded effects for either side, including save continuation',()=>{
 const s=charged(key,side),b=s.battle,prior=structuredClone(s),e=cast(s,key,side),p=e.source;
 for(const row of e.units){
  const u=b.sides[side].units.find(u=>u.id===row.id);
  for(const part of p.combination.benefits){
   if(part.status==='shield'){const layer=u.statuses.shield.layers.find(l=>l.sourceCommand===key);assert.ok(layer);assert.equal(layer.until,e.castTick+part.steps+1);assert.ok(layer.amount<=Math.round(u.maxHp*part.fraction));}
   else {assert.ok(hasStatus(b,u,part.status));assert.equal(u.statuses[part.status].duration,part.steps);}
  }
  assert.equal(row.intentBefore-row.intentAfter,STRATAGEMS[key].combination.intentCost||0);
 }
 const restored=validateSave(structuredClone(s)),recast=validateSave(prior);cast(recast,key,side);assert.deepEqual(recast.battle,b);
 for(let n=0;n<6;n++){stepBattle(b,{aiSides:[]});stepBattle(restored.battle,{aiSides:[]});assert.deepEqual(restored.battle,b);}
});

test('every component duration, including shield, resolve and penalties, follows the actual caster snapshot',()=>{
 for(const key of keys){const d=STRATAGEMS[key],id=d.roster[0],base=d.combination;
  for(const n of [0,60,80,100,120]){const p=stratagemProfile(key,{id,leadership:n,intellect:n}),parts=[...p.combination.benefits,...p.combination.penalties],original=[...base.benefits,...base.penalties];
   parts.forEach((e,i)=>assert.equal(e.steps,Math.max(1,Math.min(d.cooldown-1,Math.round(original[i].steps*p.power)))));
   assert.ok(parts.every(e=>e.steps<d.cooldown));
  }
 }
});

test('magic immunity blocks the penalty without removing the offensive gain, and expiry does not add it later',()=>{
 const s=charged('all-out'),b=s.battle,u=b.sides[0].units.find(u=>u.status==='active');setStatus(b,u,'magicImmune',1);
 assert.equal(issueCommand(b,'all-out',{x:u.x,y:u.y}),null);assert.ok(hasStatus(b,u,'valor'));assert.ok(!hasStatus(b,u,'armorBreak'));
 stepBattle(b,{aiSides:[]});stepBattle(b,{aiSides:[]});assert.ok(!hasStatus(b,u,'magicImmune'));assert.ok(!hasStatus(b,u,'armorBreak'));validateSave(s);
});

test('rally removes broken armor while keeping the gain; resolve does not block armor break',()=>{
 const s=charged('all-out'),b=s.battle,u=b.sides[0].units[0];setStatus(b,u,'resolve',30);const before=unitAttributes(u,b);assert.equal(issueCommand(b,'all-out',{x:u.x,y:u.y}),null);
 assert.ok(unitAttributes(u,b).attack>before.attack);assert.ok(unitAttributes(u,b).defense<before.defense);assert.ok(hasStatus(b,u,'armorBreak'));
 remedy(b,u,'rally');assert.ok(!hasStatus(b,u,'armorBreak'));assert.ok(hasStatus(b,u,'valor'));validateSave(s);
});

test('resolve blocks the friendly seal while attack speed and attack still increase',()=>{
 const s=charged('seize-opening'),b=s.battle,u=b.sides[0].units[0];setStatus(b,u,'resolve',30);const before=unitAttributes(u,b);assert.equal(issueCommand(b,'seize-opening',{x:u.x,y:u.y}),null);
 assert.ok(!hasStatus(b,u,'seal'));assert.ok(unitAttributes(u,b).attack>before.attack);assert.ok(unitAttributes(u,b).attackInterval<before.attackInterval);validateSave(s);
});

test('focused planning improves strategy and discipline while slowing physical and strategy basic attacks',()=>{
 const s=charged('focused-plan'),b=s.battle,u=b.sides[0].units[0],before=unitAttributes(u,b);cast(s,'focused-plan');const after=unitAttributes(u,b);
 assert.ok(after.strategyPower>before.strategyPower);assert.ok(after.discipline>before.discipline);assert.ok(after.attackInterval>before.attackInterval);assert.equal(after.martialPower,before.martialPower);validateSave(s);
});

test('morale cost is real despite magic immunity and resolve; insufficient units are excluded from preview and payment',()=>{
 const entry=id=>({id,type:'spear',troops:4000,level:10}),s=createScenario('custom-battle',14331,20,null,{seed:14331,terrain:'land',ownTeam:['jin','person-226','dun','chu','he','gao'].map(entry),enemyTeam:['shao','wen','yan'].map(entry),ownTeamRoles:{leader:'jin',advisor:'person-226'},enemyTeamRoles:{leader:'shao',advisor:'shao'}}),b=s.battle;
 assert.equal(lockDeployment(b),null);const own=b.sides[0].units.filter(u=>u.status==='active'),a=own[0],z=own[1];
 b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(b,'ward',{x:a.x,y:a.y}),null);assert.ok(hasStatus(b,a,'magicImmune'));
 b.commandProgress=COMMAND_RESOURCE.capacity;a.intent=20;z.intent=19;setStatus(b,a,'resolve',20);
 const point={x:a.x,y:a.y},preview=areaPreview(b,STRATAGEMS['morale-bulwark'],{point});assert.ok(preview.targetIds.includes(a.id));assert.ok(!preview.targetIds.includes(z.id));
 const e=cast(s,'morale-bulwark');assert.equal(a.intent,0);assert.equal(z.intent,19);assert.ok(!e.units.some(u=>u.id===z.id));assert.ok(shieldAmount(b,a)>0);validateSave(s);
});

test('empty or unaffordable selection is atomic and never pays gauge, morale or starts cooldown',()=>{
 const s=charged('morale-bulwark'),b=s.battle;for(const u of b.sides[0].units)u.intent=19;
 const before=structuredClone(b);assert.ok(issueCommand(b,'morale-bulwark',{x:5,y:0}));assert.deepEqual(b,before);assert.equal(chooseStratagemPoint(b,STRATAGEMS['morale-bulwark'],0),null);
});

test('selfless guard is anchored to its real active provider and excludes provider benefits',()=>{
 const s=charged('selfless-guard'),b=s.battle,p=battleStratagemSource(b,'selfless-guard'),u=b.sides[0].units.find(u=>u.id===p.id);
 const preview=areaPreview(b,STRATAGEMS['selfless-guard'],{point:{x:13,y:7}});assert.ok(!preview.targetIds.includes(u.id));assert.ok(preview.targetIds.length);
 assert.equal(issueCommand(b,'selfless-guard',{x:13,y:7}),null);const e=b.sides[0].stratagemEvents.at(-1);assert.deepEqual(e.point,{x:u.x,y:u.y,rotation:0});assert.ok(hasStatus(b,u,'weaken'));assert.ok(!u.statuses.shield?.layers.some(l=>l.sourceCommand==='selfless-guard'));
 validateSave(s);
 const other=charged('selfless-guard'),ob=other.battle,source=ob.sides[0].units.find(v=>v.id===battleStratagemSource(ob,'selfless-guard').id);source.status='reserve';assert.equal(battleStratagemSource(ob,'selfless-guard'),null);assert.ok(issueCommand(ob,'selfless-guard'));assert.equal(ob.commandProgress,COMMAND_RESOURCE.capacity);
});

test('an arrived reserve commander provides an ordinary combination while selfless guard still requires a field position',()=>{
 const entry=id=>({id,type:'spear',troops:4000,level:10}),holder='person-455';
 const s=createScenario('custom-battle',14331,20,null,{seed:14331,terrain:'land',ownTeam:['chu','dun','yuanxia','he','gao','yan',holder].map(entry),enemyTeam:['shao','wen'].map(entry),ownTeamRoles:{leader:holder,advisor:holder},enemyTeamRoles:{leader:'shao',advisor:'shao'}}),b=s.battle;
 assert.equal(lockDeployment(b),null);freezeAiProbe(b);
 for(const side of [0,1])b.sides[side].units.filter(u=>u.status==='active').forEach((u,i)=>{u.x=side?6:5;u.y=i;});
 const provider=b.sides[0].units.find(u=>u.id===holder);assert.equal(provider.status,'reserve');assert.equal(provider.x,-1);assert.equal(provider.y,-1);
 for(let n=0;n<180&&b.commandProgress<COMMAND_RESOURCE.capacity;n++)stepBattle(b,{aiSides:[]});
 assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);
 const e=cast(s,'seize-opening');assert.equal(e.source.id,holder);assert.deepEqual(e.providerPosition,{x:-1,y:-1});
 const copy=validateSave(structuredClone(s));
 for(let n=0;n<6;n++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.deepEqual(copy.battle,b);}
 for(const point of [{x:-1,y:0},{x:0,y:-1},{x:-2,y:-2}]){const bad=structuredClone(s);bad.battle.sides[0].stratagemEvents[0].providerPosition=point;assert.throws(()=>validateSave(bad));}
});

test('stronger and longer existing gains survive weaker combination components and save checks',()=>{
 const s=charged('seize-opening'),b=s.battle,u=b.sides[0].units[0];setStatus(b,u,'valor',80,{potency:1.6});const old=structuredClone(u.statuses.valor);cast(s,'seize-opening');assert.deepEqual(u.statuses.valor,old);validateSave(s);
 const other=charged('all-out'),v=other.battle.sides[0].units[0];setStatus(other.battle,v,'valor',80,{potency:.8});cast(other,'all-out');assert.equal(v.statuses.valor.duration,other.battle.lastCommand.source.combination.benefits[0].steps);validateSave(other);
});

test('forged duration, magnitude, shield source, paid morale and anchored coordinates are rejected',()=>{
 for(const key of ['all-out','hold-relief','morale-bulwark','selfless-guard']){
  const s=charged(key),e=cast(s,key),id=e.units[0].id;
  const changes=[v=>{v.battle.sides[0].stratagemEvents.at(-1).units[0].intentAfter++;},v=>{v.battle.sides[0].stratagemEvents.at(-1).source.power+=.1;}];
  if(key==='all-out')changes.push(v=>{const st=v.battle.sides[0].units.find(u=>u.id===id).statuses.valor;st.duration++;st.until++;},v=>{v.battle.sides[0].units.find(u=>u.id===id).statuses.valor.fraction=.8;});
  else changes.push(v=>{v.battle.sides[0].units.find(u=>u.id===id).statuses.shield.layers.find(l=>l.sourceCommand===key).until++;});
  if(key==='selfless-guard')changes.push(v=>{v.battle.sides[0].stratagemEvents.at(-1).point.x=13;},v=>{v.battle.sides[0].stratagemEvents.at(-1).providerPosition={x:-1,y:-1};});
  for(const change of changes){const bad=structuredClone(s);change(bad);assert.throws(()=>validateSave(bad),key);}
 }
});

test('AI never waits for a combo or reads future cooldowns when current targets are legal',()=>{
 const s=charged('all-out'),b=s.battle,u=b.sides[0].units[0];assert.ok(combinationAiTarget(b,STRATAGEMS['all-out'],u));
 for(const t of unitTactics(u))u.skillReady[t.id]=b.tick+999;assert.ok(combinationAiTarget(b,STRATAGEMS['all-out'],u));
});

test('offensive AI recognizes an actual siege gate when enemy troops are outside its attack range',()=>{
 const s=charged('all-out'),b=s.battle,u=b.sides[0].units[0];for(const e of b.sides[1].units)e.x=13;
 assert.ok(!combinationAiTarget(b,STRATAGEMS['all-out'],u));
 b.siege={attackerSide:0,gate:{id:'test-gate',type:'gate',side:1,x:u.x+1,y:u.y,hp:1000,maxHp:1000}};
 assert.ok(combinationAiTarget(b,STRATAGEMS['all-out'],u));
});

test('design validation rejects unimplemented effects, free morale and remote provider penalties',()=>{
 for(const change of [d=>d.stratagems['all-out'].combination.penalties[0].status='hunger',d=>d.stratagems['morale-bulwark'].combination.intentCost=0,d=>delete d.stratagems['selfless-guard'].scope.anchor,d=>d.stratagems['hold-relief'].combination.benefits[0].steps=0]){const d=structuredClone(DESIGN_TABLES);change(d);assert.ok(validateDesignTables(d).length);}
});
