import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {sideBonds,bondDamage,bondDefenseIgnore,bondFinisherCritical,bondAttributes} from '../bonds.mjs';
import {hasStatus,setStatus,shieldAmount,unitTactics} from '../tactics.mjs';
import {unitAttributes} from '../unit-stats.mjs';
import {validBondState} from '../bond-events.mjs';
import {intentIncome} from '../passives.mjs';
import {INTENT_STATE} from '../combat-rules.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';

const id=n=>Object.values(O).find(o=>o.name===n).id;
const teams={
 song:['曹操','袁术','袁谭','袁尚','袁绍','袁涣'],
 crusher:['徐晃','阎行','郭汜','华雄','鄂焕','阿会喃'],
 doubt:['贾诩','尹大目','郭图','桓范','魏讽','沮鹄'],
 lure:['陈宫','袁胤','郝萌','牛辅','王门','郭马'],
 fire:['周瑜','虞翻','阚泽','朱然','全琮','黄盖'],
 escort:['鲁肃','周泰','凌统','庞德','许褚','赵云'],
 finisher:['严颜','张郃','华雄','韩当','孙礼','马忠'],
 volley:['韩当','黄忠','甘宁','魏讽','严颜','蒋钦'],
 skirmish:['陈宫','张绣','王门','韩遂','孟达','袁熙'],
 chain:['尹默','庞统','阚泽','朱然','全琮','王浑'],
};
function scene(key,side=0,type='archer',foes=['刘禅','刘璋','韩玄','刘度','孔伷','张鲁']){
 const team=ns=>ns.map(name=>({id:id(name),type,troops:4000,level:10}));
 const state=createScenario('custom-battle',9501,20,null,{seed:9501,terrain:'land',ownTeam:team(side?foes:teams[key]),enemyTeam:team(side?teams[key]:foes)}),b=state.battle;lockDeployment(b);
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.retreatAt=null;u.statuses.root={until:999};u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));}
 const us=b.sides[side].units,es=b.sides[1-side].units;us.forEach((u,i)=>Object.assign(u,{x:i?0:4,y:i?i:3}));es.forEach((u,i)=>Object.assign(u,{x:i?13:6,y:i?i:3}));
 return {state,b,us,es,u:us[0],enemy:es[0],side};
}
const hp=(u,n)=>{u.hp=n;u.battleDamage=u.initial-n;u.healed=0;};
const basic=(x,u=x.u)=>{u.cooldown=0;stepBattle(x.b);return x.b.effects.filter(e=>e.from===u.id&&!e.skill&&!e.ongoing&&e.damage>0);};
function findProc(key,status,modify=()=>{}){for(let seed=1;seed<=80;seed++){const x=scene(key);modify(x);x.b.seed=Math.imul(seed,134775813)>>>0;basic(x);if(hasStatus(x.b,x.enemy,status))return x;}assert.fail(key+' must actually proc');}
const source=u=>({sourceId:u.id,sourceName:u.name,sourceSkillName:'火攻'});

