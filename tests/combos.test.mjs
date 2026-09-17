import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,validateSave,COMBO} from '../engine.mjs';
import {availableTactics,configureTactics,unitTactics,TACTICS_BOOK} from '../tactics.mjs';
function campaign(){const s=newGame();orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);return s;}
function scene(){const state=campaign(),b=state.battle;b.sides[0].units=b.sides[0].units.slice(0,4);b.sides[1].units=b.sides[1].units.slice(0,2);
 const coords=[[3,2],[3,3],[3,4],[4,5]];b.sides[0].units.forEach((u,i)=>{u.type='crossbow';u.tactics=['repeat','pierce','retreatShot'];[u.x,u.y]=coords[i];});
 b.sides[1].units[0].x=6;b.sides[1].units[0].y=3;b.sides[1].units[1].x=13;b.sides[1].units[1].y=7;
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.statuses.phalanx={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 return {state,b,own:b.sides[0].units,target:b.sides[1].units[0]};}
function cast(x,u,id,target=x.target){if(!availableTactics(u).some(s=>s.id===id))u.type=id==='harass'?'cavalry':id==='fire'?'archer':'spear';configureTactics(u,[id,...availableTactics(u).map(s=>s.id).filter(s=>s!==id).slice(0,2)]);u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));u.cast={skillId:id,targetId:target.id,remaining:1};stepBattle(x.b);return x.b.effects.filter(e=>e.combo);}
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
test('an interrupted cast and pure self buffs do not prime a combo',()=>{
 const x=scene();x.own[0].cast={skillId:'repeat',targetId:x.target.id,remaining:1};x.own[0].statuses.stun={until:99};stepBattle(x.b);assert.equal(x.b.comboWindows.length,0);x.own[0].cast=null;
 x.own[1].x=5;x.own[1].y=3;assert.equal(cast(x,x.own[1],'valor',x.own[1]).length,0);assert.equal(x.b.comboWindows.length,0);
});
test('combo enhances damage-over-time, intent reduction and control duration while respecting immunity',()=>{
 const x=scene();cast(x,x.own[0],'repeat');cast(x,x.own[1],'fire');assert.equal(x.target.statuses.burn.amount,30);assert.equal(x.target.statuses.burn.until,x.b.tick+8);
 const y=scene();y.own[1].x=4;cast(y,y.own[0],'repeat');y.target.intent=160;cast(y,y.own[1],'harass');assert.equal(y.target.intent,160-Math.round((20+Math.round(y.own[1].intellect*.2))*1.25));
 const z=scene();cast(z,z.own[0],'repeat');const e=cast(z,z.own[1],'ambush')[0];assert.equal(e.combo.level,2);const basic=Math.max(2,Math.min(4,Math.round(2+(z.own[1].intellect-z.target.intellect)/30)));assert.equal(z.target.statuses.confuse.until,z.b.tick+basic+2);
 const immune=scene();cast(immune,immune.own[0],'repeat');immune.target.statuses.resolve={until:99};assert.equal(cast(immune,immune.own[1],'ambush').length,0);assert.equal(immune.target.statuses.confuse,undefined);
});
test('support combos really strengthen shields and do not include unrelated primary targets',()=>{
 const x=scene(),patient=x.own[1],protector=x.own[3];patient.hp=1000;patient.battleDamage=2000;patient.x=4;patient.y=3;x.target.x=5;x.target.y=3;protector.x=4;protector.y=4;
 cast(x,x.own[0],'screen',patient);assert.ok(patient.statuses.shield);
 const e=cast(x,protector,'protect',patient)[0];assert.equal(e.combo.level,2);assert.equal(e.combo.targetName,patient.name);assert.equal(patient.statuses.shield.amount,450);assert.equal(patient.statuses.shield.until,x.b.tick+10);
});
test('ongoing combo window and fatal-hit metadata survive save; malformed chains fail closed',()=>{
 const s=campaign();while(!s.battle.effects.some(e=>e.combo))stepBattle(s.battle);
 const copy=validateSave(structuredClone(s));assert.deepEqual(copy.battle,s.battle);
 for(let i=0;i<20;i++){stepBattle(s.battle);stepBattle(copy.battle);}assert.deepEqual(copy.battle,s.battle);
 while(!s.battle.result){stepBattle(s.battle);validateSave(structuredClone(s));}assert.ok(s.battle.comboCounts.every(n=>n>0));
 const invalid=structuredClone(s);invalid.battle.comboWindows=[{side:0,targetId:'missing',tick:0,actors:[]}];assert.throws(()=>validateSave(invalid));
 const legacy=campaign();delete legacy.battle.comboWindows;delete legacy.battle.comboCounts;const migrated=validateSave(legacy);assert.deepEqual(migrated.battle.comboWindows,[]);assert.deepEqual(migrated.battle.comboCounts,[0,0]);
 const x=scene();cast(x,x.own[0],'repeat');x.target.hp=1;const e=cast(x,x.own[1],'repeat')[0];assert.equal(x.target.status,'defeated');assert.equal(e.combo.targetName,x.target.name);assert.equal(e.x,6);
});
