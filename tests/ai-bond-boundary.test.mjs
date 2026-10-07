import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {planEnemyArmy,rankEnemyReserves} from '../battle-ai.mjs';
import {reserveDeploymentUnit,deployUnit,fillSlots,lockDeployment,validateSave} from '../engine.mjs';
import {sideBonds} from '../bonds.mjs';
import {formationCells} from '../bond-battlefield.mjs';
import {OFFICER_DESIGNS} from '../data/design/officers.mjs';

const id=name=>Object.values(OFFICER_DESIGNS).find(o=>o.name===name).id;
const team=names=>names.map(name=>({id:id(name),troops:3000,type:'spear',level:10}));
const positions=b=>b.sides[1].units.map(u=>({id:u.id,status:u.status,x:u.x,y:u.y,formation:u.formation}));

test('AI retains basic deployment and can use an already active formation without changing its selected troops',()=>{
 const state=generateBattle({seed:17711,terrain:'land',battleKind:'field',limit:480,
  ownTeam:team(['刘备','关羽','张飞']),enemyTeam:team(['曹仁','郝昭','霍峻','罗宪','于禁','王平'])});
 const b=state.battle,before=structuredClone(b.sides[0]),seed=b.seed;
 assert.equal(sideBonds(b,1).bondGuard.tier,3);
 const roster=b.sides[1].units.map(u=>({id:u.id,status:u.status,tactics:[...u.tactics]}));
 const growth=b.sides[1].units.map(u=>structuredClone(u.bondGrowth));
 planEnemyArmy(b);
 assert.deepEqual(b.sides[1].units.map(u=>({id:u.id,status:u.status,tactics:[...u.tactics]})),roster);
 const marks=formationCells(b,1);
 assert.ok(b.sides[1].units.some(u=>u.status==='active'&&marks.some(p=>p.x===u.x&&p.y===u.y)));
 const placed=positions(b);planEnemyArmy(b);assert.deepEqual(positions(b),placed);
 assert.deepEqual(b.sides[0],before);assert.equal(b.seed,seed);
 assert.deepEqual(b.sides[1].units.map(u=>u.bondGrowth),growth);
 lockDeployment(b);assert.equal(sideBonds(b,1).bondGuard.tier,3);
 validateSave(structuredClone(state));
});

test('AI fills a missing role without chasing maximum Beauty; a legal player choice can complete it',()=>{
 const starters=['吕布','张辽','甄氏','大乔','小乔'];
 const own=[['吕布',3000,'halberd'],['张辽',3000,'halberd'],['甄氏',1000,'archer'],['大乔',1000,'archer'],['小乔',1000,'archer'],['高顺',7000,'cavalry'],['貂蝉',1000,'archer']]
  .map(([name,troops,type])=>({id:id(name),troops,type,level:10}));
 const state=generateBattle({seed:17711,terrain:'land',battleKind:'field',limit:480,
  ownTeam:own,enemyTeam:[{id:'cao',troops:6000,type:'spear',level:10}]}),b=state.battle;
 for(const u of b.sides[0].units.filter(u=>u.status==='active'))assert.equal(reserveDeploymentUnit(b,u.id),null);
 starters.forEach((name,i)=>assert.equal(deployUnit(b,id(name),3,i),null));
 assert.deepEqual(sideBonds(b,0).bondBeauty,{points:3,tier:2});
 const original=structuredClone(b),diagnostic=structuredClone(b);
 for(const u of diagnostic.sides[0].units)u.bondGrowth.levels={};
 const ranking=rankEnemyReserves(b,b.sides[0].units,0).map(u=>u.id);
 assert.deepEqual(ranking,rankEnemyReserves(diagnostic,diagnostic.sides[0].units,0).map(u=>u.id));
 assert.equal(ranking[0],id('高顺'));assert.deepEqual(b,original);
 const player=structuredClone(state);
 fillSlots(b,0,{ai:true});assert.deepEqual(sideBonds(b,0).bondBeauty,{points:3,tier:2});
 assert.equal(deployUnit(player.battle,id('貂蝉'),2,3),null);
 assert.deepEqual(sideBonds(player.battle,0).bondBeauty,{points:5,tier:3});
 lockDeployment(b);lockDeployment(player.battle);
 validateSave(structuredClone(state));validateSave(structuredClone(player));
});
