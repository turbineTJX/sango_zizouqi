import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_GUIDES,PAGE_GUIDE_STORAGE_KEY,createGuidePreferences,pageGuideId} from '../page-guides.mjs';
import {guideMarkup,guideCatalogueMarkup} from '../page-guide-view.mjs';
import {PAGE_GUIDE_TARGETS,placeGuideCard} from '../page-guide-targets.mjs';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('opening game, scenario and faction selection never interrupts with automatic help',()=>{
 const storage=memory(),p=createGuidePreferences(storage);
 assert.equal(p.enabled,false);assert.equal(p.shouldShow('map'),false);
 p.setEnabled(true);
 const pages=[{mode:'lobby'},{mode:'lobby',lobbyPage:'maps'},{mode:'lobby',lobbyPage:'national'},{mode:'lobby',lobbyPage:'national',nationalDraft:{step:'faction'}}];
 function check(preferences){
  for(const ui of pages){
   const id=pageGuideId(ui,{});
   assert.equal(preferences.shouldShow(id),false,id);
   assert.equal(preferences.hasSeen(id),false,'visiting does not mark help read');
   assert.match(guideMarkup(id),/data-guide-action="close"/,'manual help is available');
  }
  assert.equal(preferences.shouldShow('map'),true);
  assert.equal(preferences.shouldShow('custom'),true);
 }
 check(p);p.setEnabled(false);p.setEnabled(true);check(createGuidePreferences(storage));
 p.reset();check(createGuidePreferences(storage));
});
test('terminal recap has manual help and settings or returned map retain their own context',()=>{
 const state={campaign:{},finished:'victory'},ui={mode:'map'};
 assert.equal(pageGuideId(ui,state),'ending');assert.equal(PAGE_GUIDES.ending.autoShow,false);assert.equal(PAGE_GUIDE_TARGETS.ending.length,PAGE_GUIDES.ending.steps.length);
 assert.equal(pageGuideId({...ui,modal:'settings'},state),'saves');assert.equal(pageGuideId({...ui,endingMap:true},state),'map');
});

