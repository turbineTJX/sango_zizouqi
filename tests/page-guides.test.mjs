import test from 'node:test';
import assert from 'node:assert/strict';
import {PAGE_GUIDES,PAGE_GUIDE_STORAGE_KEY,createGuidePreferences,pageGuideId} from '../page-guides.mjs';
import {guideMarkup,guideCatalogueMarkup} from '../page-guide-view.mjs';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};

test('closing a page persists once per page across new controller instances',()=>{
 const storage=memory(),p=createGuidePreferences(storage);
 assert.equal(p.shouldShow('scouting'),true);
 // Merely querying/rendering the first popup does not acknowledge it.
 guideMarkup('scouting');assert.equal(p.hasSeen('scouting'),false);
 p.dismiss('scouting');p.dismiss('scouting');
 const restored=createGuidePreferences(storage);
 assert.equal(restored.shouldShow('scouting'),false);
 assert.equal(restored.shouldShow('troops'),true);
 assert.deepEqual(JSON.parse(storage.getItem(PAGE_GUIDE_STORAGE_KEY)).seen,['scouting']);
});
test('global disable preserves read pages and reset restores automatic first visits',()=>{
 const storage=memory(),p=createGuidePreferences(storage);p.dismiss('map');p.setEnabled(false);
 const disabled=createGuidePreferences(storage);
 assert.equal(disabled.shouldShow('troops'),false);
 assert.ok(guideMarkup('troops'),'manual help remains available');
 disabled.setEnabled(true);assert.equal(disabled.shouldShow('map'),false);
 disabled.reset();const reset=createGuidePreferences(storage);
 assert.equal(reset.enabled,true);assert.equal(reset.shouldShow('map'),true);
});
test('unavailable storage and malformed preferences do not break help',()=>{
 for(const raw of ['broken','null','{}','{"version":1,"seen":null}','{"version":1,"seen":["map",null,"unknown",{}]}']){
  const p=createGuidePreferences({getItem:()=>raw,setItem:()=>{}});
  assert.equal(p.shouldShow('unknown'),false);assert.equal(p.shouldShow('troops'),true);
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
 assert.equal(pageGuideId({modal:'campaign-affairs',affairsTab:'resources'},{}),'budget');
 assert.equal(pageGuideId({mode:'lobby',lobbyPage:'national',nationalDraft:{step:'faction'}},{}),'factions');
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
  assert.match(html,/role="dialog" aria-modal="true"/);assert.match(html,/data-guide-action="close"/);
  assert.ok(catalogue.includes('data-guide-id="'+id+'"'),id);
 }
 assert.equal(guideMarkup('missing'),'');
});
