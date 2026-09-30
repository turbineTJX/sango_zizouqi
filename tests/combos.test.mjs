import {tacticHolder} from './helpers/current-battle.mjs';
import {createScenario} from '../scenarios.mjs';
import {syncFixtureLearning} from './helpers/learn-tactics.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {relationshipKey} from '../relationships.mjs';
import {unitAttributes,disciplineDuration} from '../unit-stats.mjs';
import {powerFactor} from '../tactic-power.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,validateSave,COMBO} from '../engine.mjs';
import {availableTactics,unitTactics,TACTICS_BOOK} from '../tactics.mjs';
function campaign(seed){const s=newGame(seed);orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);return s;}
function scene(score=100,kits=Array.from({length:4},()=>['repeat','crossbow'])){
 const ids=[],ownTeam=kits.map(([skill,type])=>{const id=tacticHolder(skill,type,ids,true);ids.push(id);return{id,type,troops:3000,level:1,retreatAt:null};});
 const enemyIds=['jin','yuanxia','person-1','person-2','person-3','person-4'].filter(id=>!ids.includes(id)).slice(0,2);assert.equal(enemyIds.length,2);
 const state=createScenario('custom-battle',19,20,null,{seed:19,terrain:'land',ownTeam,enemyTeam:enemyIds.map(id=>({id,type:'spear',troops:3000,level:1,retreatAt:null}))}),b=state.battle;lockDeployment(b);
 const coords=[[3,2],[3,3],[3,4],[4,5]];b.sides[0].units.forEach((u,i)=>{[u.x,u.y]=coords[i];});
 Object.assign(b.sides[1].units[0],{x:6,y:3});Object.assign(b.sides[1].units[1],{x:13,y:7});
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.statuses.phalanx={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 for(const a of b.sides[0].units)for(const c of b.sides[0].units)if(a.id!==c.id){const key=relationshipKey(a.id,c.id);state.relationshipScores[key]=score;state.relationshipTypes[key]=score===100?'sworn':score===0?'disliked':'ordinary';}
 b.relationshipTypes=structuredClone(state.relationshipTypes);b.relationshipScores=structuredClone(state.relationshipScores);
 return{state,b,own:b.sides[0].units,target:b.sides[1].units[0]};
}
function cast(x,u,id){primeTactic(u,id);stepBattle(x.b);return x.b.effects.filter(e=>e.combo);}
function damage(b,from){return b.effects.filter(e=>e.from===from&&e.skill).reduce((n,e)=>n+e.damage,0);}
test('same target links distinct officers, doubles count once, triples cap at forty percent',()=>{
 const x=scene();assert.equal(cast(x,x.own[0],'repeat').length,0);assert.deepEqual(x.b.comboCounts,[0,0]);
 const control=structuredClone(x);control.b.comboWindows=[];control.own=control.b.sides[0].units;control.target=control.b.sides[1].units[0];
 const e=cast(x,x.own[1],'repeat')[0];cast(control,control.own[1],'repeat');
 assert.equal(e.combo.level,2);assert.equal(e.combo.bonus,25);assert.ok(Math.abs(damage(x.b,x.own[1].id)/damage(control.b,control.own[1].id)-1.25)<.03);
 assert.equal(x.b.comboCounts[0],1);assert.equal(x.b.effects.filter(e=>e.comboLevel===2&&e.damage).length,2);
 assert.equal(cast(x,x.own[2],'repeat')[0].combo.bonus,40);assert.equal(cast(x,x.own[3],'repeat')[0].combo.bonus,40);
 assert.equal(x.b.comboWindows[0].tick,1);assert.equal(x.b.comboCounts[0],3);
});
test('self repeats, other targets, expired windows, enemy casts and departed partners cannot link',()=>{
 let x=scene();cast(x,x.own[0],'repeat');assert.equal(cast(x,x.own[0],'repeat').length,0);
 x=scene();cast(x,x.own[0],'repeat');x.target.x=13;x.target.y=7;x.b.sides[1].units[1].x=6;x.b.sides[1].units[1].y=3;assert.equal(cast(x,x.own[1],'repeat',x.b.sides[1].units[1]).length,0);
 x=scene();cast(x,x.own[0],'repeat');for(let i=0;i<COMBO.window;i++)stepBattle(x.b);assert.equal(cast(x,x.own[1],'repeat').length,0);
 x=scene();cast(x,x.own[0],'repeat');x.b.comboWindows[0].side=1;assert.equal(cast(x,x.own[1],'repeat').length,0);
 x=scene();cast(x,x.own[0],'repeat');x.own[0].status='withdrawn';assert.equal(cast(x,x.own[1],'repeat').length,0);
});
test('a confused unit and a current self buff do not prime a combo',()=>{
 const x=scene(100,[['repeat','crossbow'],['gallop','cavalry'],['repeat','crossbow'],['repeat','crossbow']]);primeTactic(x.own[0],'repeat');x.own[0].statuses.confuse={until:99};stepBattle(x.b);assert.equal(x.b.comboWindows.length,0);
 x.own[1].x=5;x.own[1].y=3;assert.equal(cast(x,x.own[1],'gallop').length,0);assert.equal(x.own[1].tacticCasts.gallop,1);assert.equal(x.b.comboWindows.length,0);
});
test('a real harass combo strengthens intent loss and respects control protection',()=>{
 for(const immune of [false,true]){
 const x=scene(100,[['repeat','crossbow'],['harass','cavalry'],['repeat','crossbow'],['repeat','crossbow']]);x.own[1].x=4;cast(x,x.own[0],'repeat');x.target.intent=100;if(immune)x.target.statuses.resolve={until:99};
 const y=structuredClone(x);y.b.comboWindows=[];y.own=y.b.sides[0].units;y.target=y.b.sides[1].units[0];
 assert.equal(cast(x,x.own[1],'harass')[0].combo.level,2);cast(y,y.own[1],'harass');assert.ok(100-x.target.intent>100-y.target.intent);
 assert.equal(Boolean(x.target.statuses.disrupted),!immune);
 }
});
test('current rally support combos strengthen real intent gains on the same patient',()=>{
 const x=scene(100,[['rally','archer'],['rally','archer'],['repeat','crossbow'],['repeat','crossbow']]);const patient=x.own[2];Object.assign(patient,{x:4,y:3,intent:0});for(const u of x.own)if(u!==patient)u.intent=100;
 cast(x,x.own[0],'rally');assert.ok(patient.intent>0);const before=patient.intent;
 const y=structuredClone(x);y.b.comboWindows=[];y.own=y.b.sides[0].units;y.target=y.b.sides[1].units[0];
 const event=cast(x,x.own[1],'rally')[0];cast(y,y.own[1],'rally');assert.equal(event.combo.level,2);assert.equal(event.combo.targetName,patient.name);assert.ok(patient.intent-before>y.own[2].intent-before);
});
test('ongoing combo window and fatal-hit metadata survive save; malformed chains fail closed',()=>{
 let s;for(let seed=1;seed<=32;seed++){s=campaign(seed);while(!s.battle.result&&!s.battle.effects.some(e=>e.combo))stepBattle(s.battle);if(s.battle.effects.some(e=>e.combo))break;}
 assert.ok(s.battle.effects.some(e=>e.combo),'save during a real active combo');
 const copy=validateSave(structuredClone(syncFixtureLearning(s)));assert.deepEqual(copy.battle,s.battle);
 for(let i=0;i<20;i++){stepBattle(s.battle);stepBattle(copy.battle);}assert.deepEqual(copy.battle,s.battle);
 while(!s.battle.result){stepBattle(s.battle);validateSave(structuredClone(syncFixtureLearning(s)));}assert.ok(s.battle.comboCounts.some(n=>n>0));
 const invalid=structuredClone(s);invalid.battle.comboWindows=[{side:0,targetId:'missing',tick:0,actors:[]}];assert.throws(()=>validateSave(invalid));
 for(const field of ['comboWindows','comboCounts']){const s=campaign();delete s.battle[field];assert.throws(()=>validateSave(s));}
 const x=scene();cast(x,x.own[0],'repeat');x.target.hp=1;const e=cast(x,x.own[1],'repeat')[0];assert.equal(x.target.status,'defeated');assert.equal(e.combo.targetName,x.target.name);assert.equal(e.x,6);
});


test('relationship rolls use the previous caster, failed links restart the chain and do not boost damage',()=>{
 const x=scene(0);cast(x,x.own[0],'repeat');
 const control=structuredClone(x);control.b.comboWindows=[];control.own=control.b.sides[0].units;control.target=control.b.sides[1].units[0];
 assert.equal(cast(x,x.own[1],'repeat').length,0);cast(control,control.own[1],'repeat');
 assert.equal(damage(x.b,x.own[1].id),damage(control.b,control.own[1].id));
 assert.equal(x.b.comboCounts[0],0);assert.deepEqual(x.b.comboWindows[0].actors.map(a=>a.id),[x.own[1].id]);assert.equal(x.b.comboWindows[0].tick,2);
 assert.ok(x.b.logs.some(l=>l.text.includes('0% 连携判定未成功')));
 x.b.relationshipScores[relationshipKey(x.own[1].id,x.own[2].id)]=100;
 x.b.relationshipTypes[relationshipKey(x.own[1].id,x.own[2].id)]='sworn';
 const e=cast(x,x.own[2],'repeat')[0];assert.equal(e.combo.level,2);assert.deepEqual(e.combo.actors.map(a=>a.id),[x.own[1].id,x.own[2].id]);
 // A high score with the first actor cannot bypass a zero score with the last actor.
 x.b.relationshipScores[relationshipKey(x.own[1].id,x.own[3].id)]=100;
 x.b.relationshipTypes[relationshipKey(x.own[1].id,x.own[3].id)]='sworn';
 assert.equal(cast(x,x.own[3],'repeat').length,0);
});

test('intermediate relationship scores produce reproducible probabilities at the exact seeded threshold',()=>{
 for(const seed of [1,1000,2000,0xffffffff]){
  const x=scene(50);cast(x,x.own[0],'repeat');x.b.seed=seed;
  const roll=((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
  const copy=structuredClone(x);copy.own=copy.b.sides[0].units;copy.target=copy.b.sides[1].units[0];
  assert.equal(cast(x,x.own[1],'repeat').length>0,roll<.5);
  cast(copy,copy.own[1],'repeat');assert.deepEqual(copy.b,x.b);
 }
});


test('a changed relationship type supplies its current baseline to the real combo roll',()=>{
 const x=scene(50);cast(x,x.own[0],'repeat');x.b.seed=1000;
 const y=structuredClone(x);y.own=y.b.sides[0].units;y.target=y.b.sides[1].units[0];
 const key=relationshipKey(x.own[0].id,x.own[1].id);
 delete x.b.relationshipScores[key];delete y.b.relationshipScores[key];
 x.b.relationshipTypes[key]='ordinary';y.b.relationshipTypes[key]='sworn';
 assert.equal(cast(x,x.own[1],'repeat').length,0);
 assert.equal(cast(y,y.own[1],'repeat')[0].combo.level,2);
});
