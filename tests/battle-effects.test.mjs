import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEffects } from '../battle-effects.mjs';

// Exercise animation timing without tying game damage to the render frame rate.
function scene(t, reduced = false) {
  const original = new Map();
  const set = (key, value) => { original.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); };
  const element = () => ({ children: [], append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }, remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); } });
  const feed = element();
  const context = new Proxy({ measureText: text => ({ width: text.length * 10 }), createRadialGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] || (() => {}) });
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
  return { from:'liao', to:'shao', damage:phase === 'cast' ? 0 : 315, skill:true, phase, visual:'charge', troop:'cavalry', side:0, name:'张辽', label:'威震逍遥', fromX:4, fromY:3, x:5, y:3 };
}
function battle(e = event()) { return { id:'test', tick:1, sides:[{units:[]},{units:[]}], effects:[e] }; }
test('pause freezes effect time and speed/focus redraws never duplicate effects', t => {
  const {fx,feed,canvas} = scene(t), b = battle(event('cast'));
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
  for(let time=50;time<=1300;time+=50) fx.draw(time);
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
  fx.update(b,{paused:false,speed:1});
  for(let time=50;time<=2000;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false);
  fx.reduced = true; b.tick++;
  fx.update(b,{paused:false,speed:1});
  for(let time=2050;time<=4000;time+=50) fx.draw(time);
  assert.equal(fx.isBusy(),false);
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
