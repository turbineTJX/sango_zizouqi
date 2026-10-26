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
 assert.ok(actions.every(a=>a.duration>=280));assert.ok(actions[2].duration>=1400);
 assert.equal(JSON.stringify(events),before);
});
test('a multi-target skill and actual link share one window while a retaliation stays separate',()=>{
 const events=[hit('hero','a',{skill:true,label:'横扫'}),hit('hero','b',{skill:true,label:'横扫'}),hit('hero','a',{skill:true,label:'二连携',damage:0,combo:{level:2}}),hit('a','hero',{label:'反击',ongoing:true})];
 const actions=scheduleBattleActions(events);
 assert.equal(actions.length,2);assert.equal(actions[0].events.length,3);assert.equal(actions[1].events[0].label,'反击');
 assert.ok(actions[1].start>=actions[0].end);
});
test('identity flags fit inside the battlefield and avoid dense neighbouring flags deterministically',()=>{
 const entries=Array.from({length:12},(_,i)=>({id:'unit-'+i,x:240+(i%4)*46,y:90+Math.floor(i/4)*42,width:76,height:38}));
 const placed=placeBattleCaptions(entries,700,360);
 for(const p of placed.values())assert.ok(p.x>=0&&p.y>=0&&p.x+p.width<=700&&p.y+p.height<=360);
 const boxes=[...placed.values()];for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++){const a=boxes[i],b=boxes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`overlap ${i},${j}`);}
 assert.deepEqual(placeBattleCaptions(entries,700,360),placed);
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
