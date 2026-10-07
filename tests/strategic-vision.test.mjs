import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,beginExecution,advanceCampaignDay,serializeCampaign,validateCampaign} from '../strategic-campaign.mjs';
import {scoutingMarkup,scoutingReportMarkup} from '../scouting-view.mjs';
import {residentOfficer} from '../city-personnel.mjs';
import {cityStaffStatus} from '../domestic-feedback.mjs';
import {assignDomestic,cancelDomestic} from '../domestic.mjs';
import {finishTalentDay} from '../talent-lifecycle.mjs';
import {cityVisible,cityIntelligence,intelligenceWorld,updateVision,visionSources} from '../strategic-vision.mjs';
import {scoutCandidates,scoutTargets,dispatchScout,recallScout,scoutRoute,scoutAssignment,scoutingDurationRange,advanceScouting} from '../scouting.mjs';
import {campaignInfoIndex,campaignInfoDetail,campaignInfoMarkup,campaignInfoSections} from '../campaign-info.mjs';
import {nationalArtMap} from '../national-map-view.mjs';
import {cityHoverMarkup} from '../army-inspection.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {observeStrategicThreat} from '../strategic-ai.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {officerActivities} from '../officer-activity.mjs';
import {mapNode} from '../map-node-data.mjs';
import {roadDistance,roadCost} from '../road-metrics.mjs';
import {scoutVisionProxy} from '../scouting-state.mjs';

function quietGame(){const s=newCampaign(203);for(const c of s.cities.filter(c=>c.owner!=='cao'))for(const u of c.units)u.troops=0;updateVision(s);return s;}
function nextDay(s){if(s.campaign.phase==='planning')assert.equal(beginExecution(s),null);const r=advanceCampaignDay(s);assert.equal(r.dayEnded,true);}
function scout(s){const city=s.cities.find(c=>c.owner==='cao'&&scoutCandidates(s,c.id).length),officer=scoutCandidates(s,city.id)[0];return {city,officer};}

test('national geography is explored while enemy city contents, armies and rosters obey visibility',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.owner!=='cao'&&c.units.length&&!cityVisible(s,c.id));assert.ok(c);
 const enemy=fieldFromCity(s,c.id);s.campaign.domestic.orders.push({faction:c.owner,kind:'march',target:'secret-target',officerIds:[enemy.leader]});
 const before=serializeCampaign(s),view=intelligenceWorld(s);
 assert.equal(s.campaign.vision.explored,'national');assert.equal(view.cities.length,s.cities.length);assert.equal(view.cities.find(x=>x.id===c.id).owner,c.owner);assert.equal(view.cities.find(x=>x.id===c.id).grain,null);
 assert.ok(!campaignInfoIndex(s).army.some(a=>a.id===enemy.id));assert.ok(!campaignInfoIndex(s).officer.some(r=>r.unit.id===enemy.leader));assert.ok(!armyMapMarkers(s,{}).includes(`data-campaign-army="${enemy.id}"`));
 assert.ok(!view.campaign.domestic.orders.some(q=>q.target==='secret-target'));
 const map=nationalArtMap(s,{city:'xuchang'},null);assert.ok(map.includes(`data-city="${c.id}"`));assert.ok(map.includes('world-fog-mask'));assert.ok(map.includes('radar-fog-mask'));assert.ok(!map.includes(`data-campaign-army="${enemy.id}"`));
 assert.match(campaignInfoMarkup(s,{type:'city',id:c.id}).body,/尚未侦察/);assert.match(cityHoverMarkup(s,c),/未确认/);assert.equal(serializeCampaign(s),before);
});

