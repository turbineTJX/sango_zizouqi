import assert from 'node:assert/strict';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setPriority, getPriority, constants } from 'node:os';
import { run } from 'node:test';
import { readJSON, writeJSON, sha } from '../ai-validation/storage.mjs';
import { battleDraft, PROTOCOL, variantsFor } from './protocol.mjs';
import { installPolicyRouter } from './controllers.mjs';

const task=await readJSON(process.argv[2]);
setPriority(0,constants.priority.PRIORITY_LOW);
const load=file=>import(pathToFileURL(join(task.source,file)));
const sum=xs=>xs.reduce((s,x)=>s+x,0),mean=xs=>sum(xs)/xs.length;
async function tests(){
  const files=task.integration?PROTOCOL.integrationTests:PROTOCOL.requiredTests;
  const passed=[],failed=[],skipped=[];
  for await(const event of run({files:files.map(f=>join(task.source,f)),concurrency:1,isolation:'process'})){
    if(!['test:pass','test:fail'].includes(event.type))continue;
    const d=event.data,row={file:relative(task.source,d.file||'').replaceAll('\\','/'),name:d.name};
    if(d.skip||d.todo)skipped.push(row);
    else if(event.type==='test:fail')failed.push({...row,error:String(d.details?.error?.stack||d.details?.error)});
    else passed.push(row);
  }
  const missing=files.filter(f=>!passed.some(p=>p.file===f));
  return {kind:'tests',status:failed.length||skipped.length||missing.length?'failed':'passed',passed:passed.length,files,failed,skipped,missing};
}
async function battle(){
  const router=await installPolicyRouter({baselineRoot:task.baselineSource,candidateRoot:task.source});
  const get=router.load;
  const {generateBattle}=await get('battle-generator.mjs'),{swapCustomBattle}=await get('custom-battle.mjs');
  const E=await get('engine.mjs'),{canOccupy}=await get('battlefield.mjs');
  const {deployBattleUnit}=await get('battle-deployment.mjs');
  const {formationCells,formationChoice}=await get('bond-battlefield.mjs');
  const {sideCell}=await get('hex-grid.mjs');
  const {OFFICER_DESIGNS}=await get('data/design/officers.mjs'),{BATTLE_MAPS}=await get('data/design/battle-maps.mjs');
  const {trainingCost}=await get('troop-training.mjs');
  const outcomes=[],drafts=[];
  for(const variant of variantsFor(task.spec)){
    const draft=battleDraft(task.spec,task.seed,OFFICER_DESIGNS,BATTLE_MAPS,variant);drafts.push(draft);
    for(const swapped of [false,true]){
      const side=Number(swapped),controlledSide=task.spec.kind==='player'?1-side:side;
      router.select(task.side==='candidate'?controlledSide:null);
      const state=generateBattle(swapped?swapCustomBattle(draft):draft),b=state.battle;
      const stem=variant+'-'+side;
      try{
        E.planBattleCouncilsAI(b,[0,1]);
        const planned=structuredClone(b),seed=b.seed;
        E.planBattleCouncilsAI(b,[0,1]);assert.deepEqual(b,planned);assert.equal(b.seed,seed);
        if(variant==='arranged'){
          const choice=formationChoice(b,side);assert.ok(choice,'Player recipe must actually form a formation');
          const cells=formationCells(b,side,choice.id);
          for(const [slot,index]of task.spec.slots.entries()){
            assert.equal(deployBattleUnit(b,draft.ownTeam[index].id,cells[slot].x,cells[slot].y,side),null);
          }
        }
        if(task.spec.opponent==='spread'){
          const enemy=1-side,units=b.sides[enemy].units.filter(u=>u.status==='active');
          // A fixed visible pressure formation, not a seed-dependent search.
          for(const [i,u]of units.entries()){
            const wanted=sideCell({x:3,y:[0,7,1,6,2,5][i%6]},enemy);
            if(canOccupy(b,u,wanted.x,wanted.y))assert.equal(deployBattleUnit(b,u.id,wanted.x,wanted.y,enemy),null);
          }
        }
        const order=b.sides.map(s=>s.units.map(u=>u.id));
        assert.equal(E.lockDeployment(b),null);E.validateSave(structuredClone(state));
        await writeJSON(join(task.out,'start-'+stem+'.json'),state);
        let copy=null,staticTicks=0,maximumStaticTicks=0;
        const trace=[];
        const activity=()=>sha(JSON.stringify([b.siege?.gate?.hp,b.sides.map(s=>s.units.map(u=>[u.hp,u.x,u.y,u.status,u.intent,u.tacticCasts,u.contribution]))]));
        while(!b.result){
          const tick=b.tick,previous=activity();
          E.stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});
          if(copy)E.stepBattle(copy.battle,{aiSides:[0,1],pauseForReinforcements:false});
          assert.ok(b.tick>tick||b.result);assert.ok(b.tick<=b.maxTicks+1);
          const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);
          assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);
          for(const u of active){assert.ok(canOccupy(b,u,u.x,u.y));assert.ok(Number.isSafeInteger(u.hp)&&u.hp<=u.maxHp);}
          staticTicks=activity()===previous?staticTicks+1:0;maximumStaticTicks=Math.max(maximumStaticTicks,staticTicks);
          if(b.tick===24)copy=E.validateSave(structuredClone(state));
          if(b.tick%24===0||b.result)trace.push({tick:b.tick,sides:b.sides.map(s=>s.units.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp,status:u.status,casts:{...u.tacticCasts},contribution:{...u.contribution}})))});
        }
        if(copy)assert.deepEqual(copy.battle,b,'Deterministic continuation diverged');
        assert.deepEqual(b.sides.map(s=>s.units.map(u=>u.id)),order);
        E.validateSave(structuredClone(state));
        const initial=b.sides.map(s=>sum(s.units.map(u=>u.initial)));
        const remaining=b.sides.map(s=>sum(s.units.map(u=>u.hp)));
        outcomes.push({variant,swapped,controlledSide,winner:b.result.winner,mission:b.result.winner===side?1:0,
          draw:b.result.winner===null,reason:b.result.reason,ticks:b.tick,initial,remaining,
          remainingFraction:remaining[side]/initial[side],remainingMargin:remaining[side]/initial[side]-remaining[1-side]/initial[1-side],
          casts:b.sides.map(s=>sum(s.units.map(u=>sum(Object.values(u.tacticCasts))))),
          maximumStaticTicks,replay:copy?'checked':'ended-before-checkpoint',controllerCalls:router.diagnostics(),trace});
        await writeJSON(join(task.out,'end-'+stem+'.json'),state);
      }catch(error){await writeJSON(join(task.out,'failed-'+stem+'.json'),state);throw error;}
    }
  }
  const metric=variant=>{
    const rows=outcomes.filter(o=>o.variant===variant);
    return {missionRate:mean(rows.map(o=>o.mission)),remainingMargin:mean(rows.map(o=>o.remainingMargin)),
      remainingFraction:mean(rows.map(o=>o.remainingFraction)),ticks:mean(rows.map(o=>o.ticks)),
      timeoutRate:mean(rows.map(o=>o.reason==='久战收兵'?1:0))};
  };
  const variants=Object.fromEntries(variantsFor(task.spec).map(v=>[v,metric(v)]));
  const metrics={...variants[variantsFor(task.spec)[0]]};
  if(task.spec.kind==='advantage')Object.assign(metrics,{advantageMarginGain:variants['more-troops'].remainingMargin-variants.normal.remainingMargin,advantageMissionGain:variants['more-troops'].missionRate-variants.normal.missionRate});
  if(task.spec.kind==='player')Object.assign(metrics,{playerMarginLift:variants.arranged.remainingMargin-variants.default.remainingMargin,playerMissionLift:variants.arranged.missionRate-variants.default.missionRate,playerArrangedMission:variants.arranged.missionRate});
  return {kind:'battle',status:'passed',key:task.spec.id+':'+task.seed,seed:task.seed,spec:task.spec,
    sourceHash:task.sourceHash,engineHash:task.baselineHash,opponentHash:task.baselineHash,inputHash:sha(JSON.stringify(drafts)),
    controller:'one frozen engine; only designated AI side changes; player opening and command controller fixed',
    budgets:drafts.map(d=>[d.ownTeam,d.enemyTeam].map(t=>({troops:sum(t.map(u=>u.troops)),trainingGold:sum(t.map(u=>trainingCost(u.type,u.troops)))}))),
    outcomes,metrics,variants,priority:getPriority()};
}
try{
  assert.ok(['tests','battle'].includes(task.kind));
  const result=await(task.kind==='tests'?tests:battle)();
  await writeJSON(join(task.out,'result.json'),result);if(result.status!=='passed')process.exitCode=1;
}catch(error){await writeJSON(join(task.out,'result.json'),{kind:task.kind,status:'failed',error:error.stack});process.exitCode=1;}

