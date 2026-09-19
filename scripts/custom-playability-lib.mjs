import assert from 'node:assert/strict';
import {createScenario} from '../scenarios.mjs';
import {planEnemyArmy,chooseEnemyCommand} from '../battle-ai.mjs';
import {deployUnit,configureUnitTactics,configureBattleIntent,lockDeployment,stepBattle,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE,validateSave} from '../engine.mjs';
import {canOccupy} from '../battlefield.mjs';
import {roleTacticIds,SPECIAL_TACTICS,validLoadout,hasStatus} from '../tactics.mjs';
import {hexDistance} from '../hex-grid.mjs';

export const unit=(id,type,troops=3000,level=5)=>({id,type,troops,level});
const team=(ids,types)=>ids.map((id,i)=>unit(id,types[i]));
export const archetypes=[
 {id:'cooperation',name:'多二流协同',note:'王平、张翼、张嶷、马忠（蜀）、陈到、李典；本报告的二流是阵容定位，不是官方品阶。',team:team(['person-46','person-439','person-408','person-515','person-457','person-610'],['spear','halberd','logistics','archer','cavalry','crossbow'])},
 {id:'carry',name:'超一流主C＋三流辅助',note:'赵云主C；周仓、廖化牵制，简雍、孙乾、糜竺支援。三流指正面战斗能力，文官的智政并不低。',team:team(['person-396','person-646','person-242','person-123','person-367','person-533'],['cavalry','spear','halberd','logistics','archer','crossbow'])},
 {id:'mixed',name:'一三流混搭',note:'关羽、张辽双核；廖化、简雍、孙乾、糜竺分别承伤、补给、控制、破甲。',team:team(['person-99','liao','person-646','person-123','person-367','person-533'],['halberd','cavalry','spear','logistics','archer','crossbow'])},
];
export const opponents=[
 {id:'balanced',name:'河北混编',terrain:'land',team:team(['shao','yan','wen','he','ju','tian'],['spear','cavalry','halberd','crossbow','archer','logistics'])},
 {id:'cavalry',name:'骑兵突击',terrain:'land',team:team(['person-342','person-70','jin','dun','yuanxia','person-641'],Array(6).fill('cavalry'))},
 {id:'ranged',name:'丘陵远射',terrain:'hill',team:team(['person-467','person-117','person-164','person-459','person-470','person-119'],['spear','archer','crossbow','archer','crossbow','halberd'])},
];
export const classicCases=[
 {id:'duel',name:'飞将对普通将',terrain:'land',a:[unit('person-661','cavalry')],z:[unit('person-646','cavalry')],expect:'吕布同兵同级应有明显优势',min:.7,max:1},
 {id:'heroes',name:'三英战吕布',terrain:'land',a:[unit('person-636','spear',2300,8),unit('person-99','cavalry',3000,8),unit('person-433','spear',3200,8)],z:[unit('person-661','cavalry',8500,8)],expect:'等总兵力三英应有取胜空间，吕布不应必胜',min:.25,max:1},
 {id:'ordinary',name:'普通将协同迎飞将',terrain:'land',a:[unit('person-46','spear',2800,8),unit('person-439','halberd',2800,8),unit('person-408','crossbow',2900,8)],z:[unit('person-661','cavalry',8500,8)],expect:'普通将分工应有挑战空间；不要求稳定战胜吕布',min:.1,max:1},
 {id:'spear-cavalry',name:'枪戟拒骑',terrain:'land',a:team(['jin','person-70','person-610'],['spear','halberd','spear']),z:team(['person-467','person-117','person-164'],Array(3).fill('cavalry')),expect:'枪戟对骑兵应有优势（含武将差异）',min:.6,max:1},
 {id:'cavalry-archer',name:'轻骑突弓',terrain:'land',a:team(['jin','person-70','person-610'],Array(3).fill('cavalry')),z:team(['person-467','person-117','person-164'],Array(3).fill('archer')),expect:'无前排弓兵应受骑兵威胁（含武将差异）',min:.6,max:1},
 {id:'fire-forest',name:'林地火攻',terrain:'forest',a:team(['person-246','person-164','person-467'],['archer','spear','logistics']),z:team(['cao','dun','yu'],['spear','halberd','logistics']),expect:'林地火攻阵容至少有取胜空间',min:.2,max:1},
 {id:'fleet',name:'江上水战',terrain:'river',a:team(['person-246','person-164','person-467'],Array(3).fill('ship')),z:team(['cao','dun','yu'],Array(3).fill('ship')),expect:'水军能合法接敌并结束；久战比例不超过20%',maxTimeout:.2},
];

