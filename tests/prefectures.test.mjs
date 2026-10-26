import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay} from './helpers/auto-domestic-campaign.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn,ACTIONS} from '../domestic.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {mapNode,nodeKindName} from '../road-network.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {metropolitanCenter,metropolitanMembers,availableConstructionSites,chooseConstructionSite,constructionSiteAvailable,localBuildingLevel,productiveBuildingLevel} from '../metropolitan-areas.mjs';
import {metropolitanRegions,metropolitanBoundary} from '../metropolitan-regions.mjs';
import {metropolitanMapGroups} from '../metropolitan-map.mjs';
import {citySceneState,citySceneMarkup,cityBuildingInfo,sceneDistricts} from '../city-scene.mjs';
import {siteBuildingDurability,campaignBattleBuildings} from '../building-durability.mjs';
import {nationalArtMap} from '../national-map-view.mjs';

test('neighbouring display regions share a curved edge and omit it from the merged boundary',()=>{
 const a={polygon:[[0,0],[10,0],[10,10],[0,10]]},b={polygon:[[10,0],[20,0],[20,10],[10,10]]};
 const segments=regions=>[...metropolitanBoundary(regions).matchAll(/M([^Q]+)Q([^ ]+) ([^M]+)/g)].map(([,from,control,to])=>({from,control,to}));
 const forward=segments([a]).find(e=>e.from==='10.00,0.00'&&e.to==='10.00,10.00'),reverse=segments([b]).find(e=>e.from==='10.00,10.00'&&e.to==='10.00,0.00');
 assert.ok(forward&&reverse);assert.equal(forward.control,reverse.control);
 const merged=segments([a,b]);assert.equal(merged.length,6);assert.ok(!merged.some(e=>[e.from,e.to].every(p=>p.startsWith('10.00,'))));
 assert.doesNotMatch(metropolitanBoundary([a,b]),/NaN|Infinity/);
});

const prefectureId='junction:atlas-qiao:xuchang';
test('cities and named prefecture regions form the same metropolis used by roads and construction',()=>{
 const s=newCampaign(81,'guandu-200'),c=mapNode(s,'xuchang'),n=mapNode(s,prefectureId),before=serializeCampaign(s);
 assert.equal(n.name,'鄢陵');assert.equal(nodeKindName(n),'府');assert.equal(metropolitanCenter(s,n).id,c.id);
 assert.ok(metropolitanMembers(s,c).includes(n));assert.equal(metropolitanMapGroups(s).find(g=>g.center.id===c.id).counts.prefecture,3);
 const regions=metropolitanRegions(s);assert.equal(regions.length,s.cities.length+s.junctions.filter(n=>n.kind==='junction').length);
 for(const r of regions){assert.ok(r.polygon.length>=3);assert.equal(r.centerId,metropolitanCenter(s,mapNode(s,r.id)).id);assert.ok(r.polygon.every(p=>p.every(x=>Number.isFinite(x)&&x>=-1e-7&&x<=1024+1e-7)));}
 assert.ok(metropolitanBoundary(regions.filter(r=>r.centerId===c.id)).length>0);
 const html=nationalArtMap(s,{city:n.id});assert.ok(html.includes(`data-map-region="${n.id}"`));assert.ok(html.includes('data-region-kind="prefecture"'));assert.ok(html.includes('data-metropolis-region="xuchang"'));assert.ok(!html.includes('许谯道'));
 assert.equal(serializeCampaign(s),before);
});
test('both city and prefecture sites participate in automatic construction without independent resources',()=>{
 const s=newCampaign(81,'guandu-200'),c=mapNode(s,'xuchang'),n=mapNode(s,prefectureId);
 for(const key of ['farm','commerce','granary','workshop','barracks','clinic','hall','drill']){
  const options=availableConstructionSites(s,c,key);assert.ok(options.some(x=>x.node.id===c.id));assert.ok(options.some(x=>x.node.id===n.id));
  let sum=0;const total=options.reduce((v,x)=>v+x.weight,0);for(const x of options){assert.equal(chooseConstructionSite(s,c,key,(sum+x.weight/2)/total),x.node.id);sum+=x.weight;}
 }
 assert.deepEqual(availableConstructionSites(s,c,'walls').map(x=>x.node.id),[c.id]);
 for(const key of ['grain','gold','manpower','domestic','units'])assert.equal(n[key],undefined);
 const model=citySceneState(s,n);assert.equal(model.layout.kind,'prefecture');assert.ok(!sceneDistricts(model).some(d=>d.key==='walls'));
 assert.ok(!citySceneMarkup(model).includes('town-foundation'));assert.equal(model.resourceCity.id,c.id);assert.equal(model.grain,c.grain);
});

