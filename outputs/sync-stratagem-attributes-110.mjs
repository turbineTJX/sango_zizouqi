import {readFileSync,writeFileSync} from 'node:fs';
import {STRATAGEM_DESIGNS as designs} from '../data/design/stratagems.mjs';
import {RULES_VERSION} from '../combat-rules.mjs';
const descriptions={
 fortify:'圆形半径2格；选区内在场友军获得护盾，基准为兵力上限25%，按施放者统率与智力折算；持续12回合，各来源独立吸收，不能为同源重复叠盾',
 heal:'圆形半径2格；立即救治选区内在场友军本场伤兵，每队基准上限为兵力上限20%，按施放者统率与智力折算；不复活、不凭空补兵',
 cleanse:'圆形半径2格；驱散选区内友军全部战斗异常，保留缺粮；获得坚定，基准持续6回合，按施放者统率与智力折算',
 invincible:'圆形半径2格；选区内在场友军获得军阵无敌，基准持续4回合，按施放者统率与智力折算；免疫直接、持续、分担和传导伤害，仍可行动；不驱散控制，不免除缺粮与主动代价',
 ambush:'圆形半径2格；选区内在场友军获得伏兵，基准持续12回合，按施放者统率与智力折算；沿共同伏兵规则潜行、接敌首击并使目标混乱1回合；攻击或受伤显形，洞察可识破',
 disrupt:'圆形半径2格；选区内敌军眩晕，基准持续4回合，按施放者统率与智力折算；停止移动、普攻、反击、战法及ZOC，立即打断待结算战法；遵守魔免、坚定、控制保护与有害来源免疫',
 ward:'圆形半径2格；选区内友军获得魔免，基准持续8回合，按施放者统率与智力折算；驱散战斗异常，仅承受物理普攻；不免除缺粮或主动代价',
 swift:'圆形半径2格；选区内友军获得神速，基准持续12回合，按施放者统率与智力折算；移动力+1、攻击间隔缩短25%、无视ZOC，仍遵守地形与占位',
 blockade:'阻止敌军预备队补位，基准持续20回合，按施放者统率与智力折算；不移除敌军，不推迟实际援军到达日期',
 firestorm:'矩形4×3格，可旋转；按我军在场谋略威力生成基准125%总火势，强度按施放者统率与智力折算；以全部合法在场敌军数分摊，仅向选区内敌军施加灼烧16回合；护盾可吸收，可扑火解除，不产生战意',
 'zhou-redcliffs':'矩形4×3格，可旋转；按我军在场谋略威力生成基准160%总火势，强度按施放者统率与智力折算；以全部合法在场敌军数分摊，仅向选区内敌军施加灼烧16回合；对舰船火势提高25%；可扑火解除、护盾吸收，不产生战意',
};
for(const [key,text]of Object.entries(descriptions))designs[key].description=text;
const designPath='data/design/stratagems.mjs',header=readFileSync(designPath,'utf8').split(/\r?\n/)[0];
writeFileSync(designPath,header+'\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(designs,null,2)+';\n');
const docPath='docs/军略资格与施放-规则51.md';let doc=readFileSync(docPath,'utf8');
const table='下表的比例与时长为综合属性80时的基准；实际效果按施放者统智折算，详见[军略强度](军略强度与持有者-规则46.md)。\n\n| 军略 | 范围与基准效果 | 独立冷却（模拟回合） |\n| --- | --- | --- |\n'+Object.values(designs).map(s=>'| '+s.name+' | '+s.description+' | '+s.cooldown+' |').join('\n');
doc=doc.replace(/\| 军略 \| 范围与效果[\s\S]*?(?=\n\n护盾基准)/,table);
doc=doc.replace(/御敌军阵为范围魔免8回合；魏武挥鞭[\s\S]*?最多12回合。/,'御敌军阵的基准魔免为8回合，按施放者统智折算；魏武挥鞭先按受益者施放时军纪计算4＋⌊军纪÷25⌋、基准最多12回合，再乘施放者统智系数。');
doc=doc.replace('每场一次，持续24回合；每回合行动前','每场一次，基准持续24回合，按施放者统智折算；每回合行动前');
doc=doc.replace('点击军略入口暂停并直接显示完整列表，展示实际提供者、效果与独立冷却。','点击军略入口暂停并直接显示完整列表，展示实际提供者、统智、折算后的效果与独立冷却。选区预览同样显示实际提供者及效果。');
doc=doc.replace('冷却、施放来源、选区、护盾层、持续状态、八阵区域及限次','冷却、施放来源与统智快照、实际强度与期限、选区、护盾层、持续状态、八阵区域及限次');
writeFileSync(docPath,doc);
const manifestPath='docs/current-docs.json',manifest=JSON.parse(readFileSync(manifestPath,'utf8'));manifest.rulesVersion=RULES_VERSION;writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const packagePath='package.json',pkg=JSON.parse(readFileSync(packagePath,'utf8'));
if(!pkg.scripts['test:stratagems'].includes('tests/stratagem-attributes.test.mjs'))pkg.scripts['test:stratagems']+=' tests/stratagem-attributes.test.mjs';
writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n');
