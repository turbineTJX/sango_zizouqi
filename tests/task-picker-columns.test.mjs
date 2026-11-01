import {assignmentPickerMarkup} from '../assignment-picker.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {campaignRosterMarkup,OFFICER_STATS} from '../strategic-roster.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn} from '../domestic.mjs';
import {DIRECTION_STATS} from '../domestic-designs.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import {commanderComparison,expeditionSelectionMarkup} from '../combat-comparison.mjs';
import {newScenarioSetup,scenarioSetupMarkup} from '../scenario-setup.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {scoutingMarkup} from '../scouting-view.mjs';
import {scoutCandidates,scoutingDurationRange} from '../scouting.mjs';
import {diplomacyMarkup} from '../diplomacy-view.mjs';
import {diplomaticOfficerCandidates} from '../diplomacy.mjs';
import {appointmentFields} from '../army-appointments-view.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {militaryFlowMarkup,newMilitaryFlow} from '../military-flow.mjs';
const heads=html=>[...html.match(/<thead><tr>(.*?)<\/tr><\/thead>/s)[1].matchAll(/<th[^>]*>(.*?)<\/th>/gs)].map(m=>m[1].replace(/<[^>]*>/g,'').replace(/[↑↓↕]/g,'').trim());
const scene=()=>newCampaign(203,'guandu-200');

test('civil appointments show only their relevant attribute and transfers show the five abilities and work context',()=>{
 const s=scene(),before=JSON.stringify(s),labels=Object.fromEntries(OFFICER_STATS);
 for(const [direction,key]of Object.entries(DIRECTION_STATS)){
  const columns=heads(campaignRosterMarkup(s,{personnel:{}},{task:'domestic',city:'xuchang',direction,selected:[]}));
  assert.ok(columns.includes(labels[key]));
  for(const [other,label]of OFFICER_STATS)if(other!==key)assert.ok(!columns.includes(label));
  for(const label of ['所在','任职','事务'])assert.ok(columns.includes(label));
 }
 const governor=heads(campaignRosterMarkup(s,{personnel:{}},{task:'governor',city:'xuchang',selected:[]}));
 assert.ok(governor.includes('政治'));assert.ok(!governor.includes('武力'));
 const transfer=heads(campaignRosterMarkup(s,{personnel:{}},{task:'transfer',city:'xuchang',selected:[]}));
 for(const label of [...OFFICER_STATS.map(([,name])=>name),'所在','任职','事务','特性'])assert.ok(transfer.includes(label));
 assert.equal(JSON.stringify(s),before);
});

test('appointment, transfer and expedition choices retain paused work and queued-order information without changing it',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 assert.equal(assignDomestic(s,c.id,'commerce',u.id),null);beginDomesticTurn(s);
 const work=assignmentFor(s,u.id).action;assert.ok(work);
 assert.equal(requestStrategicOrder(s,{kind:'assign',cityId:c.id,officerIds:[u.id],direction:'agriculture'},'after').queued,true);
 work.paused=true;const before=JSON.stringify(s);
 for(const task of ['domestic','transfer']){
  const html=campaignRosterMarkup(s,{personnel:{}},{task,city:c.id,direction:'technology',selected:[]});
  assert.match(html,/商业负责人/);assert.match(html,/还需 [\d.]+ 天 · 暂停/);assert.match(html,/待执行：改任农业/);
 }
 const html=expeditionSelectionMarkup(s,[],c.units);
 assert.deepEqual(heads(html),['选择','部队','兵力','统／武／智','任职','事务','战法','羁绊','友好度']);
 assert.match(html,/太守 · 商业负责人/);assert.match(html,/待执行：改任农业/);assert.doesNotMatch(html,/ · 待命/);
 assert.equal(JSON.stringify(s),before);
});

