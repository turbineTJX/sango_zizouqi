import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {famous,controls,makeCase,simulate,seeds,sourceHash,RULES_VERSION} from './basic-balance-lib.mjs';
const dir=new URL('../outputs/basic-balance/',import.meta.url);mkdirSync(dir,{recursive:true});const hash=sourceHash(),cases=[];
for(const h of famous){const cs=controls(h);for(const c of cs)cases.push(makeCase(h,'duel',c));for(const r of [h,...cs])cases.push(makeCase(h,'squad',cs[0],r));}
writeFileSync(new URL('manifest.json',dir),JSON.stringify({rulesVersion:RULES_VERSION,hash,seeds,criteria:{crushed:'loss rate >=75%, mean enemy survival on defeats >=50%, losses on both sides; exploration only',ordinary:'no exclusive; leadership/force/intellect <=80; primary >=65; same troop aptitude >=A; role-matched median and upper controls'},cases},null,2));
writeFileSync(new URL('development.jsonl',dir),'');let count=0;
for(const h of famous){for(const c of cases.filter(c=>c.hero===h.id))for(const level of [1,5,10])for(const seed of seeds.development)for(const swapped of [false,true]){const r=simulate(c,{level,seed,swapped,replay:level===5&&seed===seeds.development[0]&&!swapped});appendFileSync(new URL('development.jsonl',dir),JSON.stringify(r)+'\n');count++;}console.log(h.name,count);}
if(sourceHash()!==hash)throw Error('Source changed during audit; results must be rerun');console.log('Complete',count);
