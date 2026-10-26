import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleFeedback,actionImpacts,feedbackReaction} from '../battle-feedback.mjs';
import {BattleSignals} from '../battle-signals.mjs';
import {createScenario} from './helpers/scenarios.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {setStatus,absorbShield,shieldAmount} from '../tactics.mjs';
import {STATUS_DEFINITIONS} from '../data/design/battle-statuses.mjs';

const shield=n=>({key:'shield',name:'护盾',tone:'buff',state:{amount:n,until:10}});
const unit=statuses=>({id:'target',x:6,y:3,statuses});
const action=(events,start=0)=>({start,duration:1000,important:true,events:events.map(e=>({from:'caster',to:'target',name:'施法者',x:6,y:3,fromX:2,fromY:3,skill:true,...e}))});
function canvas(){
 const labels=[],calls=[];
 const c=new Proxy({}, {get:(_,key)=>(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));calls.push(key);}});
 const fx={ctx:c,clock:0,width:900,height:470,reduced:false,mode:'clear',point:(x,y)=>({x:40+x*60,y:30+y*50}),line(){},glow(){},label(...args){labels.push(args);}};
 return {fx,labels,calls};
}

test('full shield absorption is a shield impact, without troop damage, white flash or recoil',()=>{
 const a=action([{damage:0,shieldAbsorbed:120},{damage:0,shieldAbsorbed:30}]);
 const receipts=actionImpacts([a]);assert.equal(receipts.length,1);assert.equal(receipts[0].absorbed,150);assert.equal(receipts[0].damage,0);assert.equal(receipts[0].start,520);
 assert.equal(feedbackReaction(receipts,'target',540),null);
 const f=new BattleFeedback();f.update([unit([shield(300)])],[],[],0);f.update([unit([shield(150)])],[a],[],0);
 const {fx,labels}=canvas();fx.clock=519;f.draw(fx,60);assert.equal(labels.length,0);
 fx.clock=550;f.draw(fx,60);assert.deepEqual(labels.map(x=>x[0]),['吸收 150']);
});

test('a shield persists through windup and breaks on the consuming hit, rather than expiring early',()=>{
 const f=new BattleFeedback();f.update([unit([shield(100)])],[],[],0);
 const a=action([{damage:40,shieldAbsorbed:100}]);f.update([unit([])],[a],[],0,{tick:1});
 assert.equal(f.changes[0].broken,true);assert.equal(f.changes[0].start,520);
 assert.ok(f.statusesFor('target',519).some(s=>s.key==='shield'));assert.equal(f.statusesFor('target',520).length,0);
 const {fx,labels}=canvas();fx.clock=550;f.draw(fx,60);
 assert.ok(labels.some(x=>x[0]==='破盾'));assert.ok(labels.some(x=>x[0]==='吸收 100'));assert.ok(labels.some(x=>x[0].includes('−40')));
 const r=f.reaction('target',550);assert.ok(r.flash>0&&r.recoil>0);
});

test('control application, refresh, cleanse and natural expiry have distinct, non-replayed transitions',()=>{
 const s={key:'stun',name:'眩晕',tone:'control',state:{until:8,sourceId:'caster'}};
 const f=new BattleFeedback();f.update([unit([])],[],[],0);
 const a=action([{damage:0,outcome:[{id:'target',changes:['眩晕（3回合）']}]}]);
 f.update([unit([s])],[a],[],0,{tick:1});assert.equal(f.statusesFor('target',519).length,0);assert.equal(f.statusesFor('target',520)[0].key,'stun');
 f.update([unit([s])],[a],[],100);assert.equal(f.changes.length,1,'redraw never re-announces a status');
 // A failed/immune roll has no state transition and never claims a control.
 const failed=action([{damage:0,resolution:{success:false,immune:true}}],1000);
 f.update([unit([s])],[a,failed],[],1000,{tick:2});assert.ok(!f.changes.some(c=>c.start===1520));
 const refreshed={...s,state:{...s.state,until:12}};f.update([unit([refreshed])],[action([{damage:0}],2000)],[],2000,{tick:3});assert.equal(f.changes.at(-1).refresh,true);
 f.update([unit([])],[action([{damage:0}],3000)],[],3000,{tick:4});assert.equal(f.changes.at(-1).expired,false);
 f.reset();f.update([unit([s])],[],[],0);f.update([unit([])],[action([{damage:10}],1000)],[],1000,{tick:8});assert.equal(f.changes[0].expired,true);assert.equal(f.changes[0].start,1000,'natural expiry cannot wait for an unrelated incoming attack');
});

test('restores and paused stepping are silent; damage numbers survive the action and remain frozen at a fixed clock',()=>{
 const f=new BattleFeedback(),a=action([{damage:210,critical:true}]);
 f.update([unit([shield(100)])],[a],[],0,{silent:true});assert.equal(f.hits.length,0);assert.equal(f.changes.length,0);
 f.update([unit([shield(100)])],[a],[],10);assert.equal(f.hits.length,0,'unpausing cannot replay restored hits');
 const next=action([{damage:210,critical:true}],1000);f.update([unit([shield(100)])],[next],[],1000);
 const {fx,labels}=canvas();fx.clock=2010;f.draw(fx,60);const first=structuredClone(labels);labels.length=0;f.draw(fx,60);assert.deepEqual(labels,first);
 assert.ok(labels.some(x=>x[0]==='−210')&&labels.some(x=>x[0]==='暴击'),'popup survives the end of its cast');
 assert.equal(f.reaction('target',2010),null,'the short hit reaction settles before its popup fades');
});

