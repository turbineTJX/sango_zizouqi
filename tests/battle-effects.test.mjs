import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEffects } from '../battle-effects.mjs';
import { TACTICS_BOOK } from '../tactics.mjs';

// Exercise animation timing without tying game damage to the render frame rate.
function scene(t, reduced = false) {
  const original = new Map();
  const set = (key, value) => { original.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); };
  const element = () => ({ children: [], prepend(n) { n.parent=this; this.children.unshift(n); }, append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }, remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); } });
  const feed = element();
  const context = new Proxy({ measureText: text => ({ width: text.length * 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] || ((...args) => { for(const value of args) if(typeof value==='number') assert.ok(Number.isFinite(value),`nonfinite canvas ${String(key)}`); }) });
  const canvas = { width: 0, height: 0, getContext: () => context, getBoundingClientRect: () => ({ width: 700, height: 400 }) };
  let disconnected = false;
  set('document', { hidden: false, createElement: element });
  set('matchMedia', () => ({ matches: reduced })); set('devicePixelRatio', 2);
  set('ResizeObserver', class { observe() {} disconnect() { disconnected = true; } });
  set('requestAnimationFrame', () => 1); set('cancelAnimationFrame', () => {});
  const fx = new BattleEffects(canvas, feed);
  t.after(() => { fx.destroy(); for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return { fx, feed, canvas, disconnected: () => disconnected };
}
function event(phase = 'impact') {
  return { from:'liao', to:'shao', damage:phase === 'cast' ? 0 : 315, skill:true, phase, visual:'charge', troop:'cavalry', side:0, name:'张辽', label:'八百破阵', fromX:4, fromY:3, x:5, y:3 };
}
function battle(e = event()) { return { id:'test', tick:1, sides:[{units:[]},{units:[]}], effects:[e] }; }

test('orb preparation stays a small cue and enchanted basics never replay spell announcements',t=>{
  const {fx,feed}=scene(t),b=battle({...event(),label:'火矢',visual:'fire',to:'liao',damage:0,enchantment:true});
  fx.result={textContent:'保留上一条重要战法',disabled:false};
  fx.update(b,{paused:false,speed:1});const result=fx.result.textContent;
  assert.equal(feed.children[0].children[0].textContent,'装填');assert.equal(fx.isCinematicPlaying(),false);
  fx.draw(100);fx.draw(300);
  b.tick++;b.effects=[{...event(),label:'火矢',visual:'fire',skill:false,attackOrb:'fire',orbRemaining:2}];
  fx.update(b,{paused:false,speed:1});fx.draw(400);fx.draw(500);
  assert.equal(feed.children.length,1);assert.equal(fx.result.textContent,result);assert.equal(fx.isCinematicPlaying(),false);
  const labels=[];fx.label=text=>labels.push(text);fx.mode='full';
  fx.drawOrb(fx.items.at(-1),.65,{x:100,y:100},{x:200,y:100},50);
  assert.ok(labels.some(s=>s.includes('−315')),'full mode keeps damage readable alongside the small orb cue');
});

test('ongoing recovery, phantom absorption and retaliation do not replay a cast cinematic each tick',t=>{
 const {fx,feed}=scene(t),b=battle({...event(),label:'回春',damage:0,healing:60,ongoing:true});
 b.effects.push({...event(),label:'幻卫',damage:0,absorbed:40,ongoing:true},{...event(),label:'反击',ongoing:true});
 fx.update(b,{paused:false,speed:1});
 assert.equal(fx.items.length,3);assert.equal(feed.children.length,0);assert.equal(fx.isCinematicPlaying(),false);
 b.effects.push({...event(),label:'回春',damage:0});fx.update(b,{paused:false,speed:1});
 assert.equal(feed.children.length,1);assert.equal(fx.isCinematicPlaying(),false);
});

test('ZOC breakthrough is explained on the existing skill row without duplicate announcements',t=>{
  const {fx,feed}=scene(t),b=battle({...event(),label:'冲阵'});
  b.effects.push({...event(),label:'冲阵',damage:0,text:'突入后阵'});
  fx.update(b,{paused:true,speed:1});
  assert.equal(feed.children.length,1);
  assert.equal(feed.children[0].children[2].textContent,'冲阵 · 突入后阵');
});

test('multi-target terrain modifiers share one readable cast announcement',t=>{
  const {fx,feed}=scene(t),b=battle({...event(),label:'火计',terrain:'林地：伤害 +30%'});
  b.effects.push({...event(),label:'火计',to:'other',terrain:'水面：伤害 −40%'});
  fx.update(b,{paused:true,speed:1});
  assert.equal(feed.children.length,1);
  assert.match(feed.children[0].children[2].textContent,/林地：伤害 \+30%.*水面：伤害 −40%/);
});

test('legacy windup events never display a preparation animation or log row',t=>{
  const {fx,feed}=scene(t),b=battle(event('cast'));
  fx.update(b,{paused:true,speed:1});
  assert.equal(fx.items.length,0);assert.equal(feed.children.length,0);
  b.effects.push(event());fx.update(b,{paused:true,speed:1});
  assert.equal(fx.items.length,1);assert.equal(feed.children.length,1);
  assert.equal(feed.children[0].children[0].textContent,'施放');
});
test('pause freezes effect time and speed/focus redraws never duplicate effects', t => {
  const {fx,feed,canvas} = scene(t), b = battle(event());
  fx.update(b,{paused:true,speed:1}); fx.draw(100); fx.draw(200);
  assert.equal(fx.clock,0); assert.equal(fx.items.length,1); assert.equal(feed.children.length,1);
  fx.update(b,{paused:true,speed:4}); fx.draw(300);
  assert.equal(fx.clock,0); assert.equal(fx.items.length,1); assert.equal(feed.children.length,1);
  fx.update(b,{paused:false,speed:4}); fx.draw(350);
  assert.equal(fx.clock,50); assert.equal(canvas.width,1400); assert.equal(canvas.height,800);
});
test('fatal-hit animation stays busy until finished even when no units remain on the board', t => {
  const {fx} = scene(t);
  fx.update(battle(),{paused:false,speed:4}); assert.equal(fx.isBusy(),true);
  for(let time=50;time<=1700;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false); assert.equal(fx.items.length,0);
});
test('effect rendering does not mutate combat events and cleans up hidden-tab animation', t => {
  const {fx,disconnected} = scene(t), b = battle(); const before = JSON.stringify(b);
  fx.update(b,{paused:false,speed:1}); fx.draw(50); fx.draw(100);
  document.hidden = true; fx.draw(180); assert.equal(fx.clock,50);
  document.hidden = false; fx.draw(230); assert.equal(fx.clock,100);
  assert.equal(JSON.stringify(b),before); fx.destroy(); assert.equal(disconnected(),true);
});
test('all six visuals and reduced-motion alternatives can complete their lifecycle', t => {
  const {fx} = scene(t), b = battle();
  b.effects = ['charge','fire','shockwave','banner','volley','slash'].map(visual=>({...event(),visual}));
  fx.update(b,{paused:false,speed:1,mode:'full'});
  for(let time=50;time<=2000;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false);
  fx.reduced = true; b.tick++;
  fx.update(b,{paused:false,speed:1});
  for(let time=2050;time<=4000;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false);
});

test('paused single stepping never replays a stack of hits from earlier turns', t => {
  const {fx,feed}=scene(t),b=battle();
  for(let tick=1;tick<=10;tick++) {
    b.tick=tick;b.effects=[{...event(),x:tick}];
    fx.update(b,{paused:true,speed:1});
  }
  assert.equal(fx.items.length,1);
  assert.equal(fx.items[0].tick,10);
  assert.ok(feed.children.length>0);
  fx.update(b,{paused:false,speed:1});
  assert.equal(fx.items.length,1);
});

test('clear mode merges same-step damage per target without changing battle events',t=>{
 const {fx}=scene(t),b=battle();
 b.effects=[{...event(),damage:100},{...event(),damage:200},{...event(),to:'yan',damage:50}];
 const before=JSON.stringify(b);fx.update(b,{paused:false,speed:1});
 assert.equal(fx.damageSummaries().length,2);assert.equal(fx.damageSummaries().find(e=>e.to==='shao').damage,300);
 assert.equal(fx.clearEffects().length,2);assert.equal(JSON.stringify(b),before);
 b.tick++;b.effects=[{...event(),damage:40}];fx.update(b,{paused:false,speed:1});
 assert.equal(fx.damageSummaries().find(e=>e.to==='shao').damage,40);
});

test('intent denial stays visible in clear and full effects, including merged hits and multi-hit cinematics',t=>{
 const {fx}=scene(t),labels=[];fx.label=text=>labels.push(text);
 for(const mode of ['clear','full']){
  const b=battle({...event(),skill:false,intentDenied:7,intentBlock:'截气'});b.id=mode;
  b.effects.unshift({...event(),skill:false,damage:20});fx.update(b,{paused:false,speed:1,mode});
  const original=JSON.stringify(b);
  for(let time=50;time<400;time+=50)fx.draw(time+fx.lastFrame);
  assert.ok(labels.some(text=>text.includes('截气')),mode);assert.equal(JSON.stringify(b),original);labels.length=0;
 }
 const b=battle({...event(),intentDenied:7,intentBlock:'断势'});b.id='stifle';b.effects.push(event());
 fx.update(b,{paused:false,speed:1,mode:'clear'});
 for(let i=0;i<28;i++)fx.draw(fx.lastFrame+50);
 assert.ok(labels.some(text=>text.includes('断势')));
});

test('clear paused inspection hides transient drawings but preserves event log and clock',t=>{
 const {fx,feed}=scene(t);let draws=0;fx.drawClear=()=>draws++;fx.label=()=>draws++;
 fx.update(battle(),{paused:true,speed:1});fx.draw(50);fx.draw(100);
 assert.equal(draws,0);assert.equal(fx.clock,0);assert.equal(feed.children.length,1);
 fx.update(battle(),{paused:false,speed:1});fx.draw(150);assert.ok(draws>0);
});

test('both factions keep twenty log rows and multi-hit effects do not flood announcements',t=>{
 const {fx,feed}=scene(t),b=battle();
 for(let tick=1;tick<=24;tick++){
   b.tick=tick;b.effects=[0,1].flatMap(side=>[event(),event(),event()].map(e=>({...e,side})));
   fx.update(b,{paused:true,speed:1});
 }
 assert.equal(feed.children.length,40);assert.equal(fx.notices.filter(n=>n.side===0).length,20);assert.equal(fx.notices.filter(n=>n.side===1).length,20);
 fx.destroy();assert.equal(feed.children.length,0);
});

test('speed changes preserve animation progress and scale lifetime with simulation steps',t=>{
 const {fx}=scene(t),b=battle();fx.update(b,{paused:false,speed:1});fx.draw(50);fx.draw(100);
 const item=fx.items[0],progress=(fx.clock-item.start)/item.duration,oldDuration=item.duration;
 fx.update(b,{paused:false,speed:4});
 assert.equal(item.duration,oldDuration/4);assert.equal((fx.clock-item.start)/item.duration,progress);
 b.tick++;b.effects=[event()];fx.update(b,{paused:false,speed:4});
 assert.equal(fx.items.at(-1).duration,650/4);
});

test('paused command effects append once at the same tick without replaying earlier hits',t=>{
 const {fx}=scene(t),b=battle();fx.update(b,{paused:true,speed:1});
 b.effects.push({...event(),visual:'banner',damage:0,text:'救治 +240'});fx.update(b,{paused:true,speed:1});
 assert.equal(fx.items.length,2);assert.equal(fx.items[1].text,'救治 +240');
 fx.update(b,{paused:true,speed:4});assert.equal(fx.items.length,2);
 b.tick++;b.effects=[event()];fx.update(b,{paused:false,speed:1});assert.equal(fx.items.length,3);
});

test('combo beams and banner survive pause and fatal targets, support reduced motion, and never replay',t=>{
 const {fx,feed}=scene(t),b=battle({...event(),label:'二连携',visual:'shockwave',damage:0,combo:{level:2,bonus:25,targetName:'袁绍',actors:[{id:'liao',name:'张辽',x:3,y:3},{id:'cao',name:'曹操',x:4,y:4}]}});
 fx.update(b,{paused:true,speed:1});fx.draw(50);fx.draw(100);assert.equal(fx.clock,0);assert.equal(feed.children.length,1);assert.match(feed.children[0].className,/combo-announcement/);assert.equal(feed.children[0].children[0].textContent,'二连携');
 fx.update(b,{paused:true,speed:4});assert.equal(fx.items.length,1);assert.equal(feed.children.length,1);
 fx.update(b,{paused:false,speed:1});for(let t=150;t<=3000;t+=50)fx.draw(t);assert.equal(fx.isBusy(),false);
 fx.reduced=true;b.tick++;fx.update(b,{paused:false,speed:1});fx.draw(3050);fx.draw(3100);assert.equal(feed.children.length,2);
});

test('a multi-target cast holds the battlefield once and stays readable at 4x', t => {
  const {fx} = scene(t), b = battle();
  b.effects.push({...event(), to:'yan', x:6}, {...event(), damage:120});
  const before = JSON.stringify(b);
  fx.update(b,{paused:false,speed:4});
  assert.equal(fx.cinematics.length,1);
  assert.ok(fx.cinematics[0].duration>=1400);
  assert.equal(fx.cinematics[0].events.length,3);
  assert.equal(fx.isCinematicPlaying(),true);
  fx.draw(50);
  for(let time=100;time<=600;time+=50) fx.draw(time);
  assert.equal(fx.items.length,0);
  assert.equal(fx.isBusy(),true, 'fatal impact must not settle while the cut-in is visible');
  fx.update(b,{paused:false,speed:1,mode:'full'});
  assert.equal(fx.cinematics.length,1, 'speed/mode redraws must not replay a cast');
  for(let time=650;time<=2200;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false);
  assert.equal(JSON.stringify(b),before);
});

test('simultaneous officers play in sequence and manual pause freezes the entire sequence', t => {
  const {fx} = scene(t), b = battle();
  b.effects.push({...event(),from:'cao',name:'曹操',label:TACTICS_BOOK['unique-person-661'].name});
  fx.update(b,{paused:false,speed:1});fx.draw(50);fx.draw(100);
  assert.equal(fx.cinematics.length,2);
  assert.equal(fx.cinematics[1].start,fx.cinematics[0].duration);
  fx.update(b,{paused:true,speed:1});fx.draw(180);
  assert.equal(fx.clock,50);
  document.hidden=true;fx.update(b,{paused:false,speed:1});fx.draw(260);
  assert.equal(fx.clock,50);
  document.hidden=false;
  for(let time=310;time<=2260;time+=50)fx.draw(time);
  assert.equal(fx.cinematics.length,1);
  assert.equal(fx.cinematics[0].events[0].name,'曹操');
  for(let time=2310;time<=4310;time+=50)fx.draw(time);
  assert.equal(fx.isCinematicPlaying(),false);
});

test('normal attacks and paused inspection never trigger a cinematic; new battles clear it', t => {
  const {fx}=scene(t),b=battle({...event(),skill:false});
  fx.update(b,{paused:false,speed:1});assert.equal(fx.isCinematicPlaying(),false);
  b.tick++;b.effects=[event()];fx.update(b,{paused:true,speed:1});
  fx.update(b,{paused:false,speed:1});assert.equal(fx.isCinematicPlaying(),false);
  b.tick++;fx.update(b,{paused:false,speed:1});assert.equal(fx.isCinematicPlaying(),true);
  b.id='new-battle';b.effects=[];fx.update(b,{paused:false,speed:1});
  assert.equal(fx.isBusy(),false);
});

test('reduced motion uses static focus and finishes without impact particles', t => {
  const {fx}=scene(t,true);let impacts=0,focus=0;
  fx.drawImpact=()=>impacts++;fx.ring=()=>focus++;
  fx.update(battle(),{paused:false,speed:1});
  for(let time=50;time<=2200;time+=50)fx.draw(time);
  assert.equal(impacts,0);assert.ok(focus>0);assert.equal(fx.isBusy(),false);
});

test('result summary follows the active cast, survives expiry, and retains damage alongside control',t=>{
  const {fx,feed}=scene(t);fx.result={};const b=battle({...event(),text:'混乱'});
  b.effects.push({...event(),from:'cao',name:'曹操',label:TACTICS_BOOK['unique-person-661'].name,damage:0,text:'护盾'});
  fx.update(b,{paused:false,speed:4});fx.draw(50);
  assert.match(fx.result.textContent,/张辽.*\n.*实际损兵 315.*混乱/);
  assert.match(feed.children[1].children[3].children[0].textContent,/实际损兵 315.*混乱/);
  for(let time=100;time<=1550;time+=50)fx.draw(time);
  assert.match(fx.result.textContent,/曹操/);
  for(let time=1600;time<=3200;time+=50)fx.draw(time);
  assert.equal(fx.isBusy(),false);assert.match(fx.result.textContent,/曹操/);
});

test('combo bonus does not add a second cinematic or replace the actual paused result',t=>{
  const {fx}=scene(t);fx.result={};const b=battle();
  b.effects.push({...event(),label:'二连携',damage:0,combo:{level:2,bonus:25,targetName:'袁绍',actors:[{name:'曹操',x:3,y:3},{name:'张辽',x:4,y:3}]}});
  fx.update(b,{paused:false,speed:1});assert.equal(fx.cinematics.length,1);
  b.tick++;fx.update(b,{paused:true,speed:1});
  assert.match(fx.result.textContent,/实际损兵 315/);
});

test('minor tactics including criticals stay local in both effect modes',t=>{
 const {fx}=scene(t);fx.result={};let lights=0,cutins=0;fx.drawLocalSkill=()=>lights++;fx.drawCutIn=()=>cutins++;
 for(const mode of ['clear','full']){
  const b=battle({...event(),label:'奋击',critical:true});b.id=mode;
  const before=JSON.stringify(b);fx.update(b,{paused:false,speed:1,mode});
  assert.equal(fx.cinematics.length,0);assert.match(fx.result.textContent,/奋击/);
  for(let i=0;i<8;i++)fx.draw(fx.lastFrame+50);
  assert.equal(JSON.stringify(b),before);
 }
 assert.ok(lights>0);assert.equal(cutins,0);
});

test('a linked minor tactic and its multi-hit result get exactly one cut-in',t=>{
 const {fx}=scene(t);fx.result={};const hit={...event(),label:'连弩',comboLevel:2};
 const b=battle(hit);b.effects.push({...hit,damage:100},{...hit,label:'二连携',damage:0,combo:{level:2,bonus:25,targetName:'袁绍',actors:[{name:'曹操',x:3,y:3},{name:'张辽',x:4,y:3}]}});
 const before=JSON.stringify(b);fx.update(b,{paused:false,speed:1});
 assert.equal(fx.cinematics.length,1);assert.equal(fx.cinematics[0].events.length,3);
 fx.draw(50);assert.match(fx.result.textContent,/连弩/);assert.match(fx.result.textContent,/415/);
 for(let time=100;time<2200;time+=50)fx.draw(time);
 assert.equal(fx.isBusy(),false);assert.equal(JSON.stringify(b),before);
});

test('real zero-intent combat only queues 100-intent tactics or genuine links',async t=>{
 const {createScenario}=await import('../scenarios.mjs');
 const {lockDeployment,stepBattle}=await import('../engine.mjs');
 const {isMajorCast}=await import('../battle-effects.mjs');
 const {fx}=scene(t),state=createScenario('officer-lab',17,20,['person-661','person-246','person-603','person-404','yu','shao']),b=state.battle;
 lockDeployment(b);let small=0,big=0,links=0;
 while(!b.result){
  stepBattle(b);const before=JSON.stringify(b);fx.update(b,{paused:false,speed:1});
  const queued=fx.cinematics.flatMap(c=>c.events);
  for(const e of fx.items)if(e.skill&&!e.ongoing&&!e.cinematic)small++;
  for(const cast of fx.cinematics){assert.ok(isMajorCast(cast.events));if(cast.events.some(e=>e.combo))links++;else big++;}
  assert.equal(new Set(queued).size,queued.length,'no linked hit is queued twice');
  // Finish presentation time before the next engine step, as the app does.
  fx.clock+=fx.cinematics.reduce((n,c)=>n+c.duration,0)+800;fx.draw(fx.lastFrame+1);
  assert.equal(JSON.stringify(b),before);
 }
 assert.ok(small>0);assert.ok(big>0);assert.ok(links>0);
});
