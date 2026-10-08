import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_DESIGNS} from '../data/design/buildings.mjs';
import {buildingCombatState} from '../building-rules.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {defaultCustomBattle} from '../custom-battle.mjs';
import {lockDeployment,stepBattle,validateSave,battleWounded,COMBAT} from '../engine.mjs';
import {setStatus} from '../tactics.mjs';
import {allLearnedTacticIds} from '../tactic-learning.mjs';
import {newCampaign,commissionProject,beginExecution,advanceCampaignDay,advanceCampaignStep,activeBattles,chooseEncounter,serializeCampaign,validateCampaign} from './helpers/auto-domestic-campaign.mjs';
import {assignDomestic,ACTIONS,actionCandidates,assignmentFor,cancelDomestic} from '../domestic.mjs';
import {canResearch} from '../city-technology.mjs';
import {buildingDurability,completeTechnologyBuilding,campaignBattleBuildings,writeBattleBuildingDamage} from '../building-durability.mjs';
import {citySceneState,citySceneMarkup,cityBuildingInfo} from '../city-scene.mjs';
import {constructionSites} from '../metropolitan-areas.mjs';
import {intelligenceWorld,cityIntelligence,updateVision} from '../strategic-vision.mjs';
import {setBuildingLevel} from './building-fixtures.mjs';
import {fundCities} from './resource-fixtures.mjs';
import {peacefulCities,invadeFromGuandu} from './helpers/field-campaign.mjs';

const kinds=['arrowTower','musicStage','aidCamp'];
const restore=s=>validateCampaign(JSON.parse(serializeCampaign(s)));
const steps=(b,n)=>{for(let i=0;i<n;i++)stepBattle(b,{aiSides:[]});};
function facility(kind,side,level=1,{hp=level*1000,id=kind}={}){
 return {id,name:BUILDING_DESIGNS[kind].name,type:'building',kind,side,x:side===0?2:11,y:2,hp,maxHp:Math.max(1000,level*1000),...buildingCombatState(kind,level)};
}
function scene(kind,side=0,level=1){
 const entry=id=>({id,type:'spear',troops:3000,level:1});
 const s=generateBattle({...defaultCustomBattle(),seed:10981,ownTeam:[entry('dun')],enemyTeam:[entry('wen')],reinforcements:[{side,name:'后援',tick:100,team:[entry('yu')]}]});
 const b=s.battle;lockDeployment(b);
 const own=b.sides[side].units.find(u=>u.status==='active'),enemy=b.sides[1-side].units[0],a=facility(kind,side,level);b.buildings=[a];
 Object.assign(own,{x:side===0?3:10,y:2});Object.assign(enemy,{x:side===0?6:7,y:2});
 for(const u of [own,enemy]){u.cooldown=999;u.intent=0;u.skillReady=Object.fromEntries(allLearnedTacticIds(u).map(id=>[id,999]));setStatus(b,u,'root',200,{sourceId:u.id,sourceName:u.name});}
 return {s,b,a,own,enemy,reserve:b.sides[side].units.find(u=>u.status==='reserve')};
}
function technology(c,kind){c.domestic.techs=['watchtower',BUILDING_DESIGNS[kind].technology];completeTechnologyBuilding(c,'watchtower');}

test('new facilities require local research and the common automatic construction action',()=>{
 const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);const u=s.campaign.idle.find(o=>o.location===c.id).unit;
 for(const kind of kinds){
  const d=BUILDING_DESIGNS[kind],key='build_'+kind;
  const before=serializeCampaign(s);assert.match(commissionProject(s,c.id,kind),/先研究/);assert.equal(serializeCampaign(s),before);
  assert.equal(assignDomestic(s,c.id,d.direction,u.id),null);let a=assignmentFor(s,u.id);assert.ok(!actionCandidates(s,a).some(p=>p.key===key));
  c.domestic.techs=['watchtower'];completeTechnologyBuilding(c,'watchtower');setBuildingLevel(c,{arrowTower:'workshop',musicStage:'drill',aidCamp:'clinic'}[kind],1);c.order=80;
  assert.ok(canResearch(c,d.technology));technology(c,kind);assert.ok(actionCandidates(s,a).some(p=>p.key===key));cancelDomestic(s,u.id);
 }
 restore(s);
});

