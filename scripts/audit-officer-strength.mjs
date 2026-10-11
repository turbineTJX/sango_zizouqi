// Compare whole, lawful officer kits at identical soldier and training budgets.
// This diagnostic never changes game rules or grants unlearned abilities.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'outputs/officer-strength'),mode=args.mode||'team';
assert.ok(['single','team','combo'].includes(mode));
const load=file=>import(pathToFileURL(join(root,file)));
const {generateBattle}=await load('battle-generator.mjs');
const {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {OFFICER_DESIGNS:O}=await load('data/design/officers.mjs');
const {OFFICER_ASSIGNMENTS:A}=await load('data/design/assignments.mjs');
const {BOND_ASSIGNMENTS:B}=await load('data/design/bond-assignments.mjs');
const {TRAIT_DESIGNS:TR}=await load('data/design/traits.mjs');
const {TACTIC_DESIGNS:T}=await load('data/design/tactics.mjs');
const {BOND_DESIGNS:D}=await load('data/design/bonds.mjs');
const {STRATAGEM_DESIGNS:ST}=await load('data/design/stratagems.mjs');
const {sideBondDetails}=await load('bonds.mjs');
const {unitAttributes}=await load('unit-stats.mjs');
const {canOccupy}=await load('battlefield.mjs');
const {trainingCost}=await load('troop-training.mjs');
const {recommendArmyAppointments}=await load('army-appointments.mjs');
const {RULES_VERSION}=await load('combat-rules.mjs');
const seeds=args.pilot?[31800101]:[31011001,31018920,31026839,31034758];
const id=name=>{const u=Object.values(O).find(u=>u.name===name);assert.ok(u,name);return u.id;};
const picks=[['吕布','cavalry'],['曹操','spear'],['刘备','spear'],['关羽','spear'],['张飞','halberd'],['司马懿','spear'],['诸葛亮','archer'],['周瑜','archer'],['陆逊','archer'],['孙策','cavalry'],['孙权','halberd'],['赵云','cavalry'],['马超','cavalry'],['黄忠','archer'],['张辽','cavalry'],['郭嘉','archer'],['庞统','halberd']];
const references={spear:id('李典'),halberd:id('文聘'),cavalry:id('臧霸'),archer:id('蒋济')};
const excluded=new Set([...picks.map(([n])=>id(n)),...Object.values(references),id('高顺'),id('程昱')]);
const quality=u=>u.leadership+Math.max(u.force,u.intellect);
const ordinary=Object.values(O).filter(u=>!excluded.has(u.id)&&!A[u.id].specialTactic&&!A[u.id].stratagems.length&&!A[u.id].traits.some(t=>TR[t]?.domain==='battle')&&!Object.keys(B[u.id]||{}).some(b=>D[b].grade==='advanced'));
const helpers=ordinary.filter(u=>Math.max(u.leadership,u.force,u.intellect)<=75&&quality(u)>=120).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,5);
assert.equal(helpers.length,5);
const enemy=ordinary.filter(u=>!helpers.some(h=>h.id===u.id)&&Math.max(u.leadership,u.force,u.intellect)<=85&&quality(u)<=165).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,8);assert.equal(enemy.length,8);
const e=(officer,type=O[officer].type,troops=3000)=>({id:officer,type,troops,level:10,retreatAt:null});
const kinds=['spear','halberd','cavalry','archer'];
const best=o=>kinds.toSorted((a,b)=>o.aptitudes[b]-o.aptitudes[a]||Number(b===o.type)-Number(a===o.type)||kinds.indexOf(a)-kinds.indexOf(b))[0];
const recipes={
 '吕布':['吕布','赵云','典韦','许褚','马超','张辽'],
 '曹操':['曹操','李典','乐进','曹洪','程昱','满宠','毛玠','吕虔'],
 '刘备':['刘备','关羽','张飞',...helpers.slice(0,3).map(u=>u.name)],
 '关羽':['关羽','刘备','张飞',...helpers.slice(0,3).map(u=>u.name)],
 '张飞':['张飞','刘备','关羽',...helpers.slice(0,3).map(u=>u.name)],
 '诸葛亮':['诸葛亮','司马懿','郭嘉','贾诩','荀攸','庞统'],
 '司马懿':['司马懿','诸葛亮','郭嘉','贾诩','荀攸','庞统'],
 '周瑜':['周瑜','虞翻','阚泽','朱然','全琮','黄盖'],
 '陆逊':['陆逊','诸葛亮','司马懿','郭嘉','贾诩','荀攸'],
 '孙策':['孙策','夏侯渊','甘宁','马超','张辽','徐荣'],
 '孙权':['孙权','赵云','周泰','凌统','庞德','许褚'],
 '郭嘉':['郭嘉','曹操','司马懿','张辽','乐进','李典','许褚','荀攸'],
 '庞统':['庞统','周瑜','阚泽','朱然','全琮','黄盖']
};
const labels={'吕布':'勇武满档','曹操':'同预算八队编制','刘备':'桃园三人','关羽':'桃园三人','张飞':'桃园三人','诸葛亮':'深谋满档','司马懿':'深谋满档','周瑜':'火谋满档','陆逊':'深谋满档','孙策':'破军满档','孙权':'护卫军团','郭嘉':'带后备的谋士支援团','庞统':'火谋连环配合'};
function specs(){const result=[];for(const [name,type]of picks){
 const focal=id(name),reference=mode==='combo'&&name==='曹操'?id('陈兰'):references[type];
 if(mode==='combo'&&!recipes[name]||args.only&&!args.only.split(',').includes(name))continue;
 const eight=mode==='combo'&&recipes[name].length===8;
 const own=mode==='single'?[e(focal,type)]:mode==='team'?[e(focal,type),...helpers.map((u,i)=>e(u.id,kinds[i%4]))]:recipes[name].map((n,i)=>e(id(n),i?best(O[id(n)]):type,eight?2250:3000));
 assert.ok(!own.some(u=>u.id===reference),'Reference must not duplicate a teammate');
 for(const context of mode==='single'?['physical-opponent','mental-opponent']:[mode==='team'?'mixed-ordinary':labels[name]]){
  const opponents=mode==='combo'?ordinary.filter(u=>!helpers.some(h=>h.id===u.id)&&!own.some(v=>v.id===u.id)&&u.id!==reference&&Math.max(u.leadership,u.force,u.intellect)<=85&&quality(u)<=165).sort((a,b)=>quality(b)-quality(a)||a.id.localeCompare(b.id)).slice(0,8):enemy;
  const foe=mode==='single'?[e(id(context==='physical-opponent'?'高顺':'程昱'),type)]:opponents.slice(0,own.length).map((u,i)=>e(u.id,kinds[i%4],eight?2250:3000));
  result.push({name,focal,type,reference,context,draft:{terrain:'land',mapId:'plain-open',battleKind:'field',limit:480,seed:seeds[0],shieldPercent:0,gateHp:18000,ownTroopBudget:own.reduce((n,u)=>n+u.troops,0),ownTeam:own,enemyTeam:foe,events:[]}});
 }
}return result;}
function fight(spec,seed,swapped,control,replay){
 const input=structuredClone(spec.draft);input.seed=seed;if(control)input.ownTeam[0].id=spec.reference;
 // Use the shared role recommendation with no inherited template appointment.
 // A strategist must not be penalized by being the first row / default leader.
 for(const prefix of ['own','enemy'])input[prefix+'TeamRoles']=recommendArmyAppointments({units:input[prefix+'Team'].map(u=>({...O[u.id],...u}))},{previous:{}});
 if(swapped)for(const suffix of ['','Roles'])[input['ownTeam'+suffix],input['enemyTeam'+suffix]]=[input['enemyTeam'+suffix],input['ownTeam'+suffix]];input.ownTroopBudget=input.ownTeam.reduce((n,u)=>n+u.troops,0);
 const state=generateBattle(input),b=state.battle,side=Number(swapped),focal=control?spec.reference:spec.focal;
 planBattleCouncilsAI(b,[0,1]);assert.equal(lockDeployment(b),null);
 const opening={bonds:sideBondDetails(b,side),commanders:structuredClone(b.sides[side].commanders),units:b.sides[side].units.map(u=>({id:u.id,name:u.name,type:u.type,status:u.status,tactics:u.tactics,attributes:unitAttributes(u,b)}))};
 let copy=null;while(!b.result){stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length);
  for(const u of active)assert.ok(canOccupy(b,u,u.x,u.y)&&Number.isFinite(u.hp)&&u.hp<=u.maxHp);
  if(replay&&b.tick===20)copy=validateSave(structuredClone(state));assert.ok(b.tick<=b.maxTicks);
 }
 validateSave(state);if(copy)assert.deepEqual(copy.battle,b);
 const unit=b.sides[side].units.find(u=>u.id===focal),sum=units=>units.reduce((a,u)=>{for(const [key,n]of Object.entries(u.contribution))a[key]=(a[key]||0)+n;return a;},{});
 const ownRemaining=b.sides[side].units.reduce((n,u)=>n+u.hp,0),enemyRemaining=b.sides[1-side].units.reduce((n,u)=>n+u.hp,0),troops=(swapped?input.enemyTeam:input.ownTeam).reduce((n,u)=>n+u.troops,0);
 if(!control&&b.result.winner!==side)writeFileSync(join(out,'failures',spec.focal+'-'+spec.context+'-'+seed+'-'+Number(swapped)+'.json'),JSON.stringify(state));
 return {win:b.result.winner===side,draw:b.result.winner===null,result:b.result,ticks:b.tick,marginPP:(ownRemaining-enemyRemaining)/troops*100,ownRemaining,enemyRemaining,troops,trainingGold:(swapped?input.enemyTeam:input.ownTeam).reduce((n,u)=>n+trainingCost(u.type,u.troops),0),opening,
  focal:{id:unit.id,hp:unit.hp,status:unit.status,contribution:unit.contribution,casts:unit.tacticCasts,traitState:unit.traitState},team:sum(b.sides[side].units),others:sum(b.sides[side].units.filter(u=>u!==unit)),stratagemUses:b.sides[side].stratagemUses,replayChecked:!!copy};
}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/(xs.length||1),round=x=>Math.round(x*100)/100;
function summarize(ps){const deltas=new Map();for(const p of ps){const key=p.context+':'+p.seed;const v=deltas.get(key)||[];v.push(p.on.marginPP-p.off.marginPP);deltas.set(key,v);}
 const xs=[...deltas.values()].map(mean),gain=mean(xs),se=xs.length>1?Math.sqrt(xs.reduce((n,x)=>n+(x-gain)**2,0)/(xs.length-1)/xs.length):0;
 const contribution=(part,key)=>round(mean(ps.map(p=>(p.on[part].contribution?.[key]??p.on[part][key]??0)-(p.off[part].contribution?.[key]??p.off[part][key]??0))));
 return {pairs:ps.length,battles:ps.length*2,onWins:ps.filter(p=>p.on.win).length,offWins:ps.filter(p=>p.off.win).length,marginGainPP:round(gain),approx95:[round(gain-1.96*se),round(gain+1.96*se)],
  focalDamageGain:contribution('focal','damage'),othersDamageGain:contribution('others','damage'),teamHealingGain:contribution('team','healing'),teamProtectionGain:contribution('team','protection'),teamControlGain:contribution('team','control'),focalSurvival:ps.filter(p=>p.on.focal.hp>0).length,
  specialCasts:round(mean(ps.map(p=>p.on.focal.casts[A[p.focal].specialTactic]||0))),timeouts:ps.flatMap(p=>[p.on,p.off]).filter(r=>r.result.reason==='久战收兵').length,replays:ps.flatMap(p=>[p.on,p.off]).filter(r=>r.replayChecked).length};
}
mkdirSync(join(out,'failures'),{recursive:true});const cases=specs(),pairs=[],started=Date.now(),file=join(out,mode+'-pairs.jsonl');writeFileSync(file,'');
writeFileSync(join(out,mode+'-cases.json'),JSON.stringify({mode,rulesVersion:RULES_VERSION,seeds,level:10,source:root,cases},null,2));
for(const spec of cases){for(const seed of seeds)for(const swapped of [false,true]){
 const replay=!args.pilot&&seed===seeds[0]&&!swapped,on=fight(spec,seed,swapped,false,replay),off=fight(spec,seed,swapped,true,replay);
 assert.equal(on.troops,off.troops);assert.equal(on.trainingGold,off.trainingGold);const p={name:spec.name,focal:spec.focal,reference:spec.reference,mode,context:spec.context,seed,swapped,on,off};pairs.push(p);appendFileSync(file,JSON.stringify(p)+'\n');
}console.log(JSON.stringify({mode,name:spec.name,context:spec.context,battles:pairs.length*2,seconds:Math.round((Date.now()-started)/1000)}));}
const info=([name,type])=>{const u=O[id(name)],a=A[u.id];return {...u,testType:type,traits:a.traits.map(t=>({id:t,name:TR[t].name,description:TR[t].description})),bonds:Object.entries(B[u.id]||{}).map(([id,cap])=>({id,name:D[id].name,cap})),special:a.specialTactic?T[a.specialTactic]:null,stratagems:a.stratagems.map(id=>({id,name:ST[id].name}))};};
const report={mode,rulesVersion:RULES_VERSION,seeds,battles:pairs.length*2,level:10,source:root,scriptHash:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),scope:'Whole legal officer replacement, not an ability ablation or universal ranking. Same types, troops and training gold within each pair. Both armies use public AI council and combat rules. Combo replacements can lower bond tiers and alter appointments; different reference officers and teammates prevent direct cross-officer causal rankings. Neutral land battle only; no long-term economy or naval evaluation.',
 rows:picks.filter(([n])=>pairs.some(p=>p.name===n)).map(pick=>{const ps=pairs.filter(p=>p.name===pick[0]);return {name:pick[0],officer:info(pick),reference:O[ps[0].reference].name,all:summarize(ps),contexts:[...new Set(ps.map(p=>p.context))].map(context=>({context,...summarize(ps.filter(p=>p.context===context))}))};})};
writeFileSync(join(out,mode+'-summary.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({done:mode,battles:report.battles,seconds:Math.round((Date.now()-started)/1000)}));
