import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bindActions,assessManual,readManualState,reviewManual,renderManual,runtimeSources,BASELINE,HTML,REPORT} from '../scripts/player-manual-sync.mjs';

const chapters=[{name:'城市',actions:[{id:'budget',name:'调整预算',steps:['修改','保存'],images:['budget'],note:''},{id:'scout',name:'派遣侦察',steps:['选人','派遣'],images:['scout'],note:''}]}];
const links={version:1,shared:['app.js'],groups:[{name:'预算',actions:['调整预算'],sources:['budget.mjs']},{name:'侦察',actions:['派遣侦察'],sources:['scout.mjs']}]};
const sources={'app.js':'app','budget.mjs':'budget','scout.mjs':'scout','engine.mjs':'engine'};
const hashes={budget:'budget-content',scout:'scout-content'};
const bound=bindActions(chapters,links);
const baseline=()=>({version:1,snapshots:{first:sources},actions:Object.fromEntries(bound.actions.map(a=>[a.id,{revision:'first',bindingHash:bound.hash,contentHash:hashes[a.id],reviewedAt:'2026-10-29',note:'初始核对',screenshots:'unchanged'}]))});
const pending=(next,base=baseline(),binding=bound,content=hashes)=>assessManual(binding,next,content,base).items.filter(i=>i.pending).map(i=>i.id);

