import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleBondEffects} from '../battle-bond-effects.mjs';
import {BOND_VISUALS,bondIcon,drawBondGlyph} from '../bond-icons.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle} from '../engine.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {scheduleBattleActions} from '../battle-presentation.mjs';

const unit=(id,levels,extra={})=>({id,side:0,status:'active',hp:3000,maxHp:3000,x:2,y:3,bondGrowth:{levels},...extra});
const battle=(units)=>({id:'bond-fx',tick:0,deploymentLocked:false,effects:[],sides:[{units},{units:[]}]});
const update=(fx,b,options={},clock=0,events=[])=>fx.update(b,events,[],clock,{paused:false,speed:1,...options});
test('all thirty-three bond glyphs are distinct and share SVG/canvas artwork',()=>{
 assert.deepEqual(Object.keys(BOND_VISUALS).sort(),Object.keys(BOND_DESIGNS).sort());
 assert.equal(new Set(Object.values(BOND_VISUALS).map(g=>g.path)).size,33);
 const calls=[],c=new Proxy({},{get:(_,name)=>(...args)=>{calls.push(name);for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));},set:()=>true});
 for(const [id,g]of Object.entries(BOND_VISUALS)){assert.ok(bondIcon(id).includes(g.path));drawBondGlyph(c,id,100,100,24);}
 assert.ok(calls.includes('bezierCurveTo'));assert.ok(calls.includes('stroke'));
});
test('opening uses real active tiers and excludes reserves, dead, decoys and hidden enemies',()=>{
 const u=unit('holder',{bondValor:2,bondPower:3}),b=battle([u,unit('bench',{bondValor:1},{status:'reserve'}),unit('dead',{bondValor:1},{hp:0}),unit('fake',{bondValor:2},{isDecoy:true})]);
 b.sides[1].units=[unit('secret',{bondValor:2},{side:1,statuses:{stealth:{until:10}}})];
 const fx=new BattleBondEffects();update(fx,b,{paused:true});b.deploymentLocked=true;const before=JSON.stringify(b);update(fx,b);
 assert.deepEqual(fx.items.map(e=>[e.unit,e.id,e.tier]),[['holder','bondValor',1],['holder','bondPower',1]]);
 assert.ok(fx.isOpening(400));assert.equal(fx.isOpening(2000),false);assert.equal(JSON.stringify(b),before);
 const old=JSON.stringify(fx.items);update(fx,b,{paused:true,speed:4});assert.equal(JSON.stringify(fx.items),old);update(fx,b);assert.equal(fx.items.length,2);
});
test('restores and paused stepping establish a baseline without replaying saved activations or procs',()=>{
 const b=battle([unit('singer',{bondSong:2}),unit('friend',{})]);b.deploymentLocked=true;b.tick=28;
 b.effects=[{from:'singer',to:'friend',label:'战歌',ongoing:true,intentGained:4,start:0,duration:480}];
 const fx=new BattleBondEffects();update(fx,b,{},0,b.effects);assert.equal(fx.items.length,0);update(fx,b);assert.equal(fx.items.length,0);
 b.tick++;update(fx,b,{paused:true,silent:true},0,b.effects);update(fx,b);assert.equal(fx.items.length,0);
});
test('actual procs attach to their source and visible beneficiaries at the originating hit, with no duplicate receipts',()=>{
 const b=battle([unit('singer',{bondSong:2}),unit('friend',{})]);b.deploymentLocked=true;
 const fx=new BattleBondEffects();update(fx,b);
 const attack={from:'singer',to:'enemy',damage:30,start:100,duration:480},event={from:'singer',to:'friend',label:'战歌',ongoing:true,intentGained:4,start:116,duration:480},events=[attack,event];
 const actions=[{events:[attack],start:100,duration:480,end:580},{events:[event],start:116,duration:480,end:596}];
 const before=JSON.stringify(b);fx.update(b,events,actions,0,{});
 assert.equal(fx.items.length,1);assert.equal(fx.items[0].start,349.6);assert.deepEqual(fx.items[0].targets,['friend']);assert.equal(fx.items[0].id,'bondSong');
 fx.update(b,[event],actions,0,{});assert.equal(fx.items.length,1);assert.equal(JSON.stringify(b),before);
 b.sides[0].units[0].status='withdrawn';update(fx,b);assert.equal(fx.items.length,0);
});
test('the low-health transition, reserve award and defender immunity identify actual beneficiaries',()=>{
 const back=unit('back',{bondLastStand:2}),guard=unit('guard',{bondValor:2}),reserve=unit('reserve',{}, {status:'reserve'}),b=battle([back,guard,reserve]);b.deploymentLocked=true;
 const fx=new BattleBondEffects();update(fx,b);back.hp=1500;reserve.status='active';b.tick=4;b.sides[0].bondReserve={tier:2,awarded:[{id:'reserve',tick:4}]};
 const e={from:'enemy',to:'guard',label:'勇武',ongoing:true,text:'勇武 · 伤害免疫',start:0,duration:480};update(fx,b,{},0,[e]);
 assert.ok(fx.items.some(e=>e.id==='bondLastStand'&&e.unit==='back'&&e.kind==='proc'));
 assert.ok(fx.items.some(e=>e.id==='bondReserve'&&e.unit==='reserve'));
 assert.ok(fx.items.some(e=>e.id==='bondValor'&&e.unit==='guard'));
 assert.deepEqual(fx.items.find(e=>e.id==='bondValor').targets,[],'immunity belongs only to its actual defender');
 update(fx,b);assert.equal(fx.items.filter(e=>e.id==='bondReserve').length,1);
});
test('reduced motion draws static glyphs, with no particles, labels or battlefield mutations',()=>{
 const b=battle([unit('holder',{bondPower:2})]),fx=new BattleBondEffects();update(fx,b);b.deploymentLocked=true;update(fx,b);
 let glyphStrokes=0;const c=new Proxy({},{get:(_,name)=>(...args)=>{if(name==='stroke')glyphStrokes++;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n));},set:()=>true});
 const view={ctx:c,clock:300,width:1000,height:600,reduced:true,mode:'full',point:()=>({x:200,y:200}),bodyAnchors:()=>{throw Error('reduced mode must not draw particles');},label:()=>{throw Error('bonds do not add text');}};
 const before=JSON.stringify(b);fx.draw(view,60);assert.ok(glyphStrokes>0);assert.equal(JSON.stringify(b),before);
 view.clock=2000;fx.draw(view,60);assert.equal(fx.items.length,0);
});
test('a later ordinary orb does not borrow attribution from spent entry equipment',()=>{
 const b=battle([unit('sage',{bondWisdom:2},{bondEquipment:[{id:'bondWisdom',tier:1}],statuses:{attackOrb:{skillId:'curse',charges:2}}})]);b.deploymentLocked=true;b.tick=40;
 const fx=new BattleBondEffects();update(fx,b);
 const e={from:'sage',to:'enemy',attackOrb:'curse',label:'挫志',damage:30,start:0,duration:480};update(fx,b,{},0,[e]);
 assert.equal(fx.items.length,0);
});
test('natural combat produces attributed bond effects using unchanged engine events and random state',()=>{
 const id=name=>Object.values(O).find(o=>o.name===name).id,team=names=>names.map(name=>({id:id(name),type:'archer',troops:3000,level:10}));
 const state=generateBattle({seed:20261028,terrain:'land',mapId:'plain-open',battleKind:'field',ownTeam:team(['周瑜','小乔','大乔','吕布','赵云','貂蝉']),enemyTeam:team(['文聘','臧霸','吕虔','颜良','文丑','袁绍']),shieldPercent:0,events:[]}),b=state.battle,fx=new BattleBondEffects();
 update(fx,b,{paused:true});assert.equal(lockDeployment(b),null);update(fx,b);
 const seen=new Set();let clock=2000;
 for(let i=0;i<180&&!b.result;i++){
  stepBattle(b,{aiSides:[],pauseForReinforcements:false});
  const events=structuredClone(b.effects),actions=scheduleBattleActions(events,{clock});
  for(const a of actions)for(const e of a.events){e.start=a.start;e.duration=a.duration;}
  const before=JSON.stringify(b);fx.update(b,events,actions,clock,{});assert.equal(JSON.stringify(b),before);
  for(const e of fx.items.filter(e=>e.kind==='proc'))seen.add(e.id);clock+=3000;
 }
 assert.ok(seen.has('bondSong'));assert.ok(seen.has('bondBeauty'));assert.ok(seen.size>=3,[...seen].join(','));
});
