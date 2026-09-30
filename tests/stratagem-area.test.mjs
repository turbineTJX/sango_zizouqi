import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,issueCommand,COMMAND_RESOURCE,validateSave,stepBattle} from '../engine.mjs';
import {STRATAGEMS,OFFICER_STRATAGEMS} from '../stratagems.mjs';
import {stratagemAreaContains,chooseStratagemPoint} from '../stratagem-area.mjs';
import {appointTestCommanders} from './helpers/commanders.mjs';
function scene(leader='person-246',advisor='yu'){
 const s=newGame();appointTestCommanders(s,leader,advisor);orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);s.battle.commandProgress=COMMAND_RESOURCE.capacity;return s;
}
test('circle and rotated rectangle use rendered geometry, inclusive boundary',()=>{
 const circle=STRATAGEMS.heal,rect=STRATAGEMS.firestorm,p={x:4,y:2};
 assert.ok(stratagemAreaContains(circle,p,{x:6,y:2}));
 assert.ok(!stratagemAreaContains(circle,p,{x:7,y:2}));
 assert.ok(stratagemAreaContains(rect,p,{x:6,y:2}));
 assert.ok(!stratagemAreaContains(rect,{...p,rotation:90},{x:6,y:2}));
 assert.ok(!stratagemAreaContains(rect,p,{x:4,y:4}));
 assert.ok(stratagemAreaContains(rect,{...p,rotation:90},{x:4,y:4}));
 assert.ok(!stratagemAreaContains(circle,p,{x:-1,y:2}));
});
test('missing, malformed and empty selection leave resources and effects unchanged',()=>{
 const b=scene().battle;
 for(const p of [null,{x:99,y:0},{x:2,y:2,rotation:45},{x:NaN,y:0},{x:0,y:0}]){
  const before=structuredClone(b);assert.ok(issueCommand(b,'zhou-redcliffs',p));assert.deepEqual(b,before);
 }
});
test('fire only applies inside rectangle and does not concentrate excluded target budget',()=>{
 const s=scene(),b=s.battle,enemy=b.sides[1].units.filter(u=>u.status==='active');
 const p={x:enemy[0].x,y:enemy[0].y};
 const clone=structuredClone(b);assert.equal(issueCommand(b,'zhou-redcliffs',p),null);
 const amount=enemy[0].statuses.burn.amount;
 const other=clone.sides[1].units.filter(u=>u.status==='active');other[0].x=2;other[0].y=2;
 assert.equal(issueCommand(clone,'zhou-redcliffs',{x:2,y:2}),null);
 assert.equal(other[0].statuses.burn.amount,amount);
 for(const u of other.slice(1))assert.equal(u.statuses.burn,undefined);
 for(const u of enemy)assert.equal(!!u.statuses.burn,stratagemAreaContains(STRATAGEMS['zhou-redcliffs'],p,u));
 const saved=validateSave(structuredClone(s));for(let i=0;i<8;i++){stepBattle(b);stepBattle(saved.battle);}assert.deepEqual(b,saved.battle);
 const broken=structuredClone(s);broken.battle.lastCommand.target.rotation=45;assert.throws(()=>validateSave(broken));
});
test('healing uses real wounded budget, excludes reserve and outside allies; AI chooses first wounded',()=>{
 const b=scene().battle,units=b.sides[0].units.filter(u=>u.status==='active'),a=units[0],z=units.at(-1);
 a.x=2;a.y=2;z.x=10;z.y=6;
 for(const u of [a,z]){u.hp-=1000;u.battleDamage+=1000;}
 assert.deepEqual(chooseStratagemPoint(b,STRATAGEMS.heal,0),{x:2,y:2,rotation:0});
 assert.equal(issueCommand(b,'heal',{x:2,y:2}),null);assert.ok(a.healed>0&&a.healed<=350);assert.equal(z.healed,0);
});
test('enemy uses identical selected geometry',()=>{
 const b=scene().battle;b.sides[1].commanders=structuredClone(b.sides[0].commanders);b.sides[1].units=structuredClone(b.sides[0].units).map(u=>({...u,side:1}));
 b.enemyCommand.commandProgress=COMMAND_RESOURCE.capacity;
 const p={x:2,y:2};b.sides[0].units[0].x=2;b.sides[0].units[0].y=2;
 assert.equal(issueCommand(b,'zhou-redcliffs',p,1),null);
 for(const u of b.sides[0].units)assert.equal(!!u.statuses.burn,u.status==='active'&&stratagemAreaContains(STRATAGEMS['zhou-redcliffs'],p,u));
});
test('demoralize affects only selected active enemies and AI chooses effective coverage',()=>{
 const holder=Object.keys(OFFICER_STRATAGEMS).find(id=>OFFICER_STRATAGEMS[id].includes('demoralize'));
 const b=scene(holder,'yu').battle,active=b.sides[1].units.filter(u=>u.status==='active'),a=active[0],z=active.at(-1);
 a.x=4;a.y=2;z.x=12;z.y=6;
 for(const u of b.sides[1].units)u.intent=80;
 const point=chooseStratagemPoint(b,STRATAGEMS.demoralize,0);
 assert.ok(active.filter(u=>stratagemAreaContains(STRATAGEMS.demoralize,point,u)).length>=active.filter(u=>stratagemAreaContains(STRATAGEMS.demoralize,{x:4,y:2},u)).length);
 assert.equal(issueCommand(b,'demoralize',{x:4,y:2}),null);
 assert.ok(a.intent<80);assert.equal(z.intent,80);
 for(const u of b.sides[1].units.filter(u=>u.status==='reserve'))assert.equal(u.intent,80);
});
