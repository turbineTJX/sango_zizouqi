import test from 'node:test';
import assert from 'node:assert/strict';
import {stepBattle,unitAttributes} from '../engine.mjs';
import {TACTICS_BOOK,statusPower,setStatus,unitTactics} from '../tactics.mjs';
import {tacticPowerValue,criticalChance} from '../tactic-power.mjs';
import {tacticUsesLeft} from '../tactic-tempo.mjs';
import {TROOP_TACTIC_REPERTOIRES} from '../data/design/assignments.mjs';
import {TACTIC_DESIGNS} from '../data/design/tactics.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {DESIGN_TABLES,validateDesignTables} from '../design-catalog.mjs';
import {currentBattle,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';

const weapons={ram:'ram',heavyRam:'ram',siege:'bombard',tower:'siegeVolley'};
test('tactic and bond names never collide, and future collisions fail validation',()=>{
 const names=new Set(Object.values(BOND_DESIGNS).map(b=>b.name));
 for(const s of Object.values(TACTIC_DESIGNS)){assert.equal(names.has(s.name),false,s.name);assert.ok(['force','intellect','politics'].includes(s.category));}
 for(const name of names){const copy=structuredClone(DESIGN_TABLES);copy.tactics.ward.name=name;assert.ok(validateDesignTables(copy).some(e=>e.includes('战法与羁绊名称不能重复')));}
 assert.deepEqual(['doubt','lure','gallop','bodyguard','chain','harass'].map(id=>TACTICS_BOOK[id].name),['惑敌','牵引','奔袭','援护','连锁','挫敌']);
});

test('siege forms have exactly one combined-power large action while ships cover three powers',()=>{
 for(const [type,id] of Object.entries(weapons)){
  assert.equal(TROOP_TACTIC_REPERTOIRES[type].small.length,3);assert.deepEqual(TROOP_TACTIC_REPERTOIRES[type].large,[id]);
  assert.equal(TACTICS_BOOK[id].powerSource,'combined');
 }
 for(const type of ['ship','mengchong','louShip','fightingShip'])assert.equal(TROOP_TACTIC_REPERTOIRES[type].large.length,3);
 assert.equal(TACTICS_BOOK.repeat.powerSource,undefined,'ordinary crossbows do not inherit the siege power rule');
 const copy=structuredClone(DESIGN_TABLES);copy.tactics.ram.powerSource='force';assert.ok(validateDesignTables(copy).some(e=>e.includes('合成威力')));
});

function scene(type,side=0,force=80,intellect=20){
 const id=weapons[type],x=currentBattle(id,type,{side});Object.assign(x.u,{force,intellect,commandBonus:0,advisorBonus:0});
 for(const unit of x.b.sides.flatMap(s=>s.units))setStatus(x.b,unit,'root',999);
 readyCurrent(x,id);return x;
}
function cast(x,id){stepBattle(x.b);while(x.u.tacticAim&&!x.b.result)stepBattle(x.b);return x.b.effects.filter(e=>e.from===x.u.id&&e.label===TACTICS_BOOK[id].name&&e.damage>0);}

for(const [type,id] of Object.entries(weapons))for(const side of [0,1])test(`${type}, side ${side}: current derived powers jointly drive real damage, criticals and shared stocks`,()=>{
 function run(force,intellect){const x=scene(type,side,force,intellect),attributes=unitAttributes(x.u,x.b),power=(attributes.martialPower+attributes.strategyPower)/2;
  assert.equal(statusPower(x.u,TACTICS_BOOK[id],x.b),power);
  const started=x.b.tick+1,hits=cast(x,id);assert.ok(hits.length>0,type);
  assert.equal(x.u.tacticCasts[id],1);assert.equal(x.u.skillReady[id],started+TACTICS_BOOK[id].cooldown);
  for(const hit of hits)assert.equal(hit.critChance,criticalChance(power));
  return {x,damage:hits.reduce((n,e)=>n+e.damage,0)};
 }
 const martial=run(80,20),strategy=run(20,80),low=run(20,20),high=run(80,80);
 assert.equal(martial.damage,strategy.damage,'equal current combined powers produce equal seeded damage');
 assert.ok(martial.damage>low.damage);assert.ok(strategy.damage>low.damage);assert.ok(high.damage>martial.damage);
 // Equipment and the original troop form continue sharing the high slot.
 martial.x.u.formType=null;const original=unitTactics(martial.x.u).find(s=>s.learningTier==='high');
 if(original)assert.equal(tacticUsesLeft(martial.x.u,original),0);
 // Persistence uses an unmodified real officer and a real carried form.
 const x=currentBattle(id,type,{side});readyCurrent(x,id);cast(x,id);resumeCurrent(x);
});

test('combined power reads live modifiers and troops rather than recomputing raw officer stats',()=>{
 const x=scene('siege'),s=TACTICS_BOOK.bombard,before=unitAttributes(x.u,x.b);
 assert.equal(tacticPowerValue(before,s),(before.martialPower+before.strategyPower)/2);
 setStatus(x.b,x.u,'nexus',20);const supported=unitAttributes(x.u,x.b);
 assert.equal(supported.martialPower,before.martialPower);assert.ok(supported.strategyPower>before.strategyPower);
 assert.equal(statusPower(x.u,s,x.b),(supported.martialPower+supported.strategyPower)/2);
 assert.ok(statusPower(x.u,s,x.b)>tacticPowerValue(before,s));
 setStatus(x.b,x.u,'powerDown',20,{fraction:.2});const weakened=unitAttributes(x.u,x.b);
 assert.equal(statusPower(x.u,s,x.b),(weakened.martialPower+weakened.strategyPower)/2);
 const full=statusPower(x.u,s,x.b);x.u.hp/=2;assert.equal(statusPower(x.u,s,x.b),full/2);
});

test('political support retains its current support power instead of becoming strategy power',()=>{
 const x=scene('siege'),s=TACTICS_BOOK.bandage;
 for(const id of ['bandage','camp','regrowth']){assert.equal(TACTICS_BOOK[id].category,'politics');assert.equal(TACTICS_BOOK[id].power.attribute,'supportPower');}
 const before=statusPower(x.u,s,x.b);x.u.politics+=20;const current=unitAttributes(x.u,x.b);
 assert.ok(statusPower(x.u,s,x.b)>before);assert.equal(statusPower(x.u,s,x.b),current.supportPower);assert.notEqual(statusPower(x.u,s,x.b),current.strategyPower);
});
