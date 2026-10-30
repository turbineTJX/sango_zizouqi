// Frozen-source gameplay diagnostic. No forced outcome or win-rate gate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const runtime=resolve(args.source),out=resolve(args.out),manifest=JSON.parse(readFileSync(join(runtime,'../manifest.json')));
const hash=b=>createHash('sha256').update(b).digest('hex'),harnessHash=hash(readFileSync(new URL(import.meta.url)));
function verify(){for(const [p,h] of Object.entries(manifest.hashes))assert.equal(hash(readFileSync(join(runtime,p))),h,p);}
verify();assert.ok(!existsSync(join(out,'summary.json')),'Preserve completed experiments');mkdirSync(join(out,'battles'),{recursive:true});
const mod=p=>import(pathToFileURL(join(runtime,p)));
const E=await mod('engine.mjs'),{generateBattle}=await mod('battle-generator.mjs'),{historicalBattleDraft}=await mod('historical-battle-library.mjs'),{swapCustomBattle}=await mod('custom-battle.mjs');
const {humanOrder}=await mod('scripts/historical-player-lab.mjs'),{OFFICER_DESIGNS:O}=await mod('data/design/officers.mjs');
const {formationCells,formationChoice}=await mod('bond-battlefield.mjs'),{deployBattleUnit}=await mod('battle-deployment.mjs');
const {configureReserveEntry}=await mod('reserve-entry.mjs'),{configureCouncilRetreat}=await mod('battle-council.mjs');
const {chooseEnemyCommand}=await mod('battle-ai.mjs'),{chooseStratagemPoint}=await mod('stratagem-area.mjs');
const seeds=(args.seeds||'91029017,91038041,92029019,92042029,92055043').split(',').map(Number),suite=args.suite||'history';
const person=name=>{const o=Object.values(O).find(o=>o.name===name);assert.ok(o,name);return o;};
const entry=([name,type,troops=3000])=>({id:person(name).id,type,troops,level:10,retreatAt:null});
const bestType=o=>['spear','halberd','cavalry','archer'].sort((a,b)=>o.aptitudes[b]-o.aptitudes[a]||Number(b===o.type)-Number(a===o.type))[0];
const recipes=[
 {id:'guan',slots:[0,5,3],team:[['关羽','spear',5000],['廖化','spear',1000],['周仓','halberd',1000],['乐进','spear',4000],['关平','spear',4000],['满宠','halberd',3000]]},
 {id:'zhou',slots:[0,2,1],team:[['周瑜','archer',5000],['黄盖','archer',3000],['曹洪','spear',4000],['陈群','spear',1000],['徐邈','archer',1000],['满宠','archer',4000]]},
 {id:'reserve',team:[['周仓','halberd',2000],['廖化','spear',2000],['邓芝','archer',2000],['严颜','archer',2000],['吴懿','spear',2000],['满宠','halberd',1000],['关羽','spear',4000],['黄忠','longbow',3000]]},
];
const foes={stars:['曹操','赵云','张飞','诸葛亮','陆逊','孙策'],yuan:['袁绍','颜良','文丑','张郃','沮授','田丰']};
const cases=[];
if(suite==='history')for(const history of (args.histories||'xiapi,guandu,chibi,hefei,yiling,wuzhang').split(','))for(const swap of [false,true])for(const policy of (args.policies||'all-ai,react,none').split(','))for(const seed of seeds){
 let draft=historicalBattleDraft(history);if(swap)draft=swapCustomBattle(draft);draft.seed=seed;
 if(args.map){draft.mapId=args.map;draft.terrain='land';}
 cases.push({id:`${history}-${swap}-${seed}-${policy}`,group:history,swap,side:0,seed,policy,draft});
}
else for(const recipe of recipes.filter(r=>suite==='reserve'?r.id==='reserve':r.id!=='reserve'))for(const [enemy,names] of Object.entries(foes))for(const mapId of (args.maps||'plain-open,hill-pass,river-harbor').split(','))for(const side of [0,1])for(const seed of seeds)for(const policy of suite==='reserve'?['core-first','wait','rotate']:['all-ai','formation']){
 const team=recipe.team.map(entry),foe=names.map(n=>entry([n,bestType(person(n))]));assert.equal(team.reduce((n,u)=>n+u.troops,0),18000);
 const draft={seed,mapId,terrain:mapId.startsWith('river')?'river':mapId.startsWith('hill')?'hill':'land',battleKind:'field',limit:480,shieldPercent:0,events:[],ownTeam:side?foe:team,enemyTeam:side?team:foe};
 cases.push({id:`${recipe.id}-${enemy}-${mapId}-${side}-${seed}-${policy}`,group:`${recipe.id}-${enemy}-${mapId}`,side,seed,policy,draft,recipe,team});
}
// Resume only the exact same frozen source and authored case matrix. Never
// mix partially completed results from another revision or budget.
const protocol={sourceHash:manifest.sourceHash,suite,seeds,casesHash:hash(JSON.stringify(cases)),retainInvalid:args['retain-invalid']==='true'};
const protocolPath=join(out,'audit-input.json');
if(existsSync(protocolPath))assert.deepEqual(JSON.parse(readFileSync(protocolPath)),protocol,'Resume inputs changed; use a new output directory');
else {assert.ok(!existsSync(join(out,'runs.jsonl')),'Unbound partial results cannot be resumed; use a new output directory');writeFileSync(protocolPath,JSON.stringify(protocol,null,2));}
const rows=existsSync(join(out,'runs.jsonl'))?readFileSync(join(out,'runs.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
function view(b){return {tick:b.tick,sides:b.sides.map(s=>({hp:s.units.reduce((n,u)=>n+u.hp,0),fighting:s.units.filter(u=>['active','reserve'].includes(u.status)).reduce((n,u)=>n+u.hp,0),casts:s.units.reduce((n,u)=>n+Object.values(u.tacticCasts).reduce((a,c)=>a+c,0),0),damage:s.units.reduce((n,u)=>n+(u.contribution.damage||0),0)})),units:b.sides.flatMap(s=>s.units.map(u=>({id:u.id,name:u.name,side:u.side,x:u.x,y:u.y,hp:u.hp,status:u.status,intent:u.intent,action:u.action,casts:u.skillCasts,damage:u.contribution.damage})))};}
function advance(state,c){
 const b=state.battle,all=['all-ai','formation'].includes(c.policy);E.stepBattle(b,{aiSides:all?[0,1]:[1-c.side],pauseForReinforcements:false});
 if(b.result||all||c.policy==='none')return;
 let order;
 if(c.policy==='react')order=humanOrder(b,{policy:'sustain'});
 else if((c.side?b.enemyCommand:b).commandProgress>=E.COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,E.battleStratagems(b,c.side),E.STRATAGEMS,c.side);if(key)order={key,point:chooseStratagemPoint(b,E.STRATAGEMS[key],c.side)};}
 if(order){const before=structuredClone(b),error=E.issueCommand(b,order.key,order.point,c.side);if(error){assert.deepEqual(b,before);return {tick:b.tick,key:order.key,error};}}
}
for(const c of cases){
 if(rows.some(r=>r.id===c.id))continue;
 const state=generateBattle(c.draft),b=state.battle;E.planBattleCouncilsAI(b,[0,1]);
 const validationErrors=[];
 const checked=stage=>{try{return E.validateSave(structuredClone(state));}catch(e){writeFileSync(join(out,'battles',c.id+'-invalid-'+stage+'.json'),JSON.stringify(state));if(args['retain-invalid']!=='true')throw e;validationErrors.push({stage,tick:b.tick,error:e.message});return null;}};
 if(c.policy==='formation'){
  const f=formationChoice(b,c.side);if(f){const cells=formationCells(b,c.side,f.id);for(const [i,index] of c.recipe.slots.entries())assert.equal(deployBattleUnit(b,c.team[index].id,cells[i].x,cells[i].y,c.side),null);}
 }else if(suite==='reserve'){
  for(const u of [...b.sides[c.side].units])assert.equal(E.reserveDeploymentUnit(b,u.id,null,c.side),null);
  const order=c.policy==='core-first'?[c.team[6],c.team[1],c.team[2],c.team[7],c.team[4],c.team[5],c.team[0],c.team[3]]:c.team;
  for(const u of order)assert.equal(E.reserveDeploymentUnit(b,u.id,null,c.side),null);
  const point=(x,y)=>c.side?{x:13-x,y:7-y}:{x,y};
  const positions=[[3,2],[3,4],[2,1],[2,5],[3,6],[3,3]];
  order.slice(0,6).forEach((u,i)=>{const p=point(...positions[i]);assert.equal(deployBattleUnit(b,u.id,p.x,p.y,c.side),null);});
  if(c.policy==='rotate')assert.equal(configureCouncilRetreat(b,c.team.slice(0,2).map(u=>u.id),1000,c.side),null);
  for(const u of order.slice(6))assert.equal(configureReserveEntry(b,u.id,point(4,['spear','halberd'].includes(u.type)?3:1),c.side),null);
 }
 assert.equal(E.lockDeployment(b),null);checked('start');writeFileSync(join(out,'battles',c.id+'-start.json'),JSON.stringify(state));
 const timeline=[view(b)],rejected=[];let copy=null,lastCast=0,checkpoint=false;
 while(!b.result){const rejection=advance(state,c);if(rejection)rejected.push(rejection);if(copy)assert.deepEqual(advance(copy,c),rejection);const now=view(b);if(now.sides.some((s,i)=>s.casts>timeline.at(-1).sides[i].casts))lastCast=b.tick;timeline.push(now);if(!checkpoint&&b.tick>=20){copy=checked('resume');checkpoint=true;}assert.ok(b.tick<=480);}
 if(copy)assert.deepEqual(copy.battle,b);checked('end');writeFileSync(join(out,'battles',c.id+'-end.json'),JSON.stringify(state));
 const row={id:c.id,group:c.group,side:c.side,swap:c.swap,seed:c.seed,policy:c.policy,win:b.result.winner===c.side,result:b.result,ticks:b.tick,tail:b.tick-lastCast,budget:b.sides.map(s=>s.units.reduce((n,u)=>n+u.initial,0)),remaining:timeline.at(-1).sides.map(s=>s.hp),deterministic:!!copy,validationErrors,rejected,timeline};rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');
 console.log(JSON.stringify({id:c.id,win:row.win,ticks:row.ticks,remaining:row.remaining,tail:row.tail}));
}
verify();const summary={rulesVersion:manifest.rulesVersion,sourceHash:manifest.sourceHash,harnessHash,suite,seeds,games:rows.length,deterministic:rows.filter(r=>r.deterministic).length,invalidSaves:rows.filter(r=>r.validationErrors?.length).length,scope:'Local paired diagnostic. Historical budgets unchanged; custom rosters have 18000 soldiers each, not equal training costs. all-ai and formation both use AI commands; formation only changes legal player deployment. react uses visible current-state humanOrder heuristic, not a human UI play session. Reserve policies keep player queue with fixed shared command triggers. All failures/draws retained; no win-rate gate.',groups:[]};
for(const key of [...new Set(rows.map(r=>JSON.stringify([r.group,r.side,r.swap,r.policy])))]){const [group,side,swap,policy]=JSON.parse(key),rs=rows.filter(r=>r.group===group&&r.side===side&&r.swap==swap&&r.policy===policy);summary.groups.push({group,side,swap,policy,n:rs.length,wins:rs.filter(r=>r.win).length,draws:rs.filter(r=>r.result.winner===null).length,ticks:rs.reduce((n,r)=>n+r.ticks,0)/rs.length,tail:rs.reduce((n,r)=>n+r.tail,0)/rs.length,remaining:rs.reduce((n,r)=>n+r.remaining[side],0)/rs.length});}
writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2));