// Apply the production enemy planner to a rotated clone, then replay only legal
// player setup actions. The live enemy, RNG and combat resources are untouched.
export function setupRulePlayer(state){
 const b=state.battle,shadow=structuredClone(b);
 shadow.sides.reverse();
 for(const [side,s] of shadow.sides.entries())for(const u of s.units){u.side=side;if(u.status==='active'){u.x=13-u.x;u.y=7-u.y;}}
 planEnemyArmy(shadow);
 for(const u of shadow.sides[1].units){
  assert.equal(configureUnitTactics(state,u.id,u.tactics),null);
  if(u.status==='active')assert.equal(deployUnit(b,u.id,13-u.x,7-u.y),null);
 }
}

export const plans=['compact','control','flank'];
export const allocations=['equal','focused','counter'];
export function playerTeam(a,allocation,opponent){
 const units=structuredClone(a.team);
 if(allocation==='equal')return units;
 const budgets={cooperation:[4200,3800,1600,2800,2400,3200],carry:[7500,3000,2500,1600,1800,1600],mixed:[5600,5400,2400,1600,1500,1500]};
 units.forEach((u,i)=>u.troops=budgets[a.id][i]);
 if(allocation==='counter'){
  if(opponent.id==='cavalry')units.forEach(u=>{if(['cavalry','archer','crossbow'].includes(u.type))u.type='spear';});
  else if(opponent.id==='ranged')units.forEach(u=>{if(['spear','halberd'].includes(u.type))u.type='cavalry';});
  else units.forEach(u=>{if(u.type==='cavalry')u.type='halberd';});
 }
 return units;
}
export function setupPlayer(state,plan){
 if(plan==='default')return;
 const b=state.battle;
 assert.equal(configureBattleIntent(b,plan==='control'?'hold':'annihilate'),null);
 const counters={};
 const cells={spear:[[4,3],[4,4]],halberd:[[4,4],[4,3]],cavalry:[[4,2],[4,5]],archer:[[3,5],[2,5]],crossbow:[[3,2],[2,2]],logistics:[[3,3],[2,4]]};
 const loadouts={spear:['phalanx','ward','strike'],halberd:['bulwark','mirage','riposte'],cavalry:['gallop','rush','valor'],archer:['smoke','wildfire','rally'],crossbow:['pierce','repeat','screen'],logistics:['passage','supply','bandage']};
 if(plan==='control'){loadouts.spear=['phalanx','doubt','ward'];loadouts.crossbow=['screen','seal','ambush'];loadouts.logistics=['passage','purify','regrowth'];}
 if(plan==='flank'){cells.cavalry=[[4,0],[4,7]];loadouts.halberd=['bulwark','riposte','cleave'];}
 const used=new Set();
 for(const [i,u] of b.sides[0].units.entries()){
  let ids=loadouts[u.type];const special=SPECIAL_TACTICS[u.id];
  if(special&&['cavalry','halberd','spear'].includes(u.type))ids=[special,...ids].slice(0,3);
  assert.equal(configureUnitTactics(state,u.id,ids),null);
  let [x,y]=cells[u.type][(counters[u.type]||0)%2];counters[u.type]=(counters[u.type]||0)+1;
  if(plan==='scattered'){x=i%2?0:4;y=i;}
  while(used.has(`${x},${y}`))x--;
  assert.ok(x>=0,'too many units for deployment template');
  used.add(`${x},${y}`);assert.equal(deployUnit(b,u.id,x,y),null);
 }
}

// Codex-authored player priorities, independent of chooseEnemyCommand. Decisions
// use visible positions, wounds, intent and statuses; no seed search or lookahead.
export function playerOrder(b){
 const allies=b.sides[0].units.filter(u=>u.status==='active'),foes=b.sides[1].units.filter(u=>u.status==='active');
 const engaged=allies.some(u=>foes.some(e=>hexDistance(u,e)<=4));
 const hurt=allies.some(u=>u.battleDamage*.35-u.healed>u.initial*.05);
 const impaired=allies.some(u=>['stun','confuse','seal','burn','scorch','plague'].some(k=>hasStatus(b,u,k)));
 const priorities=[...(impaired?['cleanse']:[]),...(hurt?['heal','regenerate']:[]),...(foes.some(u=>u.intent>=65)?['demoralize']:[]),...(engaged?['firestorm','assault','disrupt','fortify','range']:[]),...(allies.some(u=>u.intent<65)?['inspire','cycle']:[])];
 const available=battleStratagems(b);
 for(const key of priorities){
  const s=STRATAGEMS[key],target=b.sides[s.side];
  if(available.includes(key)&&(b.commandReady[key]||0)<=b.tick&&(!s.field||(target[s.field]||0)<=b.tick))return key;
 }
 return null;
}

