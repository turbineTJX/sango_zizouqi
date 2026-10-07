import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,battleStratagems,STRATAGEMS,issueCommand,validateSave} from '../engine.mjs';
import {chooseEnemyCommand} from '../battle-ai.mjs';
import {chooseStratagemPoint} from '../stratagem-area.mjs';
import {STRATAGEM_DESIGNS} from '../data/design/stratagems.mjs';
import {OFFICER_CATALOG as O,OFFICER_BY_ID as BY} from '../officer-catalog.mjs';
import {OFFICER_ASSIGNMENTS as A} from '../data/design/assignments.mjs';
import {sideBonds} from '../bonds.mjs';
import {TROOPS,unitAttributes} from '../unit-stats.mjs';
import {canOccupy} from '../battlefield.mjs';
import {trainingCost} from '../troop-training.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
export {O,BY,A,RULES_VERSION};
export const seeds={development:[861011,862019],validation:[961027,962033,963041,964043]};
export const famous=O.filter(o=>A[o.id]?.specialTactic||['典韦','许褚','徐晃','于禁','夏侯惇','夏侯渊','甘宁','乐进'].includes(o.name));
const primary=o=>Math.max(o.force,o.intellect),score=o=>o.leadership+primary(o);
export const ordinary=O.filter(o=>!A[o.id]?.specialTactic&&!famous.some(f=>f.id===o.id)&&Math.max(o.leadership,o.force,o.intellect)<=80&&primary(o)>=65);
export const aptitude=(o,type)=>o.aptitudes[TROOPS[type].family]??0;
export function controls(hero,type=hero.type){const mental=hero.intellect>hero.force;let pool=ordinary.filter(o=>aptitude(o,type)>=2&&(mental?o.intellect>=65:o.force>=65)).sort((a,b)=>score(a)-score(b)||a.id.localeCompare(b.id));if(pool.length<2)throw Error('No control pool for '+hero.name);return [pool[Math.floor((pool.length-1)*.5)],pool[Math.floor((pool.length-1)*.85)]];}
export function makeCase(hero,kind='duel',opponent=controls(hero)[0],replacement=hero,type=hero.type){
 const entry=(o,type)=>({id:o.id,type,troops:2000,level:5});
 let own=[entry(replacement,type)],enemy=[entry(opponent,type)],roles={};
 if(kind==='squad'){
  const excluded=new Set([...famous.map(o=>o.id),...controls(hero,type).map(o=>o.id),opponent.id,replacement.id]);
  const take=type=>{const pool=ordinary.filter(o=>!excluded.has(o.id)&&aptitude(o,type)>=2).sort((a,b)=>score(a)-score(b)||a.id.localeCompare(b.id));const o=pool[Math.floor((pool.length-1)*.65)];if(!o)throw Error('No squad role '+type);excluded.add(o.id);return entry(o,type);};
  const core=['spear','halberd','cavalry','archer','crossbow'].map(take);own.push(...core);enemy=[take(type),...['spear','halberd','cavalry','archer','crossbow'].map(take)];
  roles={ownTeamRoles:{leader:core[0].id,advisor:core[4].id},enemyTeamRoles:{leader:enemy[1].id,advisor:enemy[5].id}};
 }
 return {hero:hero.id,kind,control:opponent.id,focal:replacement.id,type,draft:{battleKind:'field',terrain:'land',limit:360,shieldPercent:0,waves:[],seed:seeds.development[0],ownTeam:own,enemyTeam:enemy,...roles}};
}
export function sourceHash(){const roots=['.', 'data/design','data'];const h=createHash('sha256');for(const dir of roots)for(const name of readdirSync(new URL('../'+dir+'/',import.meta.url)).filter(f=>f.endsWith('.mjs')).sort()){h.update(dir+'/'+name);h.update(readFileSync(new URL('../'+dir+'/'+name,import.meta.url)));}return h.digest('hex');}
export function simulate(spec,{level=5,seed=seeds.development[0],swapped=false,variant='default',trace=false,replay=false,disableTactics=[],observe=null}={}){
 const draft=structuredClone(spec.draft);draft.seed=seed;for(const key of ['ownTeam','enemyTeam'])for(const u of draft[key])u.level=level;
 if(variant==='commander')draft.ownTeamRoles={leader:spec.focal,advisor:spec.focal};
 if(variant==='advisor')draft.ownTeamRoles={...draft.ownTeamRoles,advisor:spec.focal};
 if(swapped)for(const suffix of ['','Roles','Tactic'])[draft['ownTeam'+suffix],draft['enemyTeam'+suffix]]=[draft['enemyTeam'+suffix],draft['ownTeam'+suffix]];
 const state=generateBattle(draft),b=state.battle,subject=swapped?1:0,diagnostic=variant!=='default'||disableTactics.length>0;
 if(variant.includes('bonds-off'))for(const u of b.sides.flatMap(s=>s.units))u.bondGrowth.levels={};
 if(variant.startsWith('mirror'))for(const [side,s]of b.sides.entries()){
  let front=0,rear=0;const rows=[3,5,1,6,2,4];for(const u of s.units){const ranged=['archer','crossbow','tower','siege'].includes(u.type);const row=ranged?rear++:front++;const x=ranged?1:3,y=rows[row];Object.assign(u,{x:side?13-x:x,y:side?7-y:y});if(!canOccupy(b,u,u.x,u.y))throw Error('Invalid mirrored deployment');}
 }
 lockDeployment(b);
 for(const id of disableTactics){const u=b.sides[subject].units.find(u=>u.id===spec.focal);u.skillReady[id]=b.maxTicks+1;}
 if(variant==='commands-off'||variant.endsWith('no-commands'))for(const resource of [b,b.enemyCommand])resource.commandReady=Object.fromEntries(Object.keys(STRATAGEMS).map(id=>[id,b.maxTicks+1]));
 if(variant==='exclusive-off'){const u=b.sides[subject].units.find(u=>u.id===spec.focal);if(A[u.id]?.specialTactic)u.skillReady[A[u.id].specialTactic]=b.maxTicks+1;}
 const initial=b.sides.map((s,i)=>({bonds:sideBonds(b,i),positions:s.units.map(u=>({id:u.id,x:u.x,y:u.y,tactics:u.tactics,attributes:unitAttributes(u,b)}))}));
 const events=[],metrics=Object.fromEntries(b.sides.flatMap(s=>s.units).map(u=>[u.id,{firstHit:null,firstCast:null,basicDamage:0,skillDamage:0,actions:{},casts:{}}]));let saved;
 while(!b.result){
  const cmd=chooseEnemyCommand(b,battleStratagems(b),STRATAGEMS,0);if(cmd){const point=chooseStratagemPoint(b,STRATAGEM_DESIGNS[cmd],0);issueCommand(b,cmd,point);if(saved)issueCommand(saved.battle,cmd,point);}
  observe?.(b,'before');stepBattle(b,{pauseForReinforcements:false});if(saved)stepBattle(saved.battle,{pauseForReinforcements:false});observe?.(b,'after');
  for(const u of b.sides.flatMap(s=>s.units)){const m=metrics[u.id];m.actions[u.action]=(m.actions[u.action]||0)+1;for(const [id,n]of Object.entries(u.tacticCasts))if(n>(m.casts[id]?.count||0)){m.firstCast??=b.tick;m.casts[id]={count:n,first:m.casts[id]?.first??b.tick,last:b.tick};}}
  for(const e of b.effects){const m=metrics[e.from];if(m&&e.damage>0){m.firstHit??=b.tick;m[e.skill?'skillDamage':'basicDamage']+=e.damage;}if(trace)events.push({tick:b.tick,...e});}
  if(replay&&b.tick===12&&!diagnostic)saved=validateSave(structuredClone(state));
  if(b.tick>b.maxTicks+1)throw Error('Nontermination');
 }
 if(!diagnostic){validateSave(state);if(saved&&JSON.stringify(saved.battle)!==JSON.stringify(b))throw Error('Replay mismatch');}
 const remaining=b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),total=draft.ownTeam.reduce((n,u)=>n+u.troops,0);
 return {hero:spec.hero,kind:spec.kind,control:spec.control,focal:spec.focal,type:spec.type,level,seed,swapped,variant,diagnostic,winner:b.result.winner,win:b.result.winner===subject,draw:b.result.winner===null,reason:b.result.reason,ticks:b.tick,remaining,margin:(remaining[subject]-remaining[1-subject])/total,enemyRemaining:remaining[1-subject]/total,budget:draft.ownTeam.reduce((n,u)=>n+trainingCost(u.type,u.troops),0),draft,initial,commands:{own:b.commandSerial,enemy:b.enemyCommand.commandSerial},units:b.sides.map(s=>s.units.map(u=>({id:u.id,hp:u.hp,status:u.status,contribution:u.contribution,metrics:metrics[u.id],bondEntry:u.bondEntry,bondState:u.bondState}))),...(trace?{events,logs:b.logs}:{} )};
}