test('independent attackers retain attributed damage lanes, and model/sprite flash starts at impact only',()=>{
 const attacks=[action([{from:'a',name:'甲',damage:40,shieldAbsorbed:20}]),action([{from:'b',name:'乙',damage:60}],40)];
 const receipts=actionImpacts(attacks);assert.equal(receipts.length,2);assert.equal(feedbackReaction(receipts,'target',519),null);
 assert.ok(feedbackReaction(receipts,'target',530).flash>0);assert.equal(feedbackReaction(receipts,'target',600).hit.from,'b');
 const f=new BattleFeedback();f.update([unit([])],attacks,[],0);const {fx,labels}=canvas();fx.clock=600;f.draw(fx,60);
 const damage=labels.filter(l=>l[0].includes('−'));assert.equal(damage.length,2);assert.notEqual(damage[0][2],damage[1][2]);
 fx.focusedUnit='target';fx.relatedUnitIds=()=>new Set(['a','b','target']);labels.length=0;f.draw(fx,60);
 assert.ok(labels.some(l=>l[0]==='甲'));assert.ok(labels.some(l=>l[0]==='乙'),'focusing exposes each actual attacker without widening the ordinary damage popups');
 const lane=f.hits[1].lane;fx.clock=f.hits[0].end+1;labels.length=0;f.draw(fx,60);
 assert.equal(f.hits[1].lane,lane,'a surviving popup never jumps lanes when the earlier hit fades');
});

test('real shield layers, status sources and battle RNG remain unchanged while clear/full/reduced feedback renders',()=>{
 const s=createScenario('history-guandu'),b=s.battle;lockDeployment(b);const u=b.sides[0].units[0],signals=new BattleSignals(),feedback=new BattleFeedback();
 signals.update(b,0);feedback.update(signals.units,[],[],0);
 setStatus(b,u,'shield',6,{amount:150,source:'fixture',label:'测试护盾'});setStatus(b,u,'burn',3,{amount:10});
 signals.update(b,0);feedback.update(signals.units,[action([{to:u.id,x:u.x,y:u.y,damage:0}])],[],0);
 assert.equal(absorbShield(b,u,170),20);
 signals.update(b,0);feedback.update(signals.units,[action([{to:u.id,x:u.x,y:u.y,damage:20,shieldAbsorbed:150}],1000)],[],1000);
 const {fx,calls}=canvas();
 for(let i=0;i<15;i++){
  stepBattle(b);signals.update(b,fx.clock);const fresh=action(b.effects,fx.clock);feedback.update(signals.units,[fresh],[],fx.clock,{tick:b.tick});
  const before=JSON.stringify(b);
  for(const mode of ['clear','full'])for(const reduced of [false,true]){
   fx.mode=mode;fx.reduced=reduced;fx.clock=fresh.start+600;
   for(const unit of signals.units)unit.statuses=feedback.statusesFor(unit.id,fx.clock);
   signals.draw(fx,60);feedback.draw(fx,60);
   assert.equal(JSON.stringify(b),before);
  }
 }
 assert.ok(!calls.includes('ellipse'),'status feedback must stay on armor and bodies without circular domes');assert.ok(calls.includes('fill'));
});

test('real ongoing damage retains the shield absorption packet even when it inflicts no troop loss',()=>{
 const s=createScenario('history-guandu'),b=s.battle;lockDeployment(b);const u=b.sides[0].units[0],source=b.sides[1].units[0];
 setStatus(b,u,'shield',6,{amount:300,source:'fixture',label:'测试护盾'});
 setStatus(b,u,'burn',3,{amount:40,sourceId:source.id});const before=shieldAmount(b,u);
 stepBattle(b);const hit=b.effects.find(e=>e.to===u.id&&e.damageKind==='dot');
 assert.ok(hit);assert.equal(hit.damage,0);assert.ok(hit.shieldAbsorbed>0);assert.equal(before-shieldAmount(b,u),hit.shieldAbsorbed);
 const impacts=actionImpacts([{start:0,duration:500,events:[hit]}]);assert.equal(impacts[0].absorbed,hit.shieldAbsorbed);assert.equal(feedbackReaction(impacts,u.id,300),null);
});

test('every visible status category keeps a body animation in clear mode, including taunt and other controls',()=>{
 const signals=new BattleSignals(),{fx,calls}=canvas();
 for(const [key,definition]of Object.entries(STATUS_DEFINITIONS)){
  if(!['buff','debuff','control','damage'].includes(definition.tone))continue;
  calls.length=0;signals.drawUnit(fx,{statuses:[{key,...definition,state:{}}]},{x:300,y:200},60,.2);
  assert.ok(calls.includes('stroke')||calls.includes('fill')||calls.includes('fillRect'),'status lost its body feedback: '+key);
  assert.ok(!calls.includes('ellipse')&&!calls.includes('arc'),'status draws a generic ring: '+key);
 }
});
