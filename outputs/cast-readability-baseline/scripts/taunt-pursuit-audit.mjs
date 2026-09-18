import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,mkdtempSync,cpSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve('.'),out=join(root,'docs/taunt-pursuit-v13');mkdirSync(out,{recursive:true});
const followup=process.argv.includes('--taunt-only');
const baseline=process.argv.slice(2).find(a=>!a.startsWith('--'))||readFileSync(join(out,'baseline-path.txt'),'utf8').trim();
const files=readdirSync(root).filter(p=>p.endsWith('.mjs'));
const hashes=dir=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(join(dir,p))).digest('hex')]));
const initialHashes=hashes(root),temp=mkdtempSync(join(tmpdir(),'sango-range-pursuit-'));
async function load(name){
  const dir=join(temp,name);mkdirSync(dir);const source=name==='before'?baseline:root;
  for(const p of files)cpSync(join(source,p),join(dir,p));cpSync(join(source,'data'),join(dir,'data'),{recursive:true});
  if(name!=='before'){
    let t=readFileSync(join(dir,'tactics.mjs'),'utf8');const range=Number(name.match(/[3456]/)?.[0]||5);
    const original="不附带减伤',5)";assert.ok(t.includes(original));t=t.replace(original,`不附带减伤',${range})`);
    if(name==='noPursuit')t=t.replace('export function pursuitTarget(b,u,enemies) {','export function pursuitTarget(b,u,enemies) { return null;');
    if(name==='noTaunt')t=t.replace("case 'taunt': {", "case 'taunt': { if(u.id.startsWith('audit-0-'))return null;");
    writeFileSync(join(dir,'tactics.mjs'),t);
  }
  const get=p=>import(pathToFileURL(join(dir,p)).href);
  return {name,...await get('engine.mjs'),...await get('tactics.mjs'),...await get('scenarios.mjs')};
}
const worlds={};for(const name of followup?['noTaunt']:['before','range3','range4','range5','range6','noPursuit'])worlds[name]=await load(name);
const specs={guard:['spear',['ward','cleanse','phalanx']],spear:['spear',['strike','thrust','phalanx']],rider:['cavalry',['rush','valor','gallop']],bow:['archer',['wildfire','scatter','fire']],bolt:['crossbow',['pierce','repeat','seal']],support:['crossbow',['screen','seal','ambush']],control:['spear',['doubt','thrust','ward']],controlBow:['archer',['smoke','rally','suppress']]};
const teams={spears:['spear','spear','spear'],riders:['rider','rider','rider'],ranged:['bow','bolt','bow'],fireline:['guard','bow','bolt'],balanced:['guard','bow','support'],supports:['guard','support','support'],doubleFront:['guard','spear','bow'],breach:['control','rider','controlBow']};
const labels={spears:'三枪',riders:'三骑',ranged:'纯远程',fireline:'一坦两输出',balanced:'坦克＋输出＋辅助',supports:'一坦两辅助',doubleFront:'双前排＋输出',breach:'控制突破'};
const seeds=[1009,1103,1201,1301,1409,1511,1601,1709,1801,1907,2003,2111];
const positions={compact:[[4,3],[3,2],[3,4]],spread:[[4,3],[2,0],[2,7]]};
function fixture(w,left,right,formation,level,seed,mirror){
  const b=w.createScenario('officer-lab',seed,0,['person-99','person-186','person-290']).battle;b.seed=seed;b.sides[1].units=b.sides[1].units.slice(0,3);
  b.sides.forEach((s,side)=>{s.tactic='steady';s.commanders=[];s.units.forEach((u,i)=>{
    const [type,ids]=specs[teams[side?right:left][i]],p=positions[formation][i];
    Object.assign(u,{id:`audit-${side}-${i}`,name:`${side?'乙':'甲'}${i+1}`,type,skillRouteType:type,leadership:85,force:85,intellect:85,politics:85,level,hp:3000,maxHp:3000,initial:3000,troops:3000,intent:0,cooldown:0,statuses:{},skillReady:{},tacticCasts:{},skillCasts:0,commandBonus:0,deputyBonus:0,advisorBonus:0,x:side?13-p[0]:p[0],y:side?7-p[1]:p[1]});
    assert.equal(w.configureTactics(u,ids),null);
  });});
  if(mirror){b.sides.reverse();b.sides.forEach((s,side)=>s.units.forEach(u=>{u.side=side;u.x=13-u.x;u.y=7-u.y;}));}
  return b;
}
function simulate(w,b,own){
  w.lockDeployment(b);const units=b.sides.flatMap(s=>s.units),byId=new Map(units.map(u=>[u.id,u])),dived=new Set();
  const rearBasic=[0,0],followup=[0,0],dives=[0,0],taunts=[0,0];let firstDive=null;
  while(!b.result){w.stepBattle(b);for(const e of b.effects){
    const from=byId.get(e.from),to=byId.get(e.to);if(!from||!to)continue;
    if(e.text==='突入后阵'){dives[from.side]++;dived.add(from.id);if(from.side===own)firstDive??=b.tick;}
    if(e.text==='挑衅 · 引战')taunts[from.side]++;
    if(from.type==='cavalry'&&from.side!==to.side&&['archer','crossbow'].includes(to.type)&&!e.skill&&e.damage>0){rearBasic[from.side]+=e.damage;if(dived.has(from.id))followup[from.side]+=e.damage;}
  }assert.ok(b.tick<=b.maxTicks);}
  const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),rear=s=>b.sides[s].units.slice(1).reduce((n,u)=>n+u.hp,0);
  return {win:b.result.winner===own?1:b.result.winner===null?.5:0,margin:hp(own)-hp(1-own),rearHp:rear(own),rearBasic:rearBasic[own],enemyRearBasic:rearBasic[1-own],followup:followup[own],enemyFollowup:followup[1-own],dives:dives[own],enemyDives:dives[1-own],taunts:taunts[own],firstDive,ticks:b.tick};
}
function run(w,left,right,formation,level,seed,mirror){return {world:w.name,left,right,formation,level,seed,mirror,...simulate(w,fixture(w,left,right,formation,level,seed,mirror),mirror?1:0)};}
const ranges=[],tournament=[],trial=[];
if(followup){
  const prior=JSON.parse(readFileSync(join(out,'audit.json'),'utf8'));assert.deepEqual(prior.sourceHashes,initialHashes);
  const tauntControl=[];
  for(const level of [1,10]){
    for(const left of ['fireline','balanced'])for(const right of Object.keys(teams))for(const formation of Object.keys(positions))for(const seed of seeds)for(const mirror of [false,true])tauntControl.push(run(worlds.noTaunt,left,right,formation,level,seed,mirror));
    console.log('taunt control',level,tauntControl.length);
  }
  assert.deepEqual(hashes(root),initialHashes);prior.tauntControl=tauntControl;prior.count=prior.ranges.length+prior.tournament.length+prior.trial.length+tauntControl.length;
  writeFileSync(join(out,'audit.json'),JSON.stringify(prior,null,2));console.log('complete',prior.count);
}else{
for(const name of ['range3','range4','range5','range6'])for(const level of [1,10]){
  for(const left of ['fireline','balanced'])for(const right of Object.keys(teams))for(const formation of Object.keys(positions))for(const seed of seeds)for(const mirror of [false,true])ranges.push(run(worlds[name],left,right,formation,level,seed,mirror));
  console.log('ranges',name,level,ranges.length);
}
const keys=Object.keys(teams);
for(const name of ['before','noPursuit','range5'])for(const formation of Object.keys(positions)){
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const seed of seeds)for(const mirror of [false,true])tournament.push(run(worlds[name],keys[i],keys[j],formation,10,seed,mirror));
  console.log('AI tournament',name,formation,tournament.length);
}
for(const name of ['before','noPursuit','range5'])for(const seed of seeds){
  const b=worlds[name].createScenario('breach',seed).battle;trial.push({world:name,seed,...simulate(worlds[name],b,0)});
}
assert.deepEqual(hashes(root),initialHashes,'Production modules changed during audit');
const count=ranges.length+tournament.length+trial.length;
writeFileSync(join(out,'audit.json'),JSON.stringify({count,seeds,sourceHashes:initialHashes,baselineHashes:hashes(baseline),specs,teams,labels,positions,ranges,tournament,trial},null,2));
console.log('complete',count);
}
