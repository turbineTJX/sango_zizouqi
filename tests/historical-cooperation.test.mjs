import {deployUnmarkedStarters} from './helpers/unmarked-deployment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {newGame,lockDeployment,stepBattle,validateSave,COMBO} from '../engine.mjs';
import {cooperatingUnit,tacticSupportRecipients} from '../tactic-cooperation.mjs';
import {snapshotTactic} from '../tactic-outcomes.mjs';
import {unitTactics,setStatus,shieldAmount} from '../tactics.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {BOND_ASSIGNMENTS as A} from '../data/design/bond-assignments.mjs';
import {HISTORICAL_COOPERATIONS,HISTORICAL_RELATIONSHIPS,COOPERATION_GAME_REFERENCES} from '../data/design/historical-cooperation.mjs';
import {relationshipInfo,relationshipKey,setRelationshipType} from '../relationships.mjs';
import {primeTactic} from './helpers/prime-tactic.mjs';
import {sideBonds} from '../bonds.mjs';

const id=n=>Object.values(O).find(u=>u.name===n).id;
function scene(names,side=0){
 const own=names.map(([name,type,troops=1000])=>({id:id(name),type,troops,level:10,retreatAt:null}));
 const foe=['文聘','臧霸','王朗'].map(name=>({id:id(name),type:'spear',troops:5000,level:10,retreatAt:null}));
 const s=createScenario('custom-battle',1001,0,null,{seed:1001,mapId:'plain-open',terrain:'land',ownTeam:side?foe:own,enemyTeam:side?own:foe,battleKind:'field',shieldPercent:0}),b=s.battle;
 deployUnmarkedStarters(b);assert.equal(lockDeployment(b),null);
 for(const u of b.sides.flatMap(s=>s.units)){u.intent=0;u.cooldown=999;u.skillReady=Object.fromEntries(unitTactics(u).map(s=>[s.id,999]));setStatus(b,u,'root',999);}
 const us=b.sides[side].units,es=b.sides[1-side].units,coords=[[4,2],[4,3],[3,3],[3,2],[3,4]];
 us.forEach((u,i)=>Object.assign(u,{x:coords[i][0],y:coords[i][1]}));es.forEach((u,i)=>Object.assign(u,{x:i<2?5+i:12,y:i<2?3:7}));
 for(const a of us)for(const c of us)if(a!==c){const key=relationshipKey(a.id,c.id);s.relationshipTypes[key]='sworn';s.relationshipScores[key]=100;}
 b.relationshipTypes=structuredClone(s.relationshipTypes);b.relationshipScores=structuredClone(s.relationshipScores);
 return {s,b,us,es,side};
}
function cast(x,u,tactic){primeTactic(u,tactic);stepBattle(x.b);while(u.tacticAim&&!x.b.result)stepBattle(x.b);return x.b.effects.filter(e=>e.combo);}
const dealt=(x,u)=>x.b.effects.filter(e=>e.from===u.id&&e.skill).reduce((n,e)=>n+e.damage,0);
function control(x){const y=structuredClone(x);y.us=y.b.sides[y.side].units;y.es=y.b.sides[1-y.side].units;y.b.comboWindows=[];return y;}
function resume(x){const y=validateSave(structuredClone(x.s));for(let i=0;i<10&&!x.b.result;i++){stepBattle(x.b);stepBattle(y.battle);}assert.deepEqual(x.s,y);}