test('responsible officer stays working in the city while a simulated scout travels and reveals immediately',()=>{
 const s=quietGame(),{city,officer}=scout(s),target=s.cities.find(c=>c.owner!=='cao'&&!cityVisible(s,c.id)&&scoutRoute(s,city.id,c.id));assert.ok(target);
 const troops=officer.unit.troops;assert.equal(dispatchScout(s,city.id,officer.unit.id,target.id),null);const task=scoutAssignment(s,officer.unit.id);
 assert.equal(officer.unit.mission,undefined);assert.equal(residentOfficer(s,officer.unit.id).location,city.id);assert.equal(officer.unit.troops,troops);assert.equal(officerActivities(s).get(officer.unit.id).action,'负责侦察');assert.equal(officerActivities(s).get(officer.unit.id).siteId,city.id);
 assert.ok(!cityStaffStatus(s,city).idle.some(o=>o.unit.id===officer.unit.id));assert.match(assignDomestic(s,city.id,'technology',officer.unit.id),/负责侦察/);
 assert.match(dispatchScout(s,city.id,officer.unit.id,target.id),/没有其它任务/);
 let days=0;while(task.phase!=='watch'&&days++<30)nextDay(s);assert.ok(days<30);assert.equal(task.location,target.id);assert.ok(cityVisible(s,target.id));
 assert.equal(cityIntelligence(s,target.id).data.grain,target.grain);assert.ok(task.contacts.some(c=>c.id===target.id&&c.report));assert.equal(residentOfficer(s,officer.unit.id).location,city.id);
 const before=serializeCampaign(s);scoutingMarkup(s);campaignInfoDetail(s,'city',target.id);assert.equal(serializeCampaign(s),before,'browsing cannot reroll or prolong illumination');
 const resumed=validateCampaign(JSON.parse(before));nextDay(s);nextDay(resumed);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
 const expires=Math.max(...s.campaign.vision.factions.cao.scouted.filter(v=>Math.hypot(v.x-target.x,v.y-target.y)<=36).map(v=>v.expiresDay));
 assert.equal(recallScout(s,officer.unit.id),null);assert.equal(officer.unit.scouting,undefined);assert.equal(residentOfficer(s,officer.unit.id).location,city.id);assert.ok(cityVisible(s,target.id),'recently illuminated areas persist after stopping work');
 while(s.campaign.day<expires)nextDay(s);assert.ok(!cityVisible(s,target.id));const old=cityIntelligence(s,target.id).data.grain;target.grain=Math.max(0,old-1234);updateVision(s);assert.equal(cityIntelligence(s,target.id).data.grain,old);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('intellect controls randomized illumination duration, without an intelligence acquisition wait',()=>{
 assert.deepEqual(scoutingDurationRange(0),{min:1,max:2});assert.deepEqual(scoutingDurationRange(100),{min:4,max:6});
 const base=quietGame(),{city,officer}=scout(base),target=scoutTargets(base,city.id).find(c=>c.units&&c.owner!=='cao'),durations=[];
 for(const intellect of [0,100]){const s=JSON.parse(serializeCampaign(base)),u=residentOfficer(s,officer.unit.id).unit;u.intellect=intellect;assert.equal(dispatchScout(s,city.id,u.id,target.id),null);
  const spots=s.campaign.vision.factions.cao.scouted;assert.ok(spots.length);durations.push(spots[0].expiresDay-spots[0].seenDay);assert.ok(durations.at(-1)>=scoutingDurationRange(intellect).min&&durations.at(-1)<=scoutingDurationRange(intellect).max);
  const before=serializeCampaign(s);scoutingMarkup(s);updateVision(s);assert.equal(serializeCampaign(s),before);
 }
 assert.ok(durations[1]>durations[0]);
});

test('scouting a fractional-distance road endpoint retains a valid, deterministic save',()=>{
 const s=newCampaign(2027,'all-heroes-251'),faction='force-41',home='town-11',target='town-10';
 assert.ok(scoutCandidates(s,home,faction).some(o=>o.unit.id==='person-613'));
 assert.equal(dispatchScout(s,home,'person-613',target,{faction}),null);advanceScouting(s);
 const t=scoutAssignment(s,'person-613');assert.equal(t.phase,'watch');assert.equal(t.location,target);
 const from='junction:town-10:town-11',endpoint=scoutVisionProxy(s,{location:from,route:[target],progress:roadCost(s,from,target)});
 assert.equal(endpoint.travel.progress,roadDistance(s,from,target));
 assert.ok(s.campaign.vision.factions[faction].scouted.every(v=>!v.travel||v.travel.progress<=roadDistance(s,v.travel.from,v.travel.to)));
 const saved=serializeCampaign(s),resumed=validateCampaign(JSON.parse(saved));assert.equal(serializeCampaign(resumed),saved);
 s.campaign.day++;resumed.campaign.day++;advanceScouting(s);advanceScouting(resumed);assert.equal(serializeCampaign(s),serializeCampaign(resumed));
});

test('a civilian scouting officer has real employment and can clear an idle resignation warning',()=>{
 const s=newCampaign(203,'guandu-200'),home='town-8',id='person-409',o=scoutCandidates(s,home).find(o=>o.unit.id===id);
 assert.equal(o.unit.troops,0);assert.equal(dispatchScout(s,home,id,scoutTargets(s,home)[0].id),null);
 const r=s.campaign.talent.records[id];Object.assign(r,{graceUntilDay:1,idleDays:180,idleTurns:18,workedDays:0,leaveAtDay:30});s.campaign.domestic.loyalty[id]=30;
 const resumed=validateCampaign(JSON.parse(serializeCampaign(s)));
 for(let day=1;day<=30;day++)for(const state of [s,resumed]){state.campaign.day=day;state.turn=Math.floor((day-1)/10)+1;finishTalentDay(state,cancelDomestic);}
 assert.equal(r.workedDays,30);assert.equal(r.idleDays,0);assert.equal(r.leaveAtDay,null);assert.ok(residentOfficer(s,id));assert.ok(scoutAssignment(s,id));
 assert.equal(serializeCampaign(s),serializeCampaign(resumed));
});

test('a prepared city officer can work and encountered armies have usable, dated intelligence reports',()=>{
 const s=newCampaign(203,'guandu-200'),city=s.cities.find(c=>c.owner==='cao'&&scoutCandidates(s,c.id).some(o=>o.unit.troops>0)&&scoutTargets(s,c.id).some(n=>n.units?.length&&n.owner!=='cao'&&!cityVisible(s,n.id))),officer=scoutCandidates(s,city.id).find(o=>o.unit.troops>0),target=scoutTargets(s,city.id).find(c=>c.units?.length&&c.owner!=='cao'&&!cityVisible(s,c.id)),enemy=fieldFromCity(s,target.id);
 assert.equal(dispatchScout(s,city.id,officer.unit.id,target.id),null);const t=scoutAssignment(s,officer.unit.id);t.location=target.id;t.route=[];t.progress=0;t.phase='watch';advanceScouting(s);
 assert.equal(residentOfficer(s,officer.unit.id).location,city.id);assert.ok(officer.unit.troops>0);assert.ok(campaignInfoIndex(s).army.some(a=>a.id===enemy.id));const contact=t.contacts.find(c=>c.kind==='army'&&c.id===enemy.id);assert.ok(contact);
 const report=scoutingReportMarkup(s,{task:t.id,key:contact.key});assert.match(report.body,/所属部队/);assert.match(report.body,/兵力/);assert.equal(contact.report.data.target,null);assert.deepEqual(contact.report.data.route,[]);assert.equal(contact.report.day,s.campaign.day);validateCampaign(JSON.parse(serializeCampaign(s)));
});

test('AI threats ignore hidden armies and secret orders but respond to observed approaching forces',()=>{
 const s=newCampaign(203,'guandu-200'),c=s.cities.find(c=>c.owner==='yuan'),enemyCity=s.cities.find(x=>x.owner==='cao'&&x.units.length&&!cityVisible(s,x.id,'yuan')),enemy=fieldFromCity(s,enemyCity.id,{target:c.id});
 assert.equal(observeStrategicThreat(s,c).power,0);enemy.location=c.id;enemy.travel=null;enemy.route=[];updateVision(s);
 assert.ok(observeStrategicThreat(s,c).nearby===0);enemy.travel={from:c.id,to:s.roads.find(([a,b])=>a===c.id||b===c.id).find(id=>id!==c.id),progress:0};
 // A known position alone does not reveal an order aimed at a distant city.
 assert.equal(observeStrategicThreat(s,c).power,0);enemy.travel={from:enemy.travel.to,to:c.id,progress:0};enemy.location=enemy.travel.from;
 enemy.travel.progress=roadDistance(s,enemy.travel.from,enemy.travel.to)-.01;updateVision(s);assert.ok(observeStrategicThreat(s,c).power>0);
});

test('foreign battle observations do not disclose unseen history or later outcomes',()=>{
 const s=newCampaign(203,'guandu-200'),home=s.cities.find(c=>c.owner==='cao');
 const r={id:'fog-battle',name:'观察战役',startedDay:1,settled:false,point:{x:home.x,y:home.y},battle:{tick:3,logs:[{text:'侦察前的秘密战况'}],sides:[{faction:'yuan',units:[]},{faction:'wu',units:[]}]},templates:{},snapshots:[{day:1,tick:0,data:{secret:true}}],report:null};
 s.campaign.battles.push(r);updateVision(s);const before=serializeCampaign(s),observed=intelligenceWorld(s).campaign.battles.find(b=>b.id===r.id);
 assert.equal(observed.snapshots.length,1);assert.equal(observed.snapshots[0].data.secret,undefined);assert.deepEqual(observed.battle.logs,[]);assert.equal(serializeCampaign(s),before);
 assert.ok(!s.campaign.vision.factions.cao.battles.includes(r.id));
 r.point={x:2000,y:2000};r.settled=true;r.report={reason:'击溃',winner:0,growth:[],stats:[]};
 s.campaign.battles=[];s.campaign.archive.push({id:r.id,name:r.name,startedDay:1,endedDay:1,reason:'击溃',winner:'yuan'});updateVision(s);
 assert.ok(!intelligenceWorld(s).campaign.archive.some(b=>b.id===r.id),'an unseen outcome is not published merely because the battle was once visible');
 s.campaign.archive=[];r.point={x:home.x,y:home.y};s.campaign.battles=[r];updateVision(s);
 s.campaign.battles=[];s.campaign.archive.push({id:r.id,name:r.name,startedDay:1,endedDay:1,reason:'击溃',winner:'yuan'});updateVision(s);
 assert.ok(intelligenceWorld(s).campaign.archive.some(b=>b.id===r.id),'an observed completed battle retains its summary');
});

test('save validation rejects missing work, future sight expiry and invalid scout routes',()=>{
 const s=quietGame(),{city,officer}=scout(s),target=scoutTargets(s,city.id).find(c=>c.units&&c.owner!=='cao');dispatchScout(s,city.id,officer.unit.id,target.id);
 const missing=JSON.parse(serializeCampaign(s));delete missing.campaign.scouting;assert.throws(()=>validateCampaign(missing),/侦察工作/);
 const fog=JSON.parse(serializeCampaign(s));delete fog.campaign.vision;assert.throws(()=>validateCampaign(fog),/迷雾/);
 const future=JSON.parse(serializeCampaign(s));future.campaign.vision.factions.cao.scouted[0].expiresDay=999;assert.throws(()=>validateCampaign(future),/迷雾/);
 const bad=JSON.parse(serializeCampaign(s));bad.campaign.scouting.tasks[0].route=['not-a-node'];assert.throws(()=>validateCampaign(bad),/侦察工作/);
 assert.equal(mapNode(s,target.id).name,target.name);
});


test('scouting selects a city, its resident officer and only a nearby endpoint in order',()=>{
 const s=quietGame(),{city,officer}=scout(s),targets=scoutTargets(s,city.id),target=targets[0];assert.ok(target);
 const select=(html,id)=>html.match(new RegExp('<select id="'+id+'"[^>]*>[\\s\\S]*?</select>'))[0];
 const initial=scoutingMarkup(s);assert.match(select(initial,'scout-officer'),/disabled/);assert.match(select(initial,'scout-target'),/disabled/);assert.doesNotMatch(select(initial,'scout-city'),/selected/);
 const cityOnly=scoutingMarkup(s,{city:city.id,target:target.id});assert.doesNotMatch(select(cityOnly,'scout-officer'),/selected/);assert.match(select(cityOnly,'scout-target'),/disabled/);
 const assigned=scoutingMarkup(s,{city:city.id,officer:officer.unit.id});assert.doesNotMatch(select(assigned,'scout-target'),/disabled/);assert.ok(targets.every(n=>select(assigned,'scout-target').includes('value="'+n.id+'"')));
 const other=s.cities.find(c=>c.owner==='cao'&&c.id!==city.id),foreignOfficer=scoutCandidates(s,other.id)[0];assert.ok(foreignOfficer);
 assert.match(dispatchScout(s,city.id,foreignOfficer.unit.id,target.id),/本城/);assert.match(select(scoutingMarkup(s,{city:city.id,officer:foreignOfficer.unit.id,target:target.id}),'scout-target'),/disabled/);
 const ready=scoutingMarkup(s,{city:city.id,officer:officer.unit.id,target:target.id});assert.match(ready,/斥候路线/);assert.doesNotMatch(ready.match(/<button[^>]*data-action="scout-dispatch"[^>]*>/)[0],/disabled/);
});

test('scouts can stop at neighboring cities but cannot cross them or follow a distant port chain',()=>{
 const s=quietGame(),{city,officer}=scout(s),neighbor=s.cities.find(c=>c.id!==city.id),far=s.cities.find(c=>c.id!==city.id&&c!==neighbor);
 const node=(id,x)=>({id,name:id,kind:'port',x,y:0});s.junctions=[node('local',1),node('beyond-city',3),node('near-port',2),node('far-port',4)];
 s.roads=[[city.id,'local'],['local',neighbor.id],[neighbor.id,'beyond-city'],['beyond-city',far.id]];
 s.roadSegments=Object.fromEntries(s.roads.map(([a,b])=>[[a,b].sort().join(':'),{distance:10}]));
 const targets=scoutTargets(s,city.id).map(n=>n.id);assert.ok(targets.includes(neighbor.id));assert.ok(targets.includes('local'));assert.ok(!targets.includes('beyond-city'));assert.ok(!targets.includes('far-port'));assert.ok(!targets.includes(far.id));
 assert.deepEqual(scoutRoute(s,city.id,neighbor.id),['local',neighbor.id]);assert.equal(scoutRoute(s,city.id,far.id),null);
 const before=serializeCampaign(s);assert.match(dispatchScout(s,city.id,officer.unit.id,far.id),/周边/);assert.equal(serializeCampaign(s),before,'illegal dispatch cannot consume the worker or random sight duration');
 const national=newCampaign(203,'guandu-200'),distantPort=national.junctions.find(n=>n.name==='安平港');assert.ok(distantPort);assert.equal(scoutRoute(national,'chenliu',distantPort.id),null);assert.ok(!scoutTargets(national,'chenliu').some(n=>n.id===distantPort.id));
});

test('saved scouts cannot bypass nearby limits or pass through a city on their remaining route',()=>{
 const s=quietGame(),{city,officer}=scout(s),target=scoutTargets(s,city.id).find(n=>n.units&&n.owner!=='cao');assert.equal(dispatchScout(s,city.id,officer.unit.id,target.id),null);
 const far=s.cities.find(c=>c.id!==city.id&&!scoutRoute(s,city.id,c.id));assert.ok(far);
 const bad=JSON.parse(serializeCampaign(s)),t=bad.campaign.scouting.tasks[0];t.targetCity=far.id;t.location=far.id;t.route=[];t.phase='watch';assert.throws(()=>validateCampaign(bad),/侦察工作/);
 const across=JSON.parse(serializeCampaign(s)),job=across.campaign.scouting.tasks[0];job.location=target.id;job.route=[city.id,...job.route];assert.throws(()=>validateCampaign(across),/侦察工作/);
});
