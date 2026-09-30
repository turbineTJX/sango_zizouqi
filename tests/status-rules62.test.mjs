import {currentBattle} from './helpers/current-battle.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave,fillSlots} from '../engine.mjs';
import {setStatus,hasStatus,unitTactics,readyTactic,routeTo,tacticTarget,TACTICS_BOOK} from '../tactics.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {isTargetable,holdsLine,interceptorsAt} from '../engagement.mjs';
import {STATUS_DEFINITIONS,remedy,createDecoy,prepareDecoy,decoyTargets,detected,breakStealth} from '../battle-status-rules.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {learnFixtureTactics,syncFixtureLearning} from './helpers/learn-tactics.mjs';

function scene(){
 const state=createScenario('breach',5),b=state.battle;lockDeployment(b);
 const [a,c]=b.sides[0].units,[d,e]=b.sides[1].units;
 b.sides[0].units=[a,c];b.sides[1].units=[d,e];
 for(const u of [a,c,d,e]){u.status='active';u.statuses={};u.intent=0;u.cooldown=999;u.entryStatusesApplied=true;u.tacticRecoveryUntil=999;}
 Object.assign(a,{x:3,y:3});Object.assign(c,{x:2,y:2});Object.assign(d,{x:4,y:3,type:'spear'});Object.assign(e,{x:7,y:3,type:'archer'});
 return {state,b,a,c,d,e};
}
test('status catalog has unique names and rejects removed status identities',()=>{
 assert.equal(new Set(Object.values(STATUS_DEFINITIONS).map(v=>v.name)).size,Object.keys(STATUS_DEFINITIONS).length);
 for(const k of ['stun','shaken','blight','scorch','curse','illusion'])assert.equal(STATUS_DEFINITIONS[k],undefined);
 const {b,a}=scene();setStatus(b,a,'stun',4);assert.equal(a.statuses.stun,undefined);
});
test('continuous intent loss is bounded, and calm does not extinguish fire or restore formation',()=>{
 const {b,a,d}=scene();a.intent=12;setStatus(b,a,'despair',4);setStatus(b,a,'burn',4,{sourceId:d.id,amount:1});setStatus(b,a,'disrupted',4);
 stepBattle(b);assert.equal(a.intent,7);stepBattle(b);assert.equal(a.intent,2);stepBattle(b);assert.equal(a.intent,0);
 remedy(b,a,'calm');assert.equal(hasStatus(b,a,'despair'),false);assert.ok(hasStatus(b,a,'burn'));assert.ok(hasStatus(b,a,'disrupted'));
 remedy(b,a,'quench');assert.equal(hasStatus(b,a,'burn'),false);remedy(b,a,'rally');assert.equal(hasStatus(b,a,'disrupted'),false);
});
test('attack cadence and range use real derived attributes without changing minimum range or skill cooldown',()=>{
 const {b,a}=scene();a.type='crossbow';const base=unitAttributes(a,b);const ready=structuredClone(a.skillReady);
 setStatus(b,a,'attackHaste',5);assert.ok(Math.abs(unitAttributes(a,b).attackInterval-base.attackInterval*.8)<1e-8);
 setStatus(b,a,'attackSlow',5);assert.ok(Math.abs(unitAttributes(a,b).attackInterval-base.attackInterval)<1e-8);
 setStatus(b,a,'longRange',5);setStatus(b,a,'longRange',5);assert.equal(unitAttributes(a,b).range,base.range+1);
 setStatus(b,a,'shortRange',5);assert.equal(unitAttributes(a,b).range,base.range);assert.equal(unitAttributes(a,b).minRange,base.minRange);assert.deepEqual(a.skillReady,ready);
});
test('loss of ZOC, root and disarm have independent effects; resolve covers all controls',()=>{
 const {b,a,d}=scene();a.type='spear';assert.ok(holdsLine(b,a));setStatus(b,a,'root',3);assert.equal(unitAttributes(a,b).move,0);assert.ok(holdsLine(b,a));
 setStatus(b,a,'disrupted',3);assert.equal(holdsLine(b,a),false);remedy(b,a,'rally');assert.ok(holdsLine(b,a));
 setStatus(b,a,'disarm',3);a.cooldown=0;const hp=d.hp;stepBattle(b);assert.equal(d.hp,hp);
 remedy(b,a,'rally');setStatus(b,a,'resolve',3);for(const k of ['confuse','root','disarm','seal','taunt','disrupted']){setStatus(b,a,k,2,{sourceId:d.id});assert.equal(hasStatus(b,a,k),false,k);}
});
test('personal range changes do not increase weapon tactic range',()=>{
 const {b,a,d,e}=scene();a.type='crossbow';d.x=9;e.x=12;setStatus(b,a,'longRange',6,{amount:2});
 assert.equal(unitAttributes(a,b).range,6);assert.equal(tacticTarget(b,a,TACTICS_BOOK.repeat,6),null);
});
test('removed opening ambush cannot be equipped or generate an entry status',()=>{
 const {state,b,u}=currentBattle('rush','cavalry');const kit=structuredClone(u.tactics);
 assert.ok(learnFixtureTactics(u,['concealment']));assert.deepEqual(u.tactics,kit);assert.equal(hasStatus(b,u,'stealth'),false);validateSave(structuredClone(state));
});
test('ambush chooses reachable rear, waits to cast, and first strike confuses for one step',()=>{
 const {b,a,d,e}=scene();a.type='cavalry';a.cooldown=0;d.x=10;Object.assign(e,{x:4,y:3});setStatus(b,a,'stealth',12);
 assert.equal(readyTactic(b,a,1),null);const hp=e.hp;stepBattle(b);assert.ok(e.hp<hp);assert.equal(hasStatus(b,a,'stealth'),false);assert.ok(hasStatus(b,e,'confuse'));assert.equal(e.statuses.confuse.until-b.tick-1,1);
});
test('insight exposes hidden units without changing contact; damage breaks stealth and cancels surprise',()=>{
 const {b,a,d}=scene();a.type='cavalry';setStatus(b,a,'stealth',12);setStatus(b,d,'insight',6);assert.ok(detected(b,a));assert.ok(isTargetable(b,a));assert.equal(interceptorsAt(b,a).length,1);
 d.cooldown=0;stepBattle(b);assert.equal(hasStatus(b,a,'stealth'),false);assert.equal(hasStatus(b,d,'confuse'),false);
 const x=scene();setStatus(x.b,x.a,'stealth',12);setStatus(x.b,x.a,'burn',3,{sourceId:x.d.id,amount:20});stepBattle(x.b);assert.equal(hasStatus(x.b,x.a,'stealth'),false);
});
test('single-target learned decoy creates a real target, not a seventh troop or damage shield',()=>{
 const {b,u:a,ally:c,target:d,rear:e}=currentBattle('mirage','crossbow',{requireS:true});e.x=13;e.y=7;primeTactic(a,'mirage');Object.assign(c,{x:3,y:2});stepBattle(b);
 const owner=[a,c].find(u=>hasStatus(b,u,'decoy'));assert.ok(owner);assert.equal(b.sides[0].units.length,2);
 const proxy=decoyTargets(b,0)[0];assert.equal(holdsLine(b,proxy),false);assert.equal(proxy.hp,Math.round(owner.initial*.3));
 Object.assign(d,{type:'archer',x:4,y:2,cooldown:0});d.passiveState.targetId=owner.id;const hp=owner.hp,intent=d.intent;stepBattle(b);
 assert.equal(owner.hp,hp);assert.ok(b.effects.some(e=>e.decoyDamage>0));assert.equal(d.intent,intent);
});
test('prepared decoy triggers only once below half, and guard / link cannot recursively duplicate damage',()=>{
 const {b,a,c,d,e}=scene();prepareDecoy(b,a,{sourceId:c.id});a.hp=Math.floor(a.initial*.49);a.cooldown=999;d.cooldown=0;stepBattle(b);assert.ok(a.preparedDecoy.used);assert.ok(hasStatus(b,a,'decoy'));
 const x=scene();x.d.cooldown=0;setStatus(x.b,x.a,'guard',5,{sourceId:x.c.id});Object.assign(x.c,{x:3,y:2});setStatus(x.b,x.a,'link',5,{group:'test'});setStatus(x.b,x.c,'link',5,{group:'test'});
 const hp=x.c.hp;stepBattle(x.b);assert.ok(x.c.hp<hp);const direct=x.b.effects.filter(v=>v.from===x.d.id&&!v.ongoing&&v.damage>0);assert.ok(x.b.effects.filter(v=>v.label==='连环传导').length<=direct.length);
});
test('new state saves reject malformed decoys and retired rules',()=>{
 const state=createScenario('breach',5);lockDeployment(state.battle);const u=state.battle.sides[0].units[0];createDecoy(state.battle,u);assert.ok(validateSave(structuredClone(state)));
 const bad=structuredClone(state);bad.battle.sides[0].units[0].statuses.decoy.hp=-1;assert.throws(()=>validateSave(bad));const old=structuredClone(state);old.rulesVersion=61;assert.throws(()=>validateSave(old));
});

