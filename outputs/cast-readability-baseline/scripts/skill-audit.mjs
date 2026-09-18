// Paired, deterministic experiments. All fixture edits stay in this process.
// Usage: node scripts/skill-audit.mjs [seeds=24] [output-directory] [comma-separated tactic/officer IDs]
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createScenario,SCENARIOS} from '../scenarios.mjs';
import {stepBattle,lockDeployment,makeOfficer} from '../engine.mjs';
import {TACTICS_BOOK,availableTactics,recommendedTacticIds,unitTactics,validLoadout} from '../tactics.mjs';
import {PASSIVES,SKILL_ROUTES,initialPassiveState} from '../passives.mjs';
import {SPECIAL_TACTICS} from '../tactics.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {commandTrial} from './calibrate-trials.mjs';

const seeds=Number(process.argv[2]||24);
const focus=process.argv[4]?new Set(process.argv[4].split(',')):null;
assert.ok(Number.isInteger(seeds)&&seeds>0);
const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,process.argv[3]||`docs/skill-audit-v${RULES_VERSION}`);
mkdirSync(out,{recursive:true});
const files=['engine.mjs','tactics.mjs','passives.mjs','famous-officers.mjs','unit-stats.mjs','relationships.mjs','combat-rules.mjs','scenarios.mjs','scenario-catalog.mjs','officer-catalog.mjs','data/officers.mjs','scripts/skill-audit.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(resolve(root,f))).digest('hex')]));
const sourceHashes=hashes(),routes=structuredClone(SKILL_ROUTES);
const template=createScenario('field',1).battle;
const raw=[],mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const round=n=>Math.round(n*1000)/1000;
const positions={compact:[[4,3],[4,4],[3,3],[3,4],[2,3],[2,4]],spread:[[4,0],[4,3],[4,6],[2,0],[2,3],[2,6]]};
const primary={spear:['strike','phalanx','thrust'],cavalry:['valor','rush','harass'],archer:['scatter','fire','suppress'],crossbow:['pierce','repeat','seal']};
const types=Object.keys(primary);

function fixture(type,profile,layout,officer=null){
  const b=structuredClone(template);
  b.maxTicks=240;b.relationshipScores={};b.relationshipTypes={};b.seed=1;
  const focal=type==='archer'||type==='crossbow'?4:0;
  for(let side=0;side<2;side++){
    b.sides[side].tactic='steady';b.sides[side].commanders=[];
    b.sides[side].units=Array.from({length:6},(_,i)=>{
      const id=`audit-${side}-${i}`,t=i===focal?type:['spear','spear','cavalry','crossbow','archer','crossbow'][i];
      const u=structuredClone(template.sides[0].units[0]);
      Object.assign(u,{id,name:id,type:t,skillRouteType:t,side,level:10,leadership:80,force:80,intellect:80,politics:80,
        hp:3000,maxHp:3000,initial:3000,troops:3000,commandBonus:0,deputyBonus:0,advisorBonus:0,
        intent:0,cooldown:0,attackCarry:0,status:'active',statuses:{},skillReady:{},tacticCasts:{},skillCasts:0,
        passiveState:initialPassiveState(),morale:80});
      if(i===focal){
        u.force=profile==='physical'?95:40;u.intellect=profile==='physical'?40:95;
        if(officer){for(const key of ['leadership','force','intellect','politics'])u[key]=officer[key];}
      }
      SKILL_ROUTES[id]=i===focal&&officer?[...routes[officer.id]]:[];
      if(i===focal&&officer&&SPECIAL_TACTICS[officer.id])SPECIAL_TACTICS[id]=SPECIAL_TACTICS[officer.id];else delete SPECIAL_TACTICS[id];
      u.tactics=i===focal&&officer?recommendedTacticIds(officer):[...primary[t]];
      const [x,y]=positions[layout][i];Object.assign(u,side?{x:13-x,y:7-y}:{x,y});
      return u;
    });
  }
  return {b,focal};
}
function simulate(base,seed,side,focal,disabled=null,level=null,commands=false){
  const b=structuredClone(base);b.seed=seed;
  const u=b.sides[side].units[focal];
  if(disabled)u.skillReady[disabled]=1e9;
  if(level!==null)u.level=level;
  let first=null,basic=0,direct=0,dot=0,activeTicks=0,lowIntentTicks=0;
  lockDeployment(b);
  while(!b.result){
    if(commands)commandTrial(b);
    if(u.status==='active')activeTicks++;
    if(b.sides[1-side].units.some(v=>v.status==='active'&&v.intent<Math.min(...unitTactics(v).map(s=>s.threshold))))lowIntentTicks++;
    stepBattle(b);
    if(u.skillCasts)first??=b.tick;
    for(const e of b.effects){
      if(e.from===u.id&&e.damage>0){if(e.skill)direct+=e.damage;else if(!e.text)basic+=e.damage;}
      if(e.text==='灼烧'){
        const victim=b.sides.flatMap(s=>s.units).find(v=>v.id===e.to);
        if(victim?.statuses.burn?.sourceId===u.id)dot+=e.damage;
      }
    }
    assert.ok(b.tick<=b.maxTicks);
    assert.ok(b.sides.every(s=>s.units.every(v=>Number.isFinite(v.hp)&&v.hp>=0&&v.intent>=0&&v.intent<=100)));
  }
  const remaining=b.sides.map(s=>s.units.reduce((n,v)=>n+v.hp,0));
  return {score:b.result.winner===null?.5:b.result.winner===side?1:0,margin:(remaining[side]-remaining[1-side])/18000*100,
    ticks:b.tick,remaining,casts:u.tacticCasts,first,basic,direct,dot,activeTicks,lowIntentTicks,combos:b.comboCounts};
}
function summarize(rows){
  const differences=rows.map(r=>r.on.margin-r.off.margin);
  // Pair both sides within each seed/context before estimating uncertainty.
  const clusters=new Map();
  for(const r of rows){const k=r.seed+':'+r.context;(clusters.get(k)||clusters.set(k,[]).get(k)).push(r.on.margin-r.off.margin);}
  const pairs=[...clusters.values()].map(mean),avg=mean(pairs);
  const se=pairs.length>1?Math.sqrt(pairs.reduce((s,x)=>s+(x-avg)**2,0)/(pairs.length-1)/pairs.length):0;
  return {pairs:rows.length,marginGainPP:round(mean(differences)),approx95: [round(avg-1.96*se),round(avg+1.96*se)],
    scoreGainPP:round(mean(rows.map(r=>r.on.score-r.off.score))*100),
    castMean:round(mean(rows.map(r=>r.kind==='tactic'?r.on.casts[r.key]||0:Object.values(r.on.casts).reduce((a,b)=>a+b,0)))),
    zeroCastPct:round(mean(rows.map(r=>r.kind==='tactic'?!(r.on.casts[r.key]>0):!Object.keys(r.on.casts).length))*100),
    seconds:round(mean(rows.map(r=>r.on.ticks))*.7)};
}
const tactics=[];
for(const [key,skill] of Object.entries(TACTICS_BOOK)){
  if(focus&&!focus.has(key))continue;
  const owner=Object.entries(SPECIAL_TACTICS).find(([id,s])=>routes[id]&&s===key)?.[0];
  const allowed=types.filter(type=>availableTactics({id:owner||'audit-pool',type}).some(s=>s.id===key));
  // Specials use their actual owner's default troop; shared low-intent skills test both troops.
  const tested=owner?[makeOfficer(owner).type]:allowed;
  const rows=[];
  for(const type of tested)for(const profile of ['physical','intellect'])for(const layout of ['compact','spread']){
    const {b,focal}=fixture(type,profile,layout);
    for(let side=0;side<2;side++){
      const u=b.sides[side].units[focal];
      if(owner)SPECIAL_TACTICS[u.id]=key;
      u.tactics=[key,...primary[type].filter(s=>s!==key).slice(0,2)];
      assert.ok(validLoadout(u,u.tactics));
    }
    for(let seed=1;seed<=seeds;seed++)for(let side=0;side<2;side++){
      const r={kind:'tactic',key,context:`${type}/${profile}/${layout}`,seed,side,
        on:simulate(b,seed,side,focal),off:simulate(b,seed,side,focal,key)};
      rows.push(r);raw.push(r);
    }
  }
  const row={id:key,name:skill.name,...summarize(rows),contexts:[...new Set(rows.map(r=>r.context))].map(context=>({context,...summarize(rows.filter(r=>r.context===context))}))};
  tactics.push(row);console.log('tactic',key,row.marginGainPP,row.castMean,row.zeroCastPct);
}
const passives=[];
for(const [id,route] of Object.entries(routes)){
  if(focus&&!focus.has(id))continue;
  const officer=makeOfficer(id),rows=[];
  for(const layout of ['compact','spread']){
    const {b,focal}=fixture(officer.type,'physical',layout,officer);
    for(let seed=1;seed<=seeds;seed++)for(let side=0;side<2;side++){
      const on=simulate(b,seed,side,focal);
      for(const [kind,level] of [['route',1],['ultimate',9]]){
        const r={kind,key:route[4],officer:id,context:layout,seed,side,on,off:simulate(b,seed,side,focal,null,level)};
        rows.push(r);raw.push(r);
      }
    }
  }
  const row={id,name:officer.name,type:officer.type,route:route.map(k=>PASSIVES[k].name),ultimate:PASSIVES[route[4]].name,
    routeResult:summarize(rows.filter(r=>r.kind==='route')),ultimateResult:summarize(rows.filter(r=>r.kind==='ultimate'))};
  passives.push(row);console.log('passive',row.name,row.ultimate,row.routeResult.marginGainPP,row.ultimateResult.marginGainPP);
}
// Restore fixture registries before running real, untouched scenarios.
for(const id of Object.keys(SKILL_ROUTES))if(id.startsWith('audit-'))delete SKILL_ROUTES[id];
for(const id of Object.keys(SPECIAL_TACTICS))if(id.startsWith('audit-'))delete SPECIAL_TACTICS[id];
const scenarios=[];
for(const config of (focus?[]:SCENARIOS))for(const mode of ['automatic','commands']){
  const results=[];
  for(let i=0;i<seeds;i++){
    const b=createScenario(config.id,config.seed+i).battle;
    lockDeployment(b);
    while(!b.result){if(mode==='commands')commandTrial(b);stepBattle(b);assert.ok(b.tick<=config.limit);}
    results.push({seed:config.seed+i,winner:b.result.winner,ticks:b.tick,reason:b.result.reason,
      units:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,name:u.name,side:u.side,level:u.level,hp:u.hp,casts:u.tacticCasts}))});
  }
  scenarios.push({id:config.id,name:config.name,mode,n:seeds,wins:results.filter(r=>r.winner===0).length,draws:results.filter(r=>r.winner===null).length,
    seconds:round(mean(results.map(r=>r.ticks))*.7),results});
  console.log('scenario',config.id,mode,scenarios.at(-1).wins+'/'+seeds);
}
assert.deepEqual(hashes(),sourceHashes,'Source changed during audit; rerun for a consistent result.');
const report={rulesVersion:RULES_VERSION,seeds,sourceHashes,officers:OFFICER_CATALOG.length,skilledOfficers:Object.keys(routes).length,
  actualBattles:raw.reduce((n,r)=>n+(r.kind==='ultimate'?1:2),0)+scenarios.length*seeds,
  methodology:'6v6, 3000 troops per unit, paired fixed seeds and both sides, two formations, no commands in marginal tests, ordinary relationship 50; tactic first slot on vs cooldown-disabled; passive same officer level10 vs1/9. Margin gain is percentage points of 18000 starting troops, not win rate. Approximate intervals are exploratory, not population confidence. Scenario commands benefit player side only.',
  tactics,passives,scenarios};
writeFileSync(resolve(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(resolve(out,'pairs.json.gz'),gzipSync(JSON.stringify(raw)));
console.log('DONE',report.actualBattles,out);
