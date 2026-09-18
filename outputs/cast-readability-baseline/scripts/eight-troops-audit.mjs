import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {world,fixture,officers,mean} from './balance-v14-lib.mjs';
import {materializeEightTroopsSnapshot} from './eight-troops-snapshot.mjs';
const w=await world(materializeEightTroopsSnapshot().dir),mode=process.argv[2]||'teams',tag=process.argv[3]||mode,out='docs/eight-troops-v16';
mkdirSync(out,{recursive:true});
const roles=Object.fromEntries(Object.entries(w.TACTIC_ROLES).flatMap(([type,rs])=>rs.map(r=>[type+'-'+r.id,{type,ids:r.ids,name:r.name}])));
const templates={
 fire:['spear-guard','archer-control','crossbow-assault'],
 care:['spear-guard','archer-control','crossbow-guard'],
 breach:['spear-control','cavalry-assault','archer-guard'],
 curse:['halberd-control','siege-control','logistics-guard'],
};
const groups={
 classic:['spear-guard','archer-control','crossbow-guard','spear-control','archer-control','crossbow-assault'],
 physical:['spear-assault','cavalry-assault','crossbow-assault','spear-guard','archer-assault','crossbow-guard'],
 curses:['halberd-control','siege-control','logistics-guard','spear-guard','archer-control','crossbow-assault'],
 illusions:['halberd-guard','archer-control','crossbow-assault','spear-guard','logistics-guard','archer-control'],
 passage:['spear-control','cavalry-assault','logistics-assault','spear-guard','cavalry-assault','crossbow-assault'],
 artillery:['spear-guard','siege-assault','siege-control','halberd-control','logistics-control','crossbow-assault'],
 medics:['spear-guard','archer-control','logistics-control','halberd-guard','crossbow-assault','logistics-guard'],
 counter:['halberd-assault','halberd-assault','archer-assault','spear-guard','logistics-guard','crossbow-assault'],
};
function unit(role,id,officer=null){const r=roles[role];return {...w.makeOfficer(officer||'person-99'),...(!officer?{id,name:id,leadership:80,force:80,intellect:80,politics:80,skillRouteType:r.type}:{}),type:r.type,tactics:r.ids,level:10};}
function team(list,side){return list.map((r,i)=>unit(r,side+'-'+i));}
// Fleet kits need a friendly ship for boarding and hostile ships for navalRam.
// The last two contexts deliberately retain shore opponents as counterexamples.
function fleetContext(left,context){
 left[2]=unit('ship-assault','ally-ship');
 const list=context==='fire'?['ship-assault','archer-control','ship-control']:context==='care'?['ship-guard','ship-control','logistics-guard']:templates[context];
 return team(list,'enemy');
}
function field(left,right,formation,seed,mirror){
 const b=fixture(w,left,right,formation,10,seed,mirror);
 if(b.sides.some(s=>s.units.some(u=>u.type==='ship'))){
  b.terrain='river';
  const land=formation==='compact'?[[4,2],[3,2],[3,1],[4,5],[3,5],[3,6]]:[[4,1],[2,0],[2,2],[4,6],[2,5],[1,7]],water=[[4,3],[3,4],[2,3],[2,4],[1,3],[1,4]];
  b.sides.forEach((s,side)=>{let l=0,n=0;s.units.forEach(u=>{const p=u.type==='ship'?water[n++]:land[l++];u.x=side?13-p[0]:p[0];u.y=side?7-p[1]:p[1];});});
 }
 return b;
}
function run(b,own,focalId){
 const focal=b.sides[own].units.find(u=>u.id===focalId);let damage=0,rearDamage=0,healing=0,absorbed=0,curseTicks=0,blightTicks=0,phaseRearDamage=0;
 w.lockDeployment(b);
 while(!b.result){w.stepBattle(b);assert.ok(b.tick<=240);
  for(const e of b.effects){const source=b.sides[own].units.find(u=>u.id===e.from),target=b.sides[1-own].units.find(u=>u.id===e.to);if(source&&target&&w.hasStatus(b,source,'phase')&&['archer','crossbow','logistics','siege'].includes(target.type))phaseRearDamage+=e.damage;if(source&&(!focal||e.from===focalId)){healing+=e.healing||0;absorbed+=e.absorbed||0;if(target){damage+=e.damage;if(['archer','crossbow','logistics','siege'].includes(target.type))rearDamage+=e.damage;}}}
  for(const u of b.sides[1-own].units){if(w.hasStatus(b,u,'curse'))curseTicks++;if(w.hasStatus(b,u,'blight'))blightTicks++;}
  const cells=new Set();for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active')){const key=u.x+','+u.y;assert.ok(!cells.has(key));cells.add(key);if(b.terrain==='river')assert.ok(u.type==='ship'?[3,4].includes(u.y):![3,4].includes(u.y)||[6,7].includes(u.x));}
 }
 const hp=s=>b.sides[s].units.reduce((n,u)=>n+u.hp,0),casts={};for(const u of b.sides[own].units)for(const [key,n]of Object.entries(u.tacticCasts))casts[key]=(casts[key]||0)+n;
 return {win:b.result.winner===null?.5:Number(b.result.winner===own),margin:hp(own)-hp(1-own),ticks:b.tick,timeout:Number(b.tick===240),damage,rearDamage,healing,absorbed,curseTicks,blightTicks,phaseRearDamage,remaining:focal?.hp??hp(own),casts:focal?.tacticCasts??casts};
}
const rows=[];
const seeds=[1601,1613],formations=['compact','spread'];
if(mode==='teams'||mode==='naval'){
 if(mode==='naval'){
  for(const key of Object.keys(groups))delete groups[key];
  const partners=['spear-guard','archer-control','logistics-guard','crossbow-assault'];
  Object.assign(groups,{strike:['ship-assault','ship-assault',...partners],escort:['ship-guard','ship-assault',...partners],control:['ship-control','ship-control',...partners],shore:['crossbow-assault','crossbow-guard',...partners]});
 }
 const keys=Object.keys(groups);
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++)for(const formation of formations)for(const seed of seeds)for(const mirror of [false,true]){
  const left=keys[i],right=keys[j];rows.push({left,right,formation,seed,mirror,...run(field(team(groups[left],'ally'),team(groups[right],'enemy'),formation,seed,mirror),mirror?1:0)});
 }
}else if(mode==='probes'){
 const cases={
  passage:{role:'logistics-assault',on:['supply','passage','purify'],off:['supply','bandage','purify'],allies:['spear-guard','cavalry-assault','archer-control','crossbow-assault','archer-control']},
  blight:{role:'halberd-control',on:['bulwark','curse','blight'],off:['bulwark','curse','cleave'],allies:['spear-guard','archer-control','crossbow-assault','logistics-guard','crossbow-guard']},
  mirage:{role:'halberd-guard',on:['bulwark','mirage','riposte'],off:['bulwark','cleave','riposte'],allies:['spear-guard','archer-control','crossbow-assault','logistics-guard','archer-control']},
 };
 for(const [key,c]of Object.entries(cases))for(const variant of ['on','off'])for(const context of ['classic','physical','curses','medics'])for(const formation of formations)for(const seed of [1601,1613,1663,1693])for(const mirror of [false,true]){
  const left=team(c.allies,'ally'),u={...unit(c.role,'focal'),tactics:c[variant]};left.splice(key==='passage'?2:0,0,u);
  rows.push({key,variant,context,formation,seed,mirror,...run(field(left,team(groups[context],'enemy'),formation,seed,mirror),mirror?1:0)});
 }
}else if(mode==='combinations'||mode==='fleet'){
 for(const type of mode==='fleet'?['ship']:Object.keys(w.TROOPS)){
  const pool=w.availableTactics({id:'generic',type}).map(s=>s.id);
  for(let i=0;i<4;i++)for(let j=i+1;j<5;j++)for(let k=j+1;k<6;k++)for(const context of Object.keys(templates))for(const formation of formations)for(const seed of seeds)for(const mirror of [false,true]){
   const ids=[pool[i],pool[j],pool[k]],u={...unit(type+'-assault','focal'),tactics:ids};
   const left=[unit('spear-guard','ally-front'),u,unit('crossbow-assault','ally-shooter')];
   if(['spear','halberd','cavalry'].includes(type))[left[0],left[1]]=[left[1],left[0]];
   const right=mode==='fleet'?fleetContext(left,context):team(templates[context],'enemy');
   rows.push({type,ids,context,formation,seed,mirror,...run(field(left,right,formation,seed,mirror),mirror?1:0,u.id)});
  }console.log(type,rows.length);
 }
}else if(mode==='officers'||mode==='fleet-officers'){
 for(const p of officers(w)){
  for(const role of Object.keys(roles).filter(key=>mode!=='fleet-officers'||key.startsWith('ship-')))for(const context of ['fire','care','curse'])for(const mirror of [false,true]){
   const u=unit(role,p.id,p.id),r=roles[role],left=[unit('spear-guard','ally-front'),u,unit('crossbow-assault','ally-shooter')];
   if(['spear','halberd','cavalry'].includes(r.type))[left[0],left[1]]=[left[1],left[0]];
   const right=mode==='fleet-officers'?fleetContext(left,context):team(templates[context],'enemy');
   rows.push({...p,type:r.type,role,context,mirror,...run(field(left,right,'compact',1627,mirror),mirror?1:0,u.id)});
  }console.log(p.name,rows.length);
 }
}else throw Error('unknown audit mode');
const metrics=rs=>Object.fromEntries(['win','margin','ticks','timeout','damage','rearDamage','healing','absorbed','curseTicks','blightTicks','phaseRearDamage','remaining'].map(k=>[k,mean(rs.map(r=>r[k]))]));
let summary;
if(['teams','naval'].includes(mode))summary=Object.keys(groups).map(key=>({key,name:key,games:rows.filter(r=>r.left===key||r.right===key).length,win:mean(rows.filter(r=>r.left===key||r.right===key).map(r=>r.left===key?r.win:1-r.win)),matchups:Object.fromEntries(Object.keys(groups).filter(k=>k!==key).map(other=>[other,mean(rows.filter(r=>r.left===key&&r.right===other||r.right===key&&r.left===other).map(r=>r.left===key?r.win:1-r.win))]))}));
if(['combinations','fleet'].includes(mode))summary=Object.keys(w.TROOPS).filter(type=>rows.some(r=>r.type===type)).map(type=>({type,builds:[...new Set(rows.filter(r=>r.type===type).map(r=>r.ids.join(',')))].map(key=>{const rs=rows.filter(r=>r.type===type&&r.ids.join(',')===key);return {ids:key.split(','),...metrics(rs),contexts:Object.fromEntries(Object.keys(templates).map(c=>[c,metrics(rs.filter(r=>r.context===c))]))};})}));
if(['officers','fleet-officers'].includes(mode))summary=officers(w).map(p=>({...p,roles:Object.keys(roles).filter(role=>rows.some(r=>r.id===p.id&&r.role===role)).map(role=>({role,...metrics(rows.filter(r=>r.id===p.id&&r.role===role))}))}));
if(mode==='probes')summary=['passage','blight','mirage'].map(key=>({key,variants:['on','off'].map(variant=>({variant,...metrics(rows.filter(r=>r.key===key&&r.variant===variant))}))}));
writeFileSync(`${out}/${tag}.json.gz`,gzipSync(JSON.stringify({mode,hashes:w.hashes,roles,templates,groups,rows})));
writeFileSync(`${out}/${tag}-summary.json`,JSON.stringify({mode,count:rows.length,summary},null,2));
console.log('complete',mode,rows.length);
