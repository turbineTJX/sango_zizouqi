import test from 'node:test';
import assert from 'node:assert/strict';
import {STRATAGEMS,stratagemProfile,officerStratagems} from '../stratagems.mjs';
import {NATIONAL_FACTIONS,nationalWorld,nationalRoster} from '../national-scenarios.mjs';
import {COMMAND_RESOURCE,lockDeployment,stepBattle,issueCommand,battleStratagems,validateSave} from '../engine.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {stratagemAreaTargets,stratagemAreaContains,stratagemNeedsCleanse} from '../stratagem-area.mjs';
import {hasStatus,shieldAmount} from '../tactics.mjs';
import {stratagemAiFixture,militaryResource,freezeAiProbe} from './helpers/stratagem-ai.mjs';

const charge=(state,side)=>{
 const b=state.battle,r=militaryResource(b,side);
 for(let n=0;n<150&&r.commandProgress<COMMAND_RESOURCE.capacity&&!b.result;n++)stepBattle(b,{aiSides:[]});
 assert.equal(b.result,null);assert.equal(r.commandProgress,COMMAND_RESOURCE.capacity);
};

test('defensive numerical budgets beat comparable offensive damage and control at low, standard and high caster strength',()=>{
 for(const stat of [60,80,100]){
  const p=key=>stratagemProfile(key,{id:STRATAGEMS[key].roster[0],leadership:stat,intellect:stat});
  const highestSingleStrike=p('storm').strength*STRATAGEMS.storm.randomDamage.max;
  assert.ok(p('fortify').strength>highestSingleStrike,'shield exceeds a single strongest lightning hit');
  assert.ok(p('heal').strength>highestSingleStrike,'healing budget exceeds that hit, subject to actual wounded');
  for(const key of ['invincible','ward'])assert.ok(p(key).duration>p('disrupt').duration);
  assert.ok(p('cleanse').resolve>p('disrupt').duration);
 }
});

for(const side of [0,1])test('proactive army discipline protects healthy allies, preserves hunger and respects selected active targets, side '+side,()=>{
 const draft=structuredClone(stratagemAiFixture('cleanse',side,11231,false).testScenario.customBattle);
 draft.events=[{kind:'supply-cut',side,tick:1,duration:100}];
 const state=generateBattle(draft),b=state.battle,r=militaryResource(b,side);
 lockDeployment(b);freezeAiProbe(b);
 charge(state,side);
 assert.equal(chooseEnemyCommand(b,battleStratagems(b,side),STRATAGEMS,side),null,'AI still needs an actual ailment');
 const u=b.sides[side].units.find(u=>u.status==='active'),point={x:u.x,y:u.y};
 const targets=stratagemAreaTargets(b,STRATAGEMS.cleanse,point,side);
 assert.equal(issueCommand(b,'cleanse',point,side),null);
 for(const unit of targets)assert.ok(hasStatus(b,unit,'resolve'));
 assert.ok(hasStatus(b,u,'hunger'));assert.equal(r.commandProgress,0);
 for(const unit of b.sides[side].units.filter(u=>u.status!=='active'||!stratagemAreaContains(STRATAGEMS.cleanse,point,u)))assert.ok(!hasStatus(b,unit,'resolve'));
 const copy=validateSave(structuredClone(state));
 for(let n=0;n<r.lastCommand.source.resolve+2;n++){stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.deepEqual(copy.battle,b);}
});

for(const side of [0,1])test('reactive AI discipline reaches the afflicted unit and protects healthy neighbours using natural charge, side '+side,()=>{
 const state=stratagemAiFixture('cleanse',side,11237,true),b=state.battle,r=militaryResource(b,side);
 const afflicted=b.sides[side].units.find(u=>stratagemNeedsCleanse(b,u));
 assert.ok(afflicted);
 for(let n=0;n<150&&!r.commandSerial&&!b.result;n++)stepBattle(b,{aiSides:[side]});
 assert.equal(r.lastCommand?.key,'cleanse');assert.ok(!stratagemNeedsCleanse(b,afflicted));
 assert.ok(stratagemAreaContains(STRATAGEMS.cleanse,r.lastCommand.target,afflicted));
 const recipients=stratagemAreaTargets(b,STRATAGEMS.cleanse,r.lastCommand.target,side);
 assert.ok(recipients.length>=2);assert.ok(recipients.every(u=>hasStatus(b,u,'resolve')));
 validateSave(structuredClone(state));
});

test('shorter independent cooldown permits a second genuinely charged shield while preserving source and deterministic saves',()=>{
 const state=stratagemAiFixture('fortify',0,11231,true),b=state.battle;charge(state,0);
 const u=b.sides[0].units.find(u=>u.status==='active'),point={x:u.x,y:u.y};
 assert.equal(issueCommand(b,'fortify',point),null);const firstTick=b.tick;
 const copy=validateSave(structuredClone(state));
 while(b.tick<firstTick+STRATAGEMS.fortify.cooldown||b.commandProgress<COMMAND_RESOURCE.capacity){
  stepBattle(b,{aiSides:[]});stepBattle(copy.battle,{aiSides:[]});assert.equal(b.result,null);assert.deepEqual(copy.battle,b);
 }
 assert.equal(shieldAmount(b,u),0,'the first shield expired before the second command');
 assert.equal(issueCommand(b,'fortify',point),null);assert.equal(b.commandSerial,2);
 assert.equal(shieldAmount(b,u),Math.round(u.maxHp*b.lastCommand.source.strength));
 validateSave(structuredClone(state));
});

test('expanded fixed repertoire covers missing regional forces in actual opening rosters without recruiting or changing scenario assignments',()=>{
 const targets={
  'all-heroes-251':['马腾','刘焉','袁术','公孙瓒','公孙度','刘虞','孔融','刘岱','陶谦','丁原','王朗','刘繇','孟获','何进','韩玄','毌丘俭','韩遂'],
  'coalition-190':['马腾','袁术','公孙瓒','公孙度','刘虞','孔融','刘岱','陶谦'],
  'warlords-194':['马腾','刘璋','公孙瓒','公孙度','孔融','陶谦','王朗','刘繇'],
  'red-cliffs-208':['刘璋','马腾','公孙康'],
 };
 for(const [id,names]of Object.entries(targets)){
  const {cities}=nationalWorld(id),roster=nationalRoster(id,cities);
  for(const name of names){
   const faction=Object.keys(NATIONAL_FACTIONS).find(f=>NATIONAL_FACTIONS[f].name===name),holders=roster.filter(o=>o.faction===faction&&officerStratagems(o.id).length);
   assert.ok(holders.length>=1,id+' '+name+': '+holders.length);
  }
 }
 const roster=nationalRoster('all-heroes-251',nationalWorld('all-heroes-251').cities);
 for(const name of ['孔伷','严白虎','雍闿','金旋','赵范','刘度']){
  const faction=Object.keys(NATIONAL_FACTIONS).find(f=>NATIONAL_FACTIONS[f].name===name);
  assert.ok(roster.filter(o=>o.faction===faction&&officerStratagems(o.id).length).length<=1,name);
 }
 assert.deepEqual(officerStratagems('person-605'),['zhou-redcliffs'],'Li Ru uses fire, not supernatural lightning');
 assert.deepEqual(STRATAGEMS.storm.roster,['person-404']);
});
