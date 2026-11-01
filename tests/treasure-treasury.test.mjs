import {equippedTreasureIds,treasureSlot,removeTreasureEquipment} from '../treasure-equipment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {grantTreasure,storeTreasure,treasureRecord,treasureOfficerRows,treasureLocation,validateTreasures} from '../treasures.mjs';
import {noteTalentCityCapture} from '../talent-lifecycle.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment} from '../engine.mjs';
import {hasStatus} from '../tactics.mjs';
import {fateRoll,officerLossResult,resolveOfficerLoss} from '../officer-fates.mjs';
const fail=(ok,message)=>assert.ok(ok,message);
const put=(s,id,faction)=>{for(const r of treasureOfficerRows(s))if(equippedTreasureIds(r.unit).includes(id))removeTreasureEquipment(r.unit,id);return Object.assign(treasureRecord(s,id),{state:'treasury',holderId:null,cityId:null,factionId:faction});};
test('every opening holder has one equipped original per category and all surplus treasures enter their faction treasury',()=>{
 const s=newCampaign(7),rows=treasureOfficerRows(s),items=s.campaign.treasures.items;
 for(const r of rows){const held=items.filter(t=>t.state==='person'&&t.holderId===r.unit.id);assert.ok(held.length<=3);assert.equal(new Set(held.map(t=>treasureSlot(t.id))).size,held.length);assert.deepEqual(new Set(equippedTreasureIds(r.unit)),new Set(held.map(t=>t.id)));}
 assert.equal(treasureRecord(s,'heavenSword').state,'treasury');assert.equal(treasureRecord(s,'heavenSword').factionId,'cao');validateCampaign(JSON.parse(serializeCampaign(s)));
 const broken=structuredClone(s),cao=treasureOfficerRows(broken).find(r=>r.unit.id==='cao');Object.assign(treasureRecord(broken,'heavenSword'),{state:'person',holderId:cao.unit.id,cityId:null});assert.throws(()=>validateCampaign(broken),/一件|一致/);
});
test('national treasury survives an ordinary city loss and transfers all owned originals exactly once on extinction',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='xuchang').units[0];put(s,'brightArmor','cao');assert.equal(grantTreasure(s,'brightArmor',u.id,{replace:true}),null);put(s,'artOfWar','cao');
 const cities=s.cities.filter(c=>c.owner==='cao'),first=cities.shift();first.owner='yuan';noteTalentCityCapture(s,'cao','yuan','one-city');assert.equal(treasureRecord(s,'artOfWar').factionId,'cao');assert.ok(equippedTreasureIds(u).includes('brightArmor'));
 const original=s.campaign.treasures.items.filter(t=>treasureLocation(s,t).faction==='cao').map(t=>t.id);
 for(const c of cities)c.owner='yuan';noteTalentCityCapture(s,'cao','yuan','last-city');
 for(const id of original){const t=treasureRecord(s,id);assert.equal(t.state,'treasury');assert.equal(t.factionId,'yuan');assert.equal(t.holderId,null);}
 assert.deepEqual(equippedTreasureIds(u),[]);assert.equal(s.campaign.treasures.items.length,70);validateTreasures(s,fail);
 const snapshot=JSON.stringify(s.campaign.treasures);noteTalentCityCapture(s,'cao','yuan','last-city');assert.equal(JSON.stringify(s.campaign.treasures),snapshot);
});
test('extinction removes treasure effects from a different live battle',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='xuchang').units[0];put(s,'brightArmor','cao');grantTreasure(s,'brightArmor',u.id,{replace:true});
 const d=defaultCustomBattle();d.ownTeam[0].id=u.id;d.ownTeam[0].treasureId='brightArmor';const b=generateBattle(d).battle;lockDeployment(b);
 s.campaign.battles.push({id:'live',settled:false,battle:b});assert.ok(hasStatus(b,b.sides[0].units[0],'shield'));
 for(const c of s.cities.filter(c=>c.owner==='cao'))c.owner='yuan';noteTalentCityCapture(s,'cao','yuan','live-extinction');
 assert.deepEqual(equippedTreasureIds(b.sides[0].units[0]),[]);assert.deepEqual(b.sides[0].units[0].treasureEntries,{});assert.ok(!hasStatus(b,b.sides[0].units[0],'shield'));validateTreasures(s,fail);
});
test('an actual captive keeps its fate when the sealed original transfers to the conquering treasury',()=>{
 const s=newCampaign(7),c=s.cities.find(c=>c.id==='xuchang'),u=c.units.find(u=>u.id!==c.governor);put(s,'brightArmor','cao');assert.equal(grantTreasure(s,'brightArmor',u.id,{replace:true}),null);
 const eventId=Array.from({length:1000},(_,i)=>'treasury-captive:'+i).find(id=>officerLossResult(fateRoll(s,id),'yuan')==='CAPTIVE');assert.ok(eventId);
 assert.equal(resolveOfficerLoss(s,{unit:u,faction:'cao',location:c.id,enemy:'yuan',eventId}),'CAPTIVE');assert.equal(treasureRecord(s,'brightArmor').state,'captive');
 for(const c of s.cities.filter(c=>c.owner==='cao'))c.owner='yuan';noteTalentCityCapture(s,'cao','yuan','captive-extinction');assert.equal(treasureRecord(s,'brightArmor').state,'treasury');assert.equal(treasureRecord(s,'brightArmor').factionId,'yuan');assert.equal(s.campaign.domestic.people.find(p=>p.id===u.id).status,'CAPTIVE');assert.deepEqual(equippedTreasureIds(u),[]);validateTreasures(s,fail);
});
test('returning a granted treasure releases the officer slot and creates no city inventory',()=>{
 const s=newCampaign(7),u=s.cities.find(c=>c.id==='chenliu').units[0];put(s,'brightArmor','cao');assert.equal(grantTreasure(s,'brightArmor',u.id),null);assert.equal(storeTreasure(s,'brightArmor'),null);assert.deepEqual(equippedTreasureIds(u),[]);assert.deepEqual(treasureRecord(s,'brightArmor'),{id:'brightArmor',state:'treasury',holderId:null,cityId:null,factionId:'cao'});validateCampaign(JSON.parse(serializeCampaign(s)));
});
