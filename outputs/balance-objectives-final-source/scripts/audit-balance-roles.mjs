import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {RULES_VERSION} from '../combat-rules.mjs';
import {configureUnitTactics,deployUnit} from '../engine.mjs';
import {recommendedTacticIds,SPECIAL_TACTICS} from '../tactics.mjs';
import {TRAIN_SEEDS,VALIDATION_SEEDS,heroCase,runCase,summarize} from './balance-objectives-lib.mjs';
const stage=process.argv[2]||'train';assert.ok(['train','validate'].includes(stage));
const seeds=stage==='train'?TRAIN_SEEDS:VALIDATION_SEEDS;
const unit=(id,type,troops=3000,level=5)=>({id,type,troops,level}),runs=[],rows=[];
const files=['engine.mjs','scenarios.mjs','tactics.mjs','combat-rules.mjs','battle-ai.mjs','famous-officers.mjs','scripts/audit-balance-roles.mjs','scripts/balance-objectives-lib.mjs'];
const hash=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL('../'+f,import.meta.url))).digest('hex')])),hashes=hash();
const sample=(id,c)=>{const group=seeds.map((s,i)=>runCase(c,s,{resume:i===0}));runs.push(...group.map(r=>({id,...r})));rows.push({id,...summarize(group)});};
for(const id of ['person-661','person-396','person-99'])for(const level of [5,10]){
 const c=heroCase(id,'cavalry','valor',level,'recommended'),setup=c.options.setup;
 c.options.setup=s=>{setup(s);assert.equal(configureUnitTactics(s,id,recommendedTacticIds(s.battle.sides[0].units[0])),null);};
 sample(`recommendation/${id}/${level}`,c);
}
for(const level of [5,10])for(const mode of ['full','basic','ordinary']){
 const id=mode==='ordinary'?'person-457':'person-433';
 sample(`frontline/zhangfei/${level}/${mode}`,{draft:{terrain:'land',ownTeam:[unit(id,'spear',3000,level),unit('person-515','archer',3000,level),unit('person-610','crossbow',3000,level)],enemyTeam:[unit('yan','cavalry',3000,level),unit('wen','cavalry',3000,level),unit('liao','cavalry',3000,level)]},options:{controller:'rule',hero:id,setup(s){
  assert.equal(configureUnitTactics(s,id,[mode==='full'?SPECIAL_TACTICS[id]:'thrust','phalanx','ward']),null);
  s.battle.sides[0].units.forEach((u,i)=>assert.equal(deployUnit(s.battle,u.id,...[[4,3],[3,4],[3,2]][i]),null));
 }}});
}
for(const id of ['person-661','person-396','person-99'])for(const mode of ['support','frontline']){
 const c=heroCase(id,'cavalry','valor',5,'full');
 if(mode==='frontline')c.draft.ownTeam[2].type='spear';
 sample(`auxiliary/${id}/${mode}`,c);
}
for(const [id,type] of [['liao','cavalry'],['chu','spear'],['jia','crossbow']]){
 sample(`exclusive/${id}`,{draft:{terrain:'land',ownTeam:[unit(id,type),unit('person-46','spear'),unit('person-123','logistics')],enemyTeam:[unit('jin','spear'),unit('yuanxia','archer'),unit('person-610','crossbow')]},options:{controller:'player',hero:id}});
}
assert.deepEqual(hash(),hashes);
const out=new URL(`../docs/balance-objectives/roles-${stage}/`,import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('results.json',out),JSON.stringify({rulesVersion:RULES_VERSION,seeds,total:runs.length,hashes,rows},null,2));
writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(runs)));console.table(rows);console.log('COMPLETE',runs.length);
