import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname,basename} from 'node:path';
import {sourceOfflineManifest,writeSourceOfflineManifest} from '../scripts/source-offline-manifest.mjs';

test('offline dependencies include transitive cycles, dynamic modules and CSS resources without caching unrelated files',async t=>{
 const base=resolve(tmpdir()),root=await mkdtemp(join(base,'sango-offline-'));
 t.after(async()=>{assert.equal(dirname(resolve(root)),base);assert.ok(basename(root).startsWith('sango-offline-'));await rm(root,{recursive:true,force:true});});
 const files={'index.html':'<link href="./screen.css" rel="stylesheet"><script type="module" src="./app.js"></script>','app.js':"import './one.mjs';export const later=()=>import('./nested/two.mjs');export const native=()=>import('@capacitor/app');",'one.mjs':"import './nested/two.mjs';",'nested/two.mjs':"import '../one.mjs';",'screen.css':"body{background:url('./paper.svg')}",'paper.svg':'<svg/>','manifest.webmanifest':'{"icons":[]}','sw.js':'// worker','private.json':'not a runtime dependency'};
 await mkdir(join(root,'nested'));for(const [file,body]of Object.entries(files))await writeFile(join(root,file),body);
 const first=await writeSourceOfflineManifest(root);
 for(const path of ['app.js','one.mjs','nested/two.mjs','screen.css','paper.svg'])assert.ok(first.files.includes('./'+path),path);
 assert.ok(!first.files.includes('./private.json'));assert.ok(!first.files.some(p=>p.includes('capacitor')));
 await writeSourceOfflineManifest(root,{check:true});await writeFile(join(root,'nested/two.mjs'),"import '../one.mjs';export const changed=1;");
 assert.notEqual((await sourceOfflineManifest(root)).revision,first.revision);await assert.rejects(writeSourceOfflineManifest(root,{check:true}),/清单已过期/);
});
