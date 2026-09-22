import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const mode=process.argv[2]||'current';
const root=resolve(mode.startsWith('baseline')?'outputs/tempo-v43/baseline':'.');
const load=p=>import(pathToFileURL(resolve(root,p)));
const {createScenario}=await load('scenarios.mjs');
const {lockDeployment,stepBattle,validateSave}=await load('engine.mjs');
const {TACTICS_BOOK}=await load('tactics.mjs');
const {RULES_VERSION}=await load('combat-rules.mjs');
const teams={
  mixed:[['cao','spear'],['liao','cavalry'],['jia','crossbow'],['chu','halberd'],['yu','halberd'],['yuanxia','archer']],
  finishers:[['person-661','cavalry'],['person-246','archer'],['person-603','archer'],['person-404','archer'],['person-636','spear'],['person-668','halberd']],
  naval:[['person-246','ship'],['person-603','ship'],['person-119','ship'],['person-164','ship'],['person-368','ship'],['person-662','ship']],
  enemy:[['shao','spear'],['yan','cavalry'],['wen','halberd'],['he','crossbow'],['ju','halberd'],['tian','siege']],
};
const rows=[];
for(const kind of ['mixed','finishers','naval'])for(const allocation of ['equal','core'])for(const level of [5,8])for(let n=0;n<8;n++){
  const seed=430100+(n+(mode.includes('validation')?8:0))*7919;
  const make=(team,opponent=false)=>team.map(([id,type],i)=>({id,type:kind==='naval'&&opponent?'ship':type,level,troops:allocation==='equal'?2500:i===0?5000:2000}));
  const draft={seed,terrain:kind==='naval'?'river':'land',ownTeam:make(teams[kind]),enemyTeam:make(teams.enemy,true)};
  const state=createScenario('custom-battle',seed,20,null,draft),b=state.battle;
  lockDeployment(b);
  assert.ok(b.sides.flatMap(s=>s.units).every(u=>u.intent===0));
  const learning=JSON.stringify(b.sides.map(s=>s.units.map(u=>[u.id,u.tacticLearning,u.tactics])));
  const casts=[],last=new Map();let activeTicks=0,cappedTicks=0,continued;
  while(!b.result){
    for(const u of b.sides.flatMap(s=>s.units).filter(u=>u.status==='active')){activeTicks++;if(u.intent===100)cappedTicks++;}
    const counts=new Map(b.sides.flatMap(s=>s.units).map(u=>[u.id,{...u.tacticCasts}]));
    stepBattle(b);if(continued)stepBattle(continued.battle);
    for(const u of b.sides.flatMap(s=>s.units)){
      assert.ok(u.intent>=0&&u.intent<=100);
      for(const [id,count] of Object.entries(u.tacticCasts))if(count>(counts.get(u.id)[id]||0)){
        const s=TACTICS_BOOK[id],gap=last.has(u.id)?b.tick-last.get(u.id):null;
        if(!mode.startsWith('baseline'))assert.ok(gap===null||gap>=4,'shared recovery');
        const events=b.effects.filter(e=>e.from===u.id&&e.label===s.name&&e.skill&&!e.ongoing);
        casts.push({unit:u.id,side:u.side,id,tick:b.tick,gap,intentAfter:u.intent,damage:events.reduce((n,e)=>n+(e.damage||0),0),healing:events.reduce((n,e)=>n+(e.healing||0),0),role:s.tempoRole||(s.special?s.threshold===100?'决胜专属':'其他专属':s.threshold<=35?'基础铺垫':'进阶交锋')});
        last.set(u.id,b.tick);
      }
    }
    if(b.tick===30)continued=validateSave(structuredClone(state));
  }
  if(continued)assert.deepEqual(continued.battle,b);
  assert.equal(JSON.stringify(b.sides.map(s=>s.units.map(u=>[u.id,u.tacticLearning,u.tactics]))),learning);
  const equipped=b.sides.flatMap(s=>s.units).flatMap(u=>u.tactics.map(id=>({unit:u.id,id})));
  rows.push({kind,allocation,level,seed,ticks:b.tick,winner:b.result.winner,remaining:b.sides.map(s=>s.units.reduce((n,u)=>n+u.hp,0)),activeTicks,cappedTicks,equipped,casts});
}
const total=key=>rows.reduce((n,r)=>n+r[key],0),casts=rows.flatMap(r=>r.casts);
const summary={games:rows.length,casts:casts.length,castsPer100ActiveSteps:100*casts.length/total('activeTicks'),cappedShare:total('cappedTicks')/total('activeTicks'),adjacentCasts:casts.filter(c=>c.gap!==null&&c.gap<4).length,averageTicks:total('ticks')/rows.length,byRole:Object.fromEntries([...new Set(casts.map(c=>c.role))].map(role=>[role,casts.filter(c=>c.role===role).length]))};
mkdirSync('docs/tactic-tempo-v43',{recursive:true});
writeFileSync(`docs/tactic-tempo-v43/${mode}.json`,JSON.stringify({mode,rulesVersion:RULES_VERSION,summary,hashes:Object.fromEntries(['engine.mjs','tactics.mjs','expanded-tactics.mjs','tactic-learning.mjs','combat-rules.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')])),rows},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
