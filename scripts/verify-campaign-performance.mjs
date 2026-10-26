import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {serializeCampaign,validateCampaign,advanceCampaignDay,activeBattles} from '../strategic-campaign.mjs';
import {officerActivityDays} from '../officer-activity.mjs';
import {PERFORMANCE_BUDGETS} from './performance-budgets.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));assert.ok(args.save,'Provide an untouched natural current save');
const out=resolve(args.out||'.local/campaign-performance-'+Date.now());await mkdir(out,{recursive:true});
const raw=await readFile(resolve(args.save),'utf8'),start=performance.now(),s=validateCampaign(JSON.parse(raw)),validateMs=performance.now()-start;
const saveStart=performance.now();assert.equal(serializeCampaign(s),raw);const serializeMs=performance.now()-saveStart;
const ids=s.cities.filter(c=>c.owner===s.campaign.playerFaction).flatMap(c=>c.units.map(u=>u.id)).slice(0,10),historyTimes=[];
for(const id of ids){const t=performance.now();officerActivityDays(s,id,{limit:30});historyTimes.push(performance.now()-t);}
const daily=[];for(let i=0;i<Number(args.days||10)&&!s.finished;i++){const before=s.campaign.day,t=performance.now(),battles=activeBattles(s).length;advanceCampaignDay(s);daily.push({day:before,ms:performance.now()-t,battles,advanced:s.campaign.day===before+1});}
const final=serializeCampaign(s),growth=(Buffer.byteLength(final)-Buffer.byteLength(raw))/Math.max(1,s.campaign.day-JSON.parse(raw).campaign.day);
const b=PERFORMANCE_BUDGETS.desktop,result={passed:false,source:'current working tree',input:{path:resolve(args.save),sha256:createHash('sha256').update(raw).digest('hex'),bytes:Buffer.byteLength(raw)},validateMs,serializeMs,historyMs:Math.max(0,...historyTimes),daily,averageBytesPerDay:growth,finalBytes:Buffer.byteLength(final),budgets:{...b,...PERFORMANCE_BUDGETS.growth}};
try{assert.ok(s.campaign.allAI,'Performance observation must not stall on player choices');assert.ok(daily.length&&daily.every(d=>d.advanced));for(const key of ['validateMs','serializeMs','historyMs'])assert.ok(result[key]<=b[key],key+' exceeded');assert.ok(daily.every(d=>d.ms<=b.dayMs),'daily execution budget exceeded');assert.ok(growth<=result.budgets.averageBytesPerDay,'full-history save growth budget exceeded');assert.ok(result.finalBytes<=result.budgets.maxSaveBytes);result.passed=true;}
catch(error){result.error=error.message;process.exitCode=1;}
await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));console.log('Campaign performance evidence: '+out);if(!result.passed)console.error(result.error);