test('each new facility is built with paid daily work, saved durability and visible original artwork',()=>{
 for(const kind of kinds){
  const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang');fundCities(s,100000);technology(c,kind);const u=s.campaign.idle.find(o=>o.location===c.id).unit,d=BUILDING_DESIGNS[kind],gold=c.gold;
  for(const [key,def]of Object.entries(ACTIONS))if(def.direction===d.direction&&key!=='build_'+kind)c.domestic.cooldowns[key]=1000;
  assignDomestic(s,c.id,d.direction,u.id);beginExecution(s);assert.equal(assignmentFor(s,u.id).action.key,'build_'+kind);const site=c.project.siteId;
  assert.equal(gold-c.gold,d.cost);assert.deepEqual(buildingDurability(c,kind,site),{hp:0,maxHp:1000});assert.equal(campaignBattleBuildings(s,site,0).find(a=>a.kind===kind).level,0);
  advanceCampaignDay(s);const copy=restore(s);
  for(let i=0;i<70&&!c[kind];i++){for(const x of [s,copy]){if(x.campaign.phase==='planning')beginExecution(x);advanceCampaignDay(x);}assert.equal(serializeCampaign(s),serializeCampaign(copy));}
  assert.equal(c[kind],1);assert.equal(buildingDurability(c,kind,site).hp,1000);
  const place=[...s.cities,...(s.junctions||[])].find(n=>n.id===site),model=citySceneState(s,place),before=serializeCampaign(s);
  assert.match(citySceneMarkup(model),new RegExp('town-facility-'+kind));assert.ok(cityBuildingInfo(model,kind).rows.some(r=>r[0]==='解锁技术'));assert.equal(serializeCampaign(s),before);restore(s);
 }
});

test('arrow towers shoot within range, grow with completed local levels and use saved intervals on either side',()=>{
 for(const side of [0,1])for(const level of [1,3]){
  const {s,b,a,enemy}=scene('arrowTower',side,level);const before=enemy.hp;steps(b,1);assert.ok(enemy.hp<before);const damage=before-enemy.hp;assert.equal(a.lastActionTick,1);assert.match(b.logs.map(l=>l.text).join('\n'),/箭塔/);
  assert.ok(damage>0);const hp=enemy.hp;steps(b,3);assert.equal(enemy.hp,hp);const copy=validateSave(structuredClone(s));steps(b,1);steps(copy.battle,1);assert.ok(enemy.hp<hp);assert.deepEqual(s,copy);
 }
 const low=scene('arrowTower',0,1),high=scene('arrowTower',0,3);steps(low.b,1);steps(high.b,1);assert.ok(high.enemy.hp<low.enemy.hp);
});

test('arrow towers respect visibility, range, shields and actual invulnerability',()=>{
 for(const protection of ['range','stealth','stasis','shield']){
  const {s,b,enemy}=scene('arrowTower');if(protection==='range')enemy.x=9;
  else setStatus(b,enemy,protection,20,{sourceId:enemy.id,sourceName:enemy.name,...(protection==='shield'?{amount:1000}:{} )});
  const hp=enemy.hp;steps(b,1);assert.equal(enemy.hp,hp,protection);validateSave(s);
 }
});

test('a real tower rout uses the shared defeat intent shock without awarding a fictitious officer',()=>{
 const entry=id=>({id,type:'spear',troops:3000,level:1}),s=generateBattle({...defaultCustomBattle(),seed:10999,ownTeam:[entry('dun')],enemyTeam:['wen','he','gao'].map(entry)}),b=s.battle;lockDeployment(b);b.buildings=[facility('arrowTower',0,3)];
 const own=b.sides[0].units[0];Object.assign(own,{x:3,y:2});const [victim,nearby,far]=b.sides[1].units;Object.assign(victim,{x:6,y:2,hp:1,battleDamage:2999});Object.assign(nearby,{x:7,y:2});Object.assign(far,{x:12,y:6});
 for(const u of [own,victim,nearby,far]){u.cooldown=999;u.intent=50;u.skillReady=Object.fromEntries(allLearnedTacticIds(u).map(id=>[id,999]));setStatus(b,u,'root',200,{sourceId:u.id,sourceName:u.name});}
 const before=structuredClone(own.contribution);steps(b,1);assert.equal(victim.status,'defeated');assert.equal(victim.intentRoutApplied,true);assert.equal(nearby.intent,20);assert.equal(far.intent,30);assert.deepEqual(own.contribution,before);validateSave(s);
});

