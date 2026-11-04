import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {zipSync} from 'fflate';
import {infinityPortraitFiles,infinityGenericPortraitFiles} from '../scripts/infinity-portraits.mjs';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'sango-infinity-faces-'));
 t.after(async()=>{assert.equal(dirname(resolve(root)),resolve(tmpdir()));assert.ok(basename(root).startsWith('sango-infinity-faces-'));await rm(root,{recursive:true,force:true});});
 const infinity=join(root,'reference'),cache=join(root,'cache');
 const library={1:{Id:1,Name:'张南',headIconID:795},2:{Id:2,Name:'张南',headIconID:463},3:{Id:3,Name:'许禇',headIconID:12},4:{Id:4,headIconID:0},5:{Id:5,headIconID:0}};
 const directory=join(infinity,'Build/Content/Data/Common');await mkdir(directory,{recursive:true});await writeFile(join(directory,'PersonLibrary.json'),JSON.stringify({PersonLibrary:library}));
 const officers=Object.keys(library).map(n=>({id:'person-'+n,sourceKind:'common',sourceId:Number(n),name:'renamed'}));
 officers.push({id:'custom-1',sourceKind:'custom',sourceId:1});
 return {root,infinity,cache,officers};
}
test('original portraits use source IDs and head indices, including homonyms and shared source defaults',async t=>{
 const f=await fixture(t),directory=join(f.infinity,'Project/Assets/Mods/Content/Assets/Face');await mkdir(directory,{recursive:true});
 for(const head of [795,463,12,0])await writeFile(join(directory,head+'_1.png'),'original '+head);
 const result=await infinityPortraitFiles(f.infinity,f.cache,f.officers);
 assert.deepEqual(result.missing,[]);assert.equal(Object.keys(result.portraits).length,5);
 assert.notEqual(result.portraits['person-1'],result.portraits['person-2']);
 assert.equal(await readFile(result.portraits['person-3'],'utf8'),'original 12');
 assert.equal(result.portraits['person-4'],result.portraits['person-5']);assert.equal(result.portraits['custom-1'],undefined);
});
test('an incomplete checkout recovers only exact Face entries from its original download',async t=>{
 const f=await fixture(t),prefix='reference/Project/Assets/Mods/Content/Assets/Face/';
 await writeFile(join(f.root,'reference.zip'),zipSync({[prefix+'795_1.png']:Buffer.from('archive face'),[prefix+'795_2.png']:Buffer.from('small'),[prefix+'../escape.png']:Buffer.from('escape')}));
 const result=await infinityPortraitFiles(f.infinity,f.cache,f.officers);
 assert.equal(await readFile(result.portraits['person-1'],'utf8'),'archive face');assert.deepEqual(result.missing,['person-2','person-3','person-4','person-5']);
 await assert.rejects(readFile(join(f.root,'escape.png')),/ENOENT/);
});
test('unavailable originals remain explicit and never borrow another named officer',async t=>{
 const f=await fixture(t);assert.deepEqual(await infinityPortraitFiles(f.infinity,f.cache,f.officers),{portraits:{},missing:f.officers.filter(o=>o.sourceKind==='common').map(o=>o.id)});
});

test('generic pools follow the source sex ranges, recover exact archive faces and report missing ones',async t=>{
 const f=await fixture(t);
 await writeFile(join(f.infinity,'Build/Content/Data/FaceConfig.json'),JSON.stringify({HeadIdRanges:[{startId:2000,endId:2001,sexType:0},{startId:2100,endId:2100,sexType:1}]}));
 const prefix='reference/Project/Assets/Mods/Content/Assets/Face/';
 await writeFile(join(f.root,'reference.zip'),zipSync({[prefix+'2000_1.png']:Buffer.from('generic male'),[prefix+'2100_1.png']:Buffer.from('generic female'),[prefix+'795_1.png']:Buffer.from('named officer')}));
 const result=await infinityGenericPortraitFiles(f.infinity,f.cache);
 assert.deepEqual(result.missing,[2001]);assert.deepEqual(result.portraits.male.map(p=>p.headId),[2000]);assert.deepEqual(result.portraits.female.map(p=>p.headId),[2100]);
 assert.equal(await readFile(result.portraits.male[0].file,'utf8'),'generic male');assert.equal(await readFile(result.portraits.female[0].file,'utf8'),'generic female');
});
