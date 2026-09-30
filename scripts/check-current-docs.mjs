import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RULES_VERSION} from '../combat-rules.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(join(root,'docs/current-docs.json'),'utf8'));
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const actual=walk(join(root,'docs')).filter(p=>p.endsWith('.md')).map(p=>relative(root,p).replaceAll('\\','/'));
const errors=[];
if(manifest.rulesVersion!==RULES_VERSION)errors.push('规则版本已变化，请复核文档并更新 docs/current-docs.json。');
for(const p of actual)if(!manifest.files.includes(p))errors.push('未纳入当前文档清单：'+p+'；请确认不是旧报告重新生成。');
for(const p of manifest.files)if(!existsSync(join(root,p)))errors.push('文档清单引用不存在文件：'+p);
const stale=[/历史(?:实现|资料|说明|设计|验证记录|版本)[:：]/,/以下保留为历史/,/当前规则(?:版本)?(?:为)?\s*(?:19|28|31|49)(?:[，。：；])/,
 /每级25%，5级必得/,/S适性5级保底/,/B适性8级保底/,/可随机学习的普通战法/,/进入骑兵谋略学习池/,/通过正常学习成为/,/迟滞／衰咒/,/一层衰咒/,/奸雄：邻接敌军概率混乱/,/战法随机学习-规则40\.md/,/辅兵\s*\|\s*200/,/辅兵(?:继续|暂)?按政治/,/当前.*?835名/,/抛锚.*?减伤 25%/,/锦帆.*?首次入场获得10日伏兵/,/疑兵和雾隐通过正常学习/,/玩家开战前只能调整施放顺序/,/每组相邻据点有两条独立道路/];
const files=[...actual,'README.md','技能设计表.md','AGENTS.md'];
for(const p of files){
 const text=readFileSync(join(root,p),'utf8');
 for(const pattern of stale)if(pattern.test(text))errors.push('发现失效条文：'+p+' '+pattern);
 for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  let target=m[1].split('#')[0];
  if(!target||/^[a-z][a-z\d+.-]*:/i.test(target))continue;
  try{target=decodeURIComponent(target);}catch{}
  if(!existsSync(resolve(root,dirname(p),target)))errors.push('失效链接：'+p+' → '+target);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`当前规则${RULES_VERSION}：${actual.length}份文档清单、${files.length}份Markdown链接及失效条文检查通过。`);