export function fight(draft,{plan='default',controller='player',resume=false,trace=false,scatter=false}={}){
 const state=createScenario('custom-battle',draft.seed,20,null,draft),b=state.battle;
 if(controller==='rule'){
  // Isolate army matchups from inherited Cao/Yuan strategic posture bonuses.
  b.sides.forEach(s=>s.tactic='balanced');setupRulePlayer(state);
 }else setupPlayer(state,plan);
 if(scatter)for(const [i,u] of b.sides[0].units.entries())assert.equal(deployUnit(b,u.id,i%2?0:4,i),null);
 const initial=structuredClone(b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,x:u.x,y:u.y,initial:u.initial,level:u.level,tactics:u.tactics}))));
 assert.equal(lockDeployment(b),null);
 const commands=[],enemyCommands=[],events=[],observations=Object.fromEntries(b.sides.flatMap(s=>s.units).map(u=>[u.id,{active:0,controlled:0,nearSupport:0}]));
 let saved=null,lastEnemy=0,maxStill=0,still=0,previous='';
 const order=b=>{
  if(controller==='none'||b.commandProgress<COMMAND_RESOURCE.capacity)return null;
  return controller==='rule'?chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0):playerOrder(b);
 };
 while(!b.result){
  const key=order(b);if(key){assert.equal(issueCommand(b,key),null);commands.push({tick:b.tick,key});}
  if(saved){assert.equal(order(saved.battle),key);if(key)assert.equal(issueCommand(saved.battle,key),null);}
  stepBattle(b);if(saved)stepBattle(saved.battle);
  assert.ok(b.tick<=480);
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.equal(new Set(active.map(u=>`${u.x},${u.y}`)).size,active.length);
  for(const u of active){
   assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isFinite(u.hp)&&u.hp>0&&u.hp<=u.maxHp);assert.ok(validLoadout(u,u.tactics));
   const o=observations[u.id];o.active++;if(['confuse','stun','seal'].some(k=>hasStatus(b,u,k)))o.controlled++;
   if(active.some(v=>v.side===u.side&&v.id!==u.id&&v.tactics.includes('passage')&&hexDistance(u,v)<=1))o.nearSupport++;
  }
  if(b.enemyCommand.commandSerial!==lastEnemy){assert.ok(battleStratagems(b,1).includes(b.enemyCommand.lastCommand.key));assert.equal(b.enemyCommand.commandProgress,0);enemyCommands.push({tick:b.tick,...b.enemyCommand.lastCommand});lastEnemy=b.enemyCommand.commandSerial;}
  const snap=JSON.stringify(active.map(u=>[u.id,u.x,u.y,u.hp]));still=snap===previous?still+1:0;previous=snap;maxStill=Math.max(maxStill,still);
  if(trace)events.push({tick:b.tick,units:active.map(u=>({id:u.id,hp:u.hp,intent:u.intent,x:u.x,y:u.y,action:u.action})),effects:structuredClone(b.effects)});
  if(resume&&b.tick===20)saved=validateSave(structuredClone(state));
 }
 if(saved)assert.deepEqual(saved.battle,b);
 validateSave(structuredClone(state));
 return {seed:draft.seed,plan,controller,result:b.result,ticks:b.tick,initial,commands,enemyCommands,maxStill,combos:b.comboCounts,units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,name:u.name,side:u.side,hp:u.hp,initial:u.initial,damageTaken:u.battleDamage,healed:u.healed,casts:u.tacticCasts,...observations[u.id]})),...(trace?{events}:{})};
}
export function summary(runs){
 const remain=side=>+(runs.reduce((n,r)=>n+r.units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0)/r.units.filter(u=>u.side===side).reduce((n,u)=>n+u.initial,0),0)/runs.length).toFixed(3);
 return {n:runs.length,wins:runs.filter(r=>r.result.winner===0).length,draws:runs.filter(r=>r.result.winner===null).length,timeout:runs.filter(r=>r.result.reason==='久战收兵').length,ticks:+(runs.reduce((n,r)=>n+r.ticks,0)/runs.length).toFixed(1),remaining:remain(0),enemyRemaining:remain(1)};
}
