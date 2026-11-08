import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS} from '../data/design/bond-assignments.mjs';
import {TREASURE_DESIGNS} from '../data/design/treasures.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {bondAttributes,grantBondEntries} from '../bonds.mjs';
import {formationMarkers} from '../bond-battlefield.mjs';
import {bondsMarkup} from '../bond-display.mjs';
import {TACTICS_BOOK} from '../tactics.mjs';
import {STRATAGEMS} from '../engine.mjs';
const removed=['bondGuard','bondTigerFormation','bondDragonFormation'];
const scene=()=>generateBattle({...defaultCustomBattle(),seed:671828,mapId:'plain-open',ownTeam:OFFICER_CATALOG.slice(0,6).map(u=>({id:u.id,type:'spear',troops:3000,level:10})),enemyTeam:OFFICER_CATALOG.slice(6,12).map(u=>({id:u.id,type:'archer',troops:3000,level:10}))});
test('formation bonds and treasure references are removed; eight formations and phalanx remain',()=>{
 for(const id of removed){assert.equal(BOND_DESIGNS[id],undefined);assert.ok(Object.values(BOND_ASSIGNMENTS).every(a=>a[id]===undefined));assert.ok(Object.values(TREASURE_DESIGNS).every(a=>a.bondId!==id));}
 assert.equal(STRATAGEMS['zhuge-eight']?.effect,'eightFormation');assert.ok(Object.values(TACTICS_BOOK).some(s=>s.name==='方阵'));
});
test('deployment, first entry and reload never grant formation markers, attributes or shields',()=>{
 const state=scene(),b=state.battle;
 for(const side of [0,1]){assert.deepEqual(formationMarkers(b,side),[]);assert.doesNotMatch(bondsMarkup([],{battle:b,side}),/天覆|虎翼|龙飞/);}
 assert.equal(lockDeployment(b),null);grantBondEntries(b);
 for(const army of b.sides){assert.equal(army.bondFormationChoice,undefined);for(const u of army.units){assert.equal(u.bondFormation,undefined);assert.equal(u.bondOpeningFormations,undefined);assert.doesNotMatch(JSON.stringify(bondAttributes(b,u)),/阵位|虎翼|龙飞/);assert.ok((u.statuses?.shield?.layers||[]).every(l=>!l.source.startsWith('formation:')));}}
 const copy=validateSave(structuredClone(state));for(let i=0;i<20&&!b.result;i++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}assert.deepEqual(state,copy);
});
test('new saves reject forged retired formation data',()=>{
 const state=scene();lockDeployment(state.battle);
 for(const field of ['bondFormation','bondOpeningFormations']){const bad=structuredClone(state);bad.battle.sides[0].units[0][field]={};assert.throws(()=>validateSave(bad));}
 const bad=structuredClone(state);bad.battle.sides[0].bondFormationChoice=null;assert.throws(()=>validateSave(bad));
});
