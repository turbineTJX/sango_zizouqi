import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {generateBattle} from '../battle-generator.mjs';
import {swapCustomBattle} from '../custom-battle.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {assessCombatForce,estimateCombatLossFraction} from '../strategic-combat-assessment.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {sourceHash} from './basic-balance-lib.mjs';

// Offline calibration only. Runtime planning imports neither this script nor
// the battle generator/stepper. Development and validation use distinct rosters.
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const batch=args.batch||'development',out=resolve(args.out||`work/precombat-validation/${batch}`);
assert.ok(['development','validation'].includes(batch));await mkdir(out,{recursive:true});
const ids=batch==='development'?[['cao','liao','chu','jia','dun','yu','jin','yuanxia'],['shao','yan','wen','he','ju','tian','gao','person-72']]
 :[['person-636','person-99','person-433','person-396','person-516','person-186','person-368','person-226'],['person-290','person-246','person-1','person-2','person-3','person-4','person-5','person-6']];
const seeds=batch==='development'?[861001,861017]:[961003,961019];
const mixed=['spear','cavalry','halberd','archer','crossbow','spear','halberd','archer'];
const cases=[
 {id:'mixed-parity',types:[mixed,mixed],men:[3000,3000]},
 {id:'mixed-advantage',types:[mixed,mixed],men:[5000,2500]},
 {id:'borderline',types:[mixed,mixed],men:[3000,3500]},
 {id:'moderate',types:[mixed,mixed],men:[4000,3000]},
 {id:'counters',types:[['spear'],['cavalry']],men:[3000,3000]},
 {id:'ranged',types:[['archer','crossbow'],['spear','halberd']],men:[3000,3000]},
 {id:'forest',types:[['cavalry','spear','archer'],mixed],men:[4000,3000],terrain:'forest'},
 {id:'hill',types:[['crossbow','archer','spear'],mixed],men:[3000,3000],terrain:'hill'},
 {id:'marsh',types:[['cavalry','archer','halberd'],mixed],men:[3000,3000],terrain:'marsh'},
 {id:'low-level',types:[mixed,mixed],men:[2000,2000],levels:[1,1]},
 {id:'level-gap',types:[mixed,mixed],men:[3000,3000],levels:[1,10]},
 {id:'small-teams',types:[['archer','spear'],['cavalry','halberd']],men:[3000,3000],counts:[2,2]},
 {id:'reserves',types:[mixed,mixed],men:[3000,3000],counts:[8,4]},
 {id:'siege',types:[mixed,mixed],men:[5000,2000],kind:'siege',gateHp:6000},
 {id:'ridge-map',types:[mixed,mixed],men:[4000,3000],mapId:'plain-ridges'},
 {id:'stream-map',types:[mixed,mixed],men:[5000,2500],terrain:'forest',mapId:'forest-stream'},
 {id:'pass-map',types:[mixed,mixed],men:[3000,3000],terrain:'hill',mapId:'hill-pass'},
 {id:'dyke-map',types:[['archer','spear','halberd'],mixed],men:[4000,3000],terrain:'marsh',mapId:'marsh-dykes'},
];
const rows=[],hash=sourceHash();let assessmentMs=0,assessments=0;
for(const c of cases)for(const seed of seeds)for(const swapped of [false,true]){
 const team=i=>ids[i].slice(0,c.counts?.[i]||6).map((id,j)=>({id,type:c.types[i][j%c.types[i].length],troops:c.men[i],level:c.levels?.[i]||5,retreatAt:null}));
 let draft={seed,terrain:c.terrain||'land',...(c.mapId?{mapId:c.mapId}:{}),battleKind:c.kind||'field',gateHp:c.gateHp||6000,limit:480,shieldPercent:0,ownTeam:team(0),enemyTeam:team(1)};
 if(swapped)draft=swapCustomBattle(draft);
 const state=generateBattle(draft),b=state.battle,before=JSON.stringify(state),start=performance.now();
 const estimates=state.armies.map((a,i)=>assessCombatForce(a,{opponents:state.armies[1-i].units,terrain:draft.terrain}));
 assessmentMs+=performance.now()-start;assessments+=2;assert.equal(JSON.stringify(state),before);
 const attackSide=b.siege?.attackerSide??null,wall=c.kind==='siege'?(c.gateHp||6000)/6:0;
 const powers=estimates.map((e,i)=>e.power+(attackSide!==null&&i!==attackSide?wall:0));
 const ratio=powers[0]/powers[1],predictedWinner=ratio>=1?0:1;
 const losses=estimates.map((e,i)=>Math.ceil(e.men*estimateCombatLossFraction(powers[i],powers[1-i])));
 planBattleCouncilsAI(b,[0,1]);assert.equal(lockDeployment(b),null);
 let copy=null;
 while(!b.result){stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});if(!copy&&c.id==='mixed-advantage'&&seed===seeds[0]&&b.tick===24)copy=validateSave(structuredClone(state));}
 if(copy)assert.deepEqual(copy.battle,b);
 const actual=estimates.map((e,i)=>e.men-b.sides[i].units.reduce((n,u)=>n+u.hp,0));
 rows.push({case:c.id,batch,seed,swapped,terrain:draft.terrain,mapId:draft.mapId||null,kind:draft.battleKind,estimates,powers,ratio,predictedWinner,
  actualWinner:b.result.winner,correct:predictedWinner===b.result.winner,losses,actualLosses:actual,ticks:b.tick,reason:b.result.reason});
 console.log(JSON.stringify({case:c.id,seed,swapped,ratio:+ratio.toFixed(2),correct:predictedWinner===b.result.winner}));
}
assert.equal(sourceHash(),hash,'Source changed during calibration');
const decisive=rows.filter(r=>Math.max(r.ratio,1/r.ratio)>=1.5),accepted=rows.flatMap(r=>[0,1].filter(i=>r.powers[i]/r.powers[1-i]>=1.7).map(i=>({r,i})));
const winners=rows.filter(r=>[0,1].includes(r.actualWinner));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const summary={rulesVersion:RULES_VERSION,batch,sourceHash:hash,battles:rows.length,matchups:cases.length,correct:rows.filter(r=>r.correct).length,
 decisive:decisive.length,decisiveCorrect:decisive.filter(r=>r.correct).length,accepted:accepted.length,acceptedWon:accepted.filter(({r,i})=>r.actualWinner===i).length,
 winnerLossMAE:mean(winners.map(r=>Math.abs(r.losses[r.actualWinner]-r.actualLosses[r.actualWinner])/r.estimates[r.actualWinner].men)),
 winnerLossBias:mean(winners.map(r=>(r.losses[r.actualWinner]-r.actualLosses[r.actualWinner])/r.estimates[r.actualWinner].men)),
 assessmentMs:assessmentMs/assessments};
await writeFile(join(out,'report.json'),JSON.stringify({summary,rows},null,2));console.log(JSON.stringify(summary));
