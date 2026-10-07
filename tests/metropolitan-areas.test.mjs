import {setBuildingLevel} from './building-fixtures.mjs';
import {fundCities} from './resource-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,serializeCampaign,validateCampaign,beginExecution,advanceCampaignDay,activeBattles,chooseEncounter} from '../strategic-campaign.mjs';
import {assignDomestic,assignmentFor,beginDomesticTurn,finishDomesticDay,cancelDomestic,reconcileDomestic,ACTIONS} from '../domestic.mjs';
import {metropolitanCenter,metropolitanMembers,availableConstructionSites,chooseConstructionSite,localBuildingLevel,constructionSiteAvailable} from '../metropolitan-areas.mjs';
import {citySceneState,citySceneMarkup,cityBuildingInfo} from '../city-scene.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {mapNode} from '../road-network.mjs';

function fixture(seed=13){
 const s=newCampaign(seed,'guandu-200','yuan'),c=mapNode(s,'jinyang');
 fundCities(s,50000);for(const city of s.cities)if(city.owner!=='yuan')for(const unit of city.units)unit.troops=0;
 const u=cityStaffStatus(s,c).idle[0].unit;
 for(const [key,def] of Object.entries(ACTIONS))if(def.direction==='technology'&&key!=='build_workshop')c.domestic.cooldowns[key]=1000;
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);
 beginDomesticTurn(s);return {s,c,u,a:assignmentFor(s,u.id)};
}
function daily(s){if(s.campaign.phase==='planning')beginExecution(s);advanceCampaignDay(s);for(const battle of activeBattles(s).filter(b=>b.awaiting))chooseEncounter(s,battle.id,false);}
let externalBase;
function externalFixture(){
 if(!externalBase)for(let seed=1;seed<30;seed++){const f=fixture(seed);if(f.a.action.siteId!==f.c.id){externalBase={state:structuredClone(f.s),officerId:f.u.id};break;}}
 if(!externalBase)throw Error('Expected a real external project');
 const s=structuredClone(externalBase.state),c=mapNode(s,'jinyang'),a=assignmentFor(s,externalBase.officerId),u=cityStaffStatus(s,c).idle.find(o=>o.unit.id===a.officerId)?.unit||c.units.find(u=>u.id===a.officerId)||s.campaign.idle.find(o=>o.unit.id===a.officerId).unit;
 return {s,c,a,u};
}

