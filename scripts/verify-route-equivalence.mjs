import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as current from '../strategic-campaign.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));assert.ok(args.baseline,'Provide the frozen pre-optimization runtime');
const root=resolve(args.baseline),baseline=await import(pathToFileURL(join(root,'strategic-campaign.mjs'))),out=resolve(args.out||'.local/route-equivalence-'+Date.now());await mkdir(out,{recursive:true});
const cases=args.save?[{input:resolve(args.save),raw:await readFile(resolve(args.save),'utf8')}]:['guandu-200','heroes-251'].map((scenario,i)=>({scenario,seed:20261025+i,raw:baseline.serializeCampaign(baseline.newCampaign(20261025+i,scenario,'cao',{allAI:true}))}));
const result={passed:false,baseline:root,days:Number(args.days||10),cases:[]};
try{for(const spec of cases){const a=baseline.validateCampaign(JSON.parse(spec.raw)),b=current.validateCampaign(JSON.parse(spec.raw)),row={scenario:a.campaign.scenarioId,input:spec.input||'fresh original scenario',inputHash:createHash('sha256').update(spec.raw).digest('hex'),samples:[]};result.cases.push(row);
 for(let i=0;i<result.days&&!a.finished;i++){const day=a.campaign.day,t=performance.now();baseline.advanceCampaignDay(a);const beforeMs=performance.now()-t,u=performance.now();current.advanceCampaignDay(b);const afterMs=performance.now()-u;assert.equal(current.serializeCampaign(b),baseline.serializeCampaign(a),'Full game state differs after day '+day);row.samples.push({day,beforeMs,afterMs});}
 }result.passed=true;}catch(error){result.error=error.stack;process.exitCode=1;}
await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));console.log('Full-state route equivalence evidence: '+out);if(!result.passed)console.error(result.error);
