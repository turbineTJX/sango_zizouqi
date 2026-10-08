import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,issueCommand,validateSave,COMMAND_RESOURCE,activeUnits,fillSlots} from '../engine.mjs';
import {frontlineCapacity,validFrontline} from '../army-trait-rules.mjs';
import {STRATAGEMS,stratagemProfile} from '../stratagems.mjs';
import {needsCommandRefresh,commandRefresh} from '../stratagem-events.mjs';
import {tacticUsesLeft,tacticUseLimit} from '../tactic-tempo.mjs';
import {chooseEnemyCommand,rankEnemyReserves} from '../battle-ai.mjs';
import {setStatus,unitTactics,shieldAmount} from '../tactics.mjs';
const entry=id=>({id,type:'spear',troops:4000,level:10,retreatAt:null});
function scene(key,side=0,seed=11101){
 const holder=STRATAGEMS[key].roster[0],own=[holder,...['chu','dun','yuanxia','he','gao','yan','liao','jin','person-17'].filter(id=>id!==holder)].slice(0,10).map(entry),foe=['shao','wen','person-70','person-186','person-516','person-243','person-439','person-433','person-255','person-637'].filter(id=>id!==holder).slice(0,9).map(entry);
 const s=createScenario('custom-battle',seed,20,null,{seed,terrain:'land',ownTeam:side?foe:own,enemyTeam:side?own:foe,ownTeamRoles:{leader:side?foe[0].id:holder,advisor:side?foe[0].id:holder},enemyTeamRoles:{leader:side?holder:foe[0].id,advisor:side?holder:foe[0].id}}),b=s.battle;
 lockDeployment(b);if(key==='refresh'){while(!b.result&&!b.sides[side].units.some(u=>u.skillCasts>0))stepBattle(b,{aiSides:[]});assert.equal(b.result,null);}
 for(const u of b.sides.flatMap(s=>s.units)){u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'phalanx',999);}
 while(!b.result&&(side?b.enemyCommand:b).commandProgress<COMMAND_RESOURCE.capacity)stepBattle(b,{aiSides:[]});assert.equal(b.result,null);return s;
}
function continueSame(s,n=8){const copy=validateSave(structuredClone(s));for(let i=0;i<n&&!s.battle.result;i++){stepBattle(s.battle,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.deepEqual(s.battle,copy.battle);}return copy;}
for(const side of [0,1])test('real reserves exceed the shared cap once, obey queue/AI order and lose extra slots on departure, side '+side,()=>{
 const s=scene('reinforce',side),b=s.battle,own=b.sides[side],waiting=own.units.filter(u=>u.status==='reserve'),order=side?rankEnemyReserves(b,waiting,side):waiting;
 const capacity=frontlineCapacity(b,side),n=stratagemProfile('reinforce',own.commanders[0]).count;
 assert.equal(issueCommand(b,'reinforce',null,side),null);const e=own.stratagemEvents[0];assert.equal(e.units[0],order[0].id);assert.equal(e.units.length,Math.min(n,waiting.length));assert.equal(activeUnits(b,side).length,capacity+e.units.length);assert.ok(validFrontline(b,side));continueSame(s);
 const bad=structuredClone(s);bad.battle.sides[side].stratagemEvents[0].source.count=10;assert.throws(()=>validateSave(bad),/军略/);
 const extra=own.units.find(u=>u.id===e.units[0]);extra.status='withdrawn';fillSlots(b,side);assert.equal(frontlineCapacity(b,side),capacity+e.units.length-1);assert.equal(activeUnits(b,side).length,capacity+e.units.length-1);validateSave(structuredClone(s));
 (side?b.enemyCommand:b).commandProgress=COMMAND_RESOURCE.capacity;(side?b.enemyCommand:b).commandReady.reinforce=0;assert.match(issueCommand(b,'reinforce',null,side),/次数/);assert.equal(own.stratagemEvents.length,1);
});
test('future reinforcements cannot enter early; lack of reserves consumes neither gauge nor RNG',()=>{
 const s=scene('reinforce'),b=s.battle;for(const u of b.sides[0].units.filter(u=>u.status==='reserve')){u.arrivalTick=b.tick+100;u.arrivalConfirmed=false;}
 const before=structuredClone(b);assert.match(issueCommand(b,'reinforce'),/已经抵达/);assert.deepEqual(b,before);
});
for(const side of [0,1])test('whole army refresh restores legal active tactics without erasing casts, intent or recovery; deterministic reload, side '+side,()=>{
 const s=scene('refresh',side),b=s.battle,own=b.sides[side],used=own.units.filter(needsCommandRefresh);assert.ok(used.length);
 const casts=own.units.map(u=>({...u.tacticCasts})),intents=own.units.map(u=>u.intent),recovery=own.units.map(u=>u.tacticRecoveryUntil);assert.equal(issueCommand(b,'refresh',null,side),null);
 for(const u of own.units)for(const t of unitTactics(u).filter(t=>!t.passive))assert.equal(tacticUsesLeft(u,t),tacticUseLimit(u,t));
 assert.deepEqual(own.units.map(u=>u.tacticCasts),casts);assert.deepEqual(own.units.map(u=>u.intent),intents);assert.deepEqual(own.units.map(u=>u.tacticRecoveryUntil),recovery);
 assert.ok(own.units.every(u=>Object.values(u.skillReady).every(n=>n<999)));continueSame(s);
 for(const mutate of [b=>b.sides[side].stratagemEvents=[],b=>b.sides[side].stratagemEvents[0].units[0].readyAfter= {},b=>b.sides[side].units[0].tacticCommandRestored={thrust:99}]){const bad=structuredClone(s);mutate(bad.battle);assert.throws(()=>validateSave(bad),/军略|次数/);}
});
test('refresh includes specials while preserving the ordinary restoration restriction and caster cooldown difference',()=>{
 const s=scene('refresh'),u=s.battle.sides[0].units.find(u=>u.id==='liao'),special=unitTactics(u).find(t=>t.special);assert.ok(special);
 // Accounting boundary: a real equipped special, with its prior cast retained.
 u.tacticCasts[special.id]=special.maxUses;assert.equal(tacticUsesLeft(u,special),0);
 const weak=stratagemProfile('refresh',{id:'yu',leadership:60,intellect:60}),strong=stratagemProfile('refresh',{id:'yu',leadership:100,intellect:100}),a=structuredClone(u),z=structuredClone(u);
 commandRefresh(a,weak,s.battle.tick);commandRefresh(z,strong,s.battle.tick);assert.equal(tacticUsesLeft(a,special),special.maxUses);assert.equal(a.tacticCasts[special.id],special.maxUses);assert.ok(z.skillReady[special.id]<a.skillReady[special.id]);
});
for(const side of [0,1])test('random broad damage hits both armies, is reproducible and rejects altered saved rolls, side '+side,()=>{
 let friendly=0,hostile=0;
 for(const seed of [11101,11102,11103]){
  const s=scene('storm',side,seed),b=s.battle,own=b.sides[side],hp=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),before=structuredClone(s);
  assert.equal(issueCommand(b,'storm',null,side),null);assert.equal(issueCommand(before.battle,'storm',null,side),null);assert.deepEqual(before.battle,b);
  const event=own.stratagemEvents[0];assert.equal(event.strikes.length,8);friendly+=hp[side]-own.units.reduce((n,u)=>n+u.hp,0);hostile+=hp[1-side]-b.sides[1-side].units.reduce((n,u)=>n+u.hp,0);continueSame(s);
  const bad=structuredClone(s);bad.battle.sides[side].stratagemEvents[0].strikes[0].point.x=99;assert.throws(()=>validateSave(bad),/军略/);
 }
 assert.ok(friendly>0);assert.ok(hostile>0);
});
test('storm uses shared immunity and shields; an invulnerable caster may still hurt both sides',()=>{
 const s=scene('storm'),b=s.battle,targets=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');for(const u of targets)setStatus(b,u,'commandInvincible',10);
 const hp=targets.map(u=>u.hp);assert.equal(issueCommand(b,'storm'),null);assert.deepEqual(targets.map(u=>u.hp),hp);
 const shielded=scene('storm'),cb=shielded.battle;for(const u of cb.sides.flatMap(s=>s.units).filter(u=>u.status==='active'))setStatus(cb,u,'shield',30,{amount:10000,source:'probe',label:'护盾'});
 const before=cb.sides.flatMap(s=>s.units).map(u=>u.hp);assert.equal(issueCommand(cb,'storm'),null);assert.deepEqual(cb.sides.flatMap(s=>s.units).map(u=>u.hp),before);assert.ok(cb.sides.flatMap(s=>s.units).some(u=>u.status==='active'&&shieldAmount(cb,u)<10000));
});
test('new AI triggers use arrived reserves, real spent stock and a fixed enemy count; no benefit prediction',()=>{
 for(const side of [0,1]){const s=scene('reinforce',side),b=s.battle;assert.equal(chooseEnemyCommand(b,['reinforce'],STRATAGEMS,side),'reinforce');assert.equal(chooseEnemyCommand(b,['storm'],STRATAGEMS,side),'storm');assert.equal(chooseEnemyCommand(b,['refresh'],STRATAGEMS,side),null);}
});
