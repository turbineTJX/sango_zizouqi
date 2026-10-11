// Four legal rosters per pair separate whole-kit partner interaction from raw strength.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'outputs/historical-synergy');
const load=file=>import(pathToFileURL(join(root,file)));
const {generateBattle}=await load('battle-generator.mjs');
const {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {OFFICER_DESIGNS:O}=await load('data/design/officers.mjs');
const {OFFICER_ASSIGNMENTS:A}=await load('data/design/assignments.mjs');
const {BOND_ASSIGNMENTS:B}=await load('data/design/bond-assignments.mjs');
const {BOND_DESIGNS:D}=await load('data/design/bonds.mjs');
const {TRAIT_DESIGNS:TR}=await load('data/design/traits.mjs');
const {recommendArmyAppointments}=await load('army-appointments.mjs');
const {trainingCost}=await load('troop-training.mjs');
const {canOccupy}=await load('battlefield.mjs');
const {RULES_VERSION}=await load('combat-rules.mjs');
const id=name=>{const o=Object.values(O).find(o=>o.name===name);assert.ok(o,name);return o.id;};
const recipes=[
 {name:'吕布＋貂蝉',a:['吕布','cavalry','臧霸'],b:['貂蝉','archer','蒋济'],extra:[],chain:'倾国削战意 → 勇武战意差优势（原设计参照）'},
 {name:'刘关张',a:['张飞','spear','文聘'],b:['关羽','spear','李典'],extra:[['刘备','spear']],chain:'长坂混乱 → 青龙乘隙；桃园共担与溃败奋战'},
 {name:'司马懿＋张郃',a:['司马懿','spear','蒋济'],b:['张郃','spear','文聘'],extra:[['郭淮','halberd']],chain:'疲弱、破甲与压战意 → 锐锋收割；郭淮承伤'},
 {name:'孙策＋周瑜',a:['孙策','cavalry','臧霸'],b:['周瑜','archer','蒋济'],extra:[['太史慈','archer']],chain:'霸王鼓舞 → 神火更早启动；太史慈同享鼓舞'},
 {name:'庞统＋黄忠',a:['庞统','halberd','文聘'],b:['黄忠','archer','蒋济'],extra:[['刘备','spear'],['魏延','spear']],chain:'连环连接 → 百步伤害传导；刘备维持前线'},
 {name:'陆逊＋朱然',a:['陆逊','archer','蒋济'],b:['朱然','spear','李典'],extra:[['韩当','spear']],chain:'朱然火谋铺火 → 火烧连营乘势；韩当跟进收割'},
];
const excluded=new Set(recipes.flatMap(r=>[...r.a.filter((_,i)=>i!==1),...r.b.filter((_,i)=>i!==1),...r.extra.map(x=>x[0])]).map(id));
const quality=u=>u.leadership+Math.max(u.force,u.intellect);
const ordinary=Object.values(O).filter(u=>!excluded.has(u.id)&&!A[u.id].specialTactic&&!A[u.id].stratagems.length&&!A[u.id].traits.some(t=>TR[t]?.domain==='battle')&&!Object.keys(B[u.id]||{}).some(b=>D[b].grade==='advanced'));
const helpers=ordinary.filter(u=>Math.max(u.leadership,u.force,u.intellect)<=75&&quality(u)>=120).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,4);
const enemies=ordinary.filter(u=>!helpers.includes(u)&&Math.max(u.leadership,u.force,u.intellect)<=85&&quality(u)<=165).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,6);
assert.equal(helpers.length,4);assert.equal(enemies.length,6);
const seeds=args.phase==='development'?[41100101]:[44100101,44108020,44115939,44123858];
const kinds=['spear','halberd','cavalry','archer'];
const entry=(officer,type)=>({id:typeof officer==='string'?id(officer):officer.id,type,troops:3000,level:10,retreatAt:null});
function draft(r,bits,seed,swapped){
 const own=[entry(bits[0]?r.a[0]:r.a[2],r.a[1]),entry(bits[1]?r.b[0]:r.b[2],r.b[1]),...r.extra.map(([name,type])=>entry(name,type)),...helpers.slice(0,4-r.extra.length).map((u,i)=>entry(u,kinds[i%4]))];
 const foe=enemies.map((u,i)=>entry(u,kinds[i%4]));
 const role=team=>recommendArmyAppointments({units:team.map(u=>({...O[u.id],...u}))},{previous:{}});
 const roles=[role(own),role(foe)];
 return {seed,terrain:'land',mapId:'plain-open',battleKind:'field',limit:480,shieldPercent:0,gateHp:18000,ownTroopBudget:18000,ownTeam:swapped?foe:own,enemyTeam:swapped?own:foe,ownTeamRoles:roles[Number(swapped)],enemyTeamRoles:roles[1-Number(swapped)],events:[]};
}
function fight(r,bits,seed,swapped,replay){
 const input=draft(r,bits,seed,swapped),state=generateBattle(input),b=state.battle,side=Number(swapped);
 planBattleCouncilsAI(b,[0,1]);assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
 const initial=b.sides[side].units.map(u=>({id:u.id,name:u.name,type:u.type,tactics:u.tactics,status:u.status}));let copy=null;
 while(!b.result){stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);assert.ok(active.every(u=>canOccupy(b,u,u.x,u.y)&&Number.isFinite(u.hp)&&u.hp<=u.maxHp));
  if(replay&&b.tick===20)copy=validateSave(structuredClone(state));assert.ok(b.tick<=b.maxTicks);
 }
 validateSave(state);if(copy)assert.deepEqual(copy.battle,b);
 const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),ownRemaining=hp(side),enemyRemaining=hp(1-side);
 if(b.result.winner!==side)writeFileSync(join(out,'failures',r.name+'-'+bits.join('')+'-'+seed+'-'+Number(swapped)+'.json'),JSON.stringify(state));
 return {bits,seed,swapped,win:b.result.winner===side,draw:b.result.winner===null,marginPP:(ownRemaining-enemyRemaining)/18000*100,ownRemaining,enemyRemaining,result:b.result,ticks:b.tick,replayChecked:!!copy,saveChecked:true,initial,trainingGold:(swapped?input.enemyTeam:input.ownTeam).reduce((n,u)=>n+trainingCost(u.type,u.troops),0),contribution:b.sides[side].units.map(u=>({name:u.name,contribution:u.contribution,casts:u.tacticCasts})),teamDamage:b.sides[side].units.reduce((n,u)=>n+(u.contribution.damage||0),0)};
}
const mean=a=>a.reduce((s,x)=>s+x,0)/(a.length||1),round=x=>Math.round(x*100)/100;
mkdirSync(join(out,'failures'),{recursive:true});writeFileSync(join(out,'battles.jsonl'),'');
const rows=[],start=Date.now();
for(const r of recipes){
 const runs=[],interactions=[];
 for(const seed of seeds)for(const swapped of [false,true]){
  const group=[];
  for(const bits of [[0,0],[1,0],[0,1],[1,1]]){
   const run=fight(r,bits,seed,swapped,args.phase!=='development'&&seed===seeds[0]&&!swapped);runs.push(run);group.push(run);appendFileSync(join(out,'battles.jsonl'),JSON.stringify({pair:r.name,...run})+'\n');
  }
  assert.equal(new Set(group.map(x=>x.trainingGold)).size,1);
  interactions.push(group[3].marginPP-group[1].marginPP-group[2].marginPP+group[0].marginPP);
 }
 const cells=[[0,0],[1,0],[0,1],[1,1]].map(bits=>{const xs=runs.filter(x=>x.bits.join('')===bits.join(''));return {bits:bits.join(''),wins:xs.filter(x=>x.win).length,games:xs.length,marginPP:round(mean(xs.map(x=>x.marginPP)))};});
 rows.push({...r,cells,interactionPP:round(mean(interactions)),replays:runs.filter(x=>x.replayChecked).length,battles:runs.length,losses:runs.filter(x=>!x.win&&!x.draw).length,draws:runs.filter(x=>x.draw).length,timeouts:runs.filter(x=>x.result.reason==='久战收兵').length});
 console.log(JSON.stringify({pair:r.name,cells,interactionPP:rows.at(-1).interactionPP,seconds:Math.round((Date.now()-start)/1000)}));
}
const report={rulesVersion:RULES_VERSION,source:root,phase:args.phase||'validation',seeds,battles:rows.reduce((n,r)=>n+r.battles,0),rows,method:'Four wholly legal rosters (neither/A/B/both), same 18,000 troops and training budget, 10th level, fixed ordinary opponent, public AI council and actual combat on both sides, swapped starts. Interaction = both − A − B + neither in remaining army margin percentage points. Whole kits, bond tiers, roles, ceilings and nonlinear victory outcomes all contribute; this is conditional on this roster/opponent and not a universal rank or a win probability. Development and validation seeds do not overlap.'};
writeFileSync(join(out,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({done:true,rulesVersion:RULES_VERSION,battles:report.battles,seconds:Math.round((Date.now()-start)/1000)}));