function constructionFixture(){
 for(let seed=1;seed<=40;seed++){
  const s=newCampaign(seed,'guandu-200'),c=mapNode(s,'xuchang'),u=cityStaffStatus(s,c).idle[0].unit;
  for(const [key,def]of Object.entries(ACTIONS))if(def.direction==='agriculture'&&key!=='build_farm')c.domestic.cooldowns[key]=1000;
  assert.equal(assignDomestic(s,c.id,'agriculture',u.id),null);beginDomesticTurn(s);
  const a=assignmentFor(s,u.id);if(a.action&&mapNode(s,a.action.siteId).kind==='junction')return {s,c,a,siteId:a.action.siteId};
 }
 throw Error('Expected a legal automatically selected prefecture project');
}
test('real prefecture construction saves its site, pauses for enemies and completes there without duplicate income',()=>{
 const {s,c,a,siteId}=constructionFixture(),n=mapNode(s,siteId),main=localBuildingLevel(c,'farm',c.id),total=c.farm,actionId=a.action.id;
 assert.equal(c.project.siteId,n.id);assert.equal(citySceneState(s,n).project.siteId,n.id);assert.equal(citySceneState(s,c).project,null);
 const enemy=fieldFromCity(s,'ye');enemy.location=n.id;enemy.cooldownDay=999;
 assert.equal(constructionSiteAvailable(s,c,n.id),false);const hp=siteBuildingDurability(s,n.id,'farm').hp;beginExecution(s);advanceCampaignDay(s);
 assert.equal(siteBuildingDurability(s,n.id,'farm').hp,hp);assert.equal(a.action.paused,true);
 enemy.location='junction:town-2:town-3';
 const copy=validateCampaign(JSON.parse(serializeCampaign(s))),officerId=a.officerId;
 for(let i=0;i<60&&a.action?.id===actionId;i++)for(const state of [s,copy]){if(state.campaign.phase==='planning')beginExecution(state);advanceCampaignDay(state);}
 assert.notEqual(a.action?.id,actionId);assert.notEqual(assignmentFor(copy,officerId).action?.id,actionId);assert.equal(serializeCampaign(s),serializeCampaign(copy));
 // Completed work keeps its result; expired start records are not campaign history.
 assert.equal(s.campaign.activity.nodes.filter(e=>e.officerId===officerId&&e.siteId===n.id&&e.key==='build_farm'&&e.phase==='complete').length,1);assert.equal(c.farm,total+1);assert.equal(localBuildingLevel(c,'farm',c.id),main);assert.equal(localBuildingLevel(c,'farm',n.id),1);
 assert.deepEqual(siteBuildingDurability(s,n.id,'farm'),{hp:1000,maxHp:1000});assert.equal(citySceneState(s,n).levels.farm,1);
 assert.equal(cityBuildingInfo(citySceneState(s,n),'farm').rows.find(r=>r[0]==='建设城市')[1],c.name);
 assert.ok(campaignBattleBuildings(s,n.id,0,['cao','yuan']).some(b=>b.source.siteId===n.id&&b.source.cityId===c.id&&b.initialHp===1000));
 const productive=productiveBuildingLevel(s,c,'farm');assert.ok(!enemy.disbanded);enemy.location=n.id;assert.equal(productiveBuildingLevel(s,c,'farm'),productive-1);
 validateCampaign(JSON.parse(serializeCampaign(s)));
});