test('music stages grant capped fixed intent only to nearby present allies on either side',()=>{
 for(const side of [0,1]){
  const {s,b,a,own,reserve}=scene('musicStage',side,3);own.intent=99;const reserveIntent=reserve.intent;steps(b,1);assert.equal(own.intent,COMBAT.intentCap);assert.equal(reserve.intent,reserveIntent);assert.equal(a.lastActionTick,1);
  own.intent=0;steps(b,5);assert.equal(own.intent,0);steps(b,1);assert.equal(own.intent,6);assert.match(b.logs.map(l=>l.text).join('\n'),/军乐台/);validateSave(s);
 }
 const {b,own}=scene('musicStage');own.x=7;steps(b,1);assert.equal(own.intent,0);
});

test('overlapping music and medical support use the strongest local facility once',()=>{
 for(const kind of ['musicStage','aidCamp']){
  const {s,b,a,own}=scene(kind,0,1);b.buildings.push({...facility(kind,0,3,{id:'second'}),x:1});own.hp=2700;own.battleDamage=300;const hp=own.hp;steps(b,1);
  if(kind==='musicStage')assert.equal(own.intent,6);else assert.equal(own.hp-hp,36);
  assert.equal(a.lastActionTick,1);validateSave(s);
 }
});

test('medical camps heal only real battle wounded, honor plague and stop at that budget',()=>{
 for(const side of [0,1]){
  const {s,b,own,reserve}=scene('aidCamp',side,3);own.hp=2700;own.battleDamage=300;const wounded=battleWounded(own),reserveHp=reserve.hp;steps(b,1);assert.equal(own.hp,2736);assert.equal(battleWounded(own),wounded-36);assert.equal(reserve.hp,reserveHp);validateSave(s);
 }
 const empty=scene('aidCamp');empty.own.hp=2700;empty.own.battleDamage=0;steps(empty.b,1);assert.equal(empty.own.hp,2700);
 const plague=scene('aidCamp',0,3);plague.own.hp=2700;plague.own.battleDamage=300;setStatus(plague.b,plague.own,'plague',20,{sourceId:plague.enemy.id,sourceName:plague.enemy.name,sourceSkillName:'疫伤',amount:0});steps(plague.b,1);assert.equal(plague.own.hp,2718);
 const small=scene('aidCamp',0,3);small.own.hp=2990;small.own.battleDamage=10;steps(small.b,1);assert.equal(small.own.hp,2993);assert.equal(battleWounded(small.own),0);
});

test('construction, destroyed buildings, stasis and withdrawing owners cannot provide support',()=>{
 for(const kind of kinds)for(const mode of ['construction','destroyed','retreat','stasis','withdrawing']){
  const {b,a,own,enemy}=scene(kind);own.hp=2700;own.battleDamage=300;
  if(mode==='construction')a.level=0;if(mode==='destroyed')a.hp=0;if(mode==='retreat')b.sides[0].retreat=true;if(mode==='stasis')setStatus(b,own,'stasis',20,{sourceId:own.id});if(mode==='withdrawing')own.withdrawing=true;
  const hp=[own.hp,enemy.hp];steps(b,1);assert.deepEqual([own.hp,enemy.hp],hp,kind+' '+mode);assert.equal(own.intent,0);assert.equal(a.lastActionTick,null);
 }
});

test('building action history survives repairs and save validation rejects forged state',()=>{
 const {s,b,a,own}=scene('musicStage');steps(b,1);a.hp=0;steps(b,1);a.hp=500;const copy=validateSave(structuredClone(s));own.intent=0;copy.battle.sides[0].units[0].intent=0;steps(b,5);steps(copy.battle,5);assert.equal(own.intent,2);assert.deepEqual(s,copy);
 for(const mutate of [a=>a.level=4,a=>a.level=-1,a=>delete a.lastActionTick,a=>a.lastActionTick=100]){const bad=structuredClone(s);mutate(bad.battle.buildings[0]);assert.throws(()=>validateSave(bad),/建筑/);}
});