test('研究覆盖四类历代机制与26组关系，史实、演义、同军和婚姻改编分别注明',()=>{
 assert.equal(HISTORICAL_COOPERATIONS.length,26);
 assert.ok(COOPERATION_GAME_REFERENCES.filter(g=>g.kind==='官方机制').length===4);
 for(const row of HISTORICAL_COOPERATIONS){assert.ok(row.names.length>=2&&row.sources.length&&row.evidence&&row.mechanics);assert.ok(row.names.every(n=>Object.values(O).some(u=>u.name===n)));assert.ok(row.sources.every(u=>u.startsWith('https://zh.wikisource.org/')));}
 assert.match(HISTORICAL_COOPERATIONS.find(r=>r.names.includes('周仓')).basis,/演义/);
 assert.match(HISTORICAL_COOPERATIONS.find(r=>r.names.includes('陈到')).evidence,/不是固定/);
 assert.match(HISTORICAL_COOPERATIONS.find(r=>r.names.includes('李典')).evidence,/素不睦/);
 assert.match(HISTORICAL_COOPERATIONS.find(r=>r.names.includes('甘宁')).evidence,/杀父之怨/);
});

test('四对历史合作补入对称关系基准，玩家修改仍优先，既有亲属与厌恶不覆盖',()=>{
 for(const p of HISTORICAL_RELATIONSHIPS){const a=relationshipInfo(...p.ids),b=relationshipInfo(...p.ids.toReversed());assert.deepEqual(a,b);assert.equal(a.type,p.type);assert.equal(a.score,p.type==='liked'?70:65);const s=newGame();assert.equal(setRelationshipType(s,...p.ids,'disliked',10),null);assert.equal(relationshipInfo(...p.ids,s.relationshipScores,s.relationshipTypes).score,10);validateSave(s);}
 assert.equal(relationshipInfo(id('孙策'),id('周瑜')).type,'sworn');
 assert.equal(relationshipInfo(id('吕布'),id('张飞')).sourceType,'disliked');
});

test('曹操真实支援接续许褚、典韦或郭嘉的合法进攻，双方非均分兵力实际增效并可续战',()=>{
 for(const side of [0,1])for(const [name,type,tactic] of [['许褚','spear','thrust'],['典韦','halberd','cleave'],['郭嘉','archer','undermine']]){
  const x=scene([['曹操','spear',5000],[name,type]],side),[main,partner]=x.us;
  cast(x,main,'unique-cao');assert.ok(x.b.comboWindows[0].supportIds.includes(partner.id));
  x.es.forEach(u=>u.intent=100);const y=control(x),e=cast(x,partner,tactic)[0];cast(y,y.us[1],tactic);
  assert.equal(e.combo.kind,'supported');assert.equal(e.combo.level,2);assert.ok(tactic==='undermine'?x.es.reduce((n,u)=>n+u.intent,0)<y.es.reduce((n,u)=>n+u.intent,0):dealt(x,partner)>dealt(y,y.us[1]));assert.ok(x.b.logs.some(l=>l.text.includes('支援接续')));
  assert.equal(partner.tacticCasts[tactic],1);assert.equal(main.tacticCasts['unique-cao'],1);assert.equal(x.b.comboWindows.length,1);assert.equal(x.b.comboWindows[0].tick,1);resume(x);
 }
});

test('赵云邓芝与法正黄忠通过普通鼓舞接续真实大战法，不依赖指定姓名',()=>{
 for(const side of [0,1])for(const [main,support,type,tactic] of [['赵云','邓芝','cavalry','unique-person-396'],['黄忠','法正','archer','unique-person-186'],['张辽','王粲','cavalry','terror']]){
  const x=scene([[support,'archer'],[main,type,5000]],side);x.us[1].intent=0;cast(x,x.us[0],'rally');
  assert.ok(x.us[1].intent>0);const e=cast(x,x.us[1],tactic)[0];assert.equal(e.combo.kind,'supported');assert.equal(e.combo.actors[0].id,x.us[0].id);assert.ok(dealt(x,x.us[1])>0);resume(x);
 }
});

test('真实攻击后的友军鼓舞形成接应掩护，增量对照成立',()=>{
 for(const side of [0,1]){
  const x=scene([['许褚','spear',5000],['郭嘉','archer']],side);Object.assign(x.us[0],{x:4,y:3});Object.assign(x.us[1],{x:3,y:3});
  cast(x,x.us[0],'thrust');const firstHit=x.b.tick;x.us[0].intent=0;const y=control(x),e=cast(x,x.us[1],'rally')[0];cast(y,y.us[1],'rally');
  assert.equal(e.combo.kind,'cover');assert.ok(x.us[0].intent>y.us[0].intent);assert.equal(x.b.comboWindows[0].tick,firstHit);resume(x);
 }
});

