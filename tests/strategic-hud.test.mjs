import {updateVision,validateVision} from '../strategic-vision.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign} from './helpers/auto-domestic-campaign.mjs';
import {strategicHUD} from '../strategic-hud.mjs';
import {armyMapMarkers} from '../strategic-army-markers.mjs';
import {roadPoint} from '../strategic-movement.mjs';
import {fieldFromCity} from './helpers/field-campaign.mjs';
import {campaignDate} from '../national-scenarios.mjs';
import {campaignJournalMarkup} from '../strategic-view.mjs';

test('record dates use the scenario calendar across periods, months and years without changing state',()=>{
 const s=newCampaign(203,'red-cliffs-208'),before=JSON.stringify(s);
 for(const [day,date]of [[1,'208年1月1日'],[10,'208年1月10日'],[11,'208年1月11日'],[30,'208年1月30日'],[31,'208年2月1日'],[360,'208年12月30日'],[361,'209年1月1日']])assert.equal(campaignDate(s,{day}),date);
 assert.equal(campaignDate(s,{turn:2,period:true}),'208年1月中旬');assert.equal(campaignDate(s,{turn:37,period:true}),'209年1月上旬');
 assert.equal(JSON.stringify(s),before);
 const legacy=newCampaign(1);assert.equal(campaignDate(legacy,{day:1}),'200年1月1日');
});

test('journal categories preserve records and dates while excluding foreign domestic events',()=>{
 const s=newCampaign(203,'red-cliffs-208');
 s.campaign.domestic.events.unshift({day:31,phase:'proposal-approved',faction:'cao',cityId:'xuchang',text:'本方提案已同意'},{day:31,phase:'start',faction:'yuan',cityId:'ye',text:'不可见的外国内政'});
 const before=JSON.stringify(s),domestic=campaignJournalMarkup(s,'domestic');
 assert.match(domestic,/208年2月1日/);assert.match(domestic,/本方提案已同意/);assert.doesNotMatch(domestic,/不可见的外国内政|呈案|准奏/);
 for(const tab of ['all','domestic','personnel','battle','orders'])assert.match(campaignJournalMarkup(s,tab),new RegExp('data-journal-tab="'+tab+'"'));
 assert.equal(JSON.stringify(s),before);
});

test('map sidebar exposes faction-wide commands independently of selected city',()=>{
 const s=newCampaign(203,'guandu-200'),before=JSON.stringify(s);
 const own=strategicHUD(s,{city:'xuchang'}),enemy=s.cities.find(c=>c.owner!=='cao');
 assert.match(own,/aria-label="势力命令"/);assert.match(own,/data-action="faction-domestic"[^>]*>内政<\/button>/);assert.doesNotMatch(own,/统一内政|势力事务|data-action="campaign-affairs"/);assert.match(own,/外交/);assert.match(own,/战役/);
 assert.match(own,/200年1月1日/);assert.doesNotMatch(own,/第 1 旬|200年1月上旬/);
 assert.doesNotMatch(own,/执行本旬|安排行动|时间推进中|推进一天|推进本日|campaign-day|<small>势力命令/);
 assert.doesNotMatch(own,/data-task="expedition"/);
 assert.equal(strategicHUD(s,{city:enemy.id}),own);assert.equal(JSON.stringify(s),before);
});

test('army presentation stays anchored to the real army and provides a portrait fallback',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang'),before=JSON.stringify(s);
 const html=armyMapMarkers(s,{army:a.id});
 assert.match(html,/data-map-army-anchor/);assert.match(html,/data-map-army-card/);
 assert.ok(html.includes(`data-campaign-army="${a.id}"`));assert.match(html,/army-map-initial/);
 assert.equal(JSON.stringify(s),before);
});

test('marching company faces its road destination and is anchored to real segment progress',()=>{
 const s=newCampaign(203,'guandu-200'),a=fieldFromCity(s,'xuchang');
 a.target='town-44';a.route=['town-44'];a.location='luoyang';a.travel={from:'luoyang',to:'town-44',progress:10,road:'main'};
 const before=JSON.stringify(s),html=armyMapMarkers(s,{army:a.id});
 assert.match(html,/army-march-company.*scale\(1 1\)/);assert.match(html,/洛阳 → 虎牢关/);assert.match(html,/，行军，/);
 const from=s.cities.find(c=>c.id==='luoyang'),to=s.junctions.find(c=>c.id==='town-44');
 const distance=s.roadSegments[['luoyang','town-44'].sort().join(':')].distance,p=a.travel.progress/distance;
 const point=roadPoint(from,to,p,a.travel.road);
 assert.ok(html.includes(`data-x="${point.x}" data-y="${point.y}"`));
 assert.ok(Math.hypot(point.x-(from.x+(to.x-from.x)*p),point.y-(from.y+(to.y-from.y)*p))>0.01);
 assert.equal(JSON.stringify(s),before);
});


