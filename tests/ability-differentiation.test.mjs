import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {unitTactics,setStatus,hasStatus,shieldAmount} from '../tactics.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {detected,remedy,breakStealth} from '../battle-status-rules.mjs';
import {holdsLine} from '../engagement.mjs';

const entry=(id,type,troops=3000)=>({id,type,troops,level:1,retreatAt:null});
function scene(id,type='cavalry',side=0,seed=17){
 const own=[entry(id,type),entry('person-1','halberd',1500)],enemy=[entry('shao','spear'),entry('tian','archer',1800)];
 const state=createScenario('custom-battle',seed,20,null,{seed,terrain:type==='ship'?'river':'land',ownTeam:side?enemy:own,enemyTeam:side?own:enemy});
 const b=state.battle;lockDeployment(b);const [u,ally]=b.sides[side].units,[target,rear]=b.sides[1-side].units;
 for(const v of b.sides.flatMap(s=>s.units)){v.intent=0;v.cooldown=999;v.skillReady=Object.fromEntries(unitTactics(v).map(t=>[t.id,999]));setStatus(b,v,'root',999);}
 Object.assign(u,{x:4,y:3});Object.assign(ally,{x:4,y:4});Object.assign(target,{x:5,y:3});Object.assign(rear,{x:7,y:3});
 return {state,b,u,ally,target,rear};
}
function cast(x,id){assert.ok(unitTactics(x.u).some(t=>t.id===id),'legal fixed kit '+id);x.u.intent=100;x.u.skillReady[id]=0;stepBattle(x.b);assert.equal(x.u.tacticCasts[id],1);}
function resume(x){const copy=validateSave(structuredClone(x.state));for(let i=0;i<10;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.b,copy.battle);}

for(const side of [0,1])test('fixed replacements apply real plague, short range and decoy on side '+side,()=>{
 const a=scene('jia','ram',side);cast(a,'blight');assert.ok(hasStatus(a.b,a.target,'plague'));assert.equal(hasStatus(a.b,a.target,'attackSlow'),false);resume(a);
 const b=scene('jia','tower',side);b.target.x=10;const range=unitAttributes(b.rear,b.b).range;cast(b,'cutRange');assert.ok(hasStatus(b.b,b.rear,'shortRange'));assert.equal(unitAttributes(b.rear,b.b).range,range-1);resume(b);
 const c=scene('jia','crossbow',side);c.ally.hp=140;c.ally.battleDamage=c.ally.initial-140;cast(c,'mirage');assert.ok(hasStatus(c.b,c.ally,'decoy'));assert.ok(hasStatus(c.b,c.ally,'stasis'));assert.ok(hasStatus(c.b,c.ally,'stasisLock'));resume(c);
});
test('Ma Chao roots through a legal special, preserves ZOC and respects resolve',()=>{
 let found=false;
 for(let seed=1;seed<=25&&!found;seed++){const x=scene('person-516','cavalry',0,seed);delete x.target.statuses.root;cast(x,'unique-person-516');assert.equal(hasStatus(x.b,x.target,'armorBreak'),false);if(hasStatus(x.b,x.target,'root')){found=true;assert.ok(holdsLine(x.b,x.target));assert.equal(unitAttributes(x.target,x.b).move,0);resume(x);}}
 assert.ok(found);
 const x=scene('person-516');delete x.target.statuses.root;setStatus(x.b,x.target,'resolve',10);cast(x,'unique-person-516');assert.equal(hasStatus(x.b,x.target,'root'),false);
});
test('Sun Ce trades armor break and ward for attack haste',()=>{
 const x=scene('person-371');const interval=unitAttributes(x.u,x.b).attackInterval;cast(x,'unique-person-371');assert.ok(hasStatus(x.b,x.u,'attackHaste'));assert.equal(unitAttributes(x.u,x.b).attackInterval,interval*.8);assert.equal(hasStatus(x.b,x.target,'armorBreak'),false);assert.equal(hasStatus(x.b,x.u,'ward'),false);assert.ok(x.ally.intent>0);resume(x);
});
test('Liu Bei supplies bounded regrowth and shields instead of instant healing and camp',()=>{
 const x=scene('person-636','spear');x.ally.hp-=600;x.ally.battleDamage=600;const hp=x.ally.hp;cast(x,'unique-person-636');assert.ok(hasStatus(x.b,x.ally,'regrowth'));assert.ok(shieldAmount(x.b,x.ally)>0);assert.equal(x.ally.hp,hp);assert.equal(hasStatus(x.b,x.ally,'camp'),false);stepBattle(x.b);assert.ok(x.ally.hp>hp);assert.ok(x.ally.hp-hp<=600*.35);resume(x);
 const y=scene('person-636','spear');y.u.intent=100;y.u.skillReady['unique-person-636']=0;stepBattle(y.b);assert.equal(y.u.tacticCasts['unique-person-636']||0,0);
});
test('Xu Shu no longer receives retired identity insight at level one',()=>{const x=scene('person-294','spear');setStatus(x.b,x.target,'stealth',8);stepBattle(x.b);assert.equal(hasStatus(x.b,x.u,'insight'),false);assert.equal(x.u.traitState['hero-person-294:0'],undefined);resume(x);});
test('Gan Ning does not retain retired automatic stealth or haste identity effects',()=>{const x=scene('person-119');x.u.cooldown=0;stepBattle(x.b);assert.equal(hasStatus(x.b,x.u,'stealth'),false);assert.equal(hasStatus(x.b,x.u,'attackHaste'),false);assert.equal(x.u.traitState['hero-person-119:1'],undefined);resume(x);});
test('anchored gives basic range only with zero movement and no damage reduction',()=>{
 const x=scene('person-246','ship');const before=unitAttributes(x.u,x.b);cast(x,'anchor');assert.ok(hasStatus(x.b,x.u,'anchored'));const after=unitAttributes(x.u,x.b);assert.equal(after.range,before.range+1);assert.equal(after.move,0);assert.equal(after.damageReduction,before.damageReduction);remedy(x.b,x.u,'breakFormation');assert.equal(unitAttributes(x.u,x.b).range,before.range);
});
