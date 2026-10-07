import test from 'node:test';
import assert from 'node:assert/strict';
import {selectOfficers,batchJobStatus} from '../scripts/officer-art-batch.mjs';
import {OFFICER_ART_KEYS} from '../officer-art-scenes.mjs';
const full=()=>Object.fromEntries(OFFICER_ART_KEYS.map(s=>[s,{url:s+'.png'}]));
const catalog=[{id:'first'},{id:'partial'},{id:'complete'},{id:'last'}];
test('missing art role blocks new work and candidates without discarding already imported images',()=>{
 const job={officerId:'first',scene:'portrait',roleNeedsReview:true};
 assert.equal(batchJobStatus(job,{}),'blocked-role');
 job.candidate={referenceSha256:'face'};assert.equal(batchJobStatus(job,{}),'blocked-role');
 assert.equal(batchJobStatus(job,{first:{portrait:{}}}),'complete');
 job.roleNeedsReview=false;assert.equal(batchJobStatus(job,{}),'candidate');
});
test('a changed identity invalidates old scene candidates instead of approving their old face',()=>{
 const j={officerId:'cao',scene:'battle',referenceSha256:'new-face',candidate:{referenceSha256:'old-face'}};
 assert.equal(batchJobStatus(j,{cao:{portrait:{}}}),'stale-identity');
 j.candidate.referenceSha256='new-face';assert.equal(batchJobStatus(j,{cao:{portrait:{}}}),'candidate');
 delete j.candidate;assert.equal(batchJobStatus(j,{}),'blocked-master');
 assert.equal(batchJobStatus(j,{cao:{portrait:{}}}),'pending');
});
test('queue resumes a partial officer and skips complete officers without duplicating priority entries',()=>{
 const manifest={partial:{portrait:{url:'portrait.png'}},complete:full()};
 assert.deepEqual(selectOfficers(manifest,['complete','partial','partial','unknown'],catalog,2),['partial','first']);
});
test('full-roster continuation follows remaining catalogue order and ends only when all scenes exist',()=>{
 const manifest={first:full(),partial:full(),complete:full()};assert.deepEqual(selectOfficers(manifest,[],catalog,3),['last']);
 manifest.last=full();assert.deepEqual(selectOfficers(manifest,[],catalog,3),[]);
 delete manifest.partial['report-concern'];assert.deepEqual(selectOfficers(manifest,[],catalog,3),['partial']);
});
test('invalid batch sizes are rejected rather than creating empty or unbounded batches',()=>{
 for(const limit of [0,-1,13,1.5,NaN])assert.throws(()=>selectOfficers({},[],catalog,limit),/1至12/);
});