test('stealth attacks an adjacent ZOC owner instead of chasing the rear',()=>{
 const {b,a,d,e}=scene();a.type='cavalry';a.cooldown=0;setStatus(b,a,'stealth',12);
 const front=d.hp,rear=e.hp;stepBattle(b);
 assert.ok(d.hp<front);assert.equal(e.hp,rear);assert.equal(hasStatus(b,a,'stealth'),false);assert.ok(hasStatus(b,d,'confuse'));
});
test('stealth movement stops at first ZOC contact and attacks in the same step',()=>{
 const {b,a,d,e}=scene();a.type='cavalry';a.cooldown=0;e.status='withdrawn';Object.assign(a,{x:2,y:3});Object.assign(d,{x:4,y:3});setStatus(b,a,'stealth',12);
 const front=d.hp,rear=e.hp;for(let i=0;i<4&&hasStatus(b,a,'stealth');i++)stepBattle(b);
 assert.ok(d.hp<front);assert.equal(e.hp,rear);assert.equal(hasStatus(b,a,'stealth'),false);assert.ok(hasStatus(b,d,'confuse'));assert.ok(a.x<d.x);
});
test('contact reveals stealth without granting a free attack during cooldown',()=>{
 const {b,a,d}=scene();a.type='cavalry';a.cooldown=5;setStatus(b,a,'stealth',12);const hp=d.hp;
 stepBattle(b);assert.equal(d.hp,hp);assert.equal(hasStatus(b,a,'stealth'),false);
});
