// Optional local gameplay trial. It has no win-rate or delivery acceptance gate.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {generateBattle} from '../battle-generator.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {formationCells,formationChoice} from '../bond-battlefield.mjs';
import {OFFICER_CATALOG} from '../officer-catalog.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {BOND_DESIGNS} from '../data/design/bonds.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const out=resolve(args.out||'work/opening-formations-trial'),phase=args.phase||'development';
assert.ok(['development','validation'].includes(phase));
const seeds=phase==='development'?[73100101]:[84100101,84108020,84115939];
const id=name=>{const u=OFFICER_CATALOG.find(u=>u.name===name);assert.ok(u,name);return u.id;};
const entry=([name,type,troops])=>({id:id(name),type,troops,level:10,retreatAt:null});
const foe=[['袁绍','spear',3500],['颜良','cavalry',3500],['文丑','halberd',3500],['张郃','cavalry',3500],['沮授','archer',3500],['田丰','archer',3500]].map(entry);
const dragon=hero=>[[hero,'archer',5000],['黄盖','halberd',3000],['陈群','spear',1000],['程武','archer',3000],['秦宓','spear',3000],['吾粲','archer',3000]];
const cases=[
 {name:'tiger',core:'吕布',formation:'bondTigerFormation',team:[['吕布','cavalry',5000],['孙策','spear',3000],['臧霸','halberd',3000],['关平','spear',3000],['乐进','spear',3000],['曹休','archer',1000]],correct:[0,2,1],wrong:[5,0,1],roles:['吕布','乐进']},
 {name:'dragon-zhou',core:'周瑜',formation:'bondDragonFormation',team:dragon('周瑜'),correct:[0,4,1],wrong:[2,0,1],roles:['黄盖','周瑜']},
 {name:'dragon-lu',core:'陆逊',formation:'bondDragonFormation',team:dragon('陆逊'),correct:[0,4,1],wrong:[2,0,1],roles:['黄盖','陆逊']},
];
const ablation=args.ablation==='1',versions=ablation?['correct']:['default','correct','wrong'],rows=[];
const files=['combat-rules.mjs','engine.mjs','bonds.mjs','bond-battlefield.mjs','battle-ai.mjs','data/design/bonds.mjs','data/design/bond-assignments.mjs','tactics.mjs','data/design/tactics.mjs','tactic-positioning.mjs','reserve-entry.mjs','unit-stats.mjs','data/design/troops.mjs','data/design/assignments.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const sourceHashes=hashes();mkdirSync(join(out,'battles'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');
// Explicit mechanism ablation, not a legal player action or production ruleset.
const formationIds=['bondTigerFormation','bondDragonFormation'];
const originalSlots=formationIds.map(id=>structuredClone(BOND_DESIGNS[id].formationSlots));
if(ablation)for(const id of formationIds)for(const slot of BOND_DESIGNS[id].formationSlots)slot.values=slot.values.map(()=>0);
try{
for(const recipe of cases)for(const seed of seeds)for(const side of [0,1])for(const version of versions){
 const team=recipe.team.map(entry),roles={leader:id(recipe.roles[0]),advisor:id(recipe.roles[1])},enemyRoles={leader:id('袁绍'),advisor:id('沮授')};
 const draft={seed,terrain:'land',mapId:'plain-open',battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:side?21000:18000,
  ownTeam:side?foe:team,enemyTeam:side?team:foe,ownTeamRoles:side?enemyRoles:roles,enemyTeamRoles:side?roles:enemyRoles};
 const state=generateBattle(draft),b=state.battle;planBattleCouncilsAI(b,[0,1]);
 assert.equal(formationChoice(b,side).id,recipe.formation);
 if(version!=='default'){
  const marks=formationCells(b,side,recipe.formation);
  for(const [slot,index]of recipe[version].entries())assert.equal(deployBattleUnit(b,team[index].id,marks[slot].x,marks[slot].y,side),null);
 }
 const initial=b.sides[side].units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,x:u.x,y:u.y}));
 assert.equal(lockDeployment(b),null);const selected=structuredClone(formationChoice(b,side)),receipts=b.sides[side].units.map(u=>({name:u.name,entries:u.bondOpeningFormations}));
 const stem=[recipe.name,seed,side,version].join('-');writeFileSync(join(out,'battles',stem+'-start.json'),JSON.stringify(state));
 let copy=null,firstRout=null;
 while(!b.result){
  stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});if(copy)stepBattle(copy.battle,{aiSides:[0,1],pauseForReinforcements:false});
  if(!copy&&b.tick===20)copy=validateSave(structuredClone(state));
  if(!firstRout){const u=b.sides.flatMap(s=>s.units).find(u=>u.status==='defeated');if(u)firstRout={tick:b.tick,side:u.side,name:u.name};}
 }
 assert.ok(copy);assert.deepEqual(copy.battle,b);validateSave(structuredClone(state));
 const total=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),core=b.sides[side].units.find(u=>u.id===id(recipe.core));
 const row={case:recipe.name,seed,side,version,won:b.result.winner===side,draw:b.result.winner===null,ticks:b.tick,ownRemaining:total(side),enemyRemaining:total(1-side),marginPP:(total(side)-total(1-side))/18000*100,coreDamage:core.contribution.damage,coreCasts:core.tacticCasts,selected,receipts,initial,firstRout,replayChecked:true};
 rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',stem+'-end.json'),JSON.stringify(state));
 console.log(JSON.stringify({case:row.case,seed,side,version,won:row.won,marginPP:Math.round(row.marginPP),coreDamage:row.coreDamage}));
}
}finally{formationIds.forEach((id,i)=>BOND_DESIGNS[id].formationSlots=originalSlots[i]);}
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const summary=cases.flatMap(c=>versions.map(version=>{const xs=rows.filter(r=>r.case===c.name&&r.version===version);return {case:c.name,version,runs:xs.length,wins:xs.filter(r=>r.won).length,marginPP:mean(xs.map(r=>r.marginPP)),coreDamage:mean(xs.map(r=>r.coreDamage)),ownRemaining:mean(xs.map(r=>r.ownRemaining))};}));
assert.deepEqual(hashes(),sourceHashes,'Trial simulation sources changed');
writeFileSync(join(out,'summary.json'),JSON.stringify({rulesVersion:RULES_VERSION,ablation,scope:ablation?'Explicit offline mechanism ablation: the two new formation slot multipliers are set to zero only in this process; identical correct positions, seeds and real rosters to the production-rule comparison. Not a legal player action or a production ruleset. All outcomes and deterministic continuations retained.':'Local gameplay experiment, not a global acceptance requirement. All paired variants use the same real roster, levels, troop types, appointments and 18000 vs 21000 soldiers. Both sides retain public AI targeting, reserve selection and command timing. Only legal prebattle positions differ: default AI, correct recipient, wrong recipient. No injected resources, statuses, intent or outcomes. Every win/loss/draw and deterministic continuation is retained.',phase,seeds,sourceHashes,cases,summary,runs:rows.length},null,2));
console.log(JSON.stringify({done:true,summary,runs:rows.length}));
