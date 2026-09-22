import {mkdirSync,writeFileSync} from 'node:fs';
import {createScenario} from '../scenarios.mjs';
import {validateSave} from '../engine.mjs';
import {HERO_CASES,HERO_COMPOSITIONS,heroCaseTeam,heroDraft} from './hero-redesign-cases.mjs';
const dir='outputs/hero-v44/playable';mkdirSync(dir,{recursive:true});
for(const fixture of [...HERO_CASES.map(([id,name,type])=>({id,name,team:heroCaseTeam(id,type)})),...HERO_COMPOSITIONS.map((c,i)=>({...c,id:['wei','shu','wu'][i]}))]){
 const seed=479806,draft=heroDraft(fixture.team,seed,8,'equal',0);
 const state=createScenario('custom-battle',seed,20,null,draft);validateSave(state);
 writeFileSync(`${dir}/${fixture.id}.json`,JSON.stringify(state,null,2)+'\n');
}
console.log('18个可导入自定义战役已生成：8级，种子479806，尚未确认开战。');
