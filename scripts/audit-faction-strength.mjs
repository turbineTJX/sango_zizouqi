// Offline faction main-army experiments; all battles use the public generator and AI.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=resolve(args.source||'.'),out=resolve(args.out||'outputs/faction-strength-20261011');
const load=file=>import(pathToFileURL(join(root,file)));
const {generateBattle}=await load('battle-generator.mjs');
const {swapCustomBattle,validateCustomBattle}=await load('custom-battle.mjs');
const {planBattleCouncilsAI,lockDeployment,stepBattle,validateSave,makeOfficer}=await load('engine.mjs');
const {nationalWorld,nationalRoster}=await load('national-scenarios.mjs');
const {OFFICER_BY_ID:O}=await load('officer-catalog.mjs');
const {highestAptitudeTroop}=await load('troop-choice.mjs');
const {recommendArmyAppointments}=await load('army-appointments.mjs');
const {trainingCost}=await load('troop-training.mjs');
const {canOccupy}=await load('battlefield.mjs');
const {sideBondDetails}=await load('bonds.mjs');
const {BATTLE_MAPS}=await load('data/design/battle-maps.mjs');
const {TROOPS}=await load('unit-stats.mjs');
const {RULES_VERSION,CAMPAIGN_TIME}=await load('combat-rules.mjs');
const recipes=[
 ['cao','曹操',['曹操','夏侯惇','夏侯渊','徐晃','许褚','郭嘉','曹仁','典韦']],
 ['force-2','刘备',['刘备','关羽','张飞','赵云','诸葛亮','庞统','姜维','法正']],
 ['force-3','江东（孙坚）',['孙坚','孙策','周瑜','陆逊','甘宁','吕蒙','周泰','鲁肃']],
 ['yuan','袁绍',['袁绍','颜良','文丑','审配','田丰','曲义','高览','许攸']],
 ['force-11','吕布',['吕布','张辽','高顺','陈宫','吕玲绮','貂蝉','侯成','曹性']],
 ['force-4','西凉（马腾）',['马腾','马超','庞德','马岱','马云𫘧','庞会','马休','马铁']],
 ['force-6','董卓',['董卓','华雄','徐荣','李儒','李傕','郭汜','樊稠','胡轸']],
 ['force-7','荆州（刘表）',['刘表','文聘','蔡瑁','蒯良','蒯越','黄祖','刘磐','张允']],
 ['force-5','益州（刘焉）',['张任','严颜','吴懿','黄权','孟达','刘𪻺','吴班','黄崇']],
 ['force-12','公孙瓒',['公孙瓒','田予','公孙越','公孙范','严纲','单经','田楷','公孙续']],
 ['force-16','司马懿',['司马懿','羊祜','杜预','司马师','司马昭','周旨','司马望','张春华']],
 ['force-29','黄巾（张角）',['张角','张宝','张梁','张燕','管亥','波才','韩暹','刘辟']],
];
const allRoster=nationalRoster('all-heroes-251',nationalWorld('all-heroes-251').cities);
const find=name=>{const u=Object.values(O).find(u=>u.name===name);assert.ok(u,'Unknown officer '+name);return u;};
const forces=recipes.map(([id,name,names])=>({id,name,officers:names.map(n=>{
 const u=find(n);assert.ok(allRoster.some(p=>p.id===u.id&&p.faction===id),'Officer belongs elsewhere: '+n);return u;
})}));
assert.equal(new Set(forces.flatMap(f=>f.officers.map(u=>u.id))).size,forces.length*8);
const modes=[
 {id:'main10',name:'满级六队主力',level:10,count:6,maps:['plain-open','forest-stream','hill-pass','river-crossing']},
 {id:'reserve10',name:'满级八队含后备',level:10,count:8,maps:['plain-open']},
 {id:'main5',name:'五级六队主力',level:5,count:6,maps:['plain-open']},
 {id:'cost10',name:'同兵种同编制费用',level:10,count:6,maps:['plain-open'],fixedTypes:true},
];
const seeds={development:[71101101],validation:[81101103,81109022,81116941,81124860]};
if(args['validation-count']){const n=Number(args['validation-count']);assert.ok(Number.isInteger(n)&&n>0&&n<=4);seeds.validation=seeds.validation.slice(0,n);}
const baseTypes=['spear','halberd','cavalry','archer'];
const costTypes=['spear','spear','halberd','cavalry','archer','archer'];
// Optimal aptitude assignment for one fixed six-unit troop mix, independent of opponents or seeds.
function fixedTypes(units){
 let best=null,bestScore=-Infinity;
 function search(i,left,types,score){
  if(i===units.length){if(score>bestScore){bestScore=score;best=types;}return;}
  for(const type of new Set(left)){
   const rest=[...left];rest.splice(rest.indexOf(type),1);
   const u=units[i],value=(u.aptitudes[type]||0)*100+Number(u.type===type);
   search(i+1,rest,[...types,type],score+value);
  }
 }
 search(0,costTypes,[],0);return best;
}
function team(force,mode,map){
 const officers=force.officers.slice(0,mode.count),types=mode.fixedTypes?fixedTypes(officers):officers.map(u=>highestAptitudeTroop(u,baseTypes));
 return officers.map((u,i)=>({id:u.id,type:types[i],troops:3000,level:mode.level,retreatAt:null,
  ...(map.terrain==='river'?{equipment:{siege:null,ship:'ship'}}:{})}));
}
const roles=entries=>recommendArmyAppointments({units:entries.map(u=>({...makeOfficer(u.id,u.troops,0,u.level),...u}))},{previous:{}});
const cases=[];
for(const mode of modes)for(const mapId of mode.maps)for(let i=0;i<forces.length;i++)for(let j=i+1;j<forces.length;j++){
 const a=forces[i],z=forces[j],map=BATTLE_MAPS[mapId],ownTeam=team(a,mode,map),enemyTeam=team(z,mode,map);
 const draft=validateCustomBattle({seed:seeds.development[0],battleKind:'field',terrain:map.terrain,mapId,limit:480,shieldPercent:0,
  ownTroopBudget:mode.count*3000,ownTeam,enemyTeam,ownTeamRoles:roles(ownTeam),enemyTeamRoles:roles(enemyTeam),events:[],reinforcements:[]});
 if(mode.fixedTypes)assert.equal(ownTeam.reduce((n,u)=>n+trainingCost(u,u.troops),0),enemyTeam.reduce((n,u)=>n+trainingCost(u,u.troops),0));
 cases.push({id:mode.id+'-'+mapId+'-'+a.id+'-'+z.id,mode:mode.id,mapId,a:a.id,z:z.id,draft});
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestPath=join(root,'..','manifest.json');
const manifest=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):null;
if(manifest)for(const [p,h] of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(root,p))),h,'Snapshot changed: '+p);
mkdirSync(out,{recursive:true});mkdirSync(join(out,'samples'),{recursive:true});
writeFileSync(join(out,'cases.json'),JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:manifest?.sourceHash,forces:forces.map(f=>({id:f.id,name:f.name,officers:f.officers.map(u=>({id:u.id,name:u.name,aptitudes:u.aptitudes}))})),modes,seeds,cases},null,2));
let selected=cases.filter(c=>!args.mode||args.mode.split(',').includes(c.mode));
if(args.pilot)selected=selected.filter(c=>c.mode==='main10').filter(c=>c.a==='cao'&&['force-2','force-3','force-11'].includes(c.z));
if(args.shard){const [index,total]=args.shard.split('/').map(Number);assert.ok(Number.isInteger(index)&&Number.isInteger(total)&&index>=0&&index<total);selected=selected.filter((_,i)=>i%total===index);}
const phases=Object.entries(seeds).filter(([p])=>!args.phase||args.phase===p);
assert.ok(selected.length&&phases.length);
const rowsPath=join(out,'battles.jsonl');writeFileSync(rowsPath,'');
const start=Date.now(),rows=[],sampled=new Set();
function fight(c,seed,swapped,phase,replay){
 let draft={...structuredClone(c.draft),seed};if(swapped)draft=swapCustomBattle(draft);
 const state=generateBattle(draft),b=state.battle;
 planBattleCouncilsAI(b,[0,1]);assert.equal(lockDeployment(b),null);
 validateSave(structuredClone(state));
 const opening=b.sides.map((s,i)=>({commanders:s.commanders,front:s.units.filter(u=>u.status==='active').map(u=>u.id),
  bonds:sideBondDetails(b,i),positions:s.units.map(u=>({id:u.id,type:u.type,status:u.status,x:u.x,y:u.y,tactics:u.tactics}))}));
 const aSide=Number(swapped),counts={commands:[{},{}],tactics:[{},{}],combo:[0,0],songIntent:[0,0],beautyDrain:[0,0]};
 const seenSerial=[0,0];let copy=null;
 const initialPath=join(out,'samples',c.id+'-initial.json');
 if(phase==='validation'&&seed===seeds.validation[0]&&!swapped&&c.a==='cao'&&!existsSync(initialPath))writeFileSync(initialPath,JSON.stringify(state));
 while(!b.result){
  stepBattle(b,{aiSides:[0,1]});if(copy)stepBattle(copy.battle,{aiSides:[0,1]});
  const active=b.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&u.hp>0);
  assert.equal(new Set(active.map(u=>u.x+','+u.y)).size,active.length,'Overlapping units');
  for(const u of active)assert.ok(canOccupy(b,u,u.x,u.y)&&Number.isFinite(u.hp)&&u.hp<=u.maxHp,'Invalid active unit');
  for(const side of [0,1]){
   const resource=side===0?b:b.enemyCommand;
   if(resource.commandSerial>seenSerial[side]){assert.equal(resource.commandSerial,seenSerial[side]+1);const key=resource.lastCommand.key;counts.commands[side][key]=(counts.commands[side][key]||0)+1;seenSerial[side]=resource.commandSerial;}
  }
  for(const e of b.effects){const s=b.sides.findIndex(s=>s.units.some(u=>u.id===e.from));if(s<0)continue;
   if(e.phase==='cast')counts.tactics[s][e.label]=(counts.tactics[s][e.label]||0)+1;
   if(e.combo)counts.combo[s]++;
   if(e.label==='战歌')counts.songIntent[s]+=e.intentGained||0;
   if(e.label==='倾国')counts.beautyDrain[s]+=e.intentDrained||0;
  }
  if(replay&&b.tick===20)copy=validateSave(structuredClone(state));
  assert.ok(b.tick<=b.maxTicks);
 }
 validateSave(state);if(copy)assert.deepEqual(copy.battle,b);
 const remaining=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0));
 const lost=remaining.map(n=>draft.ownTroopBudget-n);
 const units=b.sides.map(s=>s.units.map(u=>({id:u.id,name:u.name,type:u.type,initial:u.initial,remaining:u.hp,status:u.status,
  casts:u.tacticCasts,contribution:u.contribution})));
 const trainingGold=[draft.ownTeam,draft.enemyTeam].map(us=>us.reduce((n,u)=>n+trainingCost(u,u.troops),0));
 const row={caseId:c.id,mode:c.mode,mapId:c.mapId,a:c.a,z:c.z,phase,seed,swapped,aSide,result:b.result,ticks:b.tick,days:Math.ceil(b.tick/CAMPAIGN_TIME.stepsPerDay),
  remaining,lost,trainingGold,opening,counts,units,saveChecked:true,replayChecked:!!copy};
 const key=c.id+'-'+Number(swapped);
 if(phase==='validation'&&!sampled.has(key)){
  // One complete first-seed outcome per setup/start; every other result remains in JSONL.
  sampled.add(key);const savePath=join(out,'samples',key+'-result.json');writeFileSync(savePath,JSON.stringify(state));row.sample=relative(out,savePath);
 }
 return row;
}
for(const c of selected){
 for(const [phase,list] of phases)for(const seed of (args.pilot?list.slice(0,1):list))for(const swapped of [false,true]){
  const replay=phase==='validation'&&seed===seeds.validation[0]&&!swapped;
  const row=fight(c,seed,swapped,phase,replay);rows.push(row);appendFileSync(rowsPath,JSON.stringify(row)+'\n');
 }
 console.log(JSON.stringify({case:c.id,battles:rows.length,seconds:+((Date.now()-start)/1000).toFixed(1)}));
}
if(manifest)for(const [p,h] of Object.entries(manifest.hashes))assert.equal(sha(readFileSync(join(root,p))),h,'Snapshot changed: '+p);
writeFileSync(join(out,'run.json'),JSON.stringify({rulesVersion:RULES_VERSION,sourceHash:manifest?.sourceHash,seeds,modes,battles:rows.length,replays:rows.filter(r=>r.replayChecked).length,
 seconds:(Date.now()-start)/1000,source:root,selectedCases:selected.map(c=>c.id),pilot:!!args.pilot},null,2));
console.log(JSON.stringify({done:true,battles:rows.length,seconds:+((Date.now()-start)/1000).toFixed(1)}));
