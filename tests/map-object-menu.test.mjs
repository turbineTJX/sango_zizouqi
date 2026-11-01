import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign} from './helpers/auto-domestic-campaign.mjs';
import {mapObjectMenu} from '../map-object-menu.mjs';
import {newCommand,commandMarkup,changeCommandUnit,prepareCommandFormation} from '../strategic-command.mjs';
import {cityVisible} from '../strategic-vision.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {campaignInfoDetail} from '../campaign-info.mjs';
import {gateDurability} from '../building-durability.mjs';
import {armyInfoCounts,armySupplyInfo,armySupplyRouteMarkup} from '../army-details.mjs';
import {dailyConsumption,supplyConnection} from '../strategic-campaign.mjs';
import {strategicView} from '../strategic-view.mjs';
import {nationalArtMap} from '../national-map-view.mjs';
test('map menu restricts orders to owned objects and renders without state changes',()=>{
 const s=newCampaign(203,'guandu-200'),before=serializeCampaign(s);
 const own=mapObjectMenu(s,{kind:'city',id:'xuchang',x:20,y:30});
 assert.match(own,/city-domestic/);assert.match(own,/城市一级命令/);
 assert.match(own,/>委任<\/button>/);assert.doesNotMatch(own,/scout-open|>内政<|>侦察</);
 assert.doesNotMatch(own,/staff-summary|strategy-stats|管理面板|出征/);
 assert.match(own,/<dt>预备兵<\/dt>/);assert.match(own,/<dt>伤兵<\/dt><dd>0<\/dd>/);
 const military=mapObjectMenu(s,{kind:'city',id:'xuchang',group:'military'});
 assert.match(military,/编制/);assert.match(military,/出征/);assert.doesNotMatch(military,/调任/);
 const personnel=mapObjectMenu(s,{kind:'city',id:'xuchang',group:'personnel'});
 assert.match(personnel,/武将/);assert.match(personnel,/调任/);assert.match(personnel,/太守/);
 const enemy=mapObjectMenu(s,{kind:'city',id:'ye'});
 assert.match(enemy,/城市情报/);assert.doesNotMatch(enemy,/campaign-pick|city-domestic/);
 assert.equal(mapObjectMenu(s,{kind:'city',id:'missing'}),'');
 assert.equal(serializeCampaign(s),before);
});

test('cities, prefectures and armies share compact selection cards and respect fog',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),node=s.junctions.find(n=>n.name==='尉氏');
 const army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,3).map(u=>u.id)});army.location=node.id;
 const before=serializeCampaign(s);
 for(const [kind,id]of [['city',home.id],['node',node.id],['army',army.id]]){
  const html=mapObjectMenu(s,{kind,id});assert.match(html,/map-selection-card/);assert.ok(html.includes(`data-map-object-kind="${kind}"`));assert.match(html,/map-object-close/);assert.doesNotMatch(html,/NaN|undefined|野外战场|都市圈/);
 }
 const city=mapObjectMenu(s,{kind:'city',id:home.id});assert.match(city,/map-object-stats/);assert.match(city,/<dt>现役兵<\/dt>/);
 const prefecture=mapObjectMenu(s,{kind:'node',id:node.id});assert.match(prefecture,/隶属许昌/);assert.ok(prefecture.includes(army.name));assert.match(prefecture,/查看建筑/);
 const column=mapObjectMenu(s,{kind:'army',id:army.id});assert.match(column,/campaign-order/);assert.match(column,/campaign-info-detail/);assert.match(column,/<dt>携粮<\/dt>/);assert.match(column,/<dt>伤兵<\/dt><dd>0<\/dd>/);
 const unknown=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id)),hidden=mapObjectMenu(s,{kind:'city',id:unknown.id});assert.doesNotMatch(hidden,/map-object-stats|未侦察|city-domestic/);assert.match(hidden,/campaign-info-detail/);
 assert.equal(serializeCampaign(s),before);
});