test('进攻击败原目标后仍可真实接应发动者，实际补次也记录为支援',()=>{
 const x=scene([['许褚','spear',5000],['郭嘉','archer']]);Object.assign(x.us[0],{x:4,y:3});Object.assign(x.us[1],{x:3,y:3});x.es[0].hp=1;x.es[0].battleDamage=x.es[0].initial-1;
 cast(x,x.us[0],'thrust');assert.equal(x.es[0].status,'defeated');x.us[0].intent=0;const event=cast(x,x.us[1],'rally')[0];assert.equal(event.combo.kind,'cover');resume(x);
 const y=scene([['郭嘉','archer'],['许褚','spear']]);const before=snapshotTactic(y.b);assert.deepEqual(tacticSupportRecipients(y.b,y.us[0],before,[{from:y.us[0].id,to:y.us[1].id,tacticUseChange:{id:'thrust',mode:'refresh',amount:1}}]),[y.us[1].id]);assert.deepEqual(tacticSupportRecipients(y.b,y.us[0],before,[{from:y.us[0].id,to:y.us[1].id,tacticUseChange:{id:'thrust',mode:'refresh',amount:0}}]),[]);
});

test('支援可接续三连携但不延长首发窗口，超过窗口及自身重复不续链',()=>{
 const x=scene([['曹操','spear'],['许褚','spear'],['典韦','halberd']]);Object.assign(x.us[2],{x:5,y:2});cast(x,x.us[0],'unique-cao');primeTactic(x.us[1],'thrust');primeTactic(x.us[2],'cleave');stepBattle(x.b);stepBattle(x.b);const e=x.b.effects.find(e=>e.from===x.us[2].id&&e.combo);assert.equal(e.combo.level,3);assert.equal(e.combo.bonus,40);assert.equal(x.b.comboWindows[0].tick,1);
 const y=scene([['曹操','spear'],['许褚','spear']]);cast(y,y.us[0],'unique-cao');for(let i=0;i<COMBO.window;i++)stepBattle(y.b);assert.equal(cast(y,y.us[1],'thrust').length,0);
 const z=scene([['郭嘉','archer'],['赵云','cavalry']]);cast(z,z.us[0],'rally');assert.equal(cast(z,z.us[0],'rally').length,0);
});

test('支援排除无收益、三格外、后备、避战、撤离与已败提供者',()=>{
 const empty=scene([['郭嘉','archer'],['许褚','spear']]);empty.us.forEach(u=>u.intent=100);cast(empty,empty.us[0],'rally');assert.equal(empty.b.comboWindows.length,0);
 const separating=scene([['曹操','spear'],['许褚','spear']]);separating.us[0].disengage={readyTick:2,targetId:separating.es[0].id,guards:[separating.es[0].id]};assert.equal(cooperatingUnit(separating.b,separating.us[0]),false);separating.us[0].disengage=null;separating.us[0].status='reserve';assert.equal(cooperatingUnit(separating.b,separating.us[0]),false);
 for(const condition of ['far','stasis','withdraw','defeated']){
  const x=scene([['曹操','spear'],['许褚','spear']]);cast(x,x.us[0],'unique-cao');
  if(condition==='far')Object.assign(x.us[0],{x:1,y:0});
  if(condition==='stasis')setStatus(x.b,x.us[0],'stasis',9);
  if(condition==='withdraw')x.us[0].withdrawing=true;
  if(['defeated','reserve'].includes(condition))x.us[0].status=condition;
  assert.equal(cast(x,x.us[1],'thrust').length,0,condition);
 }
});

