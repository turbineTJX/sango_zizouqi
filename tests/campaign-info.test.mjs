import {fieldFromCity} from './helpers/field-campaign.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,transferOfficer} from '../strategic-campaign.mjs';
import {campaignInfoIndex,campaignInfoDetail,campaignInfoSections,campaignInfoMarkup} from '../campaign-info.mjs';
test('all campaign information is read only and city units are not armies',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s),ix=campaignInfoIndex(s);
 assert.equal(ix.city.length,s.cities.length);assert.equal(ix.army.length,0);assert.ok(ix.unit.length>0);
 for(const [type,rows] of Object.entries(ix)){assert.ok(campaignInfoMarkup(s,{type}).body);for(const r of rows){const detail=campaignInfoDetail(s,type,r.unit?.id||r.id);assert.ok(detail.sections.length);assert.doesNotMatch(campaignInfoSections(detail),/undefined|NaN/);}}
 assert.equal(JSON.stringify(s),before);
 const detail=campaignInfoDetail(s,'unit',ix.unit[0].unit.id),cropped=campaignInfoSections(detail,{sections:['overview','troops']});
 assert.match(cropped,/data-info-section="troops"/);assert.doesNotMatch(cropped,/data-info-section="tactics"/);
 assert.equal(campaignInfoDetail(s,'army','missing').sections.length,0);
});

test('expedition information follows real city-unit departure without duplication',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id),count=campaignInfoIndex(s).unit.length;
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[1],deputy:null,target:'chenliu',policy:'auto'}),null);
 const before=JSON.stringify(s),ix=campaignInfoIndex(s);assert.equal(ix.army.length,1);assert.equal(ix.unit.length,count);
 assert.ok(ids.every(id=>ix.unit.find(r=>r.unit.id===id).army.id===s.armies[0].id));
 const html=campaignInfoSections(campaignInfoDetail(s,'army',s.armies[0].id));assert.match(html,/指挥任职/);assert.doesNotMatch(html,/undefined|NaN/);assert.equal(JSON.stringify(s),before);
});

const status=(s,type,id)=>campaignInfoDetail(s,type,id).sections.find(x=>x.id==='status').html;
test('current status follows actual marching and transfer progress',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.slice(0,2).map(u=>u.id);
 assert.match(status(s,'unit',ids[0]),/驻城备战/);
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[1],deputy:null,target:'luoyang',policy:'auto'}),null);
 // Use a road longer than one daily movement budget; short legs may end at a junction.
 const a=s.armies[0];assert.match(status(s,'officer',ids[0]),/待出发/);
 const idle=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===c.id&&o.unit.id!==c.governor);
 assert.equal(transferOfficer(s,idle.unit.id,'chenliu'),null);assert.match(status(s,'officer',idle.unit.id),/调任途中/);assert.match(status(s,'officer',idle.unit.id),/许昌 → 陈留/);
 beginExecution(s);advanceCampaignDay(s);assert.ok(a.travel);assert.match(status(s,'army',a.id),/当前路段进度/);assert.match(status(s,'unit',ids[0]),/沿道路行军/);
});
test('siege status includes the live battlefield state of a real defending unit',()=>{
 const s=newCampaign(5);fieldFromCity(s,'guandu',{target:'xuchang'});let battle;
 for(let i=0;i<20&&!battle;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);advanceCampaignDay(s);battle=activeBattles(s).find(b=>b.armies.some(a=>a.defense));}
 assert.ok(battle);const army=s.armies.find(a=>a.defense&&battle.armyIds.includes(a.id)),unit=battle.battle.sides.flatMap(side=>side.units).find(u=>u.armyId===army.id);
 const before=JSON.stringify(s);assert.match(status(s,'city',battle.cityId),/正在遭受围攻/);const html=status(s,'unit',unit.id);assert.match(html,/战场实时兵力/);assert.ok(html.includes(String(Math.round(unit.hp))));assert.match(html,/当前战斗行动/);assert.match(status(s,'faction',army.faction),/当前战事/);assert.equal(JSON.stringify(s),before);
});

test('prepared troops show active domestic work and deferred orders separately',()=>{
 const {s,id}=busyFixture();const before=JSON.stringify(s);assert.match(status(s,'unit',id),/办理内政事务/);assert.match(status(s,'officer',id),/事务剩余/);assert.equal(JSON.stringify(s),before);
 requestStrategicOrder(s,{kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},'after');const html=status(s,'unit',id);assert.match(html,/办理内政事务/);assert.match(html,/等待命令/);assert.match(html,/完成原事务后自动执行/);
});


test('object details reuse dossier format without opening a faction directory',()=>{
 const s=newCampaign(203,'guandu-200');
 for(const type of ['city','unit','officer','faction']){
  const r=campaignInfoIndex(s)[type][0],id=r.unit?.id||r.id;
  const local=campaignInfoMarkup(s,{type,id,objectOnly:true}).body;
  assert.ok(!local.includes('info-object-list'));assert.ok(!local.includes('campaign-info-peer'));
  assert.ok(local.includes('info-dossier-content'));
  assert.ok(campaignInfoMarkup(s,{type,id}).body.includes('info-object-list'));
 }
});
