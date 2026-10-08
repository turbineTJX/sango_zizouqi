import {readFile,writeFile} from 'node:fs/promises';
import {STRATAGEM_DESIGNS as old} from '../data/design/stratagems.mjs';
import {OFFICER_ASSIGNMENTS as assignments} from '../data/design/assignments.mjs';
import {OFFICER_DESIGNS as officers} from '../data/design/officers.mjs';
const rare={
 invincible:['person-636','person-255','person-668','person-578','person-601','ju'],
 disrupt:['person-61','person-557','person-558','person-603','person-264','tian','person-294','person-605'],
 ambush:['liao','person-662','person-482','person-137','person-447','person-462','person-77','person-228','person-229','person-502','person-281','person-246'],
};
// Explicit, finite rosters. Existing exclusive owners retain their own command.
rare.ambush=rare.ambush.filter(id=>id!=='person-246');
const basic=(name,effect,side,duration,cooldown,description,extra={})=>({name,group:side?'control':'support',cost:1,duration,cooldown,description,side,effect,icon:side?'wind':'home',pool:'ordinary',owner:null,scope:{shape:'circle',radius:2},...extra});
const designs={
 fortify:basic('坚壁护军','shield',0,12,40,'圆形半径2格；选区内在场友军获得兵力上限25%的护盾，按统率与智力折算，持续12回合；各来源独立吸收，不能为同源重复叠盾',{baseStrength:.25}),
 heal:basic('三军救疗','heal',0,0,36,'圆形半径2格；立即救治选区内在场友军本场伤兵，每队最多恢复兵力上限20%，按统率与智力折算；不复活、不凭空补兵',{baseStrength:.2}),
 cleanse:basic('肃清军阵','cleanse',0,0,32,'圆形半径2格；驱散选区内友军全部战斗异常，保留缺粮；获得坚定，基准持续6回合，按统率与智力折算',{resolve:6}),
 invincible:basic('三军死守','invincible',0,4,80,'圆形半径2格；选区内在场友军获得无敌4回合，免疫直接、持续、分担和传导伤害，仍可行动；不驱散控制，不免除缺粮与主动代价',{roster:rare.invincible}),
 ambush:basic('伏兵奇袭','ambush',0,12,56,'圆形半径2格；选区内在场友军获得伏兵12回合，沿共同伏兵规则潜行、接敌首击并使目标混乱1回合；攻击或受伤显形，洞察可识破',{roster:rare.ambush}),
 disrupt:basic('震慑敌阵','stun',1,4,64,'圆形半径2格；选区内敌军眩晕4回合，停止移动、普攻、反击、战法及ZOC；立即打断待结算战法。遵守魔免、坚定、控制保护与有害来源免疫',{roster:rare.disrupt}),
 ward:basic('御敌军阵','magicImmunity',0,8,72,'圆形半径2格；选区内友军获得魔免8回合，驱散战斗异常，仅承受物理普攻；不免除缺粮或主动代价'),
 swift:basic('奇兵疾进','rapidAdvance',0,12,56,'圆形半径2格；选区内友军获得神速12回合：移动力+1、攻击间隔缩短25%、无视ZOC；仍遵守地形与占位'),
 blockade:{...basic('截断援路','blockade',1,20,60,'阻止敌军预备队补位20回合；不移除敌军，不推迟实际援军到达日期'),scope:{shape:'reserve'},field:'blockadeUntil'},
 firestorm:{...basic('火攻连营','firestorm',1,16,56,'矩形4×3格，可旋转；按我军在场谋略威力生成125%总火势，以全部合法在场敌军数分摊，仅向选区内敌军施加灼烧16回合；护盾可吸收，可扑火解除，不产生战意'),scope:{shape:'rectangle',width:4,height:3},baseStrength:1.25},
};
for(const key of ['cao-wuchao','zhou-redcliffs','zhuge-eight'])designs[key]=structuredClone(old[key]);
Object.assign(designs['cao-wuchao'],{cooldown:80});
Object.assign(designs['zhou-redcliffs'],{duration:16,cooldown:64,baseStrength:1.6});
designs['zhou-redcliffs'].description=designs['zhou-redcliffs'].description.replace('生成总火势','生成160%总火势').replace('持续12回合','持续16回合');
Object.assign(designs['zhuge-eight'],{duration:24,cooldown:96});
designs['zhuge-eight'].zone.statusSteps=3;
designs['zhuge-eight'].description=designs['zhuge-eight'].description.replace('持续18回合','持续24回合').replace('持续2回合','持续3回合');
const rosters={
 fortify:['jin','shao','person-46','person-68','person-93','person-77','person-247','person-251','person-291','person-295','person-366','person-368','person-408','person-470','person-567','person-610','person-455','person-99'],
 heal:['person-668','person-263','person-529','person-520'],
 cleanse:['yu','person-294','person-462','person-502','person-290'],
 invincible:['person-636','person-578','person-601','ju'],
 ambush:['person-61','person-557','person-447','person-482','person-137','person-456','person-119'],
 disrupt:['person-558','tian','person-605'],
 ward:['person-226','person-255'],
 swift:['jia','liao'],
 blockade:['person-264','person-304','person-642'],
 firestorm:['person-662','person-603'],
};
// One ordinary repertoire per designated holder; Zhuge Liang adds one to his exclusive.
const assigned=new Set(['cao','person-246','person-290']);
for(const key of ['ward','swift','blockade','firestorm','invincible','disrupt','ambush','heal','cleanse','fortify'])rosters[key]=rosters[key].filter(id=>{if(id==='person-290')return key==='cleanse';if(assigned.has(id))return false;assigned.add(id);return true;});
for(const [key,roster] of Object.entries(rosters))designs[key].roster=roster;
await writeFile('data/design/stratagems.mjs','// Authoritative design data. Edit here; runtime imports this table.\nexport const STRATAGEM_DESIGNS = '+JSON.stringify(designs,null,2)+';\n');
for(const [id,a] of Object.entries(assignments)){
 const exclusive=Object.keys(designs).find(key=>designs[key].owner===id);
 const special=Object.entries(rosters).find(([,roster])=>roster.includes(id))?.[0];
 a.stratagems=officers[id].intellect<70?[]:exclusive?[exclusive,...(id==='person-290'?['cleanse']:[])]:special?[special]:[];
}
let source=await readFile('data/design/assignments.mjs','utf8');
const end=source.indexOf('\nexport const TROOP_TACTIC_POOLS');
if(end<0)throw Error('Assignments export boundary missing');
source='// Authoritative officer assignments. Fixed repertoire; no random military commands.\nexport const OFFICER_ASSIGNMENTS = '+JSON.stringify(assignments,null,2)+';\n'+source.slice(end);
await writeFile('data/design/assignments.mjs',source);
console.log(Object.fromEntries(Object.keys(designs).map(key=>[key,Object.values(assignments).filter(a=>a.stratagems.includes(key)).length])));
