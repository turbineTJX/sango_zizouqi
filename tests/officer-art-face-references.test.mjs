import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {resolveLegacyFaceReference,resolveProductionFaceReference,legacyFaceReferences} from '../scripts/officer-art-face-references.mjs';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
test('face references use the exact officer mapping rather than a similarly named person',()=>{
 const key='a'.repeat(24)+'.jpg',file=resolve('reference-fixtures/cao.jpg'),pack={public:{portraits:{cao:'/local-art/files/'+key}},files:{[key]:file}};
 assert.equal(resolveLegacyFaceReference(pack,'cao').file,file);
 assert.equal(resolveLegacyFaceReference(pack,'person-636'),null);
});
test('missing and unregistered face references do not silently borrow another portrait',()=>{
 for(const url of ['https://example.com/cao.jpg','/local-art/files/../../secret.png','/local-art/files/'+ 'b'.repeat(24)+'.jpg'])assert.equal(resolveLegacyFaceReference({public:{portraits:{cao:url}},files:{}},'cao'),null);
 assert.equal(resolveLegacyFaceReference({},'cao'),null);
});
test('a shared legacy picture is flagged so two officers receive separate face designs',()=>{
 const key='c'.repeat(24)+'.jpg',url='/local-art/files/'+key,pack={public:{portraits:{first:url,second:url}},files:{[key]:resolve('reference-fixtures/shared.jpg')}};
 assert.deepEqual(resolveLegacyFaceReference(pack,'first').sharedWith,['second']);
});

test('Git portraits require the exact stable ID and a confined production path',()=>{
 const ref={officerId:'cao',file:'art-production/face-references/files/cao.jpg',sha256:'d'.repeat(64),sharedWith:['person-636']};
 const pack={references:{cao:ref}};
 assert.equal(resolveProductionFaceReference(pack,'cao').file,resolve(ref.file));
 assert.deepEqual(resolveProductionFaceReference(pack,'cao').sharedWith,['person-636']);
 assert.equal(resolveProductionFaceReference(pack,'person-636'),null);
 for(const file of ['../secret.jpg','art-production/face-references/files/../../../secret.jpg','/secret.jpg','https://example.com/cao.jpg'])assert.equal(resolveProductionFaceReference({references:{cao:{...ref,file}}},'cao'),null);
 assert.equal(resolveProductionFaceReference({references:{cao:{...ref,officerId:'person-636'}}},'cao'),null);
});

test('cloud lookups read Git portraits without a local pack and reject changed files',async()=>{
 const projectRoot=await mkdtemp(resolve(tmpdir(),'sango-face-git-'));
 try{
  const file='art-production/face-references/files/cao.jpg',bytes=Buffer.from('fixture-portrait'),sha256=createHash('sha256').update(bytes).digest('hex');
  await mkdir(resolve(projectRoot,'art-production/face-references/files'),{recursive:true});
  await writeFile(resolve(projectRoot,file),bytes);
  await writeFile(resolve(projectRoot,'art-production/face-references/index.json'),JSON.stringify({references:{cao:{officerId:'cao',file,sha256,sharedWith:[]}}}));
  const refs=await legacyFaceReferences(['cao','person-636'],projectRoot);
  assert.equal(refs.cao.sha256,sha256);
  assert.equal(refs.cao.localOnly,false);
  assert.equal(refs.cao.productionOnly,true);
  assert.equal(refs['person-636'],undefined);
  await writeFile(resolve(projectRoot,file),'changed');
  await assert.rejects(legacyFaceReferences(['cao'],projectRoot),/hash mismatch/);
 }finally{await rm(projectRoot,{recursive:true,force:true});}
});