test('journal omits only structured no-result cooperation and keeps meaningful outcomes and saved records',()=>{
 const s=newCampaign(203,'guandu-200');
 const rows=[
  {phase:'cooperation',text:'甲乙协作判定，本次未触发协作。',result:{success:false,actual:0,relationGain:0}},
  {phase:'cooperation',text:'丙丁协作，提高收益并改善关系。',result:{success:true,actual:20,relationGain:1}},
  {phase:'cooperation',text:'旧档协作记录，结果资料不完整。',result:{}},
  {phase:'failure',text:'探索失败，未发现新人。',result:{success:false,actual:0,relationGain:0}},
  {phase:'cooperation',text:'协作带来关系变化。',result:{success:false,actual:0,relationGain:1}}
 ].map((e,i)=>({...e,id:900+i,day:1,cityId:'xuchang',faction:'cao'}));
 s.campaign.domestic.events.unshift(...rows);
 s.logs.unshift(...rows.map(e=>({turn:1,text:'第1天：'+e.text,kind:'good'})));
 s.campaign.vision.factions.cao.chronicle.unshift(...rows.map(e=>({turn:1,text:'第1天：'+e.text,kind:'good'})));
 const before=JSON.stringify(s);
 for(const tab of ['all','domestic']){
  const html=campaignJournalMarkup(s,tab);
  assert.ok(!html.includes(rows[0].text));
  for(const e of rows.slice(1))assert.ok(html.includes(e.text));
 }
 assert.equal(JSON.stringify(s),before);
});


test('journal merges linked merit only while its full matching outcome is visible',()=>{
 const s=newCampaign(203,'guandu-200'),growth={gained:3,before:1,after:1,unlocked:[]};
 const merit={id:'activity:900',sequence:900,sourceId:'merit:domestic:900',category:'domestic',phase:'merit',faction:'cao',officerId:'cao-cao',cityId:'xuchang',day:1,text:'功绩单独结算记录',result:{growth}};
 const outcome={...merit,id:'activity:901',sequence:901,sourceId:'domestic:901',phase:'complete',text:'完整成果与功绩变化',result:{growth,meritSourceId:merit.sourceId}};
 s.campaign.activity.nodes.push(merit,outcome);
 const chronicle=s.campaign.vision.factions.cao.chronicle;
 chronicle.unshift(...[outcome,merit].map(n=>({sourceId:n.sourceId,turn:1,text:n.text})));
 const before=JSON.stringify(s),html=campaignJournalMarkup(s,'all');
 assert.ok(html.includes(outcome.text));assert.ok(!html.includes(merit.text));assert.equal(JSON.stringify(s),before);
 outcome.result.growth={...growth,gained:4};assert.ok(campaignJournalMarkup(s,'all').includes(merit.text));
 outcome.result.growth=growth;chronicle.shift();assert.ok(campaignJournalMarkup(s,'all').includes(merit.text));
 chronicle.unshift({turn:1,text:outcome.text});assert.ok(campaignJournalMarkup(s,'all').includes(merit.text));
});


test('chronicle dates recover the exact day from their receipt and preserve legacy period dates',()=>{
 const s=newCampaign(203,'guandu-200');s.campaign.day=75;
 s.campaign.activity.nodes.push({id:'activity:900',sequence:900,sourceId:'date-test:1',faction:'cao',day:73},{id:'activity:901',sequence:901,sourceId:'date-test:2',faction:'cao',day:75});
 s.campaign.vision.factions.cao.chronicle=[{sourceId:'date-test:1',turn:8,text:'First outcome'},{sourceId:'date-test:2',turn:8,text:'Second outcome'},{turn:8,text:'Legacy outcome'}];
 const before=JSON.stringify(s),html=campaignJournalMarkup(s,'all');
 assert.match(html,/<time>200年3月13日<\/time><p>First outcome/);
 assert.match(html,/<time>200年3月15日<\/time><p>Second outcome/);
 assert.match(html,/<time>200年3月中旬<\/time><p>Legacy outcome/);
 assert.equal(JSON.stringify(s),before);
});


