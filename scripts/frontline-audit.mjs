// Same real-combat fixtures before/after the AI change; no injected casts.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture,sample,paired,generals,contexts,formations} from './role-validation.mjs';
import {roleTacticIds} from '../tactics.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const phase=process.argv[2];if(!['before','after'].includes(phase))throw Error('Use before or after');
const out='docs/frontline-v11';mkdirSync(out,{recursive:true});
const seeds=[1009,1103,1201,1301,1409,1511,1601,1709,1801,1907,2003,2111],g=generals[1];
const mean=xs=>Math.round(xs.reduce((n,x)=>n+x,0)/xs.length*100)/100;
const rows=[];
for(const context of Object.keys(contexts))for(const formation of Object.keys(formations)){
  for(const role of ['assault','guard','control','spearGuard']){
    const type=role==='spearGuard'?'spear':'cavalry',ids=roleTacticIds({type},role==='spearGuard'?'guard':role);
    const runs=sample(fixture(g,context,formation,10),g,ids,seeds,type);
    rows.push({context,formation,role,ids,runs,summary:Object.fromEntries(['win','margin','backline','alive60','damage','rearHits','incomingHits'].map(k=>[k,mean(runs.map(r=>r[k]))]))});
  }
  console.log(`${phase}: ${context} ${formation}`);
}
const files=['engine.mjs','tactics.mjs','combat-rules.mjs',...(phase==='after'?['engagement.mjs']:[])];
writeFileSync(`${out}/${phase}.json`,JSON.stringify({rulesVersion:RULES_VERSION,count:rows.length*seeds.length*2,seeds,hashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),rows},null,2));
if(phase==='after'){
  const before=JSON.parse(readFileSync(`${out}/before.json`,'utf8'));
  const changes=rows.map(r=>{const old=before.rows.find(a=>a.context===r.context&&a.formation===r.formation&&a.role===r.role);return {...r,changes:Object.fromEntries(['margin','backline','alive60'].map(k=>[k,paired(r.runs,old.runs,k)])),before:old.summary};});
  writeFileSync(`${out}/comparison.json`,JSON.stringify(changes.map(({runs,...r})=>r),null,2));
  const labels={assault:'骑兵输出',guard:'骑兵护卫',control:'骑兵策应',spearGuard:'枪兵护卫'};
  const lines=['# 前排拦截 AI 对照验证','',`前后各 ${rows.length*seeds.length*2} 场；关羽、黄忠、诸葛亮10级，零战意开局，12固定种子双向镜像，四种敌阵×三种布阵×四种关羽配置。测试保持技能数值、属性和队友相同。`,'','| 敌阵 | 布阵 | 配置 | 后排余兵：改前→改后 | 全队兵力差变化 | 近似95%配对区间 |','|---|---|---|---|---:|---|',...changes.map(r=>`| ${contexts[r.context].name} | ${formations[r.formation].name} | ${labels[r.role]} | ${r.before.backline} → ${r.summary.backline} | ${r.changes.margin.mean} | [${r.changes.margin.low}, ${r.changes.margin.high}] |`),'','双方同样受新规则约束，因此不要求我方胜率一律上升。单前排仍无法封锁整条战线；范围伤害、远程攻击与谋略仍可以威胁后排。定点测试另验证接战锁定、移动拦截、冲锋拦截、控制解除、侧翼缺口与存档续战。',''];
  writeFileSync(`${out}/对照报告.md`,lines.join('\n'));
}