test('manual: unchanged baseline passes; a budget change identifies only its own flow',()=>{
 assert.deepEqual(pending(sources),[]);
 assert.deepEqual(pending({...sources,'budget.mjs':'changed'}),['budget']);
 assert.deepEqual(pending({...sources,'scout.mjs':'changed'}),['scout']);
});
test('manual: shared code, unclassified dependencies, additions and deletions require review',()=>{
 for(const next of [{...sources,'app.js':'changed'},{...sources,'engine.mjs':'changed'},{...sources,'new.mjs':'new'},Object.fromEntries(Object.entries(sources).filter(([p])=>p!=='engine.mjs'))])assert.deepEqual(pending(next),['budget','scout']);
 const missing=assessManual(bound,{...sources,'budget.mjs':undefined},hashes,baseline());
 assert.deepEqual(missing.missing,['budget.mjs']);assert.equal(missing.items[0].pending,true);
});
test('manual: renamed or unmapped actions and missing snapshots cannot silently pass',()=>{
 const more=structuredClone(chapters);more[0].actions.push({id:'new',name:'新增操作'});
 assert.throws(()=>bindActions(more,links),/Missing code links/);
 const renamed=structuredClone(links);renamed.groups[0].actions=['不存在的操作'];assert.throws(()=>bindActions(chapters,renamed),/Unknown manual action/);
 const unused=structuredClone(links);unused.groups[0].exclude=['调整预算'];assert.throws(()=>bindActions(chapters,unused),/no workflows/);
 assert.deepEqual(pending(sources,null),['budget','scout']);
 const corrupt=baseline();corrupt.snapshots={};assert.deepEqual(pending(sources,corrupt),['budget','scout']);
});
test('manual: rebinding or edited steps/screenshots requires renewed review',()=>{
 const other=structuredClone(links);other.groups[0].sources.push('engine.mjs');
 assert.deepEqual(pending(sources,baseline(),bindActions(chapters,other)),['budget','scout']);
 assert.deepEqual(pending(sources,baseline(),bound,{...hashes,budget:'new-image-or-steps'}),['budget']);
});

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'sango-manual-'));
 // The target is the exact fresh directory returned by mkdtemp, never a shell-
 // computed path or a user checkout.
 t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'docs/manual'),{recursive:true});await mkdir(join(root,'docs/images'),{recursive:true});
 await writeFile(join(root,'docs/manual/code-links.json'),JSON.stringify(links));
 await writeFile(join(root,'docs/manual/template.html'),'<script>const manual=/*__MANUAL_DATA__*/;</script>');
 const content={reference:'fixture',chapters:structuredClone(chapters),actions:chapters.flatMap(c=>c.actions),used:['budget','scout'],captures:{}};
 for(const id of content.used){await writeFile(join(root,'docs/images/'+id+'.webp'),'original '+id);content.captures[id]={file:'images/'+id+'.webp',group:id,title:id,capturedAt:'2026-10-29'};}
 let code={...sources};
 const read=()=>readManualState(root,{sourceProvider:async()=>code,contentLoader:async()=>content});
 return {root,read,content,change:next=>code={...code,...next}};
}
test('manual: rendering or checking cannot clear stale code; partial review leaves other work pending',async t=>{
 const f=await fixture(t),first=await f.read();
 await reviewManual(first,{ids:['budget','scout'],note:'已逐项核对初始步骤与截图',screenshots:'unchanged'});
 let state=await f.read();assert.equal(state.status.pending,0);await renderManual(state);
 const before=await readFile(join(f.root,BASELINE),'utf8');
 f.change({'app.js':'shared changed'});state=await f.read();
 const check=await renderManual(state,{check:true});assert.equal(check.valid,false);assert.ok(check.outdated.includes(HTML));
 assert.equal(JSON.parse(await readFile(join(f.root,REPORT),'utf8')).pending,0,'check is read-only');
 const built=await renderManual(state);assert.equal(built.valid,false);
 assert.equal(JSON.parse(await readFile(join(f.root,REPORT),'utf8')).pending,2);
 assert.equal(await readFile(join(f.root,BASELINE),'utf8'),before,'a build never blesses code');
 await reviewManual(state,{ids:['budget'],note:'已检查预算步骤与截图未受此次公共修改影响',screenshots:'unchanged'});
 state=await f.read();assert.deepEqual(state.status.items.filter(i=>i.pending).map(i=>i.id),['scout']);
 assert.equal(Object.keys(state.baseline.snapshots).length,2,'unreviewed workflow keeps its own old snapshot');
 await reviewManual(state,{ids:['scout'],note:'已检查侦察步骤与截图未受此次公共修改影响',screenshots:'unchanged'});
 state=await f.read();assert.equal(state.status.pending,0);assert.equal(Object.keys(state.baseline.snapshots).length,1);
 await renderManual(state);assert.equal((await renderManual(state,{check:true})).valid,true);
});
test('manual: source documents and templates regenerate; changing image bytes is detected',async t=>{
 const f=await fixture(t);await reviewManual(await f.read(),{ids:['budget','scout'],note:'已逐项核对初始步骤与截图',screenshots:'unchanged'});await renderManual(await f.read());
 await writeFile(join(f.root,'docs/manual/template.html'),'<main>new template</main><script>const manual=/*__MANUAL_DATA__*/;</script>');
 let state=await f.read();assert.equal(state.status.pending,0);assert.equal((await renderManual(state,{check:true})).valid,false);
 await renderManual(state);assert.match(await readFile(join(f.root,HTML),'utf8'),/new template/);
 f.content.chapters[0].actions[0].steps=['新步骤','保存'];state=await f.read();assert.equal(state.status.items[0].pending,true);
 await renderManual(state);assert.match(await readFile(join(f.root,HTML),'utf8'),/新步骤/);
 await writeFile(join(f.root,'docs/images/scout.webp'),'changed pixels');state=await f.read();assert.equal(state.status.items[1].pending,true);
});
test('manual: review requires explicit evidence and cannot accept missing source files',async t=>{
 const f=await fixture(t),state=await f.read();
 for(const options of [{ids:['budget'],screenshots:'unchanged'},{ids:['budget'],note:'完整核对说明但未选截图处理'},{ids:['bad'],note:'完整核对说明但行动不存在',screenshots:'unchanged'}])await assert.rejects(reviewManual(state,options));
 f.change({'budget.mjs':undefined});await assert.rejects(reviewManual(await f.read(),{ids:['budget'],note:'缺少文件不能直接接受核对',screenshots:'unchanged'}),/缺失/);
});
test('manual: real runtime graph follows new imports and data; tests/outputs are excluded and line endings stable',async t=>{
 const root=await mkdtemp(join(tmpdir(),'sango-manual-graph-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(join(root,'data'));await mkdir(join(root,'outputs'));await mkdir(join(root,'tests'));
 for(const [path,text]of Object.entries({'index.html':'<script type="module" src="./app.js"></script>','app.js':'import "./budget.mjs";\n','budget.mjs':'export const budget=1;\n','sw.js':'// service worker\n','manifest.webmanifest':'{}','data/rules.mjs':'export const limit=2;\n'}))await writeFile(join(root,path),text);
 const initial=await runtimeSources(root);
 await writeFile(join(root,'outputs/report.json'),'unrelated');await writeFile(join(root,'tests/test.mjs'),'unrelated');
 await writeFile(join(root,'budget.mjs'),'export const budget=1;\r\n');assert.deepEqual(await runtimeSources(root),initial);
 await writeFile(join(root,'new.mjs'),'export const added=3;');await writeFile(join(root,'app.js'),'import "./budget.mjs";import "./new.mjs";');
 const added=await runtimeSources(root);assert.ok(added['new.mjs']);assert.ok(added['data/rules.mjs']);
 await rm(join(root,'new.mjs'));await assert.rejects(runtimeSources(root),/Could not resolve/);
});