test('daily merit folds into optional detail while upgrades, penalties and unclassified records stay prominent',()=>{
 const s=newCampaign(203,'guandu-200');
 const rows=[
  {sourceId:'merit:governor:xuchang:1:cao',text:'Routine governance',gained:5,before:1,after:1,leveled:false},
  {sourceId:'merit:work-progress:1:1:cao',text:'Routine construction',gained:6,before:1,after:1,leveled:false},
  {sourceId:'merit:governor:xuchang:2:cao',text:'Officer upgraded',gained:5,before:1,after:2,leveled:true},
  {sourceId:'merit:work-progress:1:2:cao',text:'Work penalty',gained:-10,before:1,after:1,leveled:false},
  {sourceId:'merit:battle:1:cao',text:'Battle merit',gained:10,before:1,after:1,leveled:false},
  {sourceId:'merit:work-progress:legacy:cao',text:'Incomplete receipt'}
 ];
 s.campaign.activity.nodes.push(...rows.map((r,i)=>({id:'activity:'+(900+i),sequence:900+i,sourceId:r.sourceId,faction:'cao',day:1,phase:'merit',result:{leveled:r.leveled,growth:{gained:r.gained,before:r.before,after:r.after}}})));
 s.campaign.vision.factions.cao.chronicle=rows.map(r=>({turn:1,sourceId:r.sourceId,text:r.text}));
 const before=JSON.stringify(s),html=campaignJournalMarkup(s,'all'),fold=html.indexOf('<details'),main=html.slice(0,fold),details=html.slice(fold);
 assert.match(details,/<summary>日常功绩 · 2 条<\/summary>/);assert.doesNotMatch(details,/<details[^>]* open/);
 for(const r of rows.slice(0,2)){assert.ok(!main.includes(r.text));assert.ok(details.includes(r.text));}
 for(const r of rows.slice(2)){assert.ok(main.includes(r.text));assert.ok(!details.includes(r.text));}
 assert.equal(JSON.stringify(s),before);
});


test('observed journal dates and routine grouping survive receipt expiry and save round trips',()=>{
 const s=newCampaign(203,'guandu-200');s.campaign.day=75;
 const rows=[
  {sourceId:'merit:governor:xuchang:75:cao',text:'Retained daily merit',phase:'merit',result:{leveled:false,growth:{gained:5,before:1,after:1}}},
  {sourceId:'merit:work-progress:75:cao',text:'Retained upgrade',phase:'merit',result:{leveled:true,growth:{gained:5,before:1,after:2}}},
  {sourceId:'merit:work-progress:incomplete:cao',text:'Retained incomplete receipt',phase:'merit',result:{leveled:false,growth:{gained:5}}},
  {sourceId:'test:hidden',text:'Hidden foreign outcome',phase:'complete',faction:'yuan',cityId:'ye',result:{}}
 ].map((n,i)=>({id:'activity:'+(900+i),sequence:900+i,day:75,category:'domestic',faction:'cao',cityId:'xuchang',...n}));
 s.campaign.activity.nodes.push(...rows);updateVision(s);
 const entries=s.campaign.vision.factions.cao.chronicle;
 assert.equal(entries.find(e=>e.sourceId===rows[0].sourceId).day,75);
 assert.equal(entries.find(e=>e.sourceId===rows[0].sourceId).routineMerit,true);
 assert.equal(entries.find(e=>e.sourceId===rows[2].sourceId).routineMerit,false);
 assert.ok(!entries.some(e=>e.sourceId==='test:hidden'));
 s.campaign.activity.nodes=[];
 const restored=JSON.parse(JSON.stringify(s)),before=JSON.stringify(restored);
 validateVision(restored);
 const html=campaignJournalMarkup(restored,'all'),fold=html.indexOf('<details'),main=html.slice(0,fold),details=html.slice(fold);
 assert.match(details,/<summary>日常功绩 · 1 条<\/summary>/);
 assert.match(details,/<time>200年3月15日<\/time><p>Retained daily merit/);
 assert.ok(main.includes('Retained upgrade'));assert.ok(main.includes('Retained incomplete receipt'));
 assert.ok(!html.includes('Hidden foreign outcome'));assert.equal(JSON.stringify(restored),before);
 const record=restored.campaign.vision.factions.cao.chronicle.find(e=>e.sourceId===rows[0].sourceId);
 record.day=76;assert.throws(()=>validateVision(restored));record.day=75;
 record.routineMerit='yes';assert.throws(()=>validateVision(restored));
});


test('visible foreign settlement reports retain their speaker after receipts expire',()=>{
 const s=newCampaign(203,'guandu-200');
 s.campaign.vision.factions.cao.chronicle=[
  {turn:1,type:'war',sourceId:'battle:encounter-1:cao',text:'讨伐战结束：本方获胜。本方余兵4032。'},
  {turn:1,type:'war',sourceId:'battle:encounter-1:neutral',text:'讨伐战结束：本方败退。本方余兵0。'},
  {turn:1,type:'war',sourceId:'battle:encounter-2:yuan',text:'渡口战结束：本方获胜。接收敌方伤兵10人。'},
  {turn:1,type:'event',sourceId:'other:neutral',text:'保留原始本方措辞。'}
 ];
 const before=JSON.stringify(s),html=campaignJournalMarkup(s,'all');
 assert.match(html,/讨伐战结束：本方获胜。本方余兵4032。/);
 assert.match(html,/地方势力战报：讨伐战结束：该军败退。该军余兵0。/);
 assert.match(html,/袁绍战报：渡口战结束：该军获胜。接收对方伤兵10人。/);
 assert.doesNotMatch(html,/本方败退/);assert.match(html,/保留原始本方措辞/);
 assert.equal(JSON.stringify(s),before);
});
