import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createScenario} from '../scenarios.mjs';
import {makeOfficer,lockDeployment,stepBattle} from '../engine.mjs';
import {initialPassiveState} from '../passives.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {SPECIAL_TACTICS} from '../tactics.mjs';
const seeds=Number(process.argv[2]||16);
const disableSpecials=process.argv.includes('--without-specials');
assert.ok(Number.isInteger(seeds)&&seeds>0);
const teams={
 '魏军':['cao','dun','liao','chu','jia','yu'],
 '蜀军':['person-636','person-99','person-433','person-396','person-290','person-186'],
 '吴军':['person-368','person-371','person-246','person-603','person-662','person-119'],
 '群雄':['person-661','person-425','person-404','person-494','shao','yan'],
 '坚阵':['ju','tian','jin','yuanxia','he','gao'],
 '奇袭':['person-137','person-125','person-516','person-558','person-390','person-164'],
};
const files=['engine.mjs','tactics.mjs','passives.mjs','famous-officers.mjs','unit-stats.mjs','combat-rules.mjs','relationships.mjs','officer-catalog.mjs','data/officers.mjs','scripts/famous-team-audit.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const sourceHashes=hashes(),base=createScenario('field',1).battle,raw=[];
const names=Object.keys(teams),mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
for(let a=0;a<names.length;a++)for(let c=a+1;c<names.length;c++)for(let seed=1;seed<=seeds;seed++)for(let flip=0;flip<2;flip++){
 const pair=[names[a],names[c]],order=flip?[pair[1],pair[0]]:pair;
 const b=structuredClone(base);b.seed=seed;b.maxTicks=240;b.relationshipScores={};b.relationshipTypes={};
 for(let side=0;side<2;side++){
  const template=base.sides[side].units[0];b.sides[side].commanders=[];b.sides[side].tactic='balanced';
  b.sides[side].units=teams[order[side]].map((id,i)=>{
   const officer=makeOfficer(id),ranged=['archer','crossbow'].includes(officer.type);
   const x=ranged?2:4,y=[0,2,4,6,1,5][i];
   return {...structuredClone(template),...officer,side,level:10,hp:3000,initial:3000,maxHp:3000,morale:80,
    commandBonus:0,deputyBonus:0,advisorBonus:0,status:'active',intent:0,statuses:{},skillReady:disableSpecials?{[SPECIAL_TACTICS[id]]:1e9}:{},tacticCasts:{},
    skillCasts:0,cooldown:0,attackCarry:0,moveProgress:0,passiveState:initialPassiveState(),
    x:side?13-x:x,y:side?7-y:y};
  });
 }
 lockDeployment(b);
 while(!b.result){
  stepBattle(b);assert.ok(b.tick<=240);
  const live=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active');
  assert.equal(new Set(live.map(u=>u.x+':'+u.y)).size,live.length);
  for(const u of b.sides.flatMap(s=>s.units))assert.ok(Number.isFinite(u.hp)&&u.hp>=0&&u.hp<=3000&&u.intent>=0&&u.intent<=100);
 }
 const remaining=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0));
 raw.push({teams:order,seed,winner:b.result.winner===null?null:order[b.result.winner],ticks:b.tick,remaining,
  casts:b.sides.flatMap(s=>s.units).map(u=>({id:u.id,casts:u.tacticCasts}))});
}
assert.deepEqual(hashes(),sourceHashes);
const table=names.map(name=>{
 const games=raw.filter(r=>r.teams.includes(name)),wins=games.filter(r=>r.winner===name).length,draws=games.filter(r=>r.winner===null).length;
 return {name,ids:teams[name],games:games.length,wins,draws,scorePct:Math.round((wins+draws*.5)/games.length*10000)/100,
  seconds:Math.round(mean(games.map(r=>r.ticks))*.7*100)/100};
});
const out=new URL('../docs/famous-v9-teams/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL(disableSpecials?'without-specials.json':'summary.json',out),JSON.stringify({rulesVersion:RULES_VERSION,seeds,disableSpecials,sourceHashes,battles:raw.length,methodology:'Six predefined teams, round robin, 3000 troops and level10 per unit, no army bonuses or commands, mirrored sides per seed; win + half draw, fixed role-based formations. This is a sample of compositions, not all possible lineups.',table,raw},null,2)+'\n');
console.table(table.map(({ids,...r})=>r));console.log('Battles:',raw.length);
