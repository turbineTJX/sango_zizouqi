// Experiments run in isolated copies. Production rules and save data are untouched.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,mkdtempSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve('.'),out=join(root,'docs/zoc-balance-v12');mkdirSync(out,{recursive:true});
const followup=process.argv.includes('--followup');
const files=readdirSync(root).filter(p=>p.endsWith('.mjs'));
const hashes=()=>Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(join(root,p))).digest('hex')]));
const sourceHashes=hashes(),lab=mkdtempSync(join(tmpdir(),'sango-zoc-audit-'));
function replace(s,a,b){assert.ok(s.includes(a),'Missing experiment patch: '+a.slice(0,80));return s.replace(a,b);}
async function world(name){
  const dir=join(lab,name);mkdirSync(dir);
  for(const p of files)cpSync(join(root,p),join(dir,p));cpSync(join(root,'data'),join(dir,'data'),{recursive:true});
  if(name==='open'){
    let s=readFileSync(join(dir,'engagement.mjs'),'utf8');
    s=replace(s,"return isMelee(u)&&u.status==='active'","return false && isMelee(u)&&u.status==='active'");
    s=replace(s,'if(!isMelee(u))return enemies;','return enemies;');
    writeFileSync(join(dir,'engagement.mjs'),s);
  }
  if(name.startsWith('taunt')||name==='noWard'){
    let t=readFileSync(join(dir,'tactics.mjs'),'utf8'),e=readFileSync(join(dir,'engine.mjs'),'utf8');
    // Replace one equipped ward slot only on designated experimental casters.
    t=replace(t,'return ids.map(id=>TACTICS_BOOK[id]);',`return ids.map(id=>id==='ward'&&unit.labTaunt?{...TACTICS_BOOK[id],name:'挑衅',effect:'${name==='noWard'?'labNoop':'labTaunt'}',range:3}:TACTICS_BOOK[id]);`);
    t=replace(t,"'burn','scorch'];","'burn','scorch','labTaunt'];");
    t=replace(t,'export function tacticTarget(b,u,s,range) {',`export function labTauntPool(b,u,enemies,range,physical=true,charge=false) {
      const status=u.statuses?.labTaunt;
      if(!status||status.until<=b.tick)return enemies;
      const source=enemies.find(t=>t.id===status.sourceId&&t.status==='active'&&t.hp>0&&distance(u,t)<=range);
      if(!source||physical&&!meleeTargetPool(b,u,enemies).includes(source)||charge&&routeTo(b,u,source,3)===null)return enemies;
      return [source];
    }
    export function tacticTarget(b,u,s,range) {`);
    t=replace(t,'const enemies=living(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));',`let enemies=living(b,1-u.side).sort((a,c)=>distance(u,a)-distance(u,c)||a.id.localeCompare(c.id));
      const offensive=['confuse','harass','ambush','suppress','pierce','strike','thrust','scatter','wildfire','seal','lure','undermine','rush','terror','retreatShot','repeat','fire'].includes(s.effect)||s.effect==='famous'&&s.mode==='attack';
      if(offensive)enemies=labTauntPool(b,u,enemies,['rush','terror'].includes(s.effect)?4:(s.range??range),s.category==='force',['rush','terror'].includes(s.effect));`);
    t=replace(t,"case 'confuse': {",`case 'labNoop': return null;
    case 'labTaunt': return inRange.filter(e=>${name==='tauntMelee'?"['spear','cavalry'].includes(e.type)&&":''}!hasStatus(b,e,'labTaunt')).sort((a,c)=>Number(['archer','crossbow'].includes(c.type))-Number(['archer','crossbow'].includes(a.type))||c.intent-a.intent||idOrder(a,c))[0]||null;
    case 'confuse': {`);
    e=replace(e,"import {famousTargets,", "import {labTauntPool,famousTargets,");
    e=replace(e,'return meleeTargetPool(b,unit,[...activeUnits(b, 1 - unit.side), gateTarget(b,unit)].filter(Boolean)).filter', 'return labTauntPool(b,unit,meleeTargetPool(b,unit,[...activeUnits(b, 1 - unit.side), gateTarget(b,unit)].filter(Boolean)),attackRange(b,unit)).filter');
    e=replace(e,"case 'confuse':control", "case 'labTaunt':status(target,'labTaunt',4,{sourceId:u.id});signal(target,'挑衅');break;\n    case 'confuse':control");
    writeFileSync(join(dir,'tactics.mjs'),t);writeFileSync(join(dir,'engine.mjs'),e);
  }
  const load=p=>import(pathToFileURL(join(dir,p)).href);
  return {name,...await load('engine.mjs'),...await load('tactics.mjs'),...await load('scenarios.mjs')};
}
const worlds={};for(const name of ['zoc','open','tauntMelee','tauntAll','noWard'])worlds[name]=await world(name);
const templates={
  guard:{type:'spear',ids:['ward','cleanse','phalanx']},
  spear:{type:'spear',ids:['strike','thrust','phalanx']},
  rider:{type:'cavalry',ids:['rush','valor','gallop']},
  bow:{type:'archer',ids:['wildfire','scatter','fire']},
  bolt:{type:'crossbow',ids:['pierce','repeat','seal']},
  support:{type:'crossbow',ids:['screen','seal','ambush']},
  control:{type:'spear',ids:['doubt','thrust','ward']},
  controlBow:{type:'archer',ids:['smoke','rally','suppress']},
};
const teams={spears:['spear','spear','spear'],riders:['rider','rider','rider'],ranged:['bow','bolt','bow'],fireline:['guard','bow','bolt'],balanced:['guard','bow','support'],supports:['guard','support','support'],doubleFront:['guard','spear','bow'],breach:['control','rider','controlBow']};
const labels={spears:'三枪输出',riders:'三骑突击',ranged:'纯后排输出',fireline:'一坦两输出',balanced:'坦克＋输出＋辅助',supports:'一坦两辅助',doubleFront:'双前排＋输出',breach:'控制突破'};
const seeds=[1009,1103,1201,1301,1409,1511,1601,1709,1801,1907,2003,2111];
const formations={compact:[[4,3],[3,2],[3,4]],spread:[[4,3],[2,0],[2,7]]};
function fixture(w,left,right,formation,level,seed,mirror=false,named=false,size=3){
  const ids=['person-99','person-186','person-290','person-433','person-396','person-661'].slice(0,size);
  const b=w.createScenario('officer-lab',seed,0,ids).battle;
  b.sides[1].units=b.sides[1].units.slice(0,size);b.seed=seed;
  b.sides.forEach((s,side)=>{
    s.tactic='steady';s.commanders=[];
    s.units.forEach((u,i)=>{
      const spec=templates[teams[side?right:left][i%3]],pos=size===3?formations[formation][i]:(formation==='compact'?[[4,2],[3,1],[3,3],[4,5],[3,4],[3,6]]:[[4,2],[0,0],[0,2],[4,5],[0,5],[0,7]])[i];
      Object.assign(u,{id:named&&!side?u.id:`audit-${side}-${i}`,name:named&&!side?u.name:`${side?'乙':'甲'}${i+1}`,type:spec.type,skillRouteType:spec.type,level,hp:3000,maxHp:3000,initial:3000,troops:3000,intent:0,cooldown:0,statuses:{},skillReady:{},tacticCasts:{},skillCasts:0,commandBonus:0,deputyBonus:0,advisorBonus:0});
      if(!named||side)Object.assign(u,{leadership:85,force:85,intellect:85,politics:85});
      u.x=side?13-pos[0]:pos[0];u.y=side?7-pos[1]:pos[1];
      assert.equal(w.configureTactics(u,spec.ids),null);
      if(!side&&i===0&&(w.name.startsWith('taunt')||w.name==='noWard'))u.labTaunt=true;
    });
  });
  if(mirror){b.sides.reverse();b.sides.forEach((s,side)=>s.units.forEach(u=>{u.side=side;u.x=13-u.x;u.y=7-u.y;}));}
  assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===0));
  w.lockDeployment(b);return b;
}
function run(w,left,right,formation,level,seed,mirror,named=false,size=3){
  const b=fixture(w,left,right,formation,level,seed,mirror,named,size),own=mirror?1:0;
  const front=b.sides[own].units[0],rearIds=new Set(b.sides[own].units.slice(1).map(u=>u.id));
  let rearDamage=0,frontDamage=0,frontAlive60=0,tauntCasts=0;
  while(!b.result){
    if(front.hp>0&&b.tick<60)frontAlive60++;
    w.stepBattle(b);
    for(const e of b.effects){
      if(e.side!==own&&e.from!==e.to){if(rearIds.has(e.to))rearDamage+=e.damage;if(e.to===front.id)frontDamage+=e.damage;}
      if(e.from===front.id&&e.text==='挑衅')tauntCasts++;
    }
    assert.ok(b.tick<=b.maxTicks);
  }
  if(front.hp>0)frontAlive60=60;
  const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0);
  return {world:w.name,left,right,formation,level,seed,mirror,named,size,win:b.result.winner===own?1:b.result.winner===null?.5:0,margin:hp(own)-hp(1-own),rearHp:hp(own)-front.hp,rearDamage,frontDamage,frontAlive60,tauntCasts,ticks:b.tick};
}
// Candidate smoke checks run real automatic casts with legal loadouts and targets.
for(const name of ['tauntMelee','tauntAll']){
  const w=worlds[name],b=fixture(w,'fireline','ranged','compact',1,7),u=b.sides[0].units[0],enemy=b.sides[1].units[0];
  Object.assign(u,{x:4,y:3,intent:35});Object.assign(enemy,{x:6,y:3});
  const s=w.unitTactics(u)[0];assert.equal(s.effect,'labTaunt');
  w.stepBattle(b);
  assert.equal(!!enemy.statuses.labTaunt,name==='tauntAll');
  if(name==='tauntAll'){
    assert.equal(w.labTauntPool(b,enemy,b.sides[0].units,4)[0],u);
    u.hp=0;u.status='defeated';assert.equal(w.labTauntPool(b,enemy,b.sides[0].units,4).length,3);
  }
}
// Verify the injected selector on the actual attack path, not just its helper.
for(const name of ['tauntMelee','tauntAll']){
  const w=worlds[name],b=fixture(w,'fireline','ranged','compact',1,7);
  const [front,rear]=b.sides[0].units,attacker=b.sides[1].units[0];
  Object.assign(front,{x:4,y:3,intent:35});Object.assign(rear,{x:6,y:2,hp:300});
  Object.assign(attacker,{x:6,y:3,intent:0});
  w.stepBattle(b);
  const hit=b.effects.find(e=>e.from===attacker.id&&e.damage>0);
  assert.equal(hit?.to,name==='tauntAll'?front.id:rear.id,'Real ranged attack follows taunt only in all-target variant');
}
if(process.argv.includes('--smoke-only')){console.log('Isolated candidate cast and attack checks passed');process.exit(0);}
const rows=[],keys=Object.keys(teams);
if(!followup){
for(const name of ['zoc','open'])for(const level of [1,10])for(const formation of Object.keys(formations)){
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const seed of seeds)for(const mirror of [false,true])rows.push(run(worlds[name],keys[i],keys[j],formation,level,seed,mirror));
  console.log('tournament',name,level,formation,rows.length);
}
const taunts=[];
for(const name of ['zoc','tauntMelee','tauntAll'])for(const left of ['fireline','balanced']){
  for(const right of keys)for(const formation of Object.keys(formations))for(const level of [1,10])for(const seed of seeds)for(const mirror of [false,true])taunts.push(run(worlds[name],left,right,formation,level,seed,mirror));
  console.log('taunt',name,left,taunts.length);
}
const named=[];
for(const name of ['zoc','open'])for(const left of ['fireline','balanced','supports'])for(const right of keys)for(const seed of seeds)for(const mirror of [false,true])named.push(run(worlds[name],left,right,'compact',10,seed,mirror,true));
assert.deepEqual(hashes(),sourceHashes,'Production sources changed during audit');
writeFileSync(join(out,'audit.json'),JSON.stringify({count:rows.length+taunts.length+named.length,seeds,sourceHashes,teams,templates,labels,formations,rows,taunts,named},null,2));
console.log('complete',rows.length+taunts.length+named.length);
}else{
  const previous=JSON.parse(readFileSync(join(out,'audit.json'),'utf8'));
  assert.deepEqual(previous.sourceHashes,sourceHashes,'Baseline sources changed');
  const taunts=previous.taunts.filter(r=>r.world!=='noWard'),six=[];
  for(const left of ['fireline','balanced']){
    for(const right of keys)for(const formation of Object.keys(formations))for(const level of [1,10])for(const seed of seeds)for(const mirror of [false,true])taunts.push(run(worlds.noWard,left,right,formation,level,seed,mirror));
    console.log('no-ward',left,taunts.length);
  }
  for(const name of ['zoc','open'])for(const formation of Object.keys(formations)){
    for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const seed of seeds)for(const mirror of [false,true])six.push(run(worlds[name],keys[i],keys[j],formation,10,seed,mirror,false,6));
    console.log('six',name,formation,six.length);
  }
  assert.deepEqual(hashes(),sourceHashes,'Production sources changed during audit');
  const count=previous.rows.length+taunts.length+previous.named.length+six.length;
  writeFileSync(join(out,'audit.json'),JSON.stringify({...previous,taunts,six,count},null,2));
  console.log('complete',count);
}
