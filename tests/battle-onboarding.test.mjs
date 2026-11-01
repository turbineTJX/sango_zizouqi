import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattleOnboarding,BATTLE_ONBOARDING_KEY} from '../battle-onboarding.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const battle={key:'first-battle',locked:false};
test('first battle teaches all four topics, waiting for the real battle start between phases',()=>{
 const storage=memory(),guide=createBattleOnboarding(storage),before=JSON.stringify(battle);
 assert.equal(guide.topicFor(battle),'basics');guide.next();assert.equal(guide.topicFor(battle),'controls');
 guide.next();assert.equal(guide.topicFor(battle),null);assert.equal(guide.status,'waiting');
 const restored=createBattleOnboarding(storage);assert.equal(restored.topicFor(battle),null);
 assert.equal(restored.topicFor({...battle,locked:true}),'tactics');restored.next(true);
 assert.equal(restored.topicFor({...battle,locked:true}),'statuses');restored.previous();assert.equal(restored.step,2);restored.next(true);restored.next(true);
 assert.equal(restored.status,'complete');assert.equal(createBattleOnboarding(storage).topicFor({key:'another'}),null);
 assert.equal(JSON.stringify(battle),before,'teaching never changes the battle');
});
test('closing at any stage skips all remaining topics across reloads, phases and later battles',()=>{
 for(let step=0;step<4;step++){
  const storage=memory(),guide=createBattleOnboarding(storage);guide.topicFor({...battle,locked:true});
  for(let i=0;i<step;i++)guide.next(true);
  guide.skip();const restored=createBattleOnboarding(storage);
  assert.equal(restored.status,'skipped');assert.equal(restored.topicFor(battle),null);
  assert.equal(restored.topicFor({...battle,locked:true}),null);assert.equal(restored.topicFor({key:'next-battle'}),null);
 }
});
test('a loaded active battle can teach every topic without a deployment detour',()=>{
 const guide=createBattleOnboarding(memory());
 for(const topic of ['basics','controls','tactics','statuses']){assert.equal(guide.topicFor({...battle,locked:true}),topic);guide.next(true);}
 assert.equal(guide.status,'complete');
});
test('unfinished first-battle teaching does not move to a different battle or reopen after its result',()=>{
 for(const target of [{key:'second-battle'},{...battle,result:true}]){
  const storage=memory(),guide=createBattleOnboarding(storage);guide.topicFor(battle);guide.next();guide.next();
  assert.equal(guide.topicFor(target),null);assert.equal(guide.status,'complete');
 }
});
test('reading progress survives reload, writes only preferences and works without storage',()=>{
 const storage=memory(),guide=createBattleOnboarding(storage);guide.topicFor(battle);guide.next();
 assert.equal(createBattleOnboarding(storage).topicFor(battle),'controls');assert.ok(storage.getItem(BATTLE_ONBOARDING_KEY));
 const broken=createBattleOnboarding({getItem(){throw Error('blocked');},setItem(){throw Error('full');}});
 assert.equal(broken.topicFor(battle),'basics');broken.skip();assert.equal(broken.topicFor(battle),null);
});
