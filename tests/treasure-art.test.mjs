import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {TREASURE_IDS} from '../data/design/treasures.mjs';
import {sanitizeAssetCatalog,catalogAssetURLs} from '../asset-catalog.mjs';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createTroopModel,animateTroopModel}=await import('../art-troop-models.mjs');
import {unitModelKey} from '../unit-appearance.mjs';
import {TREASURE_APPEARANCES} from '../treasure-appearance.mjs';
test('all 70 treasure IDs resolve real, distinct images through the portable asset catalogue',async()=>{
 const raw=JSON.parse(await readFile(new URL('../assets/manifest.json',import.meta.url))),catalog=sanitizeAssetCatalog(raw);assert.equal(Object.keys(catalog.treasures).length,70);assert.equal(new Set(Object.values(catalog.treasures)).size,70);
 let bytes=0;for(const id of TREASURE_IDS){const url=catalog.treasures[id];assert.ok(catalogAssetURLs(raw).includes(url));assert.match(url,/-v2\.webp$/);const file=await readFile(new URL('../'+url,import.meta.url));bytes+=file.length;assert.ok(file.length<20*1024);const metadata=await sharp(file).metadata();assert.equal(metadata.width,256);assert.equal(metadata.height,256);}assert.ok(bytes<700*1024);
});
test('named equipment builds distinct animated leader geometry while preserving the real troop family and both sides',()=>{
 for(const [id,a] of Object.entries(TREASURE_APPEARANCES))for(const side of [0,1])for(const type of ['spear','cavalry','archer']){
  const unit={type,side,treasureId:id,equipment:{siege:null,ship:null}},before=JSON.stringify(unit),key=unitModelKey({models:{}},unit),model=createTroopModel(type,side,id);
  assert.equal(key,`builtin:troop:${type}:${side}:${id}`);assert.equal(model.userData.type,type);assert.deepEqual(model.userData.treasureIds,[id]);assert.equal(model.children.filter(x=>x.name.startsWith('member-')).length,type==='cavalry'?4:9);
  if(a.shape==='horse')assert.ok(model.getObjectByName(type==='cavalry'?'horse-0':'horse-treasure'));else if(a.shape==='armor')assert.ok(model.getObjectByName('treasure-mirror-armor'));else if(a.shape==='robe')assert.ok(model.getObjectByName('treasure-robe'));else if(a.shape==='wagon')assert.ok(model.getObjectByName('treasure-wagon'));else assert.ok(model.getObjectByName(a.shape==='bow'?'treasure-bow-trim':'treasure-weapon'));
  animateTroopModel({model},{time:300,progress:.5,moving:true,compact:true});assert.equal(JSON.stringify(unit),before);
 }
 assert.equal(unitModelKey({models:{}},{type:'spear',side:0,treasureId:null}), 'builtin:troop:spear:0');
});