test('closing a page persists once per page across new controller instances',()=>{
 const storage=memory(),p=createGuidePreferences(storage);
 p.setEnabled(true);assert.equal(p.shouldShow('scouting'),true);
 // Merely querying/rendering the first popup does not acknowledge it.
 guideMarkup('scouting');assert.equal(p.hasSeen('scouting'),false);
 p.dismiss('scouting');p.dismiss('scouting');
 const restored=createGuidePreferences(storage);
 assert.equal(restored.shouldShow('scouting'),false);
 assert.equal(restored.shouldShow('troops'),true);
 assert.deepEqual(JSON.parse(storage.getItem(PAGE_GUIDE_STORAGE_KEY)).seen,['scouting']);
});
test('reset clears read pages and preserves the automatic help preference',()=>{
 const storage=memory(),p=createGuidePreferences(storage);p.dismiss('map');p.setEnabled(false);
 const disabled=createGuidePreferences(storage);
 assert.equal(disabled.shouldShow('troops'),false);
 assert.ok(guideMarkup('troops'),'manual help remains available');
 disabled.setEnabled(true);assert.equal(disabled.shouldShow('map'),false);
 disabled.setEnabled(false);disabled.reset();const reset=createGuidePreferences(storage);
 assert.equal(reset.enabled,false);assert.equal(reset.hasSeen('map'),false);assert.equal(reset.shouldShow('map'),false);
 reset.setEnabled(true);assert.equal(createGuidePreferences(storage).shouldShow('map'),true);
});
test('unavailable storage and malformed preferences do not break help',()=>{
 for(const raw of ['broken','null','{}','{"version":1,"seen":null}','{"version":1,"seen":["map",null,"unknown",{}]}']){
  const p=createGuidePreferences({getItem:()=>raw,setItem:()=>{}});
  assert.equal(p.shouldShow('unknown'),false);assert.equal(p.shouldShow('troops'),false);
 }
 const p=createGuidePreferences({getItem(){throw Error('blocked');},setItem(){throw Error('full');}});
 assert.equal(p.dismiss('scouting'),false);assert.equal(p.shouldShow('scouting'),false);
 assert.equal(p.setEnabled(false),false);assert.equal(p.shouldShow('map'),false);
});
test('help preferences write only their own local key',()=>{
 const written=[],p=createGuidePreferences({getItem:()=>null,setItem:(...args)=>written.push(args)});
 p.dismiss('map');p.setEnabled(false);p.reset();
 assert.ok(written.every(([key])=>key===PAGE_GUIDE_STORAGE_KEY));
});
test('page resolution follows visible page, task and battle phase without mutating drafts',()=>{
 const draft={mode:'map',modal:'campaign-picker',officerPick:{task:'expedition',step:'formation',selected:['cao'],mapRoute:['chenliu']}},before=structuredClone(draft);
 assert.equal(pageGuideId(draft,{campaign:{}}),'troops');assert.deepEqual(draft,before);
 for(const [step,id]of [['unit-select','expedition'],['commanders','commanders'],['target','routes']])assert.equal(pageGuideId({...draft,officerPick:{...draft.officerPick,step}},{}),id);
 assert.equal(pageGuideId({...draft,officerPick:{task:'transfer',step:'target'}},{}),'transport');
 assert.equal(pageGuideId({modal:'campaign-affairs',affairsTab:'diplomacy'},{}),'diplomacy');
 for(const type of ['city','faction'])assert.equal(pageGuideId({modal:'campaign-info',infoView:{type,id:'own',page:'收支预算'}},{}),'budget');
 assert.equal(pageGuideId({mode:'lobby',lobbyPage:'national',nationalDraft:{step:'faction'}},{}),'factions');
 assert.equal(pageGuideId({mode:'lobby',lobbyPage:'maps'},{}),'maps');
 assert.equal(pageGuideId({mode:'map'},{battle:{deploymentLocked:false}}),'deployment');
 assert.equal(pageGuideId({mode:'map'},{battle:{deploymentLocked:true}}),'combat');
 assert.equal(pageGuideId({mode:'map'},{battle:{deploymentLocked:true,reinforcementCouncil:'open'}}),'reinforcements');
 assert.equal(pageGuideId({modal:'domestic-proposals'},{battle:{}}),'proposals');
 assert.equal(pageGuideId({modal:'unknown'},{}),null);
});
test('every guide contains detailed operations, rules, manual close and a catalogue entry',()=>{
 const catalogue=guideCatalogueMarkup(createGuidePreferences(memory()));
 for(const [id,g]of Object.entries(PAGE_GUIDES)){
  assert.ok(g.summary&&g.steps.length>=3&&g.tips.length>=1,id);
  const html=guideMarkup(id);
  assert.equal(PAGE_GUIDE_TARGETS[id]?.length,g.steps.length,id+' has live anchors for each step');
  assert.match(html,/role="region"/);assert.doesNotMatch(html,/aria-modal="true"|page-guide-shade/);assert.match(html,/page-guide-advisor/);assert.match(html,/data-guide-action="close"/);
  assert.ok(catalogue.includes('data-guide-id="'+id+'"'),id);
 }
 assert.equal(guideMarkup('missing'),'');
});

test('coach placement keeps edge controls and multiple targets clear on desktop and mobile',()=>{
 for(const [viewport,rects]of [
  [{width:1440,height:1000},[{left:1250,top:780,width:175,height:200},{left:720,top:940,width:510,height:50}]],
  [{width:390,height:844},[{left:270,top:685,width:115,height:155},{left:3,top:764,width:265,height:77}]],
  [{width:390,height:844},[{left:8,top:110,width:70,height:80}]]
 ]){
  const card={width:Math.min(360,viewport.width-24),height:320},p=placeGuideCard(rects,card,viewport);
  assert.ok(p.left>=12&&p.top>=12);
  assert.ok(p.left+card.width<=viewport.width-12&&p.top+card.height<=viewport.height-12);
  for(const r of rects)assert.ok(p.left+card.width<=r.left||p.left>=r.left+r.width||p.top+card.height<=r.top||p.top>=r.top+r.height);
 }
 const p=placeGuideCard([],{width:360,height:320},{width:1440,height:1000});
 assert.equal(p.left,540);assert.equal(p.top,340);
});
