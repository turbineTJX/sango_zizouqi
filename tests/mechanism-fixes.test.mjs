import {equipmentEntry,readyCurrent,resumeCurrent} from './helpers/current-battle.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave,issueCommand,syncCombatForm} from '../engine.mjs';
import {grantBondEntries,validBondEntry} from '../bonds.mjs';
import {TACTICS_BOOK,tacticTarget} from '../tactics.mjs';
const unit=(id,type='spear')=>({...equipmentEntry(id,type),troops:2000,level:5});
for(const side of [0,1])test(`short range naturally fires at normal tower distance, side ${side}, with finite uses and replay`,()=>{
 const a=[unit('person-2','tower'),unit('cao')].map(u=>({...u,troops:5000,level:10})),z=[unit('shao','archer'),unit('dun')].map(u=>({...u,troops:5000,level:10}));
 const state=generateBattle({seed:810001,terrain:'land',battleKind:side?'defense':'siege',shieldPercent:0,gateHp:60000,ownTeam:side?z:a,enemyTeam:side?a:z}),b=state.battle;lockDeployment(b);
 const u=b.sides[side].units.find(u=>u.id==='person-2');assert.ok(u.equipment.siege==='tower');const positions=[[9,3],[7,1],[11,1],[11,5]];for(const [i,v]of [...b.sides[side].units,...b.sides[1-side].units].entries()){v.retreatAt=null;v.x=side?13-positions[i][0]:positions[i][0];v.y=side?7-positions[i][1]:positions[i][1];}syncCombatForm(b,u,b.siege.gate);
 let copy;while(!b.result){stepBattle(b);if(copy)stepBattle(copy.battle);if(!copy&&u.tacticCasts.cutRange)copy=validateSave(structuredClone(state));}
 assert.ok(copy);assert.ok(u.tacticCasts.cutRange>=1&&u.tacticCasts.cutRange<=2);assert.deepEqual(copy.battle,b);validateSave(state);
});
test('short range targets remote troops within four hexes without growing its range or hitting melee',()=>{
 const {b,u,target:r,rear:m}=currentBattle('cutRange','tower',{requireS:true,enemyTypes:['archer','spear']});Object.assign(r,{x:u.x+4,y:u.y});Object.assign(m,{x:u.x-1,y:u.y});
 assert.equal(tacticTarget(b,u,TACTICS_BOOK.cutRange,4),r);r.x++;assert.equal(tacticTarget(b,u,TACTICS_BOOK.cutRange,4),null);
});
for(const side of [0,1])test(`unentered reserves withdraw without entry rewards, side ${side}, and entered snapshots remain mandatory`,()=>{
 const a=['shao','yan','wen','he','ju','tian','gao','jin'].map(id=>unit(id)),z=[unit('cao')];const state=generateBattle({seed:86,terrain:'land',ownTeam:side?z:a,enemyTeam:side?a:z}),b=state.battle;lockDeployment(b);
 const reserves=b.sides[side].units.filter(u=>u.status==='reserve'),starter=b.sides[side].units.find(u=>u.status==='active');assert.equal(reserves.length,2);assert.equal(issueCommand(b,'retreat',null,side),null);
 grantBondEntries(b);for(const u of reserves){assert.equal(u.status,'withdrawn');assert.equal(u.bondEntry,undefined);assert.equal(u.bondEquipment,undefined);assert.ok(validBondEntry(b,u));}
 assert.ok(starter.bondEntry);const bad=structuredClone(starter);delete bad.bondEntry;delete bad.bondFormation;delete bad.bondEquipment;assert.equal(validBondEntry(b,bad),false);
 const forged=structuredClone(reserves[0]);forged.x=0;assert.equal(validBondEntry(b,forged),false);forged.x=-1;forged.participated=true;assert.equal(validBondEntry(b,forged),false);
 const copy=validateSave(structuredClone(state));while(!b.result){stepBattle(b);stepBattle(copy.battle);}assert.deepEqual(copy.battle,b);validateSave(state);
});
import {currentBattle} from './helpers/current-battle.mjs';
for(const side of [0,1])test(`unreachable rear focus attacks its blocking line without a disengagement loop, side ${side}`,()=>{
 const {state,b,u,ally}=currentBattle('rush','cavalry',{side,requireS:true,enemyTypes:['spear','spear','spear','spear','archer']});
 const wall=b.sides[1-side].units.slice(0,4),rear=b.sides[1-side].units[4];Object.assign(ally,{x:0,y:7});wall.forEach((v,i)=>{Object.assign(v,{x:5,y:1+i*2});v.statuses.phalanx={until:999};});Object.assign(rear,{x:7,y:3,hp:300,battleDamage:2700});rear.statuses.phalanx={until:999};u.x=1;u.cooldown=0;b.sides[side].focus=rear.id;b.sides[side].focusUntil=99;
 if(side)for(const v of b.sides.flatMap(s=>s.units)){v.x=13-v.x;v.y=7-v.y;}
 const copy=validateSave(structuredClone(state));let contact=false;for(let i=0;i<13&&!contact;i++){stepBattle(b);stepBattle(copy.battle);contact=b.effects.some(e=>e.from===u.id&&e.damage>0&&wall.some(v=>v.id===e.to));}
 assert.ok(contact);assert.equal(rear.hp,300);assert.deepEqual(copy.battle,b);
});
