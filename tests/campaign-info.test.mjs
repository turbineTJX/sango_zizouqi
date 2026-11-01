import {fieldFromCity,approachDestination} from './helpers/field-campaign.mjs';
import {busyFixture} from './helpers/domestic-orders.mjs';
import {requestStrategicOrder} from '../strategic-orders.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,launchExpedition,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter,transferOfficer} from './helpers/auto-domestic-campaign.mjs';
import {campaignInfoIndex,campaignInfoDetail,campaignInfoSections,campaignInfoMarkup} from '../campaign-info.mjs';
import {metropolitanMapMarkup} from '../metropolitan-map.mjs';
import {metropolitanMembers} from '../metropolitan-areas.mjs';
import {armyInfoCounts} from '../army-details.mjs';
import {battleWounded} from '../engine.mjs';
test('officer and troop details keep tactics and stratagems on separate read-only pages',()=>{
 const s=newCampaign(203,'guandu-200'),id=campaignInfoIndex(s).unit[0].unit.id,before=JSON.stringify(s);
 for(const type of ['officer','unit'])for(const [page,section,kind]of [['战法','tactics','tactic'],['军略','stratagems','stratagem']]){
  const html=campaignInfoMarkup(s,{type,id,page,objectOnly:true}).body;
  assert.deepEqual([...html.matchAll(/data-info-section="([^"]+)"/g)].map(m=>m[1]),[section]);
  assert.doesNotMatch(html,new RegExp('data-kind="'+(kind==='tactic'?'stratagem':'tactic')+'"'));
 }
 assert.equal(JSON.stringify(s),before);
});
test('metropolis details show their actual members without duplicating counts on the main map',()=>{
 const s=newCampaign(81,'guandu-200','yuan'),c=s.cities.find(c=>c.id==='jinyang'),before=JSON.stringify(s),members=metropolitanMembers(s,c);
 const map=metropolitanMapMarkup(s,{city:c.id}),base=campaignInfoMarkup(s,{type:'city',id:c.id,objectOnly:true}).body;
 assert.doesNotMatch(map,/metropolis-summary|\d+(府|小城|港口|关卡)/);assert.doesNotMatch(base,/metropolitan-table/);
 const detail=campaignInfoMarkup(s,{type:'city',id:c.id,page:'都市圈',objectOnly:true}).body;
 assert.equal((detail.match(/data-metropolitan-member=/g)||[]).length,members.length);assert.doesNotMatch(detail,/小城/);
 assert.equal(JSON.stringify(s),before);
});
import {factionFinance,cityFinanceMarkup,factionFinanceMarkup} from '../finance-view.mjs';
import {cityBudget} from '../city-budget.mjs';
import {serializeCampaign,validateCampaign,liveSoldiers} from '../strategic-campaign.mjs';
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
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:'chenliu',policy:'auto'}),null);
 const before=JSON.stringify(s),ix=campaignInfoIndex(s);assert.equal(ix.army.length,1);assert.equal(ix.unit.length,count);
 assert.ok(ids.every(id=>ix.unit.find(r=>r.unit.id===id).army.id===s.armies[0].id));
 const html=campaignInfoSections(campaignInfoDetail(s,'army',s.armies[0].id));assert.match(html,/指挥/);assert.doesNotMatch(html,/undefined|NaN/);assert.equal(JSON.stringify(s),before);
});

