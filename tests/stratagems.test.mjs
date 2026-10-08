import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,orderArmy,advanceTurn,startBattle,lockDeployment,stepBattle,issueCommand,validateSave,settleBattle,armyCommanders,armyStratagems,battleStratagems,commandIntellect,COMMAND_RESOURCE,battleWounded,activeUnits} from '../engine.mjs';
import {STRATAGEMS,selectStratagemSource} from '../stratagems.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {setStatus,unitTactics,hasStatus} from '../tactics.mjs';
import {createScenario} from '../scenarios.mjs';
import {appointTestCommanders} from './helpers/commanders.mjs';
const full=COMMAND_RESOURCE.capacity;
function scene(leader='cao',advisor='jia'){const s=newGame();appointTestCommanders(s,leader,advisor);orderArmy(s,'a1','guandu');advanceTurn(s);startBattle(s);lockDeployment(s.battle);return s;}
function still(b){for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}}
function wound(u,amount){u.hp-=amount;u.battleDamage+=amount;}
test('single gauge starts empty, uses active intellect, holds one charge and resets only on success',()=>{
 const b=scene().battle;still(b);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'cao-wuchao'));
 stepBattle(b);assert.equal(b.commandProgress,commandIntellect(b));
 const a=activeUnits(b,0).find(u=>!b.sides[0].commanders.some(c=>c.id===u.id));a.status='withdrawn';
 const before=b.commandProgress;stepBattle(b);assert.equal(b.commandProgress-before,commandIntellect(b));
 while(b.commandProgress<full)stepBattle(b);for(let i=0;i<10;i++)stepBattle(b);assert.equal(b.commandProgress,full);
 assert.equal(issueCommand(b,'cao-wuchao'),null);assert.equal(b.commandProgress,0);assert.ok(issueCommand(b,'swift',chooseStratagemPoint(b,STRATAGEMS.swift,0)));
 stepBattle(b);assert.equal(b.commandProgress,commandIntellect(b));
});
test('leader and advisor union is sparse, duplicates collapse, unassigned officers unlock nothing',()=>{
 const s=scene(),a=s.armies[0],b=s.battle;assert.deepEqual(battleStratagems(b),armyStratagems(a));
 b.commandProgress=full;assert.match(issueCommand(b,'heal',{x:2,y:2}),/未掌握/);assert.equal(b.commandProgress,full);
 a.leader='yu';a.advisor='yu';assert.deepEqual(armyStratagems(a),['refresh']);assert.equal(armyCommanders(a).length,2);
 const changed=scene('person-368','person-668');assert.deepEqual(new Set(battleStratagems(changed.battle)),new Set(['fortify','heal']));
});
test('healing uses wounded budget, never heals dead or reserves, and settlement does not duplicate it',()=>{
 const s=scene('cao','person-668'),b=s.battle;b.commandProgress=full;
 assert.ok(issueCommand(b,'heal',chooseStratagemPoint(b,STRATAGEMS.heal,0)));assert.equal(b.commandProgress,full);
 const u=b.sides[0].units[0];wound(u,1000);const reserve=b.sides[0].units.find(u=>u.status==='reserve');wound(reserve,500);
 const dead=b.sides[0].units[1];wound(dead,dead.hp);dead.status='defeated';assert.equal(battleWounded(u),350);
 assert.equal(issueCommand(b,'heal',chooseStratagemPoint(b,STRATAGEMS.heal,0)),null);assert.equal(u.hp,2350);assert.equal(u.healed,350);assert.equal(battleWounded(u),0);assert.equal(reserve.hp,2500);assert.equal(dead.hp,0);
 b.commandProgress=full;const before=structuredClone(b);assert.match(issueCommand(b,'heal',{x:u.x,y:u.y}),/冷却/);assert.deepEqual(b,before);
 b.result={winner:0,reason:'击溃'};const report=settleBattle(s);for(const side of report.stats)assert.equal(side.initial,side.remaining+side.wounded+side.killed);
 assert.equal(s.armies[0].units[0].troops,2350);assert.equal(s.armies[0].units[0].wounded,0);
});
test('a legitimate reserve advisor can heal active troops without invalid off-board visual origins in saves',()=>{
 const s=scene('cao','person-668'),b=s.battle,u=b.sides[0].units.find(u=>u.status==='active');
 assert.equal(b.sides[0].units.find(u=>u.id==='person-668').status,'reserve');wound(u,1000);b.commandProgress=full;
 assert.equal(issueCommand(b,'heal',{x:u.x,y:u.y}),null);validateSave(structuredClone(s));assert.ok(b.effects.filter(e=>e.healing).every(e=>e.fromX>=0&&e.fromY>=0));
});
test('fire uses declared ticks, shields absorb loss, no intent income, and broad dispel clears it',()=>{
 const b=scene('person-246','jia').battle;still(b);b.commandProgress=full;assert.equal(issueCommand(b,'zhou-redcliffs',chooseStratagemPoint(b,STRATAGEMS['zhou-redcliffs'],0)),null);
 const u=b.sides[1].units[0],ticks=STRATAGEMS['zhou-redcliffs'].duration,amount=u.statuses.burn.amount;
 setStatus(b,u,'shield',99,{amount:30,source:'test',label:'护盾'});const hp=u.hp;for(let i=0;i<ticks;i++)stepBattle(b);
 assert.equal(u.hp,hp-amount*ticks+30);assert.equal(u.intent,0);const end=u.hp;stepBattle(b);assert.equal(u.hp,end);
 const cb=scene('cao','person-462').battle,own=cb.sides[0].units[0];setStatus(cb,own,'burn',12,{amount:18,sourceId:cb.sides[1].units[0].id});cb.commandProgress=full;
 assert.equal(issueCommand(cb,'cleanse',{x:own.x,y:own.y}),null);assert.equal(own.statuses.burn,undefined);assert.ok(hasStatus(cb,own,'resolve'));
});
for(const status of ['defeated','withdrawn'])for(const side of [0,1])test('departed commander loses only their repertoire: '+status+' side '+side,()=>{
 const b=scene().battle;if(side){b.sides.reverse();for(let n=0;n<2;n++)for(const u of b.sides[n].units)u.side=n;}
 const holder=b.sides[side].units.find(u=>u.id==='cao');holder.status=status;if(status==='defeated')holder.hp=0;
 const resource=side?b.enemyCommand:b;resource.commandProgress=full;assert.ok(!battleStratagems(b,side).includes('cao-wuchao'));
 assert.ok(issueCommand(b,'cao-wuchao',null,side));assert.equal(resource.commandProgress,full);assert.ok(battleStratagems(b,side).includes('reinforce'));
});
test('same-name falls back to remaining eligible source, saves resume and old rules are rejected',()=>{
 const entry=id=>({id,type:'spear',troops:3000,level:5}),s=createScenario('custom-battle',10801,20,null,{seed:10801,terrain:'land',ownTeam:['person-368','person-637','dun'].map(entry),enemyTeam:['shao','wen','yan'].map(entry),ownTeamRoles:{leader:'person-368',advisor:'person-637'}});lockDeployment(s.battle);const b=s.battle,strong=selectStratagemSource(b.sides[0].commanders,'fortify');
 b.sides[0].units.find(u=>u.id===strong.id).status='withdrawn';const expected=selectStratagemSource(b.sides[0].commanders.filter(c=>c.id!==strong.id),'fortify');
 b.commandProgress=full;assert.equal(issueCommand(b,'fortify',chooseStratagemPoint(b,STRATAGEMS.fortify,0)),null);assert.equal(b.lastCommand.source.id,expected.id);
 const copy=validateSave(structuredClone(s));for(let i=0;i<12;i++){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(b,copy.battle);
 const old=structuredClone(s);old.rulesVersion=107;assert.throws(()=>validateSave(old),/重新开始/);
});
