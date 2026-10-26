import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicDirector,musicSituation,musicSeason} from '../music-director.mjs';
import {MUSIC_THEMES,AUDIO_TRACKS} from '../music-themes.mjs';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment} from '../engine.mjs';

test('four seasonal scores follow the real 360-day calendar and have separate written melodies',()=>{
 assert.deepEqual([1,90,91,180,181,270,271,360,361].map(musicSeason),['spring','spring','summer','summer','autumn','autumn','winter','winter','spring']);
 const signatures=['spring','summer','autumn','winter'].map(id=>JSON.stringify(MUSIC_THEMES[id].phrases));assert.equal(new Set(signatures).size,4);
 assert.equal(Object.keys(AUDIO_TRACKS).length,13);assert.ok(Object.values(AUDIO_TRACKS).every(t=>t.bars>=24));
});
test('season, march, diplomacy, council and battle context use only the viewing faction',()=>{
 const state={campaign:{day:181,playerFaction:'cao'},armies:[{faction:'enemy',get travel(){throw Error('Hidden enemy movement read');}}]},ui={mode:'map'};
 assert.equal(musicSituation(state,ui).scene,'autumn');assert.equal(musicSituation(state,{...ui,modal:'faction-diplomacy'}).scene,'diplomacy');
 state.armies.push({faction:'cao',travel:{to:'x'},get units(){throw Error('Music scanned army units');}});assert.equal(musicSituation(state,ui).scene,'march');
 assert.equal(musicSituation(state,{mode:'lobby'}).scene,'lobby');
 const real=createScenario('custom-battle',521);assert.equal(musicSituation(real,ui).scene,'council');lockDeployment(real.battle);assert.equal(musicSituation(real,ui).scene,'encounter');
 real.battle.tick=20;assert.ok(['battle','advantage','disadvantage'].includes(musicSituation(real,ui).scene));
});
test('battle themes cannot reveal hidden troop numbers, reserves or future reinforcements',()=>{
 const state=createScenario('custom-battle',521);lockDeployment(state.battle);state.battle.tick=20;
 for(const enemy of state.battle.sides[1].units.slice(0,2)){enemy.status='defeated';enemy.statuses.stealth={until:1000};}
 for(const side of state.battle.sides)for(const unit of side.units)Object.defineProperty(unit,'hp',{get(){throw Error('Music read unit HP');}});
 const reserve={status:'reserve',side:1,statuses:{},get hp(){throw Error('Reserve HP read');}};state.battle.sides[1].units.push(reserve);
 state.battle.sides[1].units.push({status:'defeated',isDecoy:true,statuses:{}});
 assert.equal(musicSituation(state,{mode:'map'}).scene,'battle');
});
test('battle music compares routed squads at most once per ten seconds despite frequent redraws',()=>{
 let passes=0;
 const own=[],enemy=[],counted=units=>({*[Symbol.iterator](){passes++;yield*units;}});
 const state={battle:{deploymentLocked:true,tick:20,maxTicks:240,sides:[{units:counted(own)},{units:counted(enemy)}]}},ui={mode:'map'},d=new MusicDirector();
 assert.equal(d.update(state,ui,0),'battle');assert.equal(passes,2);
 enemy.push({status:'defeated'},{status:'defeated'});
 for(let i=1;i<1000;i++)assert.equal(d.update(state,ui,i/100),'battle');
 assert.equal(passes,2,'redraws must not iterate either side');
 assert.equal(d.update(state,ui,10),'advantage');assert.equal(passes,4);
 enemy.length=0;
 assert.equal(d.update(state,ui,19.9),'advantage');assert.equal(passes,4);
 assert.equal(d.update(state,ui,20),'battle');assert.equal(passes,6);
 own.push({status:'defeated'},{status:'defeated'});
 assert.equal(d.update(state,ui,30),'disadvantage');assert.equal(passes,8);
 state.battle.tick=180;
 assert.equal(d.update(state,ui,40),'decisive');assert.equal(passes,8,'late battle only needs the existing clock');
 state.battle.deploymentLocked=false;
 assert.equal(d.update(state,ui,40.1),'council');assert.equal(passes,8,'scene changes apply immediately without a troop scan');
});
test('day, scene, new battle and loaded game changes bypass the music cache',()=>{
 const d=new MusicDirector(),ui={mode:'map'},state={campaign:{day:90,playerFaction:'cao'},armies:[]};
 assert.equal(d.update(state,ui,0),'spring');
 state.campaign.day=91;assert.equal(d.update(state,ui,1),'summer');
 ui.modal='diplomacy';assert.equal(d.update(state,ui,2),'diplomacy');
 ui.modal=null;assert.equal(d.update(state,ui,3),'summer');
 const loaded={campaign:{day:91,playerFaction:'cao'},armies:[{faction:'cao',travel:{}}]};
 assert.equal(d.update(loaded,ui,4),'march');
 loaded.battle={deploymentLocked:true,tick:0};assert.equal(d.update(loaded,ui,5),'encounter');
 loaded.battle={deploymentLocked:true,tick:180};assert.equal(d.update(loaded,ui,6),'decisive');
 ui.mode='lobby';assert.equal(d.update(loaded,ui,7),'lobby');
});
test('music decisions do not mutate a real battle or any save field',()=>{
 const state=createScenario('custom-battle',521);lockDeployment(state.battle);state.battle.tick=80;
 const before=structuredClone(state),d=new MusicDirector();for(let i=0;i<30;i++)d.update(state,{mode:'map'},i);
 assert.deepEqual(state,before);
});
