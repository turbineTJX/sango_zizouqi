import test from 'node:test';
import assert from 'node:assert/strict';
import {currentBattle} from './helpers/current-battle.mjs';
import {stepBattle,validateSave} from '../engine.mjs';
import {setStatus,absorbShield,shieldAmount,TACTICS_BOOK} from '../tactics.mjs';
import {battleInspectionStatusesMarkup} from '../battle-inspection-view.mjs';
import {OFFICER_STRATAGEMS,stratagemProfile,stratagemEffectText} from '../stratagems.mjs';
import {OFFICER_BY_ID} from '../officer-catalog.mjs';
import {PASSIVES} from '../passives.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {STATUS_DEFINITIONS} from '../data/design/battle-statuses.mjs';
import {supplyDuration} from '../information-display.mjs';
import {remainingDaysText,progressText,attributeText} from '../number-rules.mjs';

const visible=html=>html.replace(/<[^>]*>/g,' ');

for(const side of [0,1])test('fractional shield and DOT settle whole counts on either side and resume deterministically: '+side,()=>{
 const {state,b,u,target}=currentBattle('thrust','spear',{side});
 setStatus(b,u,'shield',4.6,{amount:401.4,source:'integer-test',label:'整数护盾'});
 assert.equal(shieldAmount(b,u),401);
 assert.equal(u.statuses.shield.until,b.tick+6);
 assert.equal(absorbShield(b,u,21.7),0);
 assert.equal(shieldAmount(b,u),379);
 setStatus(b,u,'burn',4.6,{amount:100.6,sourceId:target.id,sourceName:target.name,sourceSkillName:'测试火伤'});
 assert.equal(u.statuses.burn.baseAmount,101);
 assert.equal(u.statuses.burn.until,b.tick+6);
 const copy=validateSave(structuredClone(state));
 for(let i=0;i<8;i++){
  stepBattle(b);stepBattle(copy.battle);
  for(const v of b.sides.flatMap(s=>s.units))for(const key of ['hp','intent','battleDamage','healed'])assert.ok(Number.isSafeInteger(v[key]),key);
  for(const effect of b.effects)for(const key of ['damage','healing','shieldAbsorbed'])if(effect[key]!==undefined)assert.ok(Number.isSafeInteger(effect[key]),key);
 }
 assert.deepEqual(state,copy);
 validateSave(structuredClone(state));
});

test('remaining work never shows zero days, incomplete research never shows complete, food estimates count whole days',()=>{
 assert.equal(remainingDaysText(.01),'1');assert.equal(remainingDaysText(2.01),'3');
 assert.equal(progressText(99.99),'99');assert.equal(progressText(100),'100');
 assert.equal(supplyDuration(19,10),'1 天');assert.equal(supplyDuration(9,10),'0 天');
});

test('integer rate displays preserve sub-unit speed and fractional calculations until settlement',()=>{
 const {b,u}=currentBattle('thrust','spear');setStatus(b,u,'slow',4,{potency:1.15});
 const stats=unitAttributes(u,b),before=structuredClone(b);
 assert.ok(stats.move>0&&stats.move<1);
 assert.equal(attributeText('move',stats.move),'43%');
 assert.notEqual(attributeText('attackSpeed',stats.attackSpeed),'0%');
 const html=battleInspectionStatusesMarkup(b,u);
 assert.doesNotMatch(visible(html),/\d+\.\d+/);
 assert.match(visible(html),/100 → 43%/);
 assert.deepEqual(b,before,'viewing a rounded preview must not round the stored calculation');
});

test('all real stratagem holders and static ability references use integer figures in descriptions',()=>{
 for(const [id,keys] of Object.entries(OFFICER_STRATAGEMS))for(const key of keys){
  const profile=stratagemProfile(key,{...OFFICER_BY_ID[id],role:'leader'});
  assert.doesNotMatch(stratagemEffectText(profile),/\d+\.\d+/,id+' '+key);
 }
 for(const [id,item] of Object.entries({...TACTICS_BOOK,...PASSIVES,...STATUS_DEFINITIONS}))for(const key of ['description','powerDescription','terrainDescription','tradeoff'])assert.doesNotMatch(item[key]||'',/\d+\.\d+/,id+' '+key);
});
