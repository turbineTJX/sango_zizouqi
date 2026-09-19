import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {RULES_VERSION} from '../combat-rules.mjs';
import {TRAIN_SEEDS,VALIDATION_SEEDS,ALLOCATIONS,ROUTES,ENEMIES,HEROES,heroCase,playerCase,runCase,summarize} from './balance-objectives-lib.mjs';

const phase=process.argv[2]||'train',label=process.argv[3]||phase;
assert.ok(['heroes','train','validate'].includes(phase));assert.match(label,/^[a-z0-9-]+$/);
const root=new URL('../',import.meta.url),out=new URL(`../docs/balance-objectives/${label}/`,import.meta.url);
mkdirSync(out,{recursive:true});
const files=[...readdirSync(root).filter(f=>f.endsWith('.mjs')),...readdirSync(new URL('data/',root)).filter(f=>/\.(mjs|json)$/.test(f)).map(f=>'data/'+f),'scripts/balance-objectives-lib.mjs','scripts/audit-balance-objectives.mjs','scripts/custom-playability-lib.mjs'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
const initial=hashes(),runs=[],rows=[];let trainedSelection=null;
const seeds=phase==='validate'?VALIDATION_SEEDS:TRAIN_SEEDS;
function sample(id,c,sampleSeeds=seeds){
 const group=sampleSeeds.map((seed,i)=>runCase(c,seed,{resume:i===0}));
 runs.push(...group.map(r=>({id,...r})));const row={id,...summarize(group)};rows.push(row);
 writeFileSync(new URL('progress.json',out),JSON.stringify(rows,null,2));return row;
}
function finish(){
 assert.deepEqual(hashes(),initial,'Source changed during audit');
 writeFileSync(new URL('results.json',out),JSON.stringify({rulesVersion:RULES_VERSION,phase,seeds,total:runs.length,hashes:initial,rows},null,2));
 writeFileSync(new URL('runs.json.gz',out),gzipSync(JSON.stringify(runs)));
 if(trainedSelection)writeFileSync(new URL('../selection.json',out),JSON.stringify(trainedSelection,null,2));
 console.log('COMPLETE',label,runs.length,'battles');
}
if(phase==='heroes'||phase==='validate'){
 for(const [id,type,basic] of HEROES){
  for(const level of [1,5,10])for(const mode of ['full','basic','ordinary','recommended'])sample(`hero/${id}/${level}/${mode}`,heroCase(id,type,basic,level,mode));
  console.log('Hero complete',id);
 }
}
if(phase==='train'){
 const selected=[];
 for(const route of ROUTES)for(const enemy of ENEMIES){
  const candidates=[];
  for(const allocation of Object.keys(ALLOCATIONS))for(const plan of ['default','compact','control','scattered']){
   const row=sample(`player/${route.id}/${enemy.id}/${allocation}/${plan}`,playerCase(route,enemy,allocation,plan));
   candidates.push({allocation,plan,...row});
  }
  candidates.sort((a,b)=>b.wins-a.wins||(b.remaining-b.enemyRemaining)-(a.remaining-a.enemyRemaining)||a.id.localeCompare(b.id));
  selected.push({route:route.id,enemy:enemy.id,allocation:candidates[0].allocation,plan:candidates[0].plan});
  console.log('Selected',selected.at(-1));
 }
 trainedSelection={trainingSeeds:TRAIN_SEEDS,validationSeeds:VALIDATION_SEEDS,selected};
}
if(phase==='validate'){
 const selection=JSON.parse(readFileSync(new URL('../selection.json',out),'utf8'));
 assert.deepEqual(selection.validationSeeds,VALIDATION_SEEDS);
 assert.ok(TRAIN_SEEDS.every(s=>!VALIDATION_SEEDS.includes(s)));
 for(const choice of selection.selected){
  const route=ROUTES.find(a=>a.id===choice.route),enemy=ENEMIES.find(a=>a.id===choice.enemy);
  sample(`player/${route.id}/${enemy.id}/default`,playerCase(route,enemy));
  sample(`player/${route.id}/${enemy.id}/selected`,playerCase(route,enemy,choice.allocation,choice.plan));
  for(const ablation of ['allocation','tactics','deployment','intent','commands','support-role'])sample(`player/${route.id}/${enemy.id}/without-${ablation}`,playerCase(route,enemy,choice.allocation,choice.plan,ablation));
  console.log('Player complete',choice.route,choice.enemy);
 }
}
finish();
