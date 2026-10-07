import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {famous,controls,makeCase,simulate,seeds,sourceHash} from './basic-balance-lib.mjs';
const dir=new URL('../outputs/basic-balance/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',dir))),selected=JSON.parse(readFileSync(new URL('validation-plan.json',dir))).selectedOnDevelopmentOnly;
if(sourceHash()!==manifest.hash)throw Error('Runtime changed');writeFileSync(new URL('followups.jsonl',dir),'');let n=0;
for(const x of selected){const h=famous.find(o=>o.id===x.id),opponent=controls(h)[1];
 const specs=['spear','halberd','cavalry','archer','crossbow','siege','ram','tower'].map(type=>({...makeCase(h,'duel',opponent,h,type),followup:'troop'}));
 for(const focal of [h,opponent])for(const variant of ['advisor','mirror-bonds-off-no-commands'])specs.push({...makeCase(h,'squad',controls(h)[0],focal),followup:variant});
 for(const spec of specs)for(const level of [5,10])for(const seed of seeds.validation)for(const swapped of [false,true]){const r=simulate(spec,{level,seed,swapped,variant:spec.followup==='troop'?'default':spec.followup});r.followup=spec.followup;appendFileSync(new URL('followups.jsonl',dir),JSON.stringify(r)+'\n');n++;}console.log(h.name,n);
}
if(sourceHash()!==manifest.hash)throw Error('Runtime changed');console.log('Followups',n);
