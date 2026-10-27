import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),out=resolve(args.out||'outputs/bandits-natural'),days=Number(args.days||60);
mkdirSync(out,{recursive:true});
let source=args.source&&resolve(args.source);
if(!source){const snapshot=join(out,'source-'+Date.now()),frozen=spawnSync(process.execPath,['scripts/freeze-validation-runtime.mjs',snapshot],{encoding:'utf8',windowsHide:true});if(frozen.status!==0)throw Error(frozen.stderr||frozen.stdout);console.log(frozen.stdout.trim());source=join(snapshot,'runtime');}
const audit=spawnSync(process.execPath,[join(source,'scripts/audit-all-ai-decisions.mjs'),`--source=${source}`,`--out=${out}`,`--days=${days}`,`--scenario=${args.scenario||'guandu-200'}`,`--seed=${args.seed||521200}`],{stdio:'inherit',windowsHide:true});
if(audit.status!==0)process.exit(audit.status||1);
const s=JSON.parse(readFileSync(join(out,'campaign-save.json'),'utf8')),base=JSON.parse(readFileSync(join(out,'campaign-audit.json'),'utf8'));
const result={scope:'Original ordinary nationwide all-AI scenario, ordinary fog and incidents, no injected troops, resources, discoveries, wars or outcomes.',sourceHash:createHash('sha256').update(JSON.stringify(base.sourceHashes)).digest('hex'),metrics:base.metrics,camps:s.campaign.bandits.camps.map(c=>({id:c.id,nodeId:c.nodeId,clearedDay:c.clearedDay,winner:c.winner,receipt:c.receipt})),observed:Object.fromEntries(Object.entries(s.campaign.bandits.observations).map(([f,v])=>[f,Object.keys(v).length])),battles:s.campaign.battles.filter(r=>r.banditCampId).map(r=>({id:r.id,campId:r.banditCampId,startedDay:r.startedDay,endedDay:r.endedDay,settled:r.settled,attackFaction:r.battle.sides[r.attackSide].faction,winner:r.report?.winner,loot:r.report?.banditLoot})),deterministicCheckpoints:base.checkpoints};
writeFileSync(join(out,'bandits-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({event:'bandits',cleared:result.camps.filter(c=>c.clearedDay!==null).length,observed:result.observed,battles:result.battles.length,sourceHash:result.sourceHash}));
