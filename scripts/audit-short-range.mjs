import {writeFileSync} from 'node:fs';
import {RULES_VERSION} from '../combat-rules.mjs';
import {hexDistance} from '../hex-grid.mjs';
import {generateBattle} from '../battle-generator.mjs';
import {lockDeployment,stepBattle,validateSave} from '../engine.mjs';
const rows=[];
for(const level of [1,5,10])for(const seed of [810001,817920,910001,917920])for(const swapped of [false,true]){
 const team=[{id:'person-2',type:'tower',troops:2000,level},{id:'cao',type:'spear',troops:2000,level}],enemy=[{id:'shao',type:'archer',troops:2000,level},{id:'dun',type:'spear',troops:2000,level}];
 const draft={seed,terrain:'land',battleKind:'field',limit:360,shieldPercent:0,ownTeam:swapped?enemy:team,enemyTeam:swapped?team:enemy};
 const state=generateBattle(draft),b=state.battle;lockDeployment(b);let ticks=[],closestRanged=null,closestReadyRanged=null,maxIntent=0;while(!b.result){stepBattle(b);const caster=b.sides[swapped?1:0].units.find(u=>u.id==='person-2');if(caster.status==='active'){maxIntent=Math.max(maxIntent,caster.intent);for(const target of b.sides[swapped?0:1].units.filter(u=>u.status==='active'&&u.type==='archer')){const d=hexDistance(caster,target);closestRanged=Math.min(closestRanged??Infinity,d);if(caster.intent>=30)closestReadyRanged=Math.min(closestReadyRanged??Infinity,d);}}for(const e of b.effects)if(e.phase==='cast'&&e.label==='短射')ticks.push(b.tick);}
 validateSave(state);const u=b.sides[swapped?1:0].units.find(u=>u.id==='person-2');rows.push({level,seed,swapped,draft,result:b.result,casts:u.tacticCasts,ticks,closestRanged,closestReadyRanged,maxIntent,contribution:u.contribution});
}
writeFileSync(new URL('../outputs/custom-strength/short-range.json',import.meta.url),JSON.stringify({rulesVersion:RULES_VERSION,note:'自然接敌与自动战法覆盖；玩家不手动下军略，敌方沿用游戏AI，不用于双方公平胜率结论。',rows},null,2));console.log(rows.length,'battles',rows.reduce((n,r)=>n+(r.casts.cutRange||0),0),'short range casts');
