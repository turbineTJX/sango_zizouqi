import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultCustomBattle,validateCustomBattle,swapCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitAttributes,battleSupplyPenalty} from '../unit-stats.mjs';
import {hasStatus,setStatus} from '../tactics.mjs';
import {remedy} from '../battle-status-rules.mjs';
import {applyBattleEvents} from '../battle-events.mjs';
import {inspectionStatuses} from '../status-display.mjs';
const entry=id=>({id,type:'spear',troops:5000,level:10,retreatAt:null});
function draft(){const d=defaultCustomBattle();d.ownTeam=[entry('yu')];d.enemyTeam=[entry('shao')];d.shieldPercent=0;d.events=[{kind:'supply-cut',side:1,tick:2,duration:4},{kind:'ambush',side:1,tick:3,duration:2}];return d;}

test('timed events validate real types, dates and sides; a full swap reverses every target',()=>{
 const d=draft(),swapped=swapCustomBattle(d);assert.ok(swapped.events.every(e=>e.side===0));assert.deepEqual(swapCustomBattle(swapped),validateCustomBattle(d));
 for(const mutate of [e=>e.side=2,e=>e.kind='fake',e=>e.tick=0,e=>e.tick=480,e=>e.duration=0,e=>e.duration=2001]){const bad=draft();mutate(bad.events[0]);assert.throws(()=>validateCustomBattle(bad),/定时事件/);}
});

test('events fire exactly on their date once, with real attributes, control, expiration and no direct casualties',()=>{
 const s=generateBattle(draft()),b=s.battle,u=b.sides[1].units[0];lockDeployment(b);stepBattle(b);assert.equal(b.battleEvents[0].triggeredAt,null);assert.ok(!hasStatus(b,u,'hunger'));
 stepBattle(b);assert.equal(b.battleEvents[0].triggeredAt,2);assert.ok(hasStatus(b,u,'hunger'));
 const without={...u,statuses:{...u.statuses}};delete without.statuses.hunger;
 for(const key of ['attack','martialPower','strategyPower','supportPower'])assert.ok(Math.abs(unitAttributes(u,b)[key]/unitAttributes(without,b)[key]-.65)<1e-8,key);
 const status=inspectionStatuses(b,u).find(s=>s.key==='hunger');assert.match(status.description,/35%/);assert.ok(status.sources.some(s=>s.includes('战役事件')));
 assert.deepEqual(remedy(b,u,'calm'),[]);assert.ok(hasStatus(b,u,'hunger'));
 stepBattle(b);assert.equal(b.battleEvents[1].triggeredAt,3);assert.ok(hasStatus(b,u,'confuse'));assert.ok(hasStatus(b,u,'disrupted'));assert.equal(u.hp,u.initial);assert.equal(b.sides[0].units[0].statuses.hunger,undefined);
 for(let n=0;n<5;n++)stepBattle(b);assert.ok(!hasStatus(b,u,'hunger'));assert.ok(!hasStatus(b,u,'confuse'));assert.equal(b.logs.filter(l=>l.text.includes('事件触发')).length,2);validateSave(s);
});

test('ongoing supply cuts affect arrived reserves and later arrivals, without stacking strategic supply penalties',()=>{
 const d=draft();d.events.length=1;d.reinforcements=[{side:1,name:'后军',tick:4,team:[entry('gao')]}];const s=generateBattle(d),b=s.battle,u=b.sides[1].units.find(u=>u.id==='gao');lockDeployment(b);
 for(let n=0;n<3;n++)stepBattle(b);assert.equal(u.arrivalConfirmed,false);assert.equal(u.statuses.hunger,undefined);assert.equal(u.hp,u.initial);
 for(let n=0;n<2;n++)stepBattle(b);assert.equal(u.arrivalConfirmed,true);assert.ok(hasStatus(b,u,'hunger'));assert.equal(u.statuses.hunger.until,7);
 u.supplyPenalty=.2;assert.equal(battleSupplyPenalty(u,b),.35);u.supplyPenalty=.5;assert.equal(battleSupplyPenalty(u,b),.5);u.supplyPenalty=0;validateSave(s);
});

test('ambush targets only field troops and preserves the shared immunity and remedy rules',()=>{
 const d=draft();d.events=[{kind:'ambush',side:1,tick:2,duration:4}];d.enemyTeam=['shao','dun','liao','chu','jia','he','gao'].map(entry);
 const s=generateBattle(d),b=s.battle;lockDeployment(b);const active=b.sides[1].units.filter(u=>u.status==='active'),reserve=b.sides[1].units.find(u=>u.status==='reserve');setStatus(b,active[0],'resolve',10);
 b.tick=2;applyBattleEvents(b);assert.ok(!hasStatus(b,active[0],'confuse'));assert.ok(!hasStatus(b,reserve,'confuse'));assert.ok(active.slice(1).every(u=>hasStatus(b,u,'confuse')));
 const u=active[1];assert.ok(remedy(b,u,'calm').includes('confuse'));assert.ok(!hasStatus(b,u,'confuse'));applyBattleEvents(b);assert.ok(!hasStatus(b,u,'confuse'));
});

test('a reinforcement council already shows the active supply cut without advancing time',()=>{
 const d=draft();d.events=[{kind:'supply-cut',side:0,tick:2,duration:10}];d.reinforcements=[{side:0,name:'后军',tick:4,team:[entry('gao')]}];
 const s=generateBattle(d),b=s.battle;lockDeployment(b);for(let n=0;n<4;n++)stepBattle(b);stepBattle(b);
 assert.equal(b.tick,4);assert.equal(b.reinforcementCouncil,'pending');const u=b.sides[0].units.find(u=>u.id==='gao');assert.ok(hasStatus(b,u,'hunger'));assert.equal(u.statuses.hunger.until,13);validateSave(s);
});

test('saves preserve pre-event and post-event continuation and reject forged event provenance',()=>{
 const s=generateBattle(draft()),b=s.battle;lockDeployment(b);stepBattle(b);const copy=validateSave(structuredClone(s));
 for(let n=0;n<3;n++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);validateSave(s);
 for(const mutate of [s=>s.battle.battleEvents[0].triggeredAt=null,s=>s.battle.battleEvents[0].side=0,s=>s.battle.sides[1].units[0].statuses.hunger.sourceEvent=99,s=>delete s.battle.sides[1].units[0].statuses.hunger.sourceEvent,s=>s.battle.sides[1].units[0].statuses.hunger.fraction=.8]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateSave(bad),/定时事件/);}
 const later=validateSave(structuredClone(s));while(!b.result){stepBattle(b);stepBattle(later.battle);}assert.deepEqual(b,later.battle);validateSave(s);
});