test('new-unit commanders compare all four aptitudes and capacity rather than unallocated troop counts',()=>{
 const s=scene(),html=campaignRosterMarkup(s,{personnel:{}},{task:'draft',single:true,city:'xuchang',selected:[]}),columns=heads(html);
 for(const label of ['统率','武力','智力','兵种适性','带兵上限','任职','事务'])assert.ok(columns.includes(label));
 assert.ok(!columns.includes('兵力'));assert.match(html,/枪兵 [SABC].*戟兵 [SABC]<small>骑兵 [SABC].*弓兵 [SABC]/);
 const p=newScenarioSetup(defaultCustomBattle(),'ownTeam');p.step='formation';p.choosingMain=true;const before=JSON.stringify(p),custom=heads(scenarioSetupMarkup(p).body);
 assert.ok(custom.includes('兵种适性'));assert.ok(custom.includes('带兵上限'));
 for(const label of ['兵力','所在','任职','事务'])assert.ok(!custom.includes(label));
 assert.equal(JSON.stringify(p),before);
});

test('command appointments prioritize the role attribute and retain both stratagem attributes',()=>{
 const s=scene(),units=s.cities.find(c=>c.id==='xuchang').units,before=JSON.stringify(s),html=commanderComparison(s,units,{leader:units[0].id,advisor:units[1].id},'data-role','xuchang');
 const tables=[...html.matchAll(/<thead><tr>.*?<\/tr><\/thead>/gs)].map(m=>heads(m[0]));
 assert.deepEqual(tables,[['任用','武将','统率','智力','任职特性','任职军略'],['任用','武将','智力','统率','任职特性','任职军略']]);
 assert.equal(JSON.stringify(s),before);
 const council=appointmentFields({id:'test',name:'本军',...{leader:units[0].id,advisor:units[1].id}},units,{leader:units[0].id,advisor:units[1].id});
 assert.match(council,/统率 \d+ · 智力 \d+/);assert.match(council,/智力 \d+ · 统率 \d+/);assert.match(council,/奸雄/);
});

test('splitting compares fighting composition while replenishment compares real troop shortages',()=>{
 const s=scene(),army=fieldFromCity(s,'xuchang'),before=JSON.stringify(s);
 const split=heads(militaryFlowMarkup(s,newMilitaryFlow(s,army.id,'split')).body),recruit=heads(militaryFlowMarkup(s,newMilitaryFlow(s,army.id,'recruit')).body);
 assert.ok(split.includes('统／武／智'));assert.ok(split.includes('羁绊'));assert.ok(!split.includes('可补兵员'));
 assert.ok(recruit.includes('现役'));assert.ok(recruit.includes('伤兵'));assert.ok(recruit.includes('可补兵员'));assert.ok(!recruit.includes('羁绊'));
 assert.equal(JSON.stringify(s),before);
});

test('scouting exposes vision duration and diplomatic candidates expose actual work instead of a generic busy label',()=>{
 const s=scene(),c=s.cities.find(c=>c.id==='xuchang'),scout=scoutCandidates(s,c.id)[0];assert.ok(scout);
 const range=scoutingDurationRange(scout.unit.intellect),before=JSON.stringify(s),html=assignmentPickerMarkup(s,{kind:'scout-officer',city:c.id}).body;
 assert.ok(html.includes(`<td>${scout.unit.intellect}</td><td>${range.min/10}–${range.max/10} 回合</td>`));
 assert.equal(JSON.stringify(s),before);
 const envoy=diplomaticOfficerCandidates(s,'cao','commerce').find(o=>o.location===c.id);assert.ok(envoy);
 assert.equal(assignDomestic(s,c.id,'commerce',envoy.unit.id),null);beginDomesticTurn(s);
 const work=assignmentFor(s,envoy.unit.id).action;assert.ok(work);work.paused=true;
 const saved=JSON.stringify(s),diplomacy=assignmentPickerMarkup(s,{kind:'diplomacy-officer',city:c.id,direction:'commerce'}).body;
 assert.match(diplomacy,/商业负责人.*?还需 [\d.]+ 天 · 暂停/);assert.doesNotMatch(diplomacy,/内政办理中/);
 assert.equal(JSON.stringify(s),saved);
});
