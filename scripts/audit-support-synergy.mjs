// Legal whole-roster comparisons, including smaller support units and both starts.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'outputs/support-synergy');
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
const id=name=>{const u=Object.values(O).find(o=>o.name===name);assert.ok(u,name);return u.id;};
const defaultRecipes=[
 {name:'吕布＋貂蝉',a:['吕布','cavalry','臧霸'],b:[['貂蝉','archer','蒋济']],chain:'倾国削战意 → 勇武；原设计参照'},
 {name:'曹操＋典韦',a:['曹操','spear','文聘'],b:[['典韦','halberd','丁奉']],chain:'护卫残血主将；曹操鼓舞前排'},
 {name:'司马懿＋郭淮',a:['司马懿','archer','蒋济'],b:[['郭淮','halberd','文聘']],chain:'护卫维持谋略主核；郭淮克骑承伤'},
 {name:'张辽＋李典',a:['张辽','cavalry','臧霸'],b:[['李典','halberd','文聘']],chain:'保留军阵入场配合与克骑牵制'},
 {name:'孙权＋周泰',a:['孙权','spear','文聘'],b:[['周泰','halberd','丁奉']],chain:'护卫与背水前排，碧眼全军保护'},
 {name:'周瑜＋小乔',a:['周瑜','archer','蒋济'],b:[['小乔','archer','王粲']],chain:'战歌帮助谋略主核启动；倾国保留真实点数门槛'},
 {name:'孙策＋大乔',a:['孙策','cavalry','臧霸'],b:[['大乔','archer','王粲']],chain:'战歌帮助突击主核启动；倾国保留真实点数门槛'},
 {name:'曹操＋甄氏',a:['曹操','spear','文聘'],b:[['甄氏','archer','王粲']],chain:'战歌支援魏军；同阵营战术搭配，不声称历史协战'},
 {name:'周瑜＋二乔',a:['周瑜','archer','蒋济'],b:[['小乔','archer','王粲'],['大乔','archer','王朗']],chain:'两名辅助激活倾国，战歌接续周瑜；两队的真实名额成本'},
];
const recipes=args.recipes?JSON.parse(readFileSync(resolve(args.recipes),'utf8')):defaultRecipes;
if(args['core-type'])for(const r of recipes)r.a[1]=args['core-type'];
if(args['support-type'])for(const r of recipes)for(const support of r.b)support[1]=args['support-type'];
const excluded=new Set(recipes.flatMap(r=>[r.a,...r.b].flatMap(x=>[x[0],x[2]])).map(id));
const quality=u=>u.leadership+Math.max(u.force,u.intellect);
const ordinary=Object.values(O).filter(u=>!excluded.has(u.id)&&!A[u.id].specialTactic&&!A[u.id].stratagems.length&&!A[u.id].traits.some(t=>TR[t]?.domain==='battle')&&!Object.keys(B[u.id]||{}).some(b=>D[b].grade==='advanced'));
const helpers=ordinary.filter(u=>Math.max(u.leadership,u.force,u.intellect)<=75&&quality(u)>=120).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,4);
const enemies=ordinary.filter(u=>!helpers.includes(u)&&Math.max(u.leadership,u.force,u.intellect)<=85&&quality(u)<=165).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,6);
assert.equal(helpers.length,4);assert.equal(enemies.length,6);
const base=Number(args['seed-base']||54100101);assert.ok(Number.isSafeInteger(base)&&base>0);
const seedCount=Number(args['seed-count']||4);assert.ok(Number.isSafeInteger(seedCount)&&seedCount>=1&&seedCount<=4);
const seeds=args.phase==='development'?[51100101]:[base,base+7919,base+15838,base+23757].slice(0,seedCount);
const layouts=args.layout?[args.layout]:['equal','core'];assert.ok(layouts.every(x=>['equal','core'].includes(x)));
const selected=args.pair?recipes.filter(r=>r.name===args.pair):recipes;assert.ok(selected.length);
const kinds=['spear','halberd','cavalry','archer'];
const entry=(officer,type,troops)=>({id:typeof officer==='string'?id(officer):officer.id,type,troops,level:10,retreatAt:null});
function draft(r,bits,seed,swapped,layout){
 const main=layout==='core'?5000:3000,support=layout==='core'?1000:3000,remaining=18000-main-r.b.length*support,n=5-r.b.length;
 const own=[entry(bits[0]?r.a[0]:r.a[2],r.a[1],main),...r.b.map(([name,type,ref])=>entry(bits[1]?name:ref,type,support)),...helpers.slice(0,n).map((u,i)=>entry(u,kinds[i%4],Math.floor(remaining/n)+(i<remaining%n?1:0)))];
 const foe=enemies.map((u,i)=>entry(u,kinds[i%4],3000));
 const role=team=>recommendArmyAppointments({units:team.map(u=>({...O[u.id],...u}))},{previous:{}}),roles=[role(own),role(foe)];
 return {seed,terrain:'land',mapId:'plain-open',battleKind:'field',limit:480,shieldPercent:0,gateHp:18000,ownTroopBudget:18000,ownTeam:swapped?foe:own,enemyTeam:swapped?own:foe,ownTeamRoles:roles[Number(swapped)],enemyTeamRoles:roles[1-Number(swapped)],events:[]};
}
function fight(r,bits,seed,swapped,layout,replay){
 const input=draft(r,bits,seed,swapped,layout),state=generateBattle(input),b=state.battle,side=Number(swapped);
 planBattleCouncilsAI(b,[0,1]);assert.equal(lockDeployment(b),null);validateSave(structuredClone(state));
 const initial=b.sides[side].units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,tactics:u.tactics}));let copy=null;
 const evidence={songIntent:0,escortShield:0,beautyDrain:0,songToMain:0,escortToMain:0,focusCombos:0,supportCombos:0,coverCombos:0,combosWithMain:0,crusherProcs:0};const coreId=id(bits[0]?r.a[0]:r.a[2]);
 while(!b.result){stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
  for(const e of b.effects){
   const provider=b.sides[side].units.find(u=>u.id===e.from);if(!provider)continue;
   if(e.label==='战歌'){evidence.songIntent+=e.intentGained||0;if(e.to===coreId)evidence.songToMain+=e.intentGained||0;}
   if(e.label==='护卫'){const granted=Number(e.text?.match(/护盾 \+(\d+)/)?.[1]||0);evidence.escortShield+=granted;if(e.to===coreId)evidence.escortToMain+=granted;}
   if(e.label==='倾国')evidence.beautyDrain+=e.intentDrained||0;
   if(e.combo){evidence[({supported:'supportCombos',cover:'coverCombos'})[e.combo.kind]||'focusCombos']++;if(e.combo.actors.some(a=>a.id===coreId))evidence.combosWithMain++;}
   if(e.label==='摧锋')evidence.crusherProcs++;
  }
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);assert.ok(active.every(u=>canOccupy(b,u,u.x,u.y)&&Number.isFinite(u.hp)&&u.hp<=u.maxHp));
  if(replay&&b.tick===20)copy=validateSave(structuredClone(state));assert.ok(b.tick<=b.maxTicks);
 }
 validateSave(state);if(copy)assert.deepEqual(copy.battle,b);
 const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),ownRemaining=hp(side),enemyRemaining=hp(1-side);
 if(b.result.winner!==side)writeFileSync(join(out,'failures',r.name+'-'+layout+'-'+bits.join('')+'-'+seed+'-'+Number(swapped)+'.json'),JSON.stringify(state));
 return {bits:bits.join(''),layout,seed,swapped,win:b.result.winner===side,draw:b.result.winner===null,marginPP:(ownRemaining-enemyRemaining)/18000*100,ownRemaining,enemyRemaining,result:b.result,ticks:b.tick,replayChecked:!!copy,saveChecked:true,initial,evidence,trainingGold:(swapped?input.enemyTeam:input.ownTeam).reduce((n,u)=>n+trainingCost(u.type,u.troops),0),contribution:b.sides[side].units.map(u=>({name:u.name,contribution:u.contribution,casts:u.tacticCasts}))};
}
const mean=a=>a.reduce((s,x)=>s+x,0)/(a.length||1),round=x=>Math.round(x*100)/100;
mkdirSync(join(out,'failures'),{recursive:true});writeFileSync(join(out,'battles.jsonl'),'');
const rows=[],start=Date.now();
for(const r of selected)for(const layout of layouts){
 const runs=[],interactions=[];
 for(const seed of seeds)for(const swapped of [false,true]){
  const group=[];
  for(const bits of [[0,0],[1,0],[0,1],[1,1]]){const run=fight(r,bits,seed,swapped,layout,args.phase!=='development'&&seed===seeds[0]&&!swapped);runs.push(run);group.push(run);appendFileSync(join(out,'battles.jsonl'),JSON.stringify({pair:r.name,...run})+'\n');}
  assert.equal(new Set(group.map(x=>x.trainingGold)).size,1);assert.equal(new Set(group.map(x=>x.initial.reduce((n,u)=>n+u.troops,0))).size,1);
  interactions.push(group[3].marginPP-group[1].marginPP-group[2].marginPP+group[0].marginPP);
 }
 const cells=['00','10','01','11'].map(bits=>{const xs=runs.filter(x=>x.bits===bits);return {bits,wins:xs.filter(x=>x.win).length,games:xs.length,marginPP:round(mean(xs.map(x=>x.marginPP))),evidence:Object.fromEntries(Object.keys(xs[0].evidence).map(k=>[k,round(mean(xs.map(x=>x.evidence[k])))]))};});
 rows.push({...r,layout,cells,interactionPP:round(mean(interactions)),replays:runs.filter(x=>x.replayChecked).length,battles:runs.length,losses:runs.filter(x=>!x.win&&!x.draw).length,draws:runs.filter(x=>x.draw).length});
 console.log(JSON.stringify({pair:r.name,layout,cells,interactionPP:rows.at(-1).interactionPP,seconds:Math.round((Date.now()-start)/1000)}));
}
const report={rulesVersion:RULES_VERSION,source:root,phase:args.phase||'validation',seeds,layouts,battles:rows.reduce((n,r)=>n+r.battles,0),rows,method:'Four legal whole rosters (ordinary/A/B/both), 10th level, identical troop types, 18,000 troops and training fees within each group. Equal layout: 3,000 per unit. Core layout: 5,000 main, 1,000 per support, remaining troops distributed among actual helpers. Both sides use public AI councils and combat, with swapped starts. Interaction = both − A − B + neither, in remaining army margin percentage points. Whole kits, roles, bond thresholds and nonlinear outcomes contribute. Development and validation seeds do not overlap.'};
writeFileSync(join(out,'summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({done:true,rulesVersion:RULES_VERSION,battles:report.battles,seconds:Math.round((Date.now()-start)/1000)}));
