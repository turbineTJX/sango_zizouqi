import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const label=process.argv[2]||'current';
const quick=process.argv.includes('--quick');
const root=resolve(process.argv[3]||'.');
const load=p=>import(pathToFileURL(resolve(root,p)));
const {generateBattle}=await load('battle-generator.mjs');
const {lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {unitTactics}=await load('tactics.mjs');
const {tacticUsesLeft}=await load('tactic-tempo.mjs');
const {HISTORICAL_BATTLES}=await load('data/design/historical-battles.mjs');
const {RULES_VERSION}=await load('combat-rules.mjs');
const {troopCapacity}=await load('troop-capacity.mjs');
const {OFFICER_BY_ID}=await load('officer-catalog.mjs');
const {customParticipants,swapCustomBattle}=await load('custom-battle.mjs');
const seeds={development:[961001],validation:[1061001]};
const cases=HISTORICAL_BATTLES.map(h=>({id:h.id,draft:h.draft}));
const teams=[['cao','spear'],['liao','cavalry'],['jia','crossbow'],['chu','halberd'],['yu','crossbow'],['yuanxia','archer']];
const foes=[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','crossbow'],['ju','crossbow'],['tian','archer']];
for(const allocation of ['equal','core']){
 const entries=team=>team.map(([id,type],i)=>({id,type,level:10,troops:allocation==='equal'?2500:i===0?5000:2000,retreatAt:null}));
 cases.push({id:'mixed-'+allocation,draft:{terrain:'land',battleKind:'field',limit:480,seed:961001,shieldPercent:0,waves:[],ownTeam:entries(teams),enemyTeam:entries(foes)}});
}
const rows=[];
function summarize(samples){
 const total=samples.length;
 return {samples:total,capped:total?samples.filter(x=>x.intent===100).length/total:0,mean:total?samples.reduce((n,x)=>n+x.intent,0)/total:0,exhausted:total?samples.filter(x=>x.exhausted).length/total:0,declines:samples.filter(x=>x.declined).length};
}
for(const c of cases)for(const level of quick?[10]:[1,5,10])for(const [batch,batchSeeds] of Object.entries(seeds).filter(([k])=>!quick||k==='development'))for(const seed of quick?batchSeeds.slice(0,1):batchSeeds)for(const swapped of [false,true]){
 let draft=structuredClone(c.draft);draft.seed=seed;
 // Both orientations use the same defeat/time-limit objective.
 draft.holdUntil=0;
 for(const u of customParticipants(draft)){u.level=level;u.troops=Math.min(u.troops,troopCapacity({...OFFICER_BY_ID[u.id],level}));}
 if(swapped)draft=swapCustomBattle(draft);
 const state=generateBattle(draft),b=state.battle;lockDeployment(b);
 const samples=[],gapSamples=[],casts=[],routEvents=[];let replay;
 while(!b.result){
  const prior=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,{intent:u.intent,casts:{...u.tacticCasts}}]));
  stepBattle(b,{pauseForReinforcements:false});if(replay)stepBattle(replay.battle,{pauseForReinforcements:false});
  for(const e of b.effects)if(e.label==='友军溃败')routEvents.push({tick:b.tick,fallen:e.from,recipient:e.to,loss:e.intentDrained});
  const active=b.sides.map(s=>s.units.filter(u=>u.status==='active'&&u.hp>0));
  for(const u of active.flat()){
   assert.ok(Number.isFinite(u.intent)&&u.intent>=0&&u.intent<=100);
   samples.push({tick:b.tick,intent:u.intent,exhausted:unitTactics(u).every(s=>tacticUsesLeft(u,s)===0),declined:u.intent<prior.get(u.id).intent});
  }
  for(const a of active[0])for(const d of active[1])gapSamples.push({tick:b.tick,gap:Math.abs(a.intent-d.intent)});
  for(const u of b.sides.flatMap(s=>s.units))for(const [id,count]of Object.entries(u.tacticCasts))if(count>(prior.get(u.id).casts[id]||0))casts.push({tick:b.tick,unit:u.id,id});
  if(b.tick===30&&seed===961001&&!swapped)replay=validateSave(structuredClone(state));
 }
 if(replay)assert.deepEqual(replay.battle,b);
 validateSave(state);
 const late=samples.filter(x=>x.tick>b.tick/2),lateGaps=gapSamples.filter(x=>x.tick>b.tick/2),afterStock=late.filter(x=>x.exhausted);
 rows.push({case:c.id,level,batch,seed,swapped,ticks:b.tick,winner:b.result.winner,reason:b.result.reason,draft,all:summarize(samples),late:summarize(late),afterStock:summarize(afterStock),lateDistinctShare:lateGaps.length?lateGaps.filter(x=>x.gap>=10).length/lateGaps.length:0,casts,routEvents,units:b.sides.map(s=>s.units.map(u=>({id:u.id,intent:u.intent,hp:u.hp,status:u.status,tacticCasts:u.tacticCasts,intentRoutApplied:u.intentRoutApplied})))});
}
function aggregate(rs){
 const weighted=(section,key)=>rs.reduce((n,r)=>n+r[section][key]*r[section].samples,0)/Math.max(1,rs.reduce((n,r)=>n+r[section].samples,0));
 return {games:rs.length,lateCappedShare:weighted('late','capped'),lateMean:weighted('late','mean'),lateExhaustedShare:weighted('late','exhausted'),afterStockCappedShare:weighted('afterStock','capped'),lateDistinctShare:rs.reduce((n,r)=>n+r.lateDistinctShare,0)/rs.length,casts:rs.reduce((n,r)=>n+r.casts.length,0),meanTicks:rs.reduce((n,r)=>n+r.ticks,0)/rs.length};
}
const summary={all:aggregate(rows),byLevel:Object.fromEntries([1,5,10].map(l=>[l,aggregate(rows.filter(r=>r.level===l))])),byBatch:Object.fromEntries(Object.keys(seeds).map(k=>[k,aggregate(rows.filter(r=>r.batch===k))]))};
const hashes=Object.fromEntries(['engine.mjs','combat-rules.mjs','passives.mjs','tactics.mjs','data/design/tactics.mjs','data/design/bonds.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const out=resolve('outputs/battle-intent');mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,label+'.json'),JSON.stringify({label,rulesVersion:RULES_VERSION,seeds,summary,hashes,rows},null,2)+'\n');
console.log(JSON.stringify({label,rulesVersion:RULES_VERSION,summary},null,2));
