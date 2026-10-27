import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,orderCampaignArmy,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign,chooseEncounter} from './helpers/auto-domestic-campaign.mjs';
import {fieldFromCity,approachFieldContact} from './helpers/field-campaign.mjs';
import {campaignBattleTerrain,campaignBattleMapId} from '../strategic-campaign.mjs';
import {chosenRoad} from '../road-metrics.mjs';
import {BATTLE_MAPS,FIELD_MAP_IDS} from '../data/design/battle-maps.mjs';
import {mapNode} from '../road-network.mjs';

test('national road encounters use the actual shared road terrain in both directions',()=>{
 const s=newCampaign(618,'guandu-200');
 for(const [from,to] of s.roads){
  const ground=chosenRoad(s,from,to).terrain,woodland=[from,to].some(id=>['南中','巴蜀'].includes(mapNode(s,id).province)),expected=ground==='water'?'river':ground==='mountain'?'hill':woodland?'forest':'land';
  for(const [a,b]of [[from,to],[to,from]]){
   assert.equal(campaignBattleTerrain(s,a,b),expected,a+' → '+b);
   const mapId=campaignBattleMapId(s,a,b);assert.equal(BATTLE_MAPS[mapId].terrain,expected);
   assert.equal(mapId,campaignBattleMapId(s,b,a));
  }
 }
});
test('a port site is a harbor battle while its actual land approach remains land',()=>{
 const s=newCampaign(618,'guandu-200'),from='luoyang',port='town-64';
 assert.equal(mapNode(s,port).kind,'port');assert.equal(chosenRoad(s,from,port).terrain,'land');
 assert.equal(campaignBattleTerrain(s,from,port),'land');assert.ok(FIELD_MAP_IDS.land.includes(campaignBattleMapId(s,from,port)));
 assert.equal(campaignBattleTerrain(s,from,port,{siteId:port}),'river');
 assert.equal(campaignBattleMapId(s,from,port,{siteId:port}),'river-harbor');
 assert.equal(campaignBattleMapId(s,port,port),'river-harbor');
});
for(const [name,from,to,expected]of [
 ['ships on a port approach do not create a river battle','luoyang','town-64','land'],
 ['two real columns meeting on a port-to-port water road enter river combat','town-60','town-71','river'],
 ['a real column meeting on the authored mountain road enters hill combat','jinyang','atlas-jingxing','hill'],
])test(name,()=>{
 const s=newCampaign(618,'guandu-200'),a=fieldFromCity(s,'xuchang'),enemy=fieldFromCity(s,'ye');
 a.location=from;enemy.location=to;
 for(const u of [...a.units,...enemy.units])u.equipment.ship='ship';
 assert.equal(orderCampaignArmy(s,a.id,to,'auto',{path:[to]}),null);
 assert.equal(orderCampaignArmy(s,enemy.id,from,'auto',{scheduled:true,faction:enemy.faction,path:[from]}),null);
 approachFieldContact(s,a,enemy);s.campaign.ai.lastPlanDay=s.campaign.day;beginExecution(s);advanceCampaignDay(s);
 const record=s.campaign.battles.find(r=>r.armyIds.includes(a.id)&&r.armyIds.includes(enemy.id));assert.ok(record);
 assert.ok(record.armies.every(x=>x.travel),'contact must be on the road, not an arrival at the port');
 assert.equal(record.kind,'field');assert.equal(record.battle.terrain,expected);assert.equal(BATTLE_MAPS[record.battle.mapId].terrain,expected);
 assert.equal(record.battle.mapId,campaignBattleMapId(s,from,to));assert.equal(record.battle.buildingSiteId,null);
 if(record.awaiting)chooseEncounter(s,record.id,false);
 const resumed=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const state of [s,resumed]){state.campaign.ai.lastPlanDay=state.campaign.day;advanceCampaignDay(state);}
 assert.equal(serializeCampaign(resumed),serializeCampaign(s));
});
