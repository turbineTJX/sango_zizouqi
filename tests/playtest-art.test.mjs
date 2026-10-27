import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {exportPlaytestArt} from '../scripts/export-playtest-art.mjs';
import {loadLocalArt,serveLocalArt} from '../local-art-server.mjs';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'sango-playtest-'));
 t.after(async()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep));await rm(root,{recursive:true,force:true});});
 const author=join(root,'author'),checkout=join(root,'checkout'),content=Buffer.from('portable portrait bytes');
 const sha256=createHash('sha256').update(content).digest('hex'),id=sha256.slice(0,24)+'.png',original=join(author,'original.png');
 await mkdir(join(author,'.local/art'),{recursive:true});await writeFile(original,content);
 const manifest={public:{version:1,id:'local-playtest',portraits:{'person-1':'/local-art/files/'+id}},files:{[id]:original},sources:{[id]:{source:'strategy/portraits',sha256,bytes:content.length,localOnly:true}}};
 await writeFile(join(author,'.local/art/manifest.json'),JSON.stringify(manifest));
 return {root,author,checkout,content,id,original,manifest};
}
test('exported artwork works in another checkout after the original is removed',async t=>{
 const f=await fixture(t),out=join(f.checkout,'art/playtest');
 assert.deepEqual(await exportPlaytestArt(f.author,out),{files:1,bytes:f.content.length,portraits:1});
 await unlink(f.original);
 const raw=await readFile(join(out,'manifest.json'),'utf8');assert.ok(!raw.includes(f.author));
 const pack=await loadLocalArt(f.checkout);assert.equal(pack.public.portraits['person-1'],'/local-art/files/'+f.id);
 const res={writeHead(code,headers){this.code=code;this.headers=headers;},end(body){this.body=body;}};
 await serveLocalArt('/local-art/files/'+f.id,res,pack);assert.equal(res.code,200);assert.deepEqual(res.body,f.content);
 assert.equal(pack.sources[f.id].source,'strategy/portraits');
});
test('local imports keep priority and the artwork switch disables portable resources',async t=>{
 const f=await fixture(t);await exportPlaytestArt(f.author,join(f.checkout,'art/playtest'));
 await mkdir(join(f.checkout,'.local/art'),{recursive:true});
 await writeFile(join(f.checkout,'.local/art/manifest.json'),JSON.stringify({public:{version:1,id:'override'},files:{}}));
 assert.equal((await loadLocalArt(f.checkout)).public.id,'override');
 assert.equal(await loadLocalArt(f.checkout,false),null);
});
test('portable manifests reject file paths outside the exported directory',async t=>{
 const f=await fixture(t),out=join(f.checkout,'art/playtest');await exportPlaytestArt(f.author,out);
 const manifest=JSON.parse(await readFile(join(out,'manifest.json'),'utf8'));
 for(const path of ['../../original.png',f.original]){
  manifest.files[f.id]=path;await writeFile(join(out,'manifest.json'),JSON.stringify(manifest));
  assert.equal(await loadLocalArt(f.checkout),null);
 }
});
test('export refuses changed or missing original artwork',async t=>{
 const f=await fixture(t);await writeFile(f.original,'changed');
 await assert.rejects(exportPlaytestArt(f.author,join(f.checkout,'art/playtest')),/hash mismatch/);
 await unlink(f.original);await assert.rejects(exportPlaytestArt(f.author,join(f.checkout,'art/playtest')),/ENOENT/);
});