test('single primary maxima require six actual holders, and secondary bonds remain at their attainable tiers',()=>{
 const pairs={song:['bondSong','bondValor'],crusher:['bondCrusher','bondFinisher'],doubt:['bondDoubt','bondVolley'],lure:['bondLure','bondSkirmish'],fire:['bondFire','bondChain'],escort:['bondEscort','bondLastStand']};
 for(const [key,ids]of Object.entries(pairs))for(const side of [0,1]){const x=scene(key,side);assert.equal(sideBonds(x.b,side)[ids[0]].tier,3,key);assert.ok((sideBonds(x.b,side)[ids[1]]?.tier||0)<3,key+' cannot freely max both');assert.ok(x.us.length<=6);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
});

test('Song uses real basic hits, chooses the lowest adjacent ally and preserves low-source support',()=>{
 for(const side of [0,1]){const x=scene('song',side),recipient=x.us[4];Object.assign(recipient,{x:4,y:2});recipient.intent=90;x.u.intent=20;basic(x);assert.equal(recipient.intent,97);assert.equal(x.b.effects.filter(e=>e.text?.startsWith('战歌 ·')).length,1);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
 const x=scene('song'),recipient=x.us[4];Object.assign(recipient,{x:4,y:2});recipient.intent=98;x.u.intent=20;basic(x);assert.equal(recipient.intent,100);assert.equal(shieldAmount(x.b,recipient),200);assert.equal(recipient.hp,4000);
 const shielded=scene('song');Object.assign(shielded.us[4],{x:4,y:2});setStatus(shielded.b,shielded.enemy,'shield',5,{amount:4000,source:'test',label:'护盾'});basic(shielded);assert.equal(shielded.us[4].intent,0);assert.ok(!shielded.b.effects.some(e=>e.label==='战歌'));
});

test('contact attacks trigger Song once rather than per target, and reserves cannot receive it',()=>{
 const x=scene('song',0,'spear'),recipient=x.us[4];Object.assign(recipient,{x:4,y:2});Object.assign(x.enemy,{x:5,y:3});Object.assign(x.es[1],{x:4,y:4});const hits=basic(x);assert.equal(hits.length,2);assert.equal(recipient.intent,7);assert.equal(x.b.effects.filter(e=>e.label==='战歌').length,1);
 recipient.status='reserve';recipient.arrivalTick=99;basic(x);assert.equal(recipient.intent,7);
});
test('Song settles a landed attack before retaliation can defeat its provider',()=>{
 const x=scene('song',0,'spear'),recipient=x.us[4];Object.assign(recipient,{x:4,y:2,intent:40});Object.assign(x.enemy,{x:5,y:3});hp(x.u,1);setStatus(x.b,x.enemy,'riposte',5,{...source(x.enemy),lastTick:0});basic(x);assert.equal(x.u.status,'defeated');assert.equal(recipient.intent,40+7-INTENT_STATE.defeatLoss-INTENT_STATE.nearbyDefeatLoss);assert.equal(x.b.effects.filter(e=>e.label==='战歌').length,1);assert.equal(x.b.effects.find(e=>e.label==='战歌').intentGained,7);
});

test('Crusher rolls seeded armor break, drains only after a successful top-tier break, and does not refresh it',()=>{
 const x=findProc('crusher','armorBreak',x=>{x.enemy.intent=40;});
 const remaining=hits=>40+intentIncome(x.enemy).hit*hits-D.bondCrusher.intentDrain;
 assert.equal(x.enemy.intent,remaining(1));assert.equal(x.b.effects.find(e=>e.label==='摧锋'&&e.intentDrained)?.intentDrained,D.bondCrusher.intentDrain);
 assert.equal(x.enemy.statuses.armorBreak.until,x.b.tick+D.bondCrusher.statusSteps+1);const until=x.enemy.statuses.armorBreak.until;basic(x);assert.equal(x.enemy.statuses.armorBreak.until,until);assert.equal(x.enemy.intent,remaining(2));assert.ok(!x.b.effects.some(e=>e.label==='摧锋'&&e.intentDrained));
 let hits=0,misses=0;for(let seed=1;seed<=30;seed++){const y=scene('crusher');y.b.seed=Math.imul(seed,134775813)>>>0;basic(y);hasStatus(y.b,y.enemy,'armorBreak')?hits++:misses++;}assert.ok(hits&&misses);
 const immune=scene('crusher');setStatus(immune.b,immune.enemy,'stasis',5);basic(immune);assert.ok(!hasStatus(immune.b,immune.enemy,'armorBreak'));
});

test('Finisher guarantees real basic criticals only on broken armor at or below half strength',()=>{
 for(const side of [0,1])for(const amount of [2000,2001])for(const broken of [true,false]){const x=scene('finisher',side),u=x.us[1];Object.assign(x.u,{x:0,y:0});Object.assign(u,{x:4,y:3});hp(x.enemy,amount);if(broken)setStatus(x.b,x.enemy,'armorBreak',6,source(u));assert.equal(bondFinisherCritical(x.b,u,x.enemy),broken&&amount===2000);const hit=basic(x,u)[0];assert.equal(hit.bondCritical==='bondFinisher',broken&&amount===2000);if(hit.bondCritical){assert.equal(hit.critical,true);assert.equal(hit.critChance,1);}assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
 const x=scene('finisher',0,'spear'),u=x.us[1];Object.assign(x.u,{x:0,y:0});Object.assign(u,{x:4,y:3});Object.assign(x.enemy,{x:5,y:3});hp(x.enemy,2000);setStatus(x.b,x.enemy,'armorBreak',6,source(u));primeTactic(u,'thrust');stepBattle(x.b);assert.ok(x.b.effects.some(e=>e.from===u.id&&e.skill&&e.damage>0));assert.ok(!x.b.effects.some(e=>e.bondCritical));
});

test('Doubt waits six rounds, rolls nearby enemies independently and cannot act outside legal attack range',()=>{
 let found=false,independent=false;
 for(let seed=1;seed<=35;seed++){const x=scene('doubt');Object.assign(x.es[1],{x:7,y:3});x.b.seed=Math.imul(seed,134775813)>>>0;for(let i=0;i<5;i++)stepBattle(x.b);assert.ok(!hasStatus(x.b,x.enemy,'disrupted'));stepBattle(x.b);assert.equal(x.u.bondState.doubtReady,12);const a=hasStatus(x.b,x.enemy,'disrupted'),c=hasStatus(x.b,x.es[1],'disrupted');found||=a;independent||=a!==c;if(a)assert.equal(x.enemy.statuses.disrupted.until,8);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
 assert.ok(found&&independent);
 const distant=scene('doubt');distant.enemy.x=12;for(let i=0;i<7;i++)stepBattle(distant.b);assert.equal(distant.u.bondState.doubtReady,undefined);assert.ok(!distant.es.some(u=>hasStatus(distant.b,u,'disrupted')));
});

test('Volley exploits effective control at distance and penetrates physical defense without reducing discipline',()=>{
 const x=scene('volley'),u=x.us[1];Object.assign(x.u,{x:0,y:0});Object.assign(u,{x:4,y:3});setStatus(x.b,x.enemy,'disrupted',8,source(x.u));assert.ok(Math.abs(bondDamage(x.b,u,x.enemy,'basic')-1.2*1.15)<1e-9);assert.equal(bondDefenseIgnore(x.b,u,x.enemy,'basic'),.35);assert.equal(bondDefenseIgnore(x.b,u,x.enemy,'intellect'),0);const hit=basic(x,u)[0];assert.ok(hit.damage>0);
 x.enemy.x=5;assert.equal(bondDefenseIgnore(x.b,u,x.enemy,'basic'),0);assert.equal(bondDamage(x.b,u,x.enemy,'basic'),1);
});

test('Lure actually taunts a hit enemy and slows its nearby companions while isolated hits grant Skirmish phase',()=>{
 const x=findProc('lure','taunt',x=>Object.assign(x.es[1],{x:7,y:3}));assert.equal(x.enemy.statuses.taunt.sourceId,x.u.id);assert.ok(hasStatus(x.b,x.es[1],'slow'));assert.ok(!hasStatus(x.b,x.u,'phase'));
 const isolated=scene('skirmish');basic(isolated);assert.ok(hasStatus(isolated.b,isolated.u,'phase'));assert.equal(isolated.u.statuses.phase.until,isolated.b.tick+3);assert.doesNotThrow(()=>validateSave(structuredClone(isolated.state)));
 const protectedEnemy=scene('lure');setStatus(protectedEnemy.b,protectedEnemy.enemy,'resolve',8);for(let i=0;i<3;i++)basic(protectedEnemy);assert.ok(!hasStatus(protectedEnemy.b,protectedEnemy.enemy,'taunt'));
});

test('Fire procs use the shared bounded burn and top-tier spread preserves original per-layer power and attribution',()=>{
 const x=findProc('fire','burn');assert.equal(x.enemy.statuses.burn.sourceId,x.u.id);assert.equal(x.enemy.statuses.burn.stacks,1);assert.ok(x.enemy.statuses.burn.baseAmount>0);
 for(let i=0;i<12;i++)basic(x);assert.ok((x.enemy.statuses.burn?.stacks||0)<=3);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 const y=scene('fire'),original=y.us[5];Object.assign(y.es[1],{x:7,y:3});for(let i=0;i<3;i++)setStatus(y.b,y.enemy,'burn',8,{...source(original),amount:50});for(let i=0;i<3;i++)stepBattle(y.b);assert.ok(!hasStatus(y.b,y.es[1],'burn'));stepBattle(y.b);const burn=y.es[1].statuses.burn;assert.equal(burn.baseAmount,50);assert.equal(burn.amount,50);assert.equal(burn.stacks,1);assert.equal(burn.sourceId,original.id);assert.ok(burn.until<=y.enemy.statuses.burn.until);assert.equal(y.u.bondState.fireSpreadReady,8);assert.doesNotThrow(()=>validateSave(structuredClone(y.state)));
});

test('Chain links burning enemies through actual hits then conserves one transmission budget without recursion or DOT transmission',()=>{
 for(const side of [0,1]){const x=scene('chain',side),u=x.us[1];Object.assign(x.u,{x:0,y:0});Object.assign(u,{x:4,y:3});Object.assign(x.es[1],{x:7,y:3});Object.assign(x.es[2],{x:6,y:4});setStatus(x.b,x.enemy,'burn',10,{...source(x.u),amount:1});basic(x,u);assert.ok(x.es.slice(0,3).every(v=>hasStatus(x.b,v,'link')));assert.equal(new Set(x.es.slice(0,3).map(v=>v.statuses.link.group)).size,1);assert.equal(u.bondState.linkReady,x.b.tick+5);
  const direct=basic(x,u).find(e=>e.to===x.enemy.id),transfers=x.b.effects.filter(e=>e.text==='连环传导');assert.equal(transfers.length,2);assert.equal(transfers.reduce((n,e)=>n+e.damage,0),Math.round(direct.damage*.4));assert.ok(Math.abs(transfers[0].damage-transfers[1].damage)<=1);
  stepBattle(x.b);assert.ok(!x.b.effects.some(e=>e.text==='连环传导'));assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

function guardScene(side=0){const x=scene('escort',side),recipient=x.us[1];Object.assign(recipient,{x:4,y:3});Object.assign(x.u,{x:4,y:2});hp(recipient,1600);x.enemy.intent=100;return {...x,recipient};}
test('Escort shields actual adjacent low-strength allies without healing them or disabling Backwater, and observes cooldown',()=>{
 for(const side of [0,1]){const x=guardScene(side);x.u.intent=20;x.recipient.intent=90;stepBattle(x.b);assert.equal(shieldAmount(x.b,x.recipient),800);assert.equal(x.recipient.hp,1600);assert.equal(x.u.bondState.escortReady,7);assert.ok(bondAttributes(x.b,x.recipient).attack.some(a=>a.label==='背水反击'));stepBattle(x.b);assert.equal(shieldAmount(x.b,x.recipient),800);assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));}
 const x=guardScene();hp(x.recipient,1601);stepBattle(x.b);assert.equal(shieldAmount(x.b,x.recipient),0);hp(x.recipient,1600);x.u.statuses.confuse={until:10};stepBattle(x.b);assert.equal(shieldAmount(x.b,x.recipient),0);
});

test('a surviving top-tier broken shield grants actionable damage immunity exactly once, including DOT, and resumes',()=>{
 for(const side of [0,1]){const x=guardScene(side);stepBattle(x.b);setStatus(x.b,x.recipient,'burn',2,{...source(x.enemy),amount:850});stepBattle(x.b);assert.equal(x.recipient.hp,1550);assert.equal(x.recipient.bondState.escortInvincibleUsed,true);assert.ok(hasStatus(x.b,x.recipient,'guardInvincible'));const copy=validateSave(structuredClone(x.state));x.recipient.cooldown=0;copy.battle.sides[side].units[1].cooldown=0;stepBattle(x.b);stepBattle(copy.battle);assert.deepEqual(x.state,copy);assert.equal(x.recipient.hp,1550);assert.ok(x.b.effects.some(e=>e.from===x.recipient.id&&!e.skill&&!e.ongoing&&e.damage>0));
  for(let i=0;i<4;i++)stepBattle(x.b);assert.equal(x.b.tick,7);assert.ok(!hasStatus(x.b,x.recipient,'guardInvincible'));assert.equal(shieldAmount(x.b,x.recipient),800);setStatus(x.b,x.recipient,'burn',2,{...source(x.enemy),amount:850});stepBattle(x.b);assert.ok(!hasStatus(x.b,x.recipient,'guardInvincible'));assert.doesNotThrow(()=>validateSave(structuredClone(x.state)));
 }
});

test('shield expiry and lethal damage batches cannot award invulnerability or resurrect troops',()=>{
 const expired=guardScene();for(let i=0;i<5;i++)stepBattle(expired.b);assert.equal(shieldAmount(expired.b,expired.recipient),0);assert.equal(expired.recipient.bondState.escortInvincibleUsed,undefined);
 const dead=guardScene();stepBattle(dead.b);setStatus(dead.b,dead.recipient,'burn',3,{...source(dead.enemy),amount:850});setStatus(dead.b,dead.recipient,'plague',3,{...source(dead.enemy),amount:1600});stepBattle(dead.b);assert.equal(dead.recipient.status,'defeated');assert.equal(dead.recipient.hp,0);assert.equal(dead.recipient.bondState.escortInvincibleUsed,undefined);assert.ok(!hasStatus(dead.b,dead.recipient,'guardInvincible'));assert.doesNotThrow(()=>validateSave(structuredClone(dead.state)));
});

test('all new offensive statuses respect full Valor while saved cooldowns and guard provenance reject corruption',()=>{
 for(const key of ['doubt','lure','fire','crusher']){const x=scene(key,0,'archer',['吕布','赵云','典韦','许褚','马超']);x.enemy.intent=90;for(let i=0;i<7;i++)basic(x);assert.ok(!['disrupted','taunt','burn','armorBreak'].some(k=>hasStatus(x.b,x.enemy,k)));}
 const x=guardScene();stepBattle(x.b);const bad=structuredClone(x.state);bad.battle.sides[0].units[1].statuses.shield.layers[0].bondGuardTier=4;assert.throws(()=>validateSave(bad));x.u.bondState.escortReady=x.b.tick+7;assert.equal(validBondState(x.u,x.b.tick),false);assert.throws(()=>validateSave(structuredClone(x.state)));
});

test('six combinations continue identically from real battle saves with their trigger records intact',()=>{
 for(const key of Object.keys(teams)){const x=scene(key);for(const u of x.b.sides.flatMap(s=>s.units)){delete u.statuses.root;u.cooldown=0;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,0]));}for(let i=0;i<18&&!x.b.result;i++)stepBattle(x.b);const copy=validateSave(structuredClone(x.state));for(let i=0;i<20&&!x.b.result;i++){stepBattle(x.b);stepBattle(copy.battle);}assert.deepEqual(x.state,copy);}
});
