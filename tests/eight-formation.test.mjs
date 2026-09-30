import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,COMMAND_RESOURCE,validateSave,unitAttributes} from '../engine.mjs';
import {STRATAGEMS} from '../stratagems.mjs';
import {formationChance,tickStratagemZones} from '../stratagem-zones.mjs';
import {chooseStratagemPoint,zoneStatusChoices,stratagemAreaContains} from '../stratagem-area.mjs';
import {areaPreview,stratagemZonesMarkup} from '../stratagem-area-view.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

const key='zhuge-eight',s=STRATAGEMS[key],entry=id=>({id,type:'spear',level:5,troops:3000});
function scene(seed=7211){
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:[entry('person-290'),entry('cao'),entry('yu')],enemyTeam:[entry('shao'),entry('wen'),entry('yan')],ownTeamRoles:{leader:'person-290',advisor:'yu'}});
 lockDeployment(state.battle);state.battle.commandProgress=COMMAND_RESOURCE.capacity;return state;
}
test('formation can be placed on empty ground, consumes once, and replaces all old army bonuses',()=>{
 const state=scene(),b=state.battle,old=structuredClone(b.sides[0].units);
 assert.equal(issueCommand(b,key,{x:0,y:0}),null);
 assert.equal(b.stratagemZones.length,1);assert.equal(b.sides[0].stratagemUses[key],1);assert.equal(b.commandProgress,0);
 assert.equal(b.sides[0].fortifyUntil,0);assert.deepEqual(b.sides[0].units.map(u=>u.tacticRestored),old.map(u=>u.tacticRestored));
 assert.deepEqual(b.sides[0].units.map(u=>u.skillReady),old.map(u=>u.skillReady));assert.ok(b.sides[0].units.every(u=>!u.statuses.resolve));
 const preview=areaPreview(b,s,{point:{x:0,y:0}});assert.deepEqual(preview.targetIds,[]);assert.doesNotMatch(preview.controls,/data-area-action="confirm" disabled/);
 assert.match(stratagemZonesMarkup(b),/八阵困敌/);
 for(let i=0;i<8;i++)stepBattle(b);b.commandProgress=COMMAND_RESOURCE.capacity;
 assert.match(issueCommand(b,key,{x:0,y:0}),/次数/);assert.equal(b.commandProgress,COMMAND_RESOURCE.capacity);assert.equal(chooseEnemyCommand(b,[key],STRATAGEMS,0),null);
});
test('discipline directly reduces probability; duration and odds do not use unrelated officer attributes',()=>{
 assert.equal(formationChance(s,0),.6);assert.equal(formationChance(s,100),.5);assert.equal(formationChance(s,300),.25);assert.equal(formationChance(s,2000),.1);
 const b=scene().battle,u=b.sides[1].units[0],before=formationChance(s,unitAttributes(u,b).discipline);
 b.sides[1].fortifyUntil=20;b.sides[1].stratagemEffects.fortifyUntil={strength:.2};
 assert.ok(formationChance(s,unitAttributes(u,b).discipline)<before);
});
test('each round checks actual occupants, never allies, reserves or protected targets; expiry stops checking',()=>{
 const b=scene().battle,u=b.sides[1].units[0],p={x:u.x,y:u.y};assert.equal(issueCommand(b,key,p),null);
 const apply=[];const hooks={random:()=>0,applyStatus:(u,key,steps)=>{apply.push([u.id,key,steps]);return true;},onApplied:()=>{}};
 b.tick=1;tickStratagemZones(b,hooks);
 assert.equal(apply.length,new Set(apply.map(x=>x[0])).size);
 assert.ok(apply.length>0);assert.ok(apply.every(([id,,steps])=>b.sides[1].units.some(v=>v.id===id)&&steps===2));
 u.x=0;u.y=0;apply.length=0;b.tick++;tickStratagemZones(b,hooks);assert.ok(!apply.some(([id])=>id===u.id));
 u.x=p.x;u.y=p.y;u.statuses.stasis={until:99};apply.length=0;b.tick++;tickStratagemZones(b,hooks);assert.ok(!apply.some(([id])=>id===u.id));
 delete u.statuses.stasis;u.statuses.resolve={until:99};assert.ok(zoneStatusChoices(b,s,u).every(k=>!['confuse','seal','disrupted'].includes(k)));
 delete u.statuses.resolve;u.status='reserve';apply.length=0;b.tick++;tickStratagemZones(b,hooks);assert.ok(!apply.some(([id])=>id===u.id));
 u.status='active';apply.length=0;b.tick++;tickStratagemZones(b,hooks);assert.ok(apply.some(([id])=>id===u.id),'later entrants are checked');
 b.tick=b.stratagemZones[0].until;apply.length=0;tickStratagemZones(b,hooks);assert.equal(b.stratagemZones.length,0);assert.equal(apply.length,0);
});
test('live formation causes real random statuses, survives reload, and expires after eighteen rounds',()=>{
 const state=scene(),b=state.battle,point=chooseStratagemPoint(b,s,0);
 assert.equal(issueCommand(b,key,point),null);const copy=validateSave(structuredClone(state));let seen=0;
 for(let n=0;n<19;n++){
  stepBattle(b);stepBattle(copy.battle);assert.deepEqual(copy.battle,b);
  for(const u of b.sides[1].units)for(const [k,v] of Object.entries(u.statuses))if(v.sourceSkillName===s.name&&s.zone.statuses.includes(k)){seen++;assert.ok(v.until<=b.tick+2);}
 }
 assert.ok(seen>0);assert.equal(b.stratagemZones.length,0);
 assert.ok(b.sides[0].units.find(u=>u.id==='person-290').contribution.control>0);
});
test('area saves reject forged location, duration, source, duplicate zones and missing new state',()=>{
 const state=scene();assert.equal(issueCommand(state.battle,key,{x:6,y:3}),null);validateSave(structuredClone(state));
 for(const mutate of [b=>{b.stratagemZones[0].point.x=99;},b=>{b.stratagemZones[0].until++;},b=>{b.stratagemZones[0].source.power=99;},b=>{b.stratagemZones.push(structuredClone(b.stratagemZones[0]));},b=>{delete b.stratagemZones;},b=>{delete b.sides[0].stratagemUses;}]){
  const bad=structuredClone(state);mutate(bad.battle);assert.throws(()=>validateSave(bad));
 }
});
test('enemy formation uses the same target side and probability rules',()=>{
 const state=scene(),b=state.battle;
 b.sides.reverse();for(let side=0;side<2;side++)for(const u of b.sides[side].units)u.side=side;
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;
 const point=chooseStratagemPoint(b,s,1);assert.equal(issueCommand(b,key,point,1),null);
 const ids=[];b.tick=1;tickStratagemZones(b,{random:()=>0,applyStatus:u=>{ids.push(u.id);return true;},onApplied:()=>{}});
 assert.ok(ids.length);assert.ok(ids.every(id=>b.sides[0].units.some(u=>u.id===id&&stratagemAreaContains(s,point,u))));
});
