import test from 'node:test';
import assert from 'node:assert/strict';
import {TREASURE_DESIGNS,treasureDesign} from '../data/design/treasures.mjs';
import {defaultTreasurePack,validateTreasurePack,changeTreasureEffect} from '../treasure-catalog.mjs';
import {TreasureEditor} from '../treasure-editor.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {hasStatus} from '../tactics.mjs';
import {newCampaign,validateCampaign,serializeCampaign,beginExecution,advanceCampaignDay} from '../strategic-campaign.mjs';
import {grantTreasure,treasureRecord,treasureOfficerRows} from '../treasures.mjs';
import {removeTreasureEquipment} from '../treasure-equipment.mjs';
import {fieldFromCity,approachFieldContact} from './helpers/field-campaign.mjs';
import {activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {TREASURE_EFFECTS} from '../treasure-catalog.mjs';
const custom=()=>{const p=defaultTreasurePack();p.treasures.skyHalberd=changeTreasureEffect({...p.treasures.skyHalberd,name:'试制画戟'},'entry','resolve',2);return p;};
test('treasure editor rejects malformed catalogues and unsupported powers without changing its saved pack',async()=>{
 const p=custom();validateTreasurePack(p);
 for(const mutate of [p=>delete p.treasures.redHare,p=>p.treasures.skyHalberd.name='画戟&试制',p=>p.treasures.redHare.name=p.treasures.dillu.name,p=>p.treasures.skyHalberd.steps=9,p=>p.treasures.skyHalberd.steps=1.5,p=>p.treasures.skyHalberd.status='invincible',p=>p.treasures.skyHalberd.category='horse',p=>p.treasures.brightArmor.fraction=.5,p=>p.treasures.redFirmament.bondId='bondPeach',p=>p.treasures.redFirmament.bonus=2,p=>p.treasures.skyHalberd.unknown=true]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateTreasurePack(bad));}
 const editor=new TreasureEditor({storage:{async write(){throw Error('disk full');}}});editor.selected='skyHalberd';editor.change('name','本机画戟');const saved=structuredClone(editor.pack);await assert.rejects(editor.save(),/disk full/);assert.deepEqual(editor.pack,saved);assert.equal(editor.draft.treasures.skyHalberd.name,'本机画戟');
 await editor.importFile({size:1,async text(){return '{bad';}});assert.equal(editor.draft.treasures.skyHalberd.name,'本机画戟');
});
test('treasure editor saves, switches effects, imports atomically and supports undo and reset',async()=>{
 let stored;const e=new TreasureEditor({storage:{async write(p){stored=structuredClone(p);}}});e.selected='skyHalberd';e.change('kind','bond');e.change('effect','bondGuard');assert.equal(e.draft.treasures.skyHalberd.bondId,'bondGuard');assert.equal(e.draft.treasures.skyHalberd.status,undefined);
 e.change('kind','entry');e.change('effect','regrowth');assert.equal(e.draft.treasures.skyHalberd.totalCap,600);e.change('steps',3);e.change('effect','valor');assert.equal(e.draft.treasures.skyHalberd.cap,undefined);await e.save();assert.deepEqual(stored,e.pack);assert.equal(e.saved,true);
 await e.action('reset',{},null);assert.deepEqual(e.draft.treasures.skyHalberd,TREASURE_DESIGNS.skyHalberd);await e.action('undo',{},null);assert.equal(e.saved,true);await e.action('redo',{},null);assert.deepEqual(e.draft.treasures.skyHalberd,TREASURE_DESIGNS.skyHalberd);
 await e.importFile({size:100,async text(){return JSON.stringify(custom());}});assert.equal(e.draft.treasures.skyHalberd.name,'试制画戟');assert.notDeepEqual(e.draft,e.pack);
});
test('edited entry effects execute in real battles and survive deterministic save reload independently of the editor',()=>{
 const pack=custom(),draft=defaultCustomBattle();draft.ownTeam[0].treasureIds=['skyHalberd'];const s=generateBattle(draft,{treasureDesigns:pack.treasures}),u=s.battle.sides[0].units[0];lockDeployment(s.battle);
 assert.equal(hasStatus(s.battle,u,'resolve'),true);assert.equal(hasStatus(s.battle,u,'valor'),false);assert.equal(u.statuses.resolve.sourceSkillName,'试制画戟');assert.equal(u.treasureEntries.skyHalberd.until,3);
 const restored=validateSave(JSON.parse(JSON.stringify(s)));pack.treasures.skyHalberd.name='编辑器后来修改';assert.equal(treasureDesign('skyHalberd',restored.battle.sides[0].units[0]).name,'试制画戟');
 for(let i=0;i<4;i++){stepBattle(s.battle);stepBattle(restored.battle);}assert.deepEqual(restored,s);assert.equal(hasStatus(s.battle,u,'resolve'),false);
 const base=generateBattle(draft);lockDeployment(base.battle);assert.equal(hasStatus(base.battle,base.battle.sides[0].units[0],'valor'),true);
 const bad=JSON.parse(JSON.stringify(s));bad.battle.sides[0].units[0].treasureDesigns.skyHalberd.steps=8;assert.throws(()=>validateSave(bad),/宝物配置/);
});
test('normal-mode grants, replacement and day execution preserve the saved treasure configuration',()=>{
 const s=newCampaign(7,null,'cao',{treasureDesigns:custom().treasures}),u=s.cities.find(c=>c.id==='chenliu').units[0];
 for(const id of ['skyHalberd','greenDragon']){for(const r of treasureOfficerRows(s))removeTreasureEquipment(r.unit,id);Object.assign(treasureRecord(s,id),{state:'treasury',factionId:'cao',cityId:null,holderId:null});}
 assert.equal(grantTreasure(s,'skyHalberd',u.id,{replace:true}),null);assert.equal(treasureDesign('skyHalberd',u).name,'试制画戟');validateCampaign(JSON.parse(serializeCampaign(s)));
 assert.equal(grantTreasure(s,'greenDragon',u.id,{replace:true}),null);assert.equal(u.treasureDesigns.skyHalberd,undefined);validateCampaign(JSON.parse(serializeCampaign(s)));
 beginExecution(s);advanceCampaignDay(s);validateCampaign(JSON.parse(serializeCampaign(s)));
});
test('all supported edited entry effects use their bounded real battle handlers',()=>{
 for(const status of Object.keys(TREASURE_EFFECTS)){
  const pack=custom();pack.treasures.skyHalberd=changeTreasureEffect(pack.treasures.skyHalberd,'entry',status,2);
  const draft=defaultCustomBattle();draft.ownTeam[0].treasureIds=['skyHalberd'];const s=generateBattle(draft,{treasureDesigns:pack.treasures});lockDeployment(s.battle);
  assert.equal(hasStatus(s.battle,s.battle.sides[0].units[0],status),true,status);validateSave(JSON.parse(JSON.stringify(s)));
 }
});
test('normal-mode actual encounter carries the custom catalogue into live and saved battle snapshots',()=>{
 const s=newCampaign(11,null,'cao',{treasureDesigns:custom().treasures});
 for(const c of s.cities)for(const u of c.units)u.retreatAt=null;
 for(const r of treasureOfficerRows(s))removeTreasureEquipment(r.unit,'skyHalberd');Object.assign(treasureRecord(s,'skyHalberd'),{state:'treasury',factionId:'cao',cityId:null,holderId:null});
 const holder=s.cities.find(c=>c.id==='xuchang').units[0];assert.equal(grantTreasure(s,'skyHalberd',holder.id,{replace:true}),null);
 const own=fieldFromCity(s,'xuchang',{target:'guandu'}),enemy=fieldFromCity(s,'guandu',{target:'xuchang'});approachFieldContact(s,own,enemy);beginExecution(s);
 let r;for(let i=0;i<25&&!r;i++){advanceCampaignDay(s);r=activeBattles(s)[0];}assert.ok(r);chooseEncounter(s,r.id,false);
 const restored=validateCampaign(JSON.parse(serializeCampaign(s)));assert.equal(restored.campaign.battles[0].battle.treasureDesigns.skyHalberd.name,'试制画戟');
});