const status=(s,type,id)=>campaignInfoDetail(s,type,id).sections.find(x=>x.id==='status').html;
test('current status follows actual marching and transfer progress',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),ids=c.units.filter(u=>u.id!==c.governor).slice(0,2).map(u=>u.id);
 assert.match(status(s,'unit',ids[0]),/驻城备战/);
 assert.equal(launchExpedition(s,{kind:'expedition',cityId:c.id,officerIds:ids,leader:ids[0],advisor:ids[1],target:'luoyang',policy:'auto'}),null);
 // Use a road longer than one daily movement budget; short legs may end at a junction.
 const a=s.armies[0];assert.match(status(s,'officer',ids[0]),/待出发/);
 const originalRoute=[...a.route],initialDays=Number(status(s,'army',a.id).match(/约 (\d+) 天/)[1]);assert.ok(initialDays>1);
 const idle=s.campaign.idle.find(o=>o.faction==='cao'&&o.location===c.id&&o.unit.id!==c.governor);
 assert.equal(transferOfficer(s,idle.unit.id,'chenliu'),null);assert.match(status(s,'officer',idle.unit.id),/调任途中/);assert.match(status(s,'officer',idle.unit.id),/许昌 → 陈留/);
 beginExecution(s);advanceCampaignDay(s);assert.ok(a.travel);assert.match(status(s,'army',a.id),/路段进度/);assert.match(status(s,'unit',ids[0]),/沿道路行军/);
 const before=JSON.stringify(s),remainingDays=Number(status(s,'army',a.id).match(/约 (\d+) 天/)[1]);
 assert.equal(remainingDays,initialDays-1);assert.deepEqual(a.route,originalRoute);assert.equal(JSON.stringify(s),before);
 // A saved route ends where ordered, even if the strategic target lies farther away.
 a.route=a.route.slice(0,1);assert.ok(Number(status(s,'army',a.id).match(/约 (\d+) 天/)[1])<remainingDays);
 a.route=[];a.travel=null;assert.doesNotMatch(status(s,'army',a.id),/剩余行程/);
});
test('siege status includes the live battlefield state of a real defending unit',()=>{
 const s=newCampaign(5);approachDestination(s,fieldFromCity(s,'guandu',{target:'xuchang'}));let battle;
 for(let i=0;i<20&&!battle;i++){if(s.campaign.phase==='planning')beginExecution(s);for(const b of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,b.id,false);advanceCampaignDay(s);battle=activeBattles(s).find(b=>b.armies.some(a=>a.defense));}
 assert.ok(battle);const army=s.armies.find(a=>a.defense&&battle.armyIds.includes(a.id)),unit=battle.battle.sides.flatMap(side=>side.units).find(u=>u.armyId===army.id);
 const oldHp=unit.hp,damage=Math.min(200,oldHp);unit.hp-=damage;unit.battleDamage=(unit.battleDamage??unit.initial-oldHp)+damage;
 const before=JSON.stringify(s);assert.match(status(s,'city',battle.cityId),/正在遭受围攻/);const html=status(s,'unit',unit.id);assert.doesNotMatch(html,/已进行 \d+ 日|当前战斗行动|战场实时兵力/);assert.match(html,/战场兵力/);assert.ok(html.includes(String(Math.round(unit.hp))));assert.match(html,/行动/);assert.match(status(s,'faction',army.faction),/当前战事/);assert.equal(JSON.stringify(s),before);
 const current=battle.battle.sides.flatMap(side=>side.units).filter(u=>u.armyId===army.id&&!u.retreatDispatched),counts=armyInfoCounts(s,army),expectedWounded=army.units.reduce((n,u)=>n+u.wounded,0)+current.reduce((n,u)=>n+battleWounded(u),0),fmt=n=>n.toLocaleString('zh-CN');
 assert.equal(counts.soldiers,liveSoldiers(s,army));assert.equal(counts.wounded,expectedWounded);assert.equal(counts.unitCount,current.filter(u=>u.hp>0).length);
 const indexed=campaignInfoIndex(s).unit.find(r=>r.unit.id===unit.id);
 assert.equal(indexed.unit.troops,unit.hp,'the troop directory uses live battlefield strength');
 assert.equal(indexed.unit.wounded,army.units.find(u=>u.id===unit.id).wounded+battleWounded(unit));
 const detail=campaignInfoDetail(s,'army',army.id),supply=detail.sections.find(s=>s.id==='supply').html,rows=detail.sections.find(s=>s.id==='units').html;
 assert.ok(supply.includes(`<dt>现役兵</dt><dd>${fmt(counts.soldiers)}</dd>`));assert.ok(supply.includes(`<dt>伤兵</dt><dd>${fmt(expectedWounded)}</dd>`));assert.match(rows,/<th>现役兵<\/th><th>伤兵<\/th>/);assert.ok(rows.includes(`<td class="numeric">${fmt(unit.hp)}</td>`));assert.equal(JSON.stringify(s),before);
});