test('当前关系概率仍控制支援连携，失败不放大也不重复消费支援窗口',()=>{
 const x=scene([['曹操','spear'],['许褚','spear']]);cast(x,x.us[0],'unique-cao');const key=relationshipKey(x.us[0].id,x.us[1].id);x.b.relationshipTypes[key]='disliked';x.b.relationshipScores[key]=0;
 const y=control(x);assert.equal(cast(x,x.us[1],'thrust').length,0);cast(y,y.us[1],'thrust');assert.equal(dealt(x,x.us[1]),dealt(y,y.us[1]));assert.equal(x.b.comboWindows.length,1);assert.equal(x.b.comboWindows[0].tick,x.b.tick);assert.deepEqual(x.b.comboWindows[0].actors.map(a=>a.id),[x.us[1].id]);
});

test('新增三名辅助的两羁绊上限合法，邓芝廖化实际普攻供主将接续',()=>{
 assert.deepEqual(A[id('周仓')],{bondFinisher:1,bondCrusher:2});assert.deepEqual(A[id('廖化')],{bondMuster:1,bondSong:2});assert.deepEqual(A[id('邓芝')],{bondSong:2,bondAntiHorse:1});
 for(const side of [0,1])for(const [core,support,type,supportType] of [['关羽','廖化','cavalry','spear'],['赵云','邓芝','cavalry','archer']]){
  const x=scene([[core,type,5000],[support,supportType]],side);Object.assign(x.us[1],{x:4,y:3});x.us[0].intent=97;x.us[1].cooldown=0;stepBattle(x.b);
  assert.equal(x.us[0].intent,100);assert.ok(x.b.effects.some(e=>e.label==='战歌'&&e.from===x.us[1].id&&e.to===x.us[0].id&&e.intentGained===3));assert.deepEqual(sideBonds(x.b,side).bondSong,{points:2,tier:1});resume(x);
 }
});

test('周仓真实普攻破甲供关羽利用，陈到护卫确实保护受损赵云',()=>{
 for(const side of [0,1]){
  const x=scene([['关羽','cavalry',5000],['周仓','halberd']],side);x.us[0].x=3;x.us[0].y=3;x.us[1].x=4;x.us[1].y=3;
  let happened=false;for(let i=0;i<18&&!happened;i++){x.us[1].cooldown=0;stepBattle(x.b);happened=x.es.some(e=>e.statuses.armorBreak?.until>x.b.tick);}
  assert.ok(happened);Object.assign(x.us[0],{x:5,y:2});const y=control(x);y.es.forEach(u=>delete u.statuses.armorBreak);cast(x,x.us[0],'unique-person-99');cast(y,y.us[0],'unique-person-99');assert.ok(dealt(x,x.us[0])>dealt(y,y.us[0]));resume(x);
  const z=scene([['赵云','cavalry',5000],['陈到','spear']],side);Object.assign(z.us[0],{x:4,y:2,hp:2000,battleDamage:3000});Object.assign(z.us[1],{x:4,y:3});stepBattle(z.b);assert.equal(shieldAmount(z.b,z.us[0]),500);assert.equal(z.us[0].hp,2000);resume(z);
 }
});

test('支援记录保存且拒绝缺失、重复及跨方受益者，续战不重抽关系',()=>{
 const x=scene([['曹操','spear'],['许褚','spear']]);cast(x,x.us[0],'unique-cao');const saved=validateSave(structuredClone(x.s));assert.deepEqual(saved,x.s);
 for(const bad of [undefined,[x.us[1].id,x.us[1].id],[x.es[0].id],['missing']]){const s=structuredClone(x.s);s.battle.comboWindows[0].supportIds=bad;assert.throws(()=>validateSave(s),/连携记录/);}
 const y={...x,s:saved,b:saved.battle,us:saved.battle.sides[x.side].units,es:saved.battle.sides[1-x.side].units};cast(x,x.us[1],'thrust');cast(y,y.us[1],'thrust');assert.deepEqual(y.s,x.s);
});
