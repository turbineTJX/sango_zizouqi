import assert from 'node:assert/strict';
import {readFileSync,readdirSync,cpSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export async function world(source=resolve('.')){
  const dir=mkdtempSync(join(tmpdir(),'sango-balance14-')),hashes={};
  for(const f of readdirSync(source).filter(f=>f.endsWith('.mjs'))){cpSync(join(source,f),join(dir,f));hashes[f]=createHash('sha256').update(readFileSync(join(dir,f))).digest('hex');}
  cpSync(join(source,'data'),join(dir,'data'),{recursive:true});
  const modules=await Promise.all(['engine.mjs','scenarios.mjs','tactics.mjs','passives.mjs','officer-catalog.mjs','famous-officers.mjs'].map(f=>import(pathToFileURL(join(dir,f)).href)));
  return Object.assign({dir,hashes},...modules);
}
export const specs={guard:['spear',['cleanse','phalanx','ward']],spear:['spear',['strike','thrust','phalanx']],rider:['cavalry',['rush','valor','gallop']],bow:['archer',['wildfire','scatter','fire']],bolt:['crossbow',['pierce','repeat','seal']],support:['crossbow',['screen','seal','ambush']],control:['spear',['doubt','thrust','ward']],controlBow:['archer',['smoke','rally','suppress']],flame:['archer',['fire','wildfire','smoke']],piercer:['crossbow',['pierce','repeat','screen']]};
export const teams={spears:['spear','spear','spear'],riders:['rider','rider','rider'],ranged:['bow','bolt','bow'],fireline:['guard','bow','bolt'],balanced:['guard','bow','support'],supports:['guard','support','support'],doubleFront:['guard','spear','bow'],breach:['control','rider','controlBow'],piercers:['guard','piercer','piercer'],flames:['control','flame','flame'],doubleControl:['control','controlBow','bolt']};
export const labels={spears:'三枪',riders:'三骑',ranged:'纯远程',fireline:'一坦两输出',balanced:'坦克＋输出＋辅助',supports:'一坦两辅助',doubleFront:'双前排＋输出',breach:'控制突破',piercers:'枪卫双破甲弩',flames:'控制火攻',doubleControl:'双控破甲'};
const positions={compact:[[4,3],[3,2],[3,4],[4,6],[3,5],[3,7]],spread:[[4,3],[2,0],[2,7],[4,5],[1,2],[1,6]]};
export function synthetic(w,role,id){const [type,ids]=specs[role];return {...w.makeOfficer('person-99'),id,name:id,type,skillRouteType:type,leadership:80,force:80,intellect:80,politics:80,tactics:ids};}
export function fixture(w,left,right,formation,level,seed,mirror=false){
  const b=w.createScenario('field',seed).battle;b.seed=seed;b.relationshipScores={};b.relationshipTypes={};
  b.sides.forEach((s,side)=>{const template=s.units[0];s.tactic='balanced';s.commanders=[];
    s.units=(side?right:left).map((entry,i)=>{
      const u={...structuredClone(template),...structuredClone(entry),side,level,hp:3000,maxHp:3000,initial:3000,troops:3000,battleDamage:0,healed:0,status:'active',morale:80,intent:0,cooldown:0,skillReady:{},tacticCasts:{},skillCasts:0,statuses:{},commandBonus:0,deputyBonus:0,advisorBonus:0,attackCarry:0,moveProgress:0,passiveState:w.initialPassiveState()};
      const p=positions[formation][i];u.x=side?13-p[0]:p[0];u.y=side?7-p[1]:p[1];assert.equal(w.configureTactics(u,entry.tactics),null);return u;
    });s.reserve=[];
  });
  if(mirror){b.sides.reverse();b.sides.forEach((s,side)=>s.units.forEach(u=>{u.side=side;u.x=13-u.x;u.y=7-u.y;}));}
  return b;
}
export function simulate(w,b,own=0,focalId=null){
  w.lockDeployment(b);const side=b.sides[own],focal=side.units.find(u=>u.id===focalId);let damage=0,alive=0;
  while(!b.result){if(focal?.status==='active')alive++;w.stepBattle(b);assert.ok(b.tick<=b.maxTicks);
    for(const e of b.effects)if(e.from===focalId&&b.sides[1-own].units.some(u=>u.id===e.to))damage+=e.damage;
  }
  const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0);
  return {win:b.result.winner===own?1:b.result.winner===null?.5:0,margin:hp(own)-hp(1-own),damage,remaining:focal?.hp??0,rearHp:hp(own)-(focal?.hp??0),alive,ticks:b.tick,casts:focal?.tacticCasts??{}};
}
export const ordinaryNames=['邓艾','孙坚','郝昭','郭淮','乐进','曹仁','庞德','高顺','马岱','田予','文聘','丁奉','王平','严颜','李严','陆抗','陈宫','满宠','荀彧','程昱','刘晔','简雍','韩浩','廖化'];
export function officers(w){return [...Object.keys(w.FAMOUS_OFFICERS),...ordinaryNames.map(name=>{const u=w.OFFICER_CATALOG.find(u=>u.name===name);assert.ok(u,name);assert.ok(!w.FAMOUS_OFFICERS[u.id],name);return u.id;})].map(id=>{
  const u=w.makeOfficer(id),p=w.OFFICER_BY_ID[id];
  // Ordinary scholars/supports have no assigned crossbow type in source data.
  // Offer the same legal troop change to them in both rule versions.
  if(!w.FAMOUS_OFFICERS[id]&&p.intellect>=65&&p.intellect>=p.force+15)u.type='crossbow';
  return {id,name:u.name,type:u.type,famous:!!w.FAMOUS_OFFICERS[id]};
});}
export function builds(w,g){const out=[];
  for(const role of ['assault','guard','control']){const ids=w.roleTacticIds(g,role);out.push({key:role,ids});if(w.SPECIAL_TACTICS[g.id])out.push({key:role+'Special',ids:[w.SPECIAL_TACTICS[g.id],...ids.slice(1)]});}return out;
}
export function focalTeam(w,g,ids){const u={...w.makeOfficer(g.id),type:g.type,tactics:ids},rear=['archer','crossbow'].includes(g.type);
  return rear?[synthetic(w,'guard','ally-guard'),u,synthetic(w,'bow','ally-bow')]:[u,synthetic(w,'bow','ally-bow'),synthetic(w,'bolt','ally-bolt')];
}
export const enemyTeam=(w,key,count=3)=>Array.from({length:count},(_,i)=>synthetic(w,teams[key][i%3],`enemy-${i}`));
export const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
export const stats=rs=>Object.fromEntries(['win','margin','damage','remaining','rearHp','alive','ticks'].map(k=>[k,mean(rs.map(r=>r[k]))]));
