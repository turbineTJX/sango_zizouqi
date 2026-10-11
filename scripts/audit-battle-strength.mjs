// Current legal rosters, paired feature ablations, and both AI controllers.
// Run from a frozen runtime: node scripts/audit-battle-strength.mjs --group=bonds --out=...
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {generateBattle} from '../battle-generator.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave,makeOfficer} from '../engine.mjs';
import {OFFICER_CATALOG as OFFICERS,OFFICER_BY_ID as BY} from '../officer-catalog.mjs';
import {BOND_DESIGNS as BONDS} from '../data/design/bonds.mjs';
import {BOND_ASSIGNMENTS as CAPS} from '../data/design/bond-assignments.mjs';
import {TRAIT_DESIGNS as TRAITS} from '../data/design/traits.mjs';
import {OFFICER_ASSIGNMENTS as ASSIGNMENTS} from '../data/design/assignments.mjs';
import {TROOP_DESIGNS as TROOPS} from '../data/design/troops.mjs';
import {TACTICS_BOOK,hasStatus} from '../tactics.mjs';
import {learnedTacticIds,allLearnedTacticIds} from '../tactic-learning.mjs';
import {sideBondDetails} from '../bonds.mjs';
import {tacticSlot} from '../tactic-tempo.mjs';
import {canOccupy} from '../battlefield.mjs';
import {frontlineCapacity} from '../army-trait-rules.mjs';
import {trainingCost} from '../troop-training.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {BATTLE_MAPS} from '../data/design/battle-maps.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const group=args.group||'bonds',out=resolve(args.out||'outputs/battle-strength-current');
const SEEDS={development:[810001,817920],validation:[910001,917920,925839,933758]};
const baseTypes=['spear','halberd','cavalry','archer'];
const quality=o=>o.leadership+Math.max(o.force,o.intellect)+Math.max(...Object.values(o.aptitudes))*10;
const categoryPower=(o,category)=>o[category==='intellect'?'intellect':'force']+o.leadership*.25;
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const rounded=n=>Math.round(n*100)/100;
const entry=(id,type=BY[id].type,troops=3000)=>({id,type,troops,level:10,retreatAt:null});
function bestType(o,preferred=null){
 if(preferred)return preferred;
 return [...baseTypes].sort((a,b)=>(o.aptitudes[b]||0)-(o.aptitudes[a]||0)||Number(b===o.type)-Number(a===o.type)||baseTypes.indexOf(a)-baseTypes.indexOf(b))[0];
}
function fillIds(excluded,count,{elite=false,mental=false}={}){
 const pool=OFFICERS.filter(o=>!excluded.has(o.id)&&(!mental||o.intellect>=o.force)&&
  (elite?Math.max(o.force,o.intellect,o.leadership)>=88:!ASSIGNMENTS[o.id]?.specialTactic&&Math.max(o.force,o.intellect,o.leadership)<=85));
 pool.sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id));
 const result=pool.slice(0,count).map(o=>o.id);assert.equal(result.length,count);result.forEach(id=>excluded.add(id));return result;
}
function foe(own,context,count=6,types=null){
 const excluded=new Set(own.map(u=>u.id)),ids=fillIds(excluded,count,{elite:context==='elite',mental:context==='spell'});
 return ids.map((id,i)=>entry(id,types?.[i%types.length]||(context==='cavalry'?'cavalry':context==='spell'?'halberd':context==='frontline'?(i%2?'halberd':'spear'):baseTypes[i%4])));
}
function draft(own,enemy,{terrain='land',kind='field',events=[],mapId}={}){
 return {terrain,battleKind:kind,limit:480,seed:SEEDS.development[0],shieldPercent:0,gateHp:18000,
  ownTroopBudget:own.reduce((n,u)=>n+u.troops,0),ownTeam:own,enemyTeam:enemy,events,...(mapId?{mapId}:{})};
}
function bondCases(){
 const cases=[];
 for(const [id,d]of Object.entries(BONDS)){
  const holders=OFFICERS.filter(o=>CAPS[o.id]?.[id]).sort((a,b)=>CAPS[b.id][id]-CAPS[a.id][id]||quality(b)-quality(a)||a.id.localeCompare(b.id));
  const chosen=holders.slice(0,6).map(o=>o.id),excluded=new Set(chosen);
  chosen.push(...fillIds(excluded,6-chosen.length));
  if(id==='bondReserve')chosen.push(...fillIds(excluded,2));
  const preferred=['bondSwift'].includes(id)?'cavalry':['bondVolley','bondBeauty','bondFire','bondChain'].includes(id)?'archer':['bondWisdom','bondScholar'].includes(id)?'halberd':null;
  const own=chosen.map(id=>entry(id,bestType(BY[id],preferred)));
  if(id==='bondSiegebreak')for(const u of own)u.equipment={siege:'siege',ship:null};
  const contexts=id==='bondAntiHorse'?['cavalry','elite']:['bondSpread','bondSteady'].includes(id)?['spell','elite']:['mixed','elite'];
  for(const context of contexts){
   const enemy=foe(own,context,own.length),spec=draft(own,enemy,{kind:id==='bondSiegebreak'?'siege':'field'});
   cases.push({id,name:d.name,kind:'bond',context,grade:d.grade,target:id,focals:own.filter(u=>CAPS[u.id]?.[id]).map(u=>u.id),draft:spec});
  }
 }
 return cases;
}
function tacticConfigurations(){
 const found=new Map();
 for(const o of OFFICERS)for(const [type,t]of Object.entries(TROOPS)){
  if(!['troop','equipment'].includes(t.category))continue;
  const base=t.equipmentSlot?'halberd':type,u=makeOfficer(o.id,3000,0,10);
  u.type=base;if(t.equipmentSlot){u.equipment={siege:null,ship:null,[t.equipmentSlot]:type};u.formType=type;}
  for(const id of learnedTacticIds(u)){
   const s=TACTICS_BOOK[id],candidate={id:o.id,type:base,equipment:t.equipmentSlot?u.equipment:undefined,form:type,
    score:categoryPower(o,s.category)+(ASSIGNMENTS[o.id]?.specialTactic&&!s.special?-80:0)+(type===o.type?5:0)};
   const old=found.get(id);if(!old||candidate.score>old.score)found.set(id,candidate);
  }
 }
 return found;
}
function tacticCases(){
 const cases=[];
 for(const [id,c]of tacticConfigurations()){
  const d=TACTICS_BOOK[id],excluded=new Set([c.id]),naval=!!c.equipment?.ship,siege=!!c.equipment?.siege;
  const own=[{...entry(c.id,c.type),...(c.equipment?{equipment:c.equipment}:{})},...fillIds(excluded,5).map((id,i)=>entry(id,baseTypes[i%4]))];
  for(const context of ['mixed',siege?'rear-defense':'frontline']){
   const enemy=foe(own,context,6,context==='mixed'?own.map(u=>u.type):context==='rear-defense'?Array(6).fill('archer'):null);
   if(naval)for(const u of [...own,...enemy])u.equipment={siege:null,ship:c.equipment.ship};
   cases.push({id,name:d.name,kind:'tactic',context,grade:d.special?'exclusive':'ordinary',target:id,focals:[c.id],
    draft:draft(own,enemy,{terrain:naval?'river':'land',kind:siege?'siege':'field',...(naval?{mapId:'chibi'}:{})})});
  }
 }
 return cases;
}
function traitCases(){
 const cases=[];
 for(const [id,d]of Object.entries(TRAITS).filter(([,d])=>d.domain==='battle'&&d.mechanics?.some(m=>m.roles))){
  const holder=Object.keys(ASSIGNMENTS).filter(o=>ASSIGNMENTS[o].traits.includes(id)).sort((a,b)=>quality(BY[b])-quality(BY[a]))[0];
  const count=id==='hero-cao'?8:6,excluded=new Set([holder]),ids=[holder,...fillIds(excluded,count-1)];
  const own=ids.map((id,i)=>entry(id,bestType(BY[id]),count===8?2250:3000));
  for(const context of ['mixed','ambush-pressure']){
   const enemy=foe(own,'elite',count),events=context==='ambush-pressure'?[18,42,66].map(tick=>({kind:'ambush',side:0,tick,duration:4})):[];
   if(count===8)for(const u of enemy)u.troops=2250;
   const spec=draft(own,enemy,{events});
   spec.ownTeamRoles={leader:holder,advisor:holder};
   cases.push({id,name:d.name,kind:'trait',context,grade:d.tier,target:id,focals:[holder],draft:spec});
  }
 }
 return cases;
}
function stateFor(spec,seed,swapped,disabled){
 const input=structuredClone(spec.draft);input.seed=seed;
 if(swapped){for(const suffix of ['','Roles','Tactic'])[input['ownTeam'+suffix],input['enemyTeam'+suffix]]=[input['enemyTeam'+suffix],input['ownTeam'+suffix]];for(const event of input.events)event.side=1-event.side;if(input.battleKind==='siege')input.battleKind='defense';}
 input.ownTroopBudget=input.ownTeam.reduce((n,u)=>n+u.troops,0);
 const state=generateBattle(input),b=state.battle,subject=swapped?1:0;
 planBattleCouncilsAI(b,[0,1]);
 if(disabled&&spec.kind==='bond')for(const u of b.sides[subject].units)delete u.bondGrowth.levels[spec.target];
 assert.equal(lockDeployment(b),null);
 if(disabled&&spec.kind==='tactic')for(const u of b.sides[subject].units.filter(u=>spec.focals.includes(u.id)))u.skillReady[spec.target]=b.maxTicks+1;
 return {state,b,subject,input};
}
function fight(spec,seed,swapped,disabled,{replay=false,savePath=null}={}){
 const original=spec.kind==='trait'?TRAITS[spec.target].mechanics:null;
 if(disabled&&original)TRAITS[spec.target].mechanics=[];
 try{
  const {state,b,subject,input}=stateFor(spec,seed,swapped,disabled),initial=sideBondDetails(b,subject);
  const ids=new Set(spec.focals),opening=b.sides.map((s,i)=>({capacity:frontlineCapacity(b,i),commanders:s.commanders,
   units:s.units.map(u=>({id:u.id,type:u.type,form:u.formType,status:u.status,x:u.x,y:u.y,points:u.bondGrowth.levels,tactics:u.tactics}))}));
  const byId=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,u]));
  const observation={directDamage:0,healing:0,shieldAbsorbed:0,intentDrained:0,intentDenied:0,commandRestored:0,traitEvents:0,
   enemyControlSteps:0,ownControlSteps:0,tierSteps:[0,0,0,0],focalAliveSteps:0,zeroImpactEvents:0};
  let copy=null,firstCast=null;
  while(!b.result){
   stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
   const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);
   assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);
   for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y)&&Number.isFinite(u.hp)&&u.hp<=u.maxHp);const held=['confuse','stun','seal','root','disarm','disrupted'].some(k=>hasStatus(b,u,k));observation[u.side===subject?'ownControlSteps':'enemyControlSteps']+=Number(held);if(ids.has(u.id))observation.focalAliveSteps++;}
   if(spec.kind==='bond')observation.tierSteps[sideBondDetails(b,subject)[spec.target]?.tier||0]++;
   for(const e of b.effects){
    const actor=byId.get(e.from),target=byId.get(e.to),relevant=actor?.side===subject&&ids.has(e.from)&&
     (spec.kind==='bond'||spec.kind==='trait'&&e.traitId===spec.target||spec.kind==='tactic'&&e.label===spec.name);
    if(!relevant)continue;
    if(target?.side!==subject)observation.directDamage+=e.damage||0;
    observation.healing+=e.healing||0;observation.shieldAbsorbed+=e.shieldAbsorbed||0;
    observation.intentDrained+=e.intentDrained||0;observation.intentDenied+=e.intentDenied||0;observation.commandRestored+=e.commandRestored||0;
    observation.traitEvents+=Number(e.abilityKind==='trait');observation.zeroImpactEvents+=Number(e.damage===0&&!(e.healing||e.intentDrained||e.commandRestored)&&e.resolution?.immune===true);
   }
   if(spec.kind==='tactic'&&b.sides[subject].units.some(u=>ids.has(u.id)&&u.tacticCasts[spec.target]>0))firstCast??=b.tick;
   if(replay&&!disabled&&b.tick===20)copy=validateSave(structuredClone(state));
   assert.ok(b.tick<=b.maxTicks);
  }
  if(!disabled){validateSave(state);if(copy)assert.deepEqual(copy.battle,b);}
  const contributions=b.sides.map(s=>s.units.reduce((a,u)=>{for(const [key,n]of Object.entries(u.contribution))a[key]=(a[key]||0)+n;return a;},{}));
  const remaining=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),budget=input[subject?'enemyTeam':'ownTeam'].reduce((n,u)=>n+u.troops,0);
  if(savePath&&!disabled&&(b.result.winner!==subject||b.result.reason==='久战收兵'))writeFileSync(savePath,JSON.stringify(state));
  const focal=b.sides[subject].units.filter(u=>ids.has(u.id));
  return {disabled,subject,winner:b.result.winner,win:b.result.winner===subject,draw:b.result.winner===null,reason:b.result.reason,ticks:b.tick,
   marginPP:(remaining[subject]-remaining[1-subject])/budget*100,remaining,gateHp:b.siege?.gate.hp??null,budget,
   trainingGold:input[subject?'enemyTeam':'ownTeam'].reduce((n,u)=>n+trainingCost(u.type,u.troops),0),initial,opening,contributions,observation,firstCast,
   casts:focal.reduce((n,u)=>n+(u.tacticCasts[spec.target]||0),0),traitUses:focal.reduce((n,u)=>n+Object.entries(u.traitState).filter(([key])=>key.startsWith(spec.target+':')).reduce((a,[,v])=>a+v.uses,0),0),
   sharedSlot:spec.kind==='tactic'?allLearnedTacticIds(focal[0]).filter(id=>tacticSlot(TACTICS_BOOK[id])===tacticSlot(TACTICS_BOOK[spec.target])):[],
   units:b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,hp:u.hp,status:u.status,contribution:u.contribution,casts:u.tacticCasts,traitState:u.traitState}))),replayChecked:!!copy};
 }finally{if(disabled&&original)TRAITS[spec.target].mechanics=original;}
}
function summarize(pairs){
 const clusters=new Map();for(const p of pairs){const key=p.context+':'+p.seed;const xs=clusters.get(key)||[];xs.push(p.on.marginPP-p.off.marginPP);clusters.set(key,xs);}
 const deltas=[...clusters.values()].map(mean),gain=mean(deltas),se=deltas.length>1?Math.sqrt(deltas.reduce((n,x)=>n+(x-gain)**2,0)/(deltas.length-1)/deltas.length):0;
 const on=pairs.map(p=>p.on),off=pairs.map(p=>p.off);
 const difference=key=>mean(on.map((r,i)=>(r.contributions[r.subject][key]||0)-(off[i].contributions[off[i].subject][key]||0)));
 return {pairs:pairs.length,battles:pairs.length*2,onWins:on.filter(r=>r.win).length,offWins:off.filter(r=>r.win).length,onWinPct:rounded(mean(on.map(r=>Number(r.win)))*100),offWinPct:rounded(mean(off.map(r=>Number(r.win)))*100),
  winGainPP:rounded(mean(on.map((r,i)=>Number(r.win)-Number(off[i].win)))*100),marginGainPP:rounded(gain),approx95:[rounded(gain-1.96*se),rounded(gain+1.96*se)],
  damageGain:rounded(difference('damage')),healingGain:rounded(difference('healing')),protectionGain:rounded(difference('protection')),controlGain:rounded(difference('control')),siegeGain:rounded(difference('siege')),
  averageCasts:rounded(mean(on.map(r=>r.casts))),zeroCastPct:rounded(mean(on.map(r=>Number(!r.casts)))*100),firstCast:rounded(mean(on.map(r=>r.firstCast).filter(n=>n!==null))),
  averageTraitUses:rounded(mean(on.map(r=>r.traitUses))),commandRestored:rounded(mean(on.map(r=>r.observation.commandRestored))),
  controlStepGain:rounded(mean(on.map((r,i)=>r.observation.enemyControlSteps-off[i].observation.enemyControlSteps))),ownControlStepReduction:rounded(mean(on.map((r,i)=>off[i].observation.ownControlSteps-r.observation.ownControlSteps))),
  timeouts:on.filter(r=>r.reason==='久战收兵').length,maxTicks:Math.max(...on.map(r=>r.ticks)),meanTicks:rounded(mean(on.map(r=>r.ticks))),
  replayChecks:on.filter(r=>r.replayChecked).length,openingTiers:[...new Set(on.map(r=>r.initial[pairs[0].target]?.tier||0))],
  sharedSlot:[...new Set(on.flatMap(r=>r.sharedSlot))]};
}
assert.ok(['bonds','tactics','traits'].includes(group));mkdirSync(out,{recursive:true});mkdirSync(join(out,'failures'),{recursive:true});
const cases=group==='bonds'?bondCases():group==='tactics'?tacticCases():traitCases();
if(args.level){
 const level=Number(args.level);assert.ok(Number.isInteger(level)&&level>=1&&level<=10);
 for(const c of cases)for(const u of [...c.draft.ownTeam,...c.draft.enemyTeam])u.level=level;
}
if(args.map){
 assert.ok(BATTLE_MAPS[args.map]);
 for(const c of cases){c.draft.mapId=args.map;c.draft.terrain=BATTLE_MAPS[args.map].terrain;}
}
writeFileSync(join(out,group+'-cases.json'),JSON.stringify({rulesVersion:RULES_VERSION,seeds:SEEDS,level:Number(args.level||10),mapId:args.map||null,cases},null,2));
const path=join(out,group+'-pairs.jsonl');writeFileSync(path,'');const all=[],started=Date.now();let battles=0;
let selected=args.only?cases.filter(c=>args.only.split(',').includes(c.id)):cases;
if(args.shard){const [index,total]=args.shard.split('/').map(Number),ids=[...new Set(selected.map(s=>s.id))];selected=selected.filter(s=>ids.indexOf(s.id)%total===index);}
for(const spec of selected){
 for(const [phase,seeds]of Object.entries(SEEDS).filter(([phase])=>!args.phase||args.phase===phase))for(const seed of args.pilot?seeds.slice(0,1):seeds)for(const swapped of [false,true]){
  const prefix=spec.kind+'-'+spec.id+'-'+spec.context+'-'+seed+'-'+Number(swapped),on=fight(spec,seed,swapped,false,{replay:phase==='validation'&&seed===seeds[0]&&!swapped,savePath:join(out,'failures',prefix+'.json')}),off=fight(spec,seed,swapped,true);
  const pair={kind:spec.kind,id:spec.id,name:spec.name,grade:spec.grade,target:spec.target,context:spec.context,phase,seed,swapped,on,off};
  appendFileSync(path,JSON.stringify(pair)+'\n');all.push(pair);battles+=2;
 }
 console.log(JSON.stringify({group,ability:spec.name,context:spec.context,battles,seconds:Math.round((Date.now()-started)/1000)}));
}
const summary={rulesVersion:RULES_VERSION,group,battles,cases:selected.length,seeds:SEEDS,level:Number(args.level||10),mapId:args.map||null,diagnostic:'Off runs are feature ablations, not legal player choices. Equipment tactic ablation disables its shared slot.',
 rows:[...new Set(all.map(p=>p.id))].map(id=>{const ps=all.filter(p=>p.id===id);return {id,name:ps[0].name,grade:ps[0].grade,all:summarize(ps),validation:summarize(ps.filter(p=>p.phase==='validation')),contexts:[...new Set(ps.map(p=>p.context))].map(context=>({context,...summarize(ps.filter(p=>p.context===context&&p.phase==='validation'))}))};})};
writeFileSync(join(out,group+'-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({complete:group,battles,seconds:Math.round((Date.now()-started)/1000)}));