test('city cards and details distinguish active, reserve and wounded troops and show current/maximum durability',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),node=s.junctions.find(n=>n.name==='尉氏');
 const army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,2).map(u=>u.id)});
 home.units[0].troops-=123;home.units[0].wounded=123;army.units[0].troops-=77;army.units[0].wounded=77;gateDurability(home).hp-=1000;
 const fields=html=>Object.fromEntries([...html.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]+)<\/dd>/g)].map(m=>[m[1],m[2]])),fmt=n=>n.toLocaleString('zh-CN');
 for(const traveling of [false,true]){
  army.location=home.id;army.travel=traveling?{from:home.id,to:node.id,road:'main',progress:0}:null;
  const before=serializeCampaign(s),troops=home.units.reduce((n,u)=>n+u.troops,0)+(traveling?0:army.units.reduce((n,u)=>n+u.troops,0));
  const expected={'现役兵':fmt(troops),'预备兵':fmt(home.manpower),'伤兵':traveling?'123':'200','城防耐久':`${fmt(gateDurability(home).hp)} / ${fmt(gateDurability(home).maxHp)}`};
  const card=fields(mapObjectMenu(s,{kind:'city',id:home.id})),detail=fields(campaignInfoDetail(s,'city',home.id).sections.find(s=>s.id==='resources').html);
  for(const [key,value]of Object.entries(expected)){assert.equal(card[key],value);assert.equal(detail[key],value);}
  assert.equal(serializeCampaign(s),before);
 }
 const foreign=s.cities.find(c=>c.owner!=='cao'&&c.units.length&&!cityVisible(s,c.id)),report=s.campaign.vision.factions.cao.cities[foreign.id];
 report.day=s.campaign.day;report.data=structuredClone(foreign);report.data.units[0].troops-=54;report.data.units[0].wounded=54;
 const expectedOld={'现役兵':fmt(report.data.units.reduce((n,u)=>n+u.troops,0)),'预备兵':fmt(report.data.manpower),'伤兵':'54','城防耐久':`${fmt(gateDurability(report.data).hp)} / ${fmt(gateDurability(report.data).maxHp)}`};
 foreign.units[0].troops-=100;foreign.units[0].wounded+=100;foreign.manpower--;gateDurability(foreign).hp--;
 const before=serializeCampaign(s),card=fields(mapObjectMenu(s,{kind:'city',id:foreign.id})),detail=fields(campaignInfoDetail(s,'city',foreign.id).sections.find(s=>s.id==='resources').html);
 for(const [key,value]of Object.entries(expectedOld)){assert.equal(card[key],value);assert.equal(detail[key],value);}assert.equal(serializeCampaign(s),before);
});
test('army muster previews equipment and cost without committing the draft',()=>{
 const s=newCampaign(203,'guandu-200'),p=newCommand(s,'draft','xuchang'),home=s.cities.find(c=>c.id==='xuchang');home.gold=5000;
 const unit=home.units[0],before=serializeCampaign(s);
 assert.match(commandMarkup(s,{officerPick:p,personnel:{}},'').body,/campaign-unit-detail/);
 assert.deepEqual(p.selected,[]);
 assert.equal(changeCommandUnit(s,p,unit.id,'siege','ram'),null);
 const html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.match(html,/unit-muster/);assert.match(html,/value="ram" selected/);
 const preview=prepareCommandFormation(s,p);assert.equal(preview.error,undefined);assert.ok(preview.gold>0);
 assert.equal(preview.state.cities.find(c=>c.id==='xuchang').units.find(u=>u.id===unit.id).equipment.siege,'ram');
 assert.equal(serializeCampaign(s),before);
});

