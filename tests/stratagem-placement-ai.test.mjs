import test from 'node:test';
import assert from 'node:assert/strict';
import {STRATAGEMS} from '../stratagems.mjs';
import {chooseStratagemPoint,stratagemAreaTargets} from '../stratagem-area.mjs';
import {areaPreview} from '../stratagem-area-view.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';

const unit=(id,x,y,side=1)=>({id,x,y,side,status:'active',hp:1000,maxHp:1000,initial:1000,battleDamage:0,battleDeserted:0,healed:0,intent:80,statuses:{}});
function fixture(){return {tick:5,commandReady:{},enemyCommand:{commandReady:{}},sides:[{units:[unit('own',2,2,0)]},{units:[unit('isolated',12,7),unit('a',4,0),unit('b',4,2),unit('c',4,4)]}]};}
test('AI improves coverage over first target and rotates rectangle, without mutating state or RNG',()=>{
 const b=fixture(),before=structuredClone(b),s=STRATAGEMS['zhou-redcliffs'];
 const point=chooseStratagemPoint(b,s,0);
 assert.deepEqual(point,{x:4,y:2,rotation:90});
 assert.equal(stratagemAreaTargets(b,s,point,0).length,3);
 assert.equal(stratagemAreaTargets(b,s,{x:12,y:7},0).length,1);
 assert.deepEqual(chooseStratagemPoint(structuredClone(b),s,0),point);assert.deepEqual(b,before);
 assert.equal(chooseEnemyCommand(b,['zhou-redcliffs','fortify'],STRATAGEMS,0),'zhou-redcliffs');
});
test('AI excludes burning, untargetable and reserve units, and skips unusable area commands',()=>{
 const b=fixture();
 for(const u of b.sides[1].units)u.statuses.burn={until:20};
 assert.equal(chooseStratagemPoint(b,STRATAGEMS['zhou-redcliffs'],0),null);
 assert.equal(chooseEnemyCommand(b,['zhou-redcliffs','fortify'],STRATAGEMS,0),'fortify');
 delete b.sides[1].units[0].statuses.burn;b.sides[1].units[0].statuses.stasis={until:20};
 assert.equal(chooseStratagemPoint(b,STRATAGEMS['zhou-redcliffs'],0),null);
 b.sides[1].units[0].statuses={};b.sides[1].units[0].status='reserve';
 assert.equal(chooseStratagemPoint(b,STRATAGEMS['zhou-redcliffs'],0),null);
});
test('heal highlights only real wounded and confirmation is disabled without useful targets',()=>{
 const b=fixture(),s=STRATAGEMS.heal;
 let preview=areaPreview(b,s,{point:{x:2,y:2}});assert.deepEqual(preview.targetIds,[]);assert.match(preview.controls,/data-area-action="confirm" disabled/);
 const u=b.sides[0].units[0];u.hp=700;u.battleDamage=300;
 preview=areaPreview(b,s,{point:{x:2,y:2}});assert.deepEqual(preview.targetIds,['own']);assert.doesNotMatch(preview.controls,/data-area-action="confirm" disabled/);
 u.healed=105;assert.equal(chooseStratagemPoint(b,s,0),null);assert.deepEqual(areaPreview(b,s,{point:{x:2,y:2}}).targetIds,[]);
 u.healed=0;u.statuses.stasis={until:20};assert.equal(chooseEnemyCommand(b,['heal'],STRATAGEMS,0),null);
});
test('protected troops are not scored or highlighted for disrupt; both sides share placement',()=>{
 const b=fixture(),s=STRATAGEMS.disrupt;
 for(const u of b.sides[1].units)u.statuses.resolve={until:20};
 assert.equal(chooseStratagemPoint(b,s,0),null);assert.deepEqual(areaPreview(b,s,{point:{x:4,y:2}}).targetIds,[]);
 b.sides[1].units[1].statuses={};b.sides[1].units[2].statuses={};
 const point=chooseStratagemPoint(b,s,0),swap=structuredClone(b);swap.sides.reverse();for(let side=0;side<2;side++)for(const u of swap.sides[side].units)u.side=side;
 assert.deepEqual(chooseStratagemPoint(swap,s,1),point);
});