test('every small city, pass and port belongs to exactly one nearest major-city metropolis',()=>{
 const s=newCampaign(81,'guandu-200'),members=s.cities.filter(c=>c.citySize==='large').flatMap(c=>metropolitanMembers(s,c));
 const expected=[...s.cities,...s.junctions].filter(n=>n.citySize||['gate','port'].includes(n.kind));
 assert.equal(members.length,expected.length);assert.equal(new Set(members.map(n=>n.id)).size,expected.length);
 const c=mapNode(s,'jinyang');assert.deepEqual(new Set(metropolitanMembers(s,c).map(n=>n.kind)),new Set(['city','gate','port']));
 for(const n of metropolitanMembers(s,c))assert.equal(metropolitanCenter(s,n).id,c.id);
 const before=serializeCampaign(s);for(const n of expected)metropolitanMembers(s,n);assert.equal(serializeCampaign(s),before);
});
test('automatic site selection can use the main city, small city, gate and port; walls stay at home',()=>{
 const s=newCampaign(81,'guandu-200','yuan'),c=mapNode(s,'jinyang');
 const sites=availableConstructionSites(s,c,'workshop');assert.equal(sites.length,4);
 let sum=0;const total=sites.reduce((n,x)=>n+x.weight,0);
 for(const x of sites){assert.equal(chooseConstructionSite(s,c,'workshop',(sum+x.weight/2)/total),x.node.id);sum+=x.weight;}
 assert.deepEqual(availableConstructionSites(s,c,'walls').map(x=>x.node.id),[c.id]);
});
test('real remote construction animates only its saved site, completes there and reloads identically',()=>{
 const {s,c,a}=externalFixture(),site=mapNode(s,a.action.siteId),baseline=localBuildingLevel(c,'workshop',site.id);
 assert.equal(c.project.siteId,site.id);assert.equal(citySceneState(s,c).project,null);
 assert.match(citySceneMarkup(citySceneState(s,site)),/city-scaffold/);
 assert.match(cityBuildingInfo(citySceneState(s,site),'workshop').rows.find(r=>r[0]==='建设城市')[1],new RegExp(c.name));
 daily(s);daily(s);const restored=validateCampaign(JSON.parse(serializeCampaign(s)));
 assert.deepEqual(citySceneState(restored,mapNode(restored,site.id)),citySceneState(s,site));
 for(let i=0;i<60&&a.action;i++){daily(s);daily(restored);assert.equal(serializeCampaign(s),serializeCampaign(restored));}
 assert.equal(a.action,null);assert.equal(c.workshop,1);assert.equal(localBuildingLevel(c,'workshop',site.id),baseline+1);
 assert.equal(citySceneState(s,site).project,null);assert.equal(citySceneState(s,c).levels.workshop,0);
 assert.ok(s.campaign.domestic.events.some(e=>e.phase==='complete'&&e.result.siteId===site.id));
});
test('an interrupted remote project resumes on the same site without payment or completion on inspection',()=>{
 const {s,c,u,a}=externalFixture(),siteId=a.action.siteId;finishDomesticDay(s);const remaining=a.action.remaining,cash=s.gold;
 cancelDomestic(s,u.id);const before=serializeCampaign(s),scene=citySceneState(s,mapNode(s,siteId));
 assert.equal(scene.project.paused,true);assert.equal(serializeCampaign(s),before);
 assert.equal(assignDomestic(s,c.id,'technology',u.id),null);beginDomesticTurn(s);
 assert.equal(assignmentFor(s,u.id).action.siteId,siteId);assert.equal(assignmentFor(s,u.id).action.remaining,remaining);assert.equal(s.gold,cash);
});
test('hostile towns and blocked roads pause construction until the actual site becomes usable again',()=>{
 const {s,c,a}=externalFixture(),siteId=a.action.siteId,remaining=a.action.remaining;
 const enemy={id:'blocker',faction:'cao',location:siteId,travel:null,route:[],units:[],disbanded:false};
 const realOfficer=s.cities.find(n=>n.owner==='cao').units[0];enemy.units=[{...realOfficer,troops:1000}];s.armies.push(enemy);
 assert.equal(constructionSiteAvailable(s,c,siteId),false);finishDomesticDay(s);assert.equal(a.action.remaining,remaining);assert.equal(a.action.paused,true);
 assert.equal(citySceneState(s,mapNode(s,siteId)).project.paused,true);s.armies.pop();s.campaign.day++;finishDomesticDay(s);assert.equal(a.action.paused,false);assert.equal(a.action.remaining,remaining-1);
 const small=metropolitanMembers(s,c).find(n=>n.citySize==='small');small.owner='cao';assert.equal(constructionSiteAvailable(s,c,small.id),false);
});
test('capturing a small city transfers its completed local facilities instead of moving them to the major city',()=>{
 const s=newCampaign(81,'guandu-200','yuan'),c=mapNode(s,'jinyang'),small=metropolitanMembers(s,c).find(n=>n.citySize==='small');
 setBuildingLevel(c,'workshop',1,small.id);small.owner='cao';reconcileDomestic(s);
 assert.equal(c.workshop,0);assert.deepEqual(c.domestic.buildingSites.workshop,[]);assert.equal(small.workshop,1);
 assert.equal(citySceneState(s,small).levels.workshop,1);assert.equal(citySceneState(s,c).levels.workshop,0);
});
test('saved sites must belong to the city metropolis and agree with the action; old saves are rejected',()=>{
 const {s,c,a}=externalFixture();daily(s);validateCampaign(JSON.parse(serializeCampaign(s)));
 for(const mutate of [v=>v.campaign.version--,v=>mapNode(v,c.id).project.siteId='xuchang',v=>assignmentFor(v,a.officerId).action.siteId=c.id,v=>mapNode(v,c.id).domestic.buildingSites.workshop=['missing']]){
  const bad=JSON.parse(serializeCampaign(s));mutate(bad);assert.throws(()=>validateCampaign(bad));
 }
});
