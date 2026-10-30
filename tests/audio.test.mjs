import test from 'node:test';
import assert from 'node:assert/strict';
import {AUDIO_TRACKS,scorePulse,SOUND_CUES} from '../audio-score.mjs';
import {BattleAudioReader} from '../audio-events.mjs';
import {GameAudio,audioPreferences} from '../game-audio.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';

test('audio presentation observes a complete real battle without changing its state or random sequence',()=>{
 const observed=createScenario('custom-battle',521),silent=structuredClone(observed),reader=new BattleAudioReader(),heard=new Set();
 const b=observed.battle;assert.deepEqual(reader.read(b),[]);assert.equal(lockDeployment(b),null);lockDeployment(silent.battle);
 for(const cue of reader.read(b))heard.add(cue.key);
 for(let i=0;i<600&&!b.result;i++){
  stepBattle(b);stepBattle(silent.battle);const before=structuredClone(observed);
  for(const cue of reader.read(b))heard.add(cue.key);
  assert.deepEqual(observed,before,'audio may not mutate simulation or save data');
  assert.deepEqual(reader.read(b),[],'DOM redraws may not replay a damage batch');
 }
 assert.ok(b.result);assert.ok(heard.has('start'));assert.ok(heard.has('melee')||heard.has('arrow'));assert.ok(heard.has('tactic')||heard.has('fire'));
 assert.ok(['victory','defeat','draw'].some(key=>heard.has(key)));assert.deepEqual(observed,silent);
});

test('restored commands, effects and results stay silent; new paused commands play once',()=>{
 const b=createScenario('custom-battle',521).battle;lockDeployment(b);stepBattle(b);b.commandSerial=2;b.lastCommand={key:'assault',tick:b.tick};
 const reader=new BattleAudioReader();assert.deepEqual(reader.read(b),[]);
 b.commandSerial++;assert.equal(reader.read(b).filter(c=>c.key==='order').length,1);assert.deepEqual(reader.read(b),[]);
 b.result={winner:0};assert.equal(reader.read(b)[0].key,'victory');assert.deepEqual(reader.read(b),[]);
 const reloaded=structuredClone(b);assert.deepEqual(reader.read(reloaded),[]);
 reader.read(null);b.commandSerial++;assert.deepEqual(reader.read(b),[],'returning to a battle may not replay events from another view');
});

test('hidden enemies and ongoing effects produce no cues; a multi-target cast is one gesture',()=>{
 const b=createScenario('custom-battle',521).battle;lockDeployment(b);
 const own=b.sides[0].units.find(u=>u.status==='active'),enemy=b.sides[1].units.find(u=>u.status==='active');
 const reader=new BattleAudioReader();reader.read(b);
 const effect={from:enemy.id,to:own.id,skill:true,visual:'fire',label:'火计',damage:100,x:own.x};
 enemy.statuses.stealth={until:1000};b.effects=[effect];assert.deepEqual(reader.read(b),[]);
 delete enemy.statuses.stealth;b.tick++;b.effects=[effect,{...effect,to:enemy.id}, {...effect,ongoing:true}];
 assert.deepEqual(reader.read(b).map(c=>c.key),['fire']);
 b.tick++;b.effects=[effect];assert.deepEqual(reader.read(b,{audible:false}),[]);assert.deepEqual(reader.read(b),[],'hidden tab must consume, not queue, old events');
 b.tick++;b.effects=[{...effect,skill:false,troop:'siege',visual:'slash'}];assert.deepEqual(reader.read(b).map(c=>c.key),['impact'],'actual siege equipment IDs use the heavy impact cue');
});

test('music loops contain finite playable notes and return to their exact written start',()=>{
 for(const [scene,track]of Object.entries(AUDIO_TRACKS)){
  let events=0;for(let pulse=0;pulse<track.bars*8;pulse++)for(const e of scorePulse(scene,pulse)){
   events++;for(const key of ['hz','length','level','pan','offset'])assert.ok(Number.isFinite(e[key]),scene+':'+key);
   assert.ok(e.hz>20&&e.hz<10000);assert.ok(e.length>0&&e.level>0&&e.level<1);
  }
  assert.ok(events>70);assert.deepEqual(scorePulse(scene,0),scorePulse(scene,track.bars*8));
 }
 assert.deepEqual(scorePulse('missing',0),[]);
 assert.equal(Object.keys(SOUND_CUES).length,22);
 for(const key of ['rout','retreat','withdraw','reinforcement'])assert.ok(SOUND_CUES[key].length>=2);
});

test('unavailable audio and corrupt or blocked preference storage never stop gameplay',async()=>{
 assert.deepEqual(audioPreferences({muted:'false',music:NaN,sfx:2}),{muted:false,music:.32,sfx:1,voice:.85,track:'auto'});
 const messages=[],a=new GameAudio({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},contextFactory:()=>null,onError:m=>messages.push(m)});
 assert.equal(await a.unlock(),false);assert.equal(a.play('tap'),false);a.setPreferences({muted:true,music:0});
 assert.equal(messages.length,1);assert.equal(a.preferences.muted,true);assert.equal(a.preferences.music,0);await a.destroy();
});
