import {tacticHolder} from './helpers/current-battle.mjs';
import {learnFixtureTactics} from './helpers/learn-tactics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {stepBattle,lockDeployment,validateSave} from '../engine.mjs';
import {routeTo,unitTactics,TACTICS_BOOK,tacticTarget} from '../tactics.mjs';
import {zocCells,interceptorsAt} from '../engagement.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

function line(){const supportId=tacticHolder('harass','cavalry'),chargerId=tacticHolder('rush','cavalry',[supportId]);const unit=(id,type)=>({id,type,level:1,troops:3000});const state=createScenario('custom-battle',1,20,null,{seed:1,terrain:'land',ownTeam:[unit(supportId,'cavalry'),unit(chargerId,'cavalry')],enemyTeam:[unit('person-342','spear'),unit('person-186','archer')]});const b=state.battle;lockDeployment(b);const[support,charger]=b.sides[0].units,[front,rear]=b.sides[1].units;Object.assign(support,{x:3,y:3});Object.assign(charger,{x:4,y:3});Object.assign(front,{x:5,y:3});Object.assign(rear,{x:7,y:3,intent:100});for(const u of [support,charger,front,rear]){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}front.statuses.phalanx={until:999};rear.statuses.phalanx={until:999};primeTactic(support,'harass');primeTactic(charger,'rush');return{state,b,support,charger,front,rear};}

test('a real control cast opens ZOC and the next allied charge exploits it',()=>{
  const {b,support,charger,front,rear}=line();
  assert.equal(routeTo(b,charger,rear,3),null);
  assert.equal(tacticTarget(b,support,TACTICS_BOOK.harass,4),front,'support targets the blocking front over a high-intent rear');
  stepBattle(b);
  assert.equal(support.tacticCasts.harass,1);assert.equal(charger.tacticCasts.rush,1);
  assert.ok(front.hp>0);assert.ok(b.effects.some(e=>e.from===charger.id&&e.to===rear.id&&e.damage>0));
  assert.ok(front.statuses.disrupted);assert.ok(b.effects.some(e=>e.text==='突入后阵'));
});

test('overlapping ZOC still stops a charge after only one front is controlled',()=>{
  const {b,charger,front,rear}=line();
  const second={...structuredClone(front),id:'second-front',x:5,y:4};b.sides[1].units.push(second);
  assert.equal(zocCells(b).find(c=>c.x===4&&c.y===3).counts[1],2);
  stepBattle(b);assert.equal(charger.tacticCasts.rush,undefined);
  assert.equal(routeTo(b,charger,rear,3),null);
  assert.equal(zocCells(b).find(c=>c.x===4&&c.y===3).counts[1],1);
});

test('sealing the actual harasser prevents opening the blocking line',()=>{const {b,support,charger,front,rear}=line();support.statuses.seal={until:99};stepBattle(b);assert.equal(support.tacticCasts.harass||0,0);assert.equal(charger.tacticCasts.rush||0,0);assert.equal(routeTo(b,charger,rear,3),null);assert.ok(front.hp>0);});

test('control protection, silence and restored ZOC cannot be bypassed',()=>{
  for(const state of ['resolve','seal','expired']){
    const {b,charger,front,rear}=line();
    front.statuses[state==='expired'?'confuse':state]={until:state==='expired'?b.tick:99};
    assert.equal(routeTo(b,charger,rear,3),null,state);
    if(state==='resolve'){stepBattle(b);assert.equal(charger.tacticCasts.rush,undefined);}
  }
});

test('ZOC coverage uses live interceptors and respects boundaries and both sides',()=>{
  const {b,charger,front}=line();
  for(const cell of zocCells(b)){
    assert.ok(cell.x>=0&&cell.x<14&&cell.y>=0&&cell.y<8);
    for(const side of [0,1])assert.equal(cell.counts[1-side],interceptorsAt(b,{...charger,side},cell).length);
  }
  front.statuses.confuse={until:b.tick+3};assert.equal(zocCells(b).some(c=>c.counts[1]),false);
  delete front.statuses.confuse;Object.assign(front,{x:0,y:0});
  assert.equal(zocCells(b).filter(c=>c.counts[1]).length,2);
});

test('zero-intent generator trial uses natural learned tactics and resumes deterministically',()=>{
  {
    const state=createScenario('breach',1),b=state.battle;
    assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===0));
    lockDeployment(b);let openingTick=null,breakTick=null,resumed=null;
    while(!b.result){
      stepBattle(b);if(resumed)stepBattle(resumed.battle);
      if(b.effects.some(e=>e.side===0&&e.text==='拦截中断'))openingTick??=b.tick;
      if(b.sides[1].units[0].hp>0&&b.effects.some(e=>e.side===0&&e.text==='突入后阵'))breakTick??=b.tick;
      if(b.tick>=12&&!resumed)resumed=validateSave(structuredClone(state));
    }
    assert.ok(b.sides.flatMap(s=>s.units).some(u=>u.skillCasts>0));
    assert.deepEqual(resumed.battle,b);
  }
  const old=createScenario('breach');old.rulesVersion=11;assert.throws(()=>validateSave(old),/重新开始/);
});
