import {BANDIT_RULES as R,BANDIT_NAMES as N} from './data/design/bandits.mjs';
import {emptyRelations} from './officer-catalog.mjs';
export const GENERATED_STATS=['leadership','force','intellect','politics','charm'];
export function generatedOfficerSource(g){
 if(!g||g.version!==1||!/^bandit-person-\d+-\d+$/.test(g.id)||!Number.isSafeInteger(g.seed)||g.seed<0||g.seed>0xffffffff||!g.average||!GENERATED_STATS.every(k=>Number.isFinite(g.average[k])&&g.average[k]>=0&&g.average[k]<=100)||!Number.isFinite(g.average.level)||g.average.level<1||g.average.level>10||!Number.isSafeInteger(g.year))return null;
 let seed=g.seed;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(random()*a.length)];
 const name=pick(N.surnames)+pick(N.given)+(random()<.4?pick(N.given):''),courtesy=pick(N.courtesy)+pick(N.given),stats=Object.fromEntries(GENERATED_STATS.map(k=>[k,Math.max(0,Math.floor(g.average[k]*(R.abilityMinimum+random()*(R.abilityMaximum-R.abilityMinimum))))]));
 return {id:g.id,name,courtesy,...stats,personality:1+Math.floor(random()*4),righteousness:1+Math.floor(random()*5),compatibility:Math.floor(random()*150),sex:random()<.15?1:0,birthYear:g.year-22-Math.floor(random()*25),deathYear:g.year+40,relations:emptyRelations(),skill:'',trait:'',loyalty:100};
}
export const generatedOfficer=u=>generatedOfficerSource(u?.generatedOfficer);
export function validGeneratedOfficer(u){const source=generatedOfficer(u);return !!source&&Object.entries(source).every(([k,v])=>JSON.stringify(u[k])===JSON.stringify(v));}