test('inherited facilities can be repaired without granting local expansion research',()=>{
 for(const kind of kinds){const s=peacefulCities(newCampaign(81)),c=s.cities.find(c=>c.id==='xuchang'),u=s.campaign.idle.find(o=>o.location===c.id).unit;fundCities(s,100000);setBuildingLevel(c,kind,1,c.id,{hp:0});assignDomestic(s,c.id,BUILDING_DESIGNS[kind].direction,u.id);const a=assignmentFor(s,u.id);
  assert.ok(actionCandidates(s,a).some(p=>p.key==='build_'+kind&&p.targetId===c.id));beginExecution(s);assert.equal(c.project.mode,'repair');advanceCampaignDay(s);assert.ok(buildingDurability(c,kind).hp>0);assert.equal(c[kind],1);restore(s);
 }
});

test('ports and passes use only their actual local facilities and keep distinct physical source cells',()=>{
 const s=newCampaign(81,'guandu-200'),c=s.cities.find(c=>c.citySize==='large'&&constructionSites(s,c).some(n=>['gate','port'].includes(n.kind))),site=constructionSites(s,c).find(n=>['gate','port'].includes(n.kind));assert.ok(site);
 for(const kind of kinds)setBuildingLevel(c,kind,1,site.id);
 const atNode=campaignBattleBuildings(s,site.id,0),atCity=campaignBattleBuildings(s,c.id,0);
 for(const kind of kinds){assert.equal(atNode.find(a=>a.kind===kind).level,1);assert.equal(atNode.find(a=>a.kind===kind).source.cityId,c.id);assert.ok(!atCity.some(a=>a.kind===kind));}
 assert.equal(new Set(atNode.map(a=>a.x+':'+a.y)).size,atNode.length);assert.ok(!atNode.some(a=>[3,4].includes(a.y)));restore(s);
});

test('hidden new facilities never leak current levels and dated intelligence remains unchanged',()=>{
 const s=newCampaign(81,'guandu-200'),c=s.cities.find(c=>c.owner!=='cao'&&!cityIntelligence(s,c.id).data);assert.ok(c);
 setBuildingLevel(c,'arrowTower',1);let projected=intelligenceWorld(s);assert.equal(projected.cities.find(n=>n.id===c.id).arrowTower,null);
 s.campaign.vision.factions.cao.scouted.push({x:c.x,y:c.y,expiresDay:s.campaign.day+1,scoutId:'fixture'});updateVision(s);const known=cityIntelligence(s,c.id).data;assert.equal(known.arrowTower,1);
 s.campaign.vision.factions.cao.scouted=[];setBuildingLevel(c,'arrowTower',3);updateVision(s);projected=intelligenceWorld(s);assert.equal(projected.cities.find(n=>n.id===c.id).arrowTower,1);assert.equal(cityIntelligence(s,c.id).day,s.campaign.day);assert.equal(c.arrowTower,3);
});

test('real sieges load and save the new original-site facilities and continue deterministically',()=>{
 const s=newCampaign(81),c=s.cities.find(c=>c.id==='xuchang');c.domestic.techs=['watchtower',...kinds.map(k=>BUILDING_DESIGNS[k].technology)];completeTechnologyBuilding(c,'watchtower');for(const kind of kinds)setBuildingLevel(c,kind,2,c.id,{hp:1500});
 invadeFromGuandu(s);beginExecution(s);let r;for(let i=0;i<8&&!r;i++){advanceCampaignDay(s);r=activeBattles(s).find(r=>r.cityId===c.id&&r.kind==='siege');}assert.ok(r);chooseEncounter(s,r.id,true);lockDeployment(r.battle);
 for(const kind of kinds){const a=r.battle.buildings.find(a=>a.kind===kind);assert.equal(a.hp,1500);assert.equal(a.level,2);assert.equal(a.source.siteId,c.id);}
 const copy=restore(s),other=copy.campaign.battles.find(x=>x.id===r.id);for(let i=0;i<12;i++){advanceCampaignStep(s);advanceCampaignStep(copy);}assert.deepEqual(r.battle,other.battle);restore(s);
 const tower=r.battle.buildings.find(a=>a.kind==='arrowTower');tower.hp=0;writeBattleBuildingDamage(s,r.battle);assert.equal(buildingDurability(c,'arrowTower').hp,0);assert.equal(campaignBattleBuildings(s,c.id,1).find(a=>a.kind==='arrowTower').hp,0);
});
