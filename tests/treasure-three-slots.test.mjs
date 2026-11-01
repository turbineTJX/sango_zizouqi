import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {grantTreasure,treasureRecord,treasureOfficerRows} from '../treasures.mjs';
import {equippedTreasureIds,treasureInSlot,removeTreasureEquipment} from '../treasure-equipment.mjs';
import {defaultCustomBattle,validateCustomBattle} from '../custom-battle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {hasStatus,shieldAmount} from '../tactics.mjs';
import {treasureBondBonuses} from '../treasure-battle.mjs';
const put=(s,id)=>{for(const r of treasureOfficerRows(s))removeTreasureEquipment(r.unit,id);Object.assign(treasureRecord(s,id),{state:'treasury',factionId:'cao',cityId:null,holderId:null});};
test('weapon, mount and other equipment coexist; confirmation replaces only the occupied category',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='chenliu').units[0];
 for(const id of ['skyHalberd','redHare','brightArmor','greenDragon'])put(s,id);
 for(const id of ['skyHalberd','redHare','brightArmor'])assert.equal(grantTreasure(s,id,u.id,{replace:true}),null);
 assert.deepEqual(equippedTreasureIds(u),['skyHalberd','redHare','brightArmor']);const before=serializeCampaign(s);
 assert.match(grantTreasure(s,'greenDragon',u.id),/确认替换.*方天画戟/);assert.equal(serializeCampaign(s),before);
 assert.equal(grantTreasure(s,'greenDragon',u.id,{replace:true}),null);assert.deepEqual(equippedTreasureIds(u),['greenDragon','redHare','brightArmor']);assert.equal(treasureRecord(s,'skyHalberd').state,'treasury');assert.equal(treasureInSlot(u,'other'),'brightArmor');validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('three first-entry effects actually coexist, expire independently and resume deterministically',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureIds=['skyHalberd','redHare','brightArmor'];const s=generateBattle(d),u=s.battle.sides[0].units[0];assert.equal(u.treasureEntries,undefined);lockDeployment(s.battle);
 for(const status of ['valor','haste','shield'])assert.ok(hasStatus(s.battle,u,status));assert.equal(Object.keys(u.treasureEntries).length,3);assert.equal(shieldAmount(s.battle,u),120);
 for(const v of s.battle.sides.flatMap(s=>s.units))v.cooldown=100;const copy=validateSave(structuredClone(s));for(let i=0;i<7;i++){stepBattle(s.battle,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});}
 assert.ok(!hasStatus(s.battle,u,'valor'));assert.ok(hasStatus(s.battle,u,'haste'));assert.ok(hasStatus(s.battle,u,'shield'));assert.deepEqual(s,copy);
 for(let i=0;i<2;i++)stepBattle(s.battle,{aiSides:[]});assert.ok(!hasStatus(s.battle,u,'haste'));assert.ok(!hasStatus(s.battle,u,'shield'));validateSave(s);
});
test('two different source layers of the same entry status do not overwrite each other',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureIds=['blueSteel','shadow','medicineBook'];const s=generateBattle(d),u=s.battle.sides[0].units[0];lockDeployment(s.battle);assert.equal(u.statuses.phase.sources.length,2);assert.ok(hasStatus(s.battle,u,'regrowth'));validateSave(s);
});
test('weapon and book bonuses share the individual six-point budget and never create unlearned bonds',()=>{
 const u={treasureIds:['redFirmament','redHare','artOfWar']};assert.deepEqual(treasureBondBonuses(u,{bondPower:2,bondScholar:2}),[{id:'bondPower',points:1},{id:'bondScholar',points:1}]);assert.equal(treasureBondBonuses(u,{bondPower:2,bondScholar:2,bondGuard:1}).length,1);assert.deepEqual(treasureBondBonuses(u,{bondGuard:1}),[]);
});
test('custom battles reject two items of one category and duplicates across armies',()=>{
 const d=defaultCustomBattle();d.ownTeam[0].treasureIds=['skyHalberd','greenDragon'];assert.throws(()=>validateCustomBattle(d),/宝物/);d.ownTeam[0].treasureIds=['skyHalberd','redHare','brightArmor'];d.enemyTeam[0].treasureIds=['redHare'];assert.throws(()=>validateCustomBattle(d),/宝物/);
});