test('prepared troops show active domestic work and deferred orders separately',()=>{
 const {s,id}=busyFixture();const before=JSON.stringify(s);assert.match(status(s,'unit',id),/办理内政事务/);assert.match(status(s,'officer',id),/事务剩余/);assert.equal(JSON.stringify(s),before);
 requestStrategicOrder(s,{kind:'assign',cityId:'xuchang',officerIds:[id],direction:'commerce'},'after');const html=status(s,'unit',id);assert.match(html,/办理内政事务/);assert.match(html,/等待命令/);assert.match(html,/事务完成后/);
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

test('finance belongs to owned city and faction details, preserves state and is read only in observation',()=>{
 for(const faction of ['cao','yuan']){
  const s=newCampaign(203,'guandu-200',faction),city=s.cities.find(c=>c.owner===faction),foreign=s.cities.find(c=>c.owner!==faction&&c.owner!=='neutral'),before=serializeCampaign(s);
  for(const [type,id]of [['city',city.id],['faction',faction]]){
   const html=campaignInfoMarkup(s,{type,id,page:'收支预算',objectOnly:true}).body;
   assert.match(html,/data-info-section="finance"/);assert.match(html,/未来一旬/);assert.match(html,/<th>收入<\/th>/);assert.doesNotMatch(html,/info-object-list/);
  }
  assert.match(cityFinanceMarkup(s,city),/data-city-budget-key/);
  assert.doesNotMatch(campaignInfoMarkup(s,{type:'city',id:foreign.id,page:'收支预算'}).body,/data-info-section="finance"|data-city-budget-key/);
  assert.doesNotMatch(campaignInfoMarkup(s,{type:'faction',id:foreign.owner,page:'收支预算'}).body,/data-info-section="finance"/);
  assert.equal(serializeCampaign(s),before);
  s.campaign.allAI=true;const observed=serializeCampaign(s);
  assert.match(cityFinanceMarkup(s,city),/未来一旬/);assert.match(cityFinanceMarkup(s,city),/<th>收入<\/th>/);assert.doesNotMatch(cityFinanceMarkup(s,city),/data-city-budget-key/);assert.equal(serializeCampaign(s),observed);
 }
});

test('faction forecasts sum owned cities while preserving a local food deficit despite a rich neighbour',()=>{
 const s=newCampaign(203,'guandu-200'),cities=s.cities.filter(c=>c.owner==='cao'),poor=cities.find(c=>c.units.length),rich=cities.find(c=>c!==poor);
 poor.grain=0;rich.grain=1000000;
 const before=JSON.stringify(s),{rows,totals}=factionFinance(s);
 assert.deepEqual(rows.map(r=>r.city.id),cities.map(c=>c.id));
 for(const field of ['stocks','income','costs','reserve','projected','fundingShortages'])for(const key of ['gold','grain']){
  assert.equal(totals[field][key],cities.reduce((sum,c)=>sum+cityBudget(s,c)[field][key],0));
 }
 assert.ok(totals.fundingShortages.grain>0);assert.ok(totals.projected.grain>0);
 assert.match(factionFinanceMarkup(s,'cao'),/data-page="收支预算"/);assert.equal(JSON.stringify(s),before);
});

test('actual finance uses completed harvest and payroll receipts and survives a real save round trip',()=>{
 const s=newCampaign(31);assert.match(factionFinanceMarkup(s,'cao'),/尚无已结算旬记录/);
 assert.equal(beginExecution(s),null);while(s.campaign.day<11)advanceCampaignDay(s);
 const receipt=s.campaign.activity.nodes.findLast(n=>n.phase==='harvest'),row=receipt.result.cities[0],city=s.cities.find(c=>c.id===row.id),before=serializeCampaign(s);
 const html=cityFinanceMarkup(s,city),aggregate=factionFinanceMarkup(s,'cao'),fmt=n=>Math.round(n).toLocaleString('zh-CN');
 assert.match(html,/200年1月上旬结算/);assert.ok(html.includes(fmt(row.credited.gold+row.work.gold)));assert.ok(html.includes('官员俸禄实发 '+fmt(city.payroll.lastPaid)+' 金'));
 assert.match(aggregate,/城仓净变化/);assert.match(aggregate,/旬末收支明细/);assert.equal(serializeCampaign(s),before);
 const restored=validateCampaign(JSON.parse(before));assert.equal(cityFinanceMarkup(restored,restored.cities.find(c=>c.id===city.id)),html);assert.equal(factionFinanceMarkup(restored,'cao'),aggregate);
});


test('army destination retains known raid identity and falls back after retargeting or lost knowledge',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.id==='xuchang'),u=c.units[0];
 assert.equal(launchExpedition(s,{cityId:c.id,officerIds:[u.id],leader:u.id,advisor:u.id,target:'chenliu',policy:'auto'}),null);
 const a=s.armies.at(-1);a.banditTarget='test-raid';
 s.campaign.bandits.observations[s.campaign.playerFaction]={'test-raid':{day:s.campaign.day,data:{id:'test-raid',nodeId:'chenliu',name:'陈留贼寨',clearedDay:null,units:[]}}};
 const before=JSON.stringify(s),detail=()=>campaignInfoDetail(s,'army',a.id);
 for(const id of ['status','overview'])assert.match(detail().sections.find(x=>x.id===id).html,/陈留贼寨/);
 assert.equal(JSON.stringify(s),before);
 delete a.banditTarget;
 for(const id of ['status','overview'])assert.match(detail().sections.find(x=>x.id===id).html,/陈留贼寨/);
 a.target='luoyang';assert.doesNotMatch(campaignInfoSections(detail()),/陈留贼寨/);
 a.target='chenliu';s.campaign.bandits.observations[s.campaign.playerFaction]['test-raid'].data.clearedDay=s.campaign.day;
 assert.doesNotMatch(campaignInfoSections(detail()),/陈留贼寨/);
 delete s.campaign.bandits.observations[s.campaign.playerFaction]['test-raid'];
 assert.doesNotMatch(campaignInfoSections(detail()),/陈留贼寨/);assert.match(campaignInfoSections(detail()),/陈留/);
});


