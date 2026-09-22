import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';

test('reimport excludes the custom editor library even when it contains invalid data',async()=>{
 const root=await mkdtemp(join(tmpdir(),'sango-import-scope-'));
 try{
  await mkdir(join(root,'scripts'));
  for(const file of ['import-officers.mjs','officer-source-lib.mjs'])await copyFile(new URL('../scripts/'+file,import.meta.url),join(root,'scripts',file));
  const person={Id:1,Name:'正式武将',command:70,strength:70,intelligence:70,politics:70,glamour:70};
  const inputs={
   'Build/Content/Data/Common/PersonLibrary.json':{PersonLibrary:{1:person}},
   'Build/Content/Language/PersonDescription.json':{},
   'Build/Content/Data/Common/Personalities.json':{Personalities:{}},
   'Build/Content/Data/Common/Argumentations.json':{Argumentations:{}},
   'Build/Content/Scenario/Scenario.json':{personSet:{1:person}},
  };
  for(const [path,value] of Object.entries(inputs)){const target=join(root,'source',path);await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(value));}
  const custom=join(root,'source/Build/CustomEdit/CustomPerson.json');await mkdir(dirname(custom),{recursive:true});await writeFile(custom,'invalid custom data: 小美 是的 发是');
  execFileSync(process.execPath,[join(root,'scripts/import-officers.mjs'),join(root,'source')]);
  const manifest=JSON.parse(await readFile(join(root,'data/officers-source.json'),'utf8'));
  assert.deepEqual(manifest.counts,{common:1,custom:0,total:1});assert.equal(manifest.sources.custom,undefined);
  const source=await readFile(join(root,'data/officers.mjs'),'utf8');assert.match(source,/正式武将/);assert.doesNotMatch(source,/小美|是的|发是|"custom"/);
 }finally{await rm(root,{recursive:true,force:true});}
});