test('army cards, management and details retain wounds, unit count, daily rations and baggage capacity',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),army=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,2).map(u=>u.id)});
 army.location=s.junctions.find(n=>n.name==='尉氏').id;army.units[0].troops-=175;army.units[0].wounded=175;army.supply-=125;
 const before=serializeCampaign(s),fmt=n=>n.toLocaleString('zh-CN'),troops=army.units.reduce((n,u)=>n+u.troops,0),expected={'现役兵':fmt(troops),'伤兵':'175','部队数':'2 队','士气':fmt(army.morale)+' / 100','每日耗粮':fmt(Math.ceil(troops/100+175/200)),'携粮':fmt(army.supply)+' / '+fmt(army.supplyCapacity)};
 const fields=html=>Object.fromEntries([...html.matchAll(/<dt>([^<]+)<\/dt><dd>([^<]+)<\/dd>/g)].map(m=>[m[1],m[2]]));
 const card=fields(mapObjectMenu(s,{kind:'army',id:army.id})),detail=campaignInfoDetail(s,'army',army.id),supply=fields(detail.sections.find(s=>s.id==='supply').html);
 for(const [key,value]of Object.entries(expected)){assert.equal(card[key],value);assert.equal(supply[key],value);}
 assert.equal(dailyConsumption(s,army),Number(expected['每日耗粮']));assert.match(detail.sections.find(s=>s.id==='units').html,/<th>现役兵<\/th><th>伤兵<\/th>/);
 const html=strategicView(s,{army:army.id,city:army.location,strategyTab:'army',mapPanelOpen:true});assert.match(html,/伤兵<b>175<\/b>/);assert.ok(html.includes(`每日耗粮<b>${expected['每日耗粮']}</b>`));
 assert.equal(armyInfoCounts(s,army).wounded,175);assert.equal(serializeCampaign(s),before);
});

test('only the selected own army paints its current supply connection and stale or empty depots do not invent a line',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.id==='xuchang'),a=fieldFromCity(s,home.id,{ids:home.units.filter(u=>!u.cityGuard&&u.id!==home.governor).slice(0,2).map(u=>u.id)});a.location=s.junctions.find(n=>n.name==='尉氏').id;
 const link=supplyConnection(s,a);assert.ok(link&&link.path.length>1);const before=serializeCampaign(s),ui={city:a.location,army:a.id,mapSupplyArmy:a.id};
 assert.equal(armySupplyRouteMarkup(s,{}),'');const route=armySupplyRouteMarkup(s,ui);assert.ok(route.includes(`data-supply-army="${a.id}"`));assert.ok(route.includes(`data-supply-source="${link.source}"`));assert.match(route,/strategy-supply-path/);
 assert.equal(armySupplyInfo(s,a).label,s.cities.find(c=>c.id===link.source).name);
 assert.doesNotMatch(nationalArtMap(s,{city:a.location,army:a.id},a),/data-supply-army=/);assert.ok(nationalArtMap(s,ui,a).includes(`data-supply-army="${a.id}"`));assert.equal(serializeCampaign(s),before);
 a.target='ye';a.route=['ye'];assert.equal(armySupplyRouteMarkup(s,ui),route,'future orders do not change the currently effective supply path');
 a.supplyLine=structuredClone(link);for(const c of s.cities.filter(c=>c.owner===a.faction))c.grain=0;
 assert.equal(armySupplyRouteMarkup(s,ui),'');assert.equal(armySupplyInfo(s,a).label,'未连接');assert.match(mapObjectMenu(s,{kind:'army',id:a.id}),/粮道 · 未连接/);
 a.faction='yuan';assert.equal(armySupplyRouteMarkup(s,ui),'');assert.equal(armySupplyInfo(s,a),undefined);
});
test('expedition destination details use city intelligence instead of hidden resources',()=>{
 const s=newCampaign(203,'guandu-200'),target=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id)),p=newCommand(s,'expedition','xuchang');
 target.grain=987654;target.manpower=765432;p.step='target';p.destination=target.id;
 const before=serializeCampaign(s),html=commandMarkup(s,{officerPick:p,personnel:{}},'').body;
 assert.ok(html.includes(target.name));assert.doesNotMatch(html,/987654|765432/);assert.equal(serializeCampaign(s),before);
});
