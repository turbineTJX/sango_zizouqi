import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave,issueCommand,COMMAND_RESOURCE} from '../engine.mjs';
import {setStatus,hasStatus} from '../tactics.mjs';
import {mechanicEntries,traitEligible} from '../trait-mechanics.mjs';
import {TRAIT_DESIGNS} from '../data/design/traits.mjs';
const entry=id=>({id,type:'spear',level:1,troops:3000});
function scene(id,role='leader',side=0){
 const own=[entry(id),entry('dun'),entry('jin')],enemy=[entry('shao'),entry('tian')];
 const roles={leader:role==='leader'?id:'dun',advisor:role==='advisor'?id:'jin'};
 const state=createScenario('custom-battle',91,20,null,{seed:91,terrain:'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy,[side?'enemyTeamRoles':'ownTeamRoles']:roles});
 const b=state.battle;lockDeployment(b);for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(u.tactics.map(id=>[id,999]));}
 return{state,b,u:b.sides[side].units[0],ally:b.sides[side].units[1],other:b.sides[side].units[2],side};
}
function resume(x){const copy=validateSave(structuredClone(x.state));for(let i=0;i<12;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.state,copy);}
test('current independent battle mechanics all require explicit appointments',()=>{
 const defs=Object.values(TRAIT_DESIGNS).filter(d=>d.domain==='battle');assert.equal(defs.length,4);assert.ok(defs.every(d=>d.mechanics.every(r=>r.roles?.length)));
 for(const id of ['person-661','person-290','person-472','person-119','person-294'])assert.deepEqual(mechanicEntries({id}),[]);
});
for(const side of [0,1])for(const role of ['leader','advisor'])test('Ji Jun cleans one actual ally and respects its interval on '+side+'/'+role,()=>{
 const x=scene('person-668',role,side);x.ally.hp-=600;x.ally.battleDamage=600;setStatus(x.b,x.ally,'despair',40);setStatus(x.b,x.other,'despair',40);
 stepBattle(x.b);assert.equal(hasStatus(x.b,x.ally,'despair'),false);assert.equal(hasStatus(x.b,x.other,'despair'),true);
 const used=x.u.traitState['hero-person-668:0'];assert.equal(used.uses,1);stepBattle(x.b);assert.equal(x.u.traitState['hero-person-668:0'].uses,1);resume(x);
});
test('Ji Jun does not activate without appointment, while withdrawing or for another army',()=>{
 for(const mode of ['unappointed','withdrawing','other-army']){const x=scene('person-668',mode==='unappointed'?'none':'leader');if(mode==='withdrawing')x.u.withdrawing=true;if(mode==='other-army')x.ally.armyId='other';setStatus(x.b,x.ally,'despair',40);stepBattle(x.b);assert.ok(hasStatus(x.b,x.ally,'despair'));}
});
test('Bi Yan triggers from a real legal command and saves its interval',()=>{
 const x=scene('person-368');setStatus(x.b,x.ally,'despair',40);x.b.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(x.b,'fortify',{x:x.ally.x,y:x.ally.y}),null);
 assert.equal(hasStatus(x.b,x.ally,'despair'),false);assert.ok(hasStatus(x.b,x.ally,'resolve'));assert.equal(x.u.traitState['hero-person-368:0'].uses,1);resume(x);
});
test('Yin Ren refunds only its own gauge after an actual enemy command',()=>{
 const x=scene('person-226');x.b.commandProgress=0;x.b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;
 assert.equal(issueCommand(x.b,'fortify',{x:x.b.sides[1].units[0].x,y:x.b.sides[1].units[0].y},1),null);assert.equal(x.b.commandProgress,COMMAND_RESOURCE.capacity*.15);assert.equal(x.b.enemyCommand.commandProgress,0);
 x.b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;assert.equal(issueCommand(x.b,'disrupt',{x:x.ally.x,y:x.ally.y},1),null);assert.equal(x.b.commandProgress,COMMAND_RESOURCE.capacity*.15);resume(x);
});
