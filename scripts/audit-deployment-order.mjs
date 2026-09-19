// Paired audit: only the reserve selector differs; learning, deployment,
// commands, combat and seeds use the current real engine in both processes.
import {registerHooks} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const mode=process.argv[2]||'current';
if(!['current','fifo'].includes(mode))throw new Error('Use current or fifo');
if(mode==='fifo')registerHooks({load(url,context,nextLoad){
  if(url.endsWith('/engine.mjs')){
    const source=readFileSync(new URL(url),'utf8'),needle='side===1?rankEnemyReserves(b,waiting)[0]:waiting[0]';
    if(!source.includes(needle))throw new Error('FIFO comparison hook no longer matches');
    return {format:'module',shortCircuit:true,source:source.replace(needle,'waiting[0]')};
  }
  return nextLoad(url,context);
}});
const {newGame,makeOfficer,startBattle,fillSlots,lockDeployment,stepBattle,activeUnits,issueCommand,battleStratagems,STRATAGEMS,COMMAND_RESOURCE}=await import('../engine.mjs');
const {initializeTacticLearning}=await import('../tactic-learning.mjs');
const {planEnemyArmy,chooseEnemyCommand}=await import('../battle-ai.mjs');
const ids=['shao','yan','wen','he','ju','tian','gao','jin','yuanxia'];
const cases=[
  {id:'weak-first',types:['spear','archer','cavalry','spear','crossbow','cavalry','halberd','logistics','archer'],troops:[150,150,150,2600,2600,2600,2600,2600,2600]},
  {id:'rear-first',types:['archer','crossbow','archer','crossbow','archer','crossbow','spear','halberd','logistics']},
  {id:'balanced',types:['spear','cavalry','archer','logistics','halberd','crossbow','spear','archer','cavalry']},
  {id:'against-cavalry',types:['archer','crossbow','logistics','cavalry','archer','crossbow','spear','halberd','spear'],foe:['cavalry','cavalry','cavalry','cavalry','archer','logistics']},
  {id:'siege',types:['spear','cavalry','archer','logistics','halberd','crossbow','siege','siege','archer'],gate:true},
  {id:'river',types:['ship','ship','archer','logistics','halberd','crossbow','ship','spear','cavalry']},
];
const rows=[];
for(const fixture of cases)for(let index=0;index<16;index++){
  const seed=841100+index,s=newGame(seed),own=s.armies[0],enemy=s.armies[1];s.armies=[own,enemy];
  const make=(id,type,troops,i)=>{const u=makeOfficer(id,troops,i,5,seed);u.type=type;initializeTacticLearning(u,seed);return u;};
  own.units=['cao','dun','liao','chu','jia','yu'].map((id,i)=>make(id,(fixture.foe||['spear','halberd','cavalry','crossbow','archer','logistics'])[i],3000,i));
  enemy.units=ids.map((id,i)=>make(id,fixture.types[i],fixture.troops?.[i]??2000,i));
  for(const a of [own,enemy]){a.location='guandu';a.tactic='balanced';a.morale=80;}
  s.cities.find(c=>c.id==='guandu').garrison=0;
  s.pending={cityId:'guandu',attackerId:own.id,defenderIds:[enemy.id],origin:'xuchang',defenderFaction:'yuan'};
  startBattle(s,{deferEnemyDeployment:true});const b=s.battle;
  if(fixture.gate)b.siege={attackerSide:1,gate:{id:'siege-gate',type:'gate',side:0,name:'城门',x:0,y:7,hp:18000,maxHp:18000}};
  fillSlots(b,1);planEnemyArmy(b);
  const before=b.sides.map(side=>side.units.map(u=>({id:u.id,tactics:[...u.tactics],learning:structuredClone(u.tacticLearning)})));
  const starters=activeUnits(b,1).map(u=>({id:u.id,type:u.type,troops:u.hp}));
  lockDeployment(b);
  while(!b.result){
    if(b.commandProgress>=COMMAND_RESOURCE.capacity){const key=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(key)issueCommand(b,key);}
    stepBattle(b);
    if(b.sides.some(side=>side.units.filter(u=>u.status==='active').length>6))throw new Error('slot overflow');
  }
  const after=b.sides.map(side=>side.units.map(u=>({id:u.id,tactics:u.tactics,learning:u.tacticLearning})));
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('learning/loadout/initiative changed');
  const ratios=b.sides.map(side=>side.units.reduce((n,u)=>n+(['active','reserve'].includes(u.status)?u.hp:0),0)/side.units.reduce((n,u)=>n+u.initial,0));
  rows.push({case:fixture.id,seed,starters,winner:b.result.winner,ticks:b.tick,ratios,enemyCasts:b.sides[1].units.reduce((n,u)=>n+u.skillCasts,0),commands:b.enemyCommand.commandSerial});
}
const summary=cases.map(c=>{const rs=rows.filter(r=>r.case===c.id);return {case:c.id,games:rs.length,enemyWins:rs.filter(r=>r.winner===1).length,draws:rs.filter(r=>r.winner===null).length,averageEnemyRemaining:rs.reduce((n,r)=>n+r.ratios[1],0)/rs.length};});
const dir='docs/deployment-order-v41';mkdirSync(dir,{recursive:true});
writeFileSync(`${dir}/${mode}.json`,JSON.stringify({mode,seeds:'841100–841115',summary,rows},null,2)+'\n');
console.log(JSON.stringify({mode,games:rows.length,summary},null,2));
