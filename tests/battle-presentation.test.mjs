import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleBattleActions,placeBattleCaptions,observedUnitAction,battleActionKind} from '../battle-presentation.mjs';

const hit=(from,to,extra={})=>({from,to,label:'普攻',damage:100,skill:false,fromX:3,fromY:2,x:4,y:2,...extra});
test('action choreography preserves recorded order and separates a skill from preceding attacks and following responses',()=>{
 const events=[hit('a','b'),hit('c','b'),hit('hero','b',{skill:true,label:'名将战法'}),hit('b','a')],before=JSON.stringify(events);
 const actions=scheduleBattleActions(events,{speed:4,isMajor:es=>es[0].skill});
 assert.deepEqual(actions.map(a=>a.events[0].from),['a','c','hero','b']);
 assert.ok(actions[1].start>actions[0].start);
 assert.ok(actions[2].start>=Math.max(actions[0].end,actions[1].end));
 assert.ok(actions[3].start>=actions[2].end);
 assert.ok(actions.every(a=>a.duration>0));assert.ok(actions[2].duration>=1400);
 assert.equal(JSON.stringify(events),before);
});
test('a multi-target skill and actual link share one window while a retaliation stays separate',()=>{
 const events=[hit('hero','a',{skill:true,label:'横扫'}),hit('hero','b',{skill:true,label:'横扫'}),hit('hero','a',{skill:true,label:'二连携',damage:0,combo:{level:2}}),hit('a','hero',{label:'反击',ongoing:true})];
 const actions=scheduleBattleActions(events,{isMajor:es=>es.some(e=>e.combo)});
 assert.equal(actions.length,2);assert.equal(actions[0].events.length,3);assert.equal(actions[1].events[0].label,'反击');
 assert.ok(actions[1].start>=actions[0].end);
});
test('dense identity flags stay local even when avoiding every overlap is impossible',()=>{
 const entries=Array.from({length:12},(_,i)=>({id:'unit-'+i,x:240+(i%4)*46,y:90+Math.floor(i/4)*42,width:76,height:38}));
 const placed=placeBattleCaptions(entries,700,360);
 for(const p of placed.values())assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=700&&p.y+p.height<=360);
 for(const e of entries){const p=placed.get(e.id);assert.ok(Math.hypot(p.x+p.width/2-e.x,p.y+p.height/2-e.y)<700/14.5,'name remains within one hex of its own soldier');}
 assert.deepEqual(placeBattleCaptions(entries,700,360),placed);
});

test('mobile flags remain associated with actual soldier centers after resizing and crowding',()=>{
 const entries=Array.from({length:12},(_,i)=>({id:'mobile-'+i,x:70+i%4*32,y:60+Math.floor(i/4)*28,width:54,height:28}));
 const stale=new Map(entries.map(e=>[e.id,{x:e.x+90,y:e.y+120}]));
 const placed=placeBattleCaptions(entries,474,236,stale);
 for(const e of entries){const p=placed.get(e.id);assert.ok(Math.hypot(p.x+p.width/2-e.x,p.y+p.height/2-e.y)<33,'cannot drift two or three mobile rows');}
});
test('hovered intentions use observable events and movement, and never name a hidden enemy',()=>{
 const own={id:'a',side:0,status:'active',name:'我将',action:'接近敌将'},foe={id:'b',side:1,status:'active',name:'敌将',statuses:{}};
 const b={tick:3,sides:[{units:[own]},{units:[foe]}],effects:[]},before=JSON.stringify(b);
 assert.equal(observedUnitAction(b,own).targetId,'b');assert.equal(JSON.stringify(b),before);
 b.effects=[hit('a','b')];assert.equal(observedUnitAction(b,own).text,'攻击');
 foe.statuses.stealth={until:10};assert.equal(observedUnitAction(b,own).targetId,undefined);assert.equal(observedUnitAction(b,own).targetName,undefined);
});
test('support, shielding and successful or resisted control keep their real visual roles',()=>{
 assert.equal(battleActionKind(hit('a','b',{healing:100,damage:0})),'heal');
 assert.equal(battleActionKind(hit('a','a',{text:'护盾 +200',damage:0})),'shield');
 assert.equal(battleActionKind(hit('a','b',{resolution:{effect:'confuse',success:false}})),'control');
});

test('a full routine exchange fits one beat and preserves impact order at every speed',()=>{
 const events=Array.from({length:12},(_,i)=>hit('u'+i,'target',{skill:i%3===0,label:i%3===0?'小战法':'普攻'})),before=JSON.stringify(events);
 for(const speed of [.5,1,2,4]){
  const actions=scheduleBattleActions(events,{speed});
  assert.ok(Math.max(...actions.map(a=>a.end))<=700/speed,'routine casts must not serialize a full frontline');
  for(let i=1;i<actions.length;i++){
   assert.ok(actions[i].start<actions[i-1].end);
   assert.ok(actions[i].start+actions[i].duration*.52>actions[i-1].start+actions[i-1].duration*.52);
  }
  assert.equal(actions[0].duration*speed,480);
 }
 assert.equal(JSON.stringify(events),before);
});
test('crowded flags at board edges stay near their soldiers instead of occupying distant empty gaps',()=>{
 const entries=Array.from({length:12},(_,i)=>({id:'u'+i,x:600-i%3*28,y:285-Math.floor(i/3)*19,width:76,height:43}));
 const placed=placeBattleCaptions(entries,640,320);
 for(const e of entries){const p=placed.get(e.id),anchor={x:Math.min(640-e.width-2,Math.max(2,e.x-e.width/2)),y:Math.min(320-e.height-2,Math.max(2,e.y))};
  assert.ok(Math.hypot(p.x-anchor.x,p.y-anchor.y)<=90,'a caption cannot become the identity of a distant soldier');
  assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=640&&p.y+p.height<=320);
 }
 assert.deepEqual(placeBattleCaptions([...entries].reverse(),640,320),placed);
});
