import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {resolveLegacyFaceReference} from '../scripts/officer-art-face-references.mjs';
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
