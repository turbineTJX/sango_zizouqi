// Local gameplay diagnosis, never a delivery gate or a prescribed win rate.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,appendFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {generateBattle} from '../battle-generator.mjs';
import {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave} from '../engine.mjs';
import {deployBattleUnit} from '../battle-deployment.mjs';
import {formationCells,formationChoice} from '../bond-battlefield.mjs';
import {sideBondDetails} from '../bonds.mjs';
import {OFFICER_DESIGNS as O} from '../data/design/officers.mjs';
import {OFFICER_ASSIGNMENTS as A} from '../data/design/assignments.mjs';
import {BOND_ASSIGNMENTS as B} from '../data/design/bond-assignments.mjs';
import {BOND_DESIGNS as D} from '../data/design/bonds.mjs';
import {recommendArmyAppointments} from '../army-appointments.mjs';
import {trainingCost} from '../troop-training.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {refreshShield,shieldLayers} from '../tactics.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const phase=args.phase||'development',out=resolve(args.out||'work/synergy-vs-stars');
assert.ok(['development','validation'].includes(phase));
const seeds=phase==='development'?[75300101]:[86300101,86308020];
const person=name=>{const xs=Object.values(O).filter(u=>u.name===name);assert.equal(xs.length,1,name);return xs[0];};
const ordinary=u=>!A[u.id].specialTactic&&Math.max(u.leadership,u.force,u.intellect)<=85;
const bestType=u=>['spear','halberd','cavalry','archer'].sort((a,b)=>u.aptitudes[b]-u.aptitudes[a]||Number(b===u.type)-Number(a===u.type))[0];
const entry=([name,type,troops=3000])=>({id:person(name).id,type:type||bestType(person(name)),troops,level:10,retreatAt:null});
const enemies=[
 {id:'stars-a',names:['吕布','关羽','黄忠','周瑜','郭嘉','司马懿']},
 {id:'stars-b',names:['曹操','赵云','张飞','诸葛亮','陆逊','孙策']},
];
const recipes=[
 {id:'ordinary-armor',kind:'ordinary',core:'于禁',team:[['于禁','spear'],['田予','archer'],['诸葛诞','halberd'],['留赞','spear'],['胡烈','archer'],['朱异','halberd']],slots:[0,2,3]},
 {id:'ordinary-horse-counter',kind:'ordinary',core:'朱桓',team:[['朱桓','spear'],['程普','halberd'],['丁奉','spear'],['李典','halberd'],['孙桓','archer'],['邓芝','archer']],slots:[0,1,2]},
 {id:'ordinary-tiger',kind:'ordinary',core:'纪灵',team:[['纪灵','halberd',5000],['乐进','spear'],['关平','spear'],['臧霸','cavalry'],['凌操','halberd'],['曹休','archer',1000]],slots:[0,4,1]},
 {id:'mixed-lv',kind:'mixed',core:'吕布',team:[['吕布','halberd',5000],['乐进','spear'],['关平','spear'],['臧霸','cavalry'],['纪灵','halberd'],['曹休','archer',1000]],slots:[0,4,1]},
 {id:'mixed-guan',kind:'mixed',core:'关羽',team:[['关羽','spear',5000],['廖化','spear',1000],['周仓','halberd',1000],['乐进','spear',4000],['关平','spear',4000],['满宠','halberd',3000]],slots:[0,5,3]},
 {id:'mixed-zhou',kind:'mixed',core:'周瑜',team:[['周瑜','archer',5000],['黄盖','archer',3000],['曹洪','spear',4000],['陈群','spear',1000],['徐邈','archer',1000],['邓芝','archer',4000]],slots:[0,2,1]},
 {id:'ordinary-beauty',kind:'ordinary',core:'乐进',team:[['乐进','spear',5000],['关平','spear',5000],['貂蝉','archer',2000],['甄氏','archer',2000],['大乔','archer',2000],['小乔','archer',2000]],slots:[0,1,2]},
 {id:'mixed-lv-beauty',kind:'mixed',core:'吕布',team:[['吕布','halberd',5000],['乐进','spear',5000],['貂蝉','archer',2000],['甄氏','archer',2000],['大乔','archer',2000],['小乔','archer',2000]],slots:[0,1,2]},
 {id:'mixed-zhou-beauty',kind:'mixed',core:'周瑜',team:[['周瑜','archer',5000],['黄盖','halberd',5000],['貂蝉','archer',2000],['甄氏','archer',2000],['大乔','archer',2000],['小乔','archer',2000]],slots:[0,1,2]},
 {id:'ordinary-dragon',kind:'ordinary',core:'杨仪',team:[['杨仪','archer',5000],['黄盖','halberd',5000],['陆凯','archer',4000],['陈群','spear',1000],['程武','archer',1000],['吾粲','archer',2000]],slots:[0,1,2]},
 {id:'ordinary-dragon-bows',kind:'ordinary',core:'杨仪',team:[['杨仪','archer'],['黄盖','archer'],['陆凯','archer'],['陈群','archer'],['程武','archer'],['吾粲','archer']],slots:[0,1,2]},
];
const ablation=args.ablation==='1',modes=ablation?['arranged']:['default','arranged','incomplete'];
const files=['combat-rules.mjs','engine.mjs','bonds.mjs','bond-battlefield.mjs','battle-ai.mjs','tactics.mjs','tactic-aim.mjs','tactic-positioning.mjs','reserve-entry.mjs','unit-stats.mjs','data/design/bonds.mjs','data/design/bond-assignments.mjs','data/design/tactics.mjs','data/design/assignments.mjs','data/design/troops.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')]));
const sourceHashes=hashes(),rows=[],inputs=[];
mkdirSync(join(out,'battles'),{recursive:true});writeFileSync(join(out,'runs.jsonl'),'');
for(const r of recipes.filter(r=>!args.recipes||args.recipes.split(',').includes(r.id))){
 const team=r.team.map(entry),core=person(r.core);assert.equal(team.reduce((n,u)=>n+u.troops,0),18000);
 assert.equal(team.filter(u=>A[u.id].specialTactic).length,r.kind==='ordinary'?0:1);
 assert.ok(team.filter(u=>u.id!==core.id||r.kind==='ordinary').every(u=>ordinary(O[u.id])));
 for(const enemy of enemies){
  if(enemy.names.some(n=>team.some(u=>u.id===person(n).id)))continue; // Whole-battle identity uniqueness is mandatory.
  const foe=enemy.names.map(n=>entry([n]));assert.ok(foe.every(u=>A[u.id].specialTactic));
  const roles=units=>recommendArmyAppointments({units:units.map(u=>({...O[u.id],...u}))},{previous:{}});
  inputs.push({recipe:r.id,kind:r.kind,enemy:enemy.id,own:team,foe,trainingGold:[team,foe].map(t=>t.reduce((n,u)=>n+trainingCost(u.type,u.troops),0))});
  for(const seed of seeds)for(const side of [0,1])for(const mode of modes){
   const state=generateBattle({seed,mapId:'plain-open',terrain:'land',battleKind:'field',limit:480,shieldPercent:0,events:[],ownTroopBudget:18000,
    ownTeam:side?foe:team,enemyTeam:side?team:foe,ownTeamRoles:roles(side?foe:team),enemyTeamRoles:roles(side?team:foe)}),b=state.battle;
   planBattleCouncilsAI(b,[0,1]);
   const selected=formationChoice(b,side);
   if(mode!=='default'&&selected){
    const cells=formationCells(b,side,selected.id);for(const [slot,index]of r.slots.entries())assert.equal(deployBattleUnit(b,team[index].id,cells[slot].x,cells[slot].y,side),null);
    if(mode==='incomplete'){
     const free=[];for(let x=side?9:0;x<=(side?13:4);x++)for(let y=0;y<8;y++)if(!cells.some(p=>p.x===x&&p.y===y)&&!b.sides.flatMap(s=>s.units).some(u=>u.status==='active'&&u.x===x&&u.y===y))free.push({x,y});
     const moved=team[r.slots[2]],origin=cells[2];free.sort((a,c)=>Math.abs(a.x-origin.x)+Math.abs(a.y-origin.y)-Math.abs(c.x-origin.x)-Math.abs(c.y-origin.y)||a.x-c.x||a.y-c.y);
     assert.ok(free.some(p=>deployBattleUnit(b,moved.id,p.x,p.y,side)===null));
    }
   }
   const initial=b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,troops:u.initial,x:u.x,y:u.y})));
   assert.equal(lockDeployment(b),null);
   // Offline mechanism ablation only: keep the legal positions, remove just
   // the new shield layers. It is never presented as a player action.
   if(ablation)for(const army of b.sides)for(const u of army.units)refreshShield(b,u,shieldLayers(b,u).filter(l=>!l.source.startsWith('formation:')));
   const points=b.sides.map((s,i)=>sideBondDetails(b,i)),formation=b.sides.map((s,i)=>formationChoice(b,i)),openingShields=b.sides.map(s=>s.units.map(u=>({name:u.name,layers:shieldLayers(b,u).filter(l=>l.source.startsWith('formation:'))})));let copy=null;
   const stem=[r.id,enemy.id,seed,side,mode].join('-');writeFileSync(join(out,'battles',stem+'-start.json'),JSON.stringify(state));
   while(!b.result){stepBattle(b,{aiSides:[0,1],pauseForReinforcements:false});if(copy)stepBattle(copy.battle,{aiSides:[0,1],pauseForReinforcements:false});if(!copy&&b.tick===20)copy=validateSave(structuredClone(state));}
   assert.ok(copy);assert.deepEqual(copy.battle,b);validateSave(structuredClone(state));
   const total=i=>b.sides[i].units.reduce((n,u)=>n+u.hp,0),main=b.sides[side].units.find(u=>u.id===core.id);
   const row={recipe:r.id,kind:r.kind,enemy:enemy.id,seed,side,mode,win:b.result.winner===side,draw:b.result.winner===null,ownRemaining:total(side),enemyRemaining:total(1-side),marginPP:(total(side)-total(1-side))/18000*100,coreDamage:main.contribution.damage,ticks:b.tick,initial,points,formation,openingShields,replayChecked:true};
   rows.push(row);appendFileSync(join(out,'runs.jsonl'),JSON.stringify(row)+'\n');writeFileSync(join(out,'battles',stem+'-end.json'),JSON.stringify(state));
   console.log(JSON.stringify({recipe:r.id,enemy:enemy.id,seed,side,mode,win:row.win,marginPP:Math.round(row.marginPP)}));
  }
 }
}
const mean=xs=>xs.reduce((n,x)=>n+x,0)/xs.length;
const summary=inputs.flatMap(i=>modes.map(mode=>{const xs=rows.filter(r=>r.recipe===i.recipe&&r.enemy===i.enemy&&r.mode===mode);return {recipe:i.recipe,kind:i.kind,enemy:i.enemy,mode,games:xs.length,wins:xs.filter(r=>r.win).length,marginPP:mean(xs.map(r=>r.marginPP)),coreDamage:mean(xs.map(r=>r.coreDamage))};}));
assert.deepEqual(hashes(),sourceHashes,'Trial sources changed');
writeFileSync(join(out,'summary.json'),JSON.stringify({ablation,scope:'Local diagnosis only; no global win gate. Ordinary = no special tactic, leadership/force/intellect <=85; support officers with advanced bonds are allowed. Mixed = exactly one special-tactic officer and five such ordinary officers. Enemy = six actual special-tactic holders, individually suitable troop types, public AI councils and commands; naturally activated enemy bonds remain fully effective. 18000 real soldiers per side, same level and exact inputs within each placement pair; cross-roster training costs are recorded and are not asserted equal. Default, arranged and incomplete are legal placements; incomplete leaves one marked role vacant. All starts/results and deterministic continuations retained; no injected or removed bonds, free resources, future-seed access or forced outcomes. When ablation=true only, the new formation shield is explicitly removed offline at identical arranged positions; that run is not a legal player action.',rules:RULES_VERSION,phase,seeds,sourceHashes,inputs,summary,games:rows.length},null,2));
console.log(JSON.stringify({done:true,summary,games:rows.length}));