test('a city unit stays listed at home while its commander travels on a personal mission',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='town-11'),u=home.units[0];
 // Snapshot at a legal talent-contact destination; troops remain in the home city array.
 u.mission={homeCity:home.id,faction:home.owner,targetCity:'town-26',location:'town-26',route:[],progress:0,phase:'work'};
 for(const phase of ['work','return']){
  u.mission.phase=phase;u.mission.route=phase==='return'?['town-11']:[];
  const before=JSON.stringify(s),unit=campaignInfoDetail(s,'unit',u.id),officer=campaignInfoDetail(s,'officer',u.id);
  const overview=unit.sections.find(x=>x.id==='overview').html;
  assert.match(overview,/<dt>所在<\/dt><dd>[^]*?data-id="town-11"/);
  assert.doesNotMatch(overview,/data-id="town-26"/);
  assert.match(overview,/主将外出/);
  const status=unit.sections.find(x=>x.id==='status').html;
  assert.match(status,/部队驻地[^]*?寿春/);assert.match(status,/主将位置[^]*?庐江/);
  assert.match(officer.sections.find(x=>x.id==='overview').html,/data-id="town-26"/);
  assert.equal(JSON.stringify(s),before);
 }
});


test('visible enemy city explains troops left by absent commanders without exposing their identity',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.owner!=='cao'&&c.units.length>=2);
 // Disable fog for this presentation fixture; enemy mission identities remain excluded by the index.
 delete s.campaign.vision;
 const away=home.units[0];away.troops=2500;
 away.mission={homeCity:home.id,faction:home.owner,targetCity:'town-26',location:'town-26',route:[],progress:0,phase:'work'};
 const total=home.units.reduce((sum,u)=>sum+u.troops,0),before=JSON.stringify(s);
 const detail=campaignInfoDetail(s,'city',home.id,{finance:false}),resources=detail.sections.find(x=>x.id==='resources').html,units=detail.sections.find(x=>x.id==='units').html;
 assert.ok(resources.includes(total.toLocaleString('zh-CN')));
 assert.match(resources,/其中主将外出留城兵<\/dt><dd>2,500/);
 assert.match(units,/主将外出留城兵 2,500/);assert.match(units,/暂不可参战/);
 assert.ok(!units.includes(`data-id="${away.id}"`));
 assert.ok(units.includes(`data-id="${home.units[1].id}"`));
 assert.equal(JSON.stringify(s),before);
});
