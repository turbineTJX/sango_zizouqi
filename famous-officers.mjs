import {TRAIT_DESIGNS} from './data/design/traits.mjs';
// Stable catalogue IDs; no name matching at runtime. This is the shared design data.
const attack=(name,category,threshold,cooldown,range,scale,extra={})=>({name,category,threshold,cooldown,range,scale,mode:'attack',...extra});
const support=(name,threshold,cooldown,extra={})=>({name,category:'intellect',threshold,cooldown,range:3,mode:'support',targets:2,...extra});
const physical=(name,t,c,r,s,e)=>attack(name,'force',t,c,r,s,e);
const mental=(name,t,c,r,s,e)=>attack(name,'intellect',t,c,r,s,e);
const entry=(name,role,type,tactic,route=null,ultimate=null)=>({name,role,type,tactic,route,ultimate});
// Personal skills strengthen the led unit, independently of the equipped tactic.
const cap=name=>{const t=Object.values(TRAIT_DESIGNS).find(t=>t.mechanics&&t.name===name);return t?{troops:[...new Set(t.mechanics.flatMap(m=>m.troops||[]))],description:t.description}:null;};
export const FAMOUS_OFFICERS={
 cao:entry('曹操','攻防号令','spear',support('魏武之强',65,32,{targets:2,excludeSelf:true,intent:12,buffs:{valor:.8,camp:.6},buffSteps:7,tempo:{cost:30,role:'交锋专属'}})),
 dun:entry('夏侯惇','反压前锋','spear',physical('豪气冲天',45,26,1,.8,{selfWard:20,selfWardSteps:8,debuff:'weaken',steps:6,allyIntent:10,allyRange:2,allyTargets:1,tempo:{cost:12,role:'持续专属'}})),
 liao:entry('张辽','突击控制','cavalry',null),
 chu:entry('许褚','贴身护卫','spear',null),
 jia:entry('郭嘉','压制战意','crossbow',null),
 'person-255':entry('荀彧','王佐救急','spear',support('王佐之才',35,26,{targets:1,excludeSelf:true,shield:.025,cleanse:true,intent:18,tempo:{cost:10,role:'持续专属'}})),
 yu:entry('荀攸','解围支援','crossbow',support('奇策解围',65,34,{shield:.025,cleanse:true})),
 yuanxia:entry('夏侯渊','远程快攻','archer',physical('千里奔袭',55,24,5,1.15,{debuff:'slow',steps:5,exploit:{statuses:['armorBreak','slow'],scale:.7},tempo:{cost:20,role:'交锋专属'}})),
 jin:entry('于禁','军阵守备','spear',support('持军毅重',65,32,{range:2,ward:25})),
 shao:entry('袁绍','集群进攻','spear',support('名门号令',60,30,{range:2,valor:true})),
 yan:entry('颜良','单体破阵','cavalry',physical('河北先登',70,26,1,1.8,{debuff:'armorBreak',steps:5})),
 wen:entry('文丑','追击残军','cavalry',physical('骁骑追斩',65,26,1,1.5,{execute:.6})),
 he:entry('张郃','侧翼牵制','spear',physical('巧变袭阵',65,26,2,1.25,{debuff:'weaken',steps:5})),
 ju:entry('沮授','筹策护军','crossbow',support('监军持重',65,34,{targets:1,shield:.07})),
 tian:entry('田丰','封技谋攻','archer',mental('刚谏破谋',70,28,4,1.05,{debuff:'seal',steps:3})),
 gao:entry('高览','前线承压','cavalry',physical('奋武坚阵',60,26,1,1.35,{selfWard:18})),
 'person-636':entry('刘备','义勇救援','spear',support('义勇援军',40,28,{targets:2,heal:.08,intent:10,buffs:{camp:.6},buffSteps:6,requiresWounded:true,tempo:{cost:12,role:'持续专属'}}),['benevolence','discipline','shield','calm'],cap('昭烈')),
 'person-99':entry('关羽','破甲斩将','cavalry',physical('青龙偃月',100,34,1,2,{execute:.6,exploit:{statuses:['armorBreak','confuse','slow'],scale:.9},debuff:'armorBreak',steps:5,tempo:{cost:65,role:'决胜专属'}}),['martial','spirit','rider','joint'],cap('武圣')),
 'person-433':entry('张飞','邻阵震慑','spear',physical('长坂怒喝',85,32,1,.9,{targets:3,radius:1,control:'confuse',steps:3,selfWard:15,selfWardSteps:6,tempo:{cost:45,role:'决胜专属'}}),['assault','endurance','spearGeneral','desperate'],cap('燕人')),
 'person-396':entry('赵云','攻守救援','cavalry',physical('七进七出',60,26,2,1.45,{selfCleanse:true,selfWard:12}),['martial','discipline','rider','calm'],cap('龙胆')),
 'person-516':entry('马超','骑阵破防','cavalry',physical('西凉铁骑',70,28,1,1.2,{targets:2,radius:1,debuff:'armorBreak',steps:4}),['assault','martial','rider','joint'],cap('锦骑')),
 'person-186':entry('黄忠','远距点杀','archer',physical('百步穿杨',70,28,5,1.65,{execute:.45}),['assault','spirit','bow','joint'],cap('老健')),
 'person-290':entry('诸葛亮','破谋控场','crossbow',mental('八阵奇门',90,36,4,.65,{targets:3,radius:1,debuff:'seal',steps:4,drain:12,exploit:{statuses:['slow','curse'],scale:.45},tempo:{cost:50,role:'决胜专属'}}),['scholar','discipline','combo','calm'],cap('卧龙')),
 'person-558':entry('庞统','连环谋攻','archer',mental('连环奇计',70,30,4,.9,{targets:3,radius:1,debuff:'slow',steps:4}),['scholar','spirit','combo','discipline'],cap('凤雏')),
 'person-137':entry('姜维','文武压制','spear',mental('麒麟破阵',65,26,3,1.15,{drain:20}),['martial','scholar','discipline','combo'],cap('幼麟')),
 'person-125':entry('魏延','孤军斩击','spear',physical('子午奇袭',65,26,1,1.65,{execute:.4}),['assault','martial','joint','desperate'],cap('奇兵')),
 'person-368':entry('孙权','制衡援军','spear',support('江东制衡',50,28,{targets:2,excludeSelf:true,cleanse:true,cooldownReduction:3,ward:12,tempo:{cost:18,role:'持续专属'}}),['iron','discipline','shield','calm'],cap('碧眼')),
 'person-371':entry('孙策','突阵压制','cavalry',physical('霸王讨逆',60,28,2,1.35,{debuff:'armorBreak',steps:5,selfWard:10,selfWardSteps:6,allyIntent:12,allyRange:2,allyTargets:1,tempo:{cost:25,role:'交锋专属'}}),['assault','martial','rider','joint'],cap('霸业')),
 'person-246':entry('周瑜','火攻破阵','archer',mental('神火燎原',100,36,4,1.1,{targets:3,radius:1,burn:28,steps:6,debuff:'armorBreak',exploit:{statuses:['burn'],scale:.9},tempo:{cost:65,role:'决胜专属'}}),['scholar','spirit','combo','discipline'],cap('都督')),
 'person-668':entry('鲁肃','战意补给','crossbow',support('榻上定策',55,30,{targets:1,intent:32}),['wealth','discipline','shield','affinity'],cap('济军')),
 'person-662':entry('吕蒙','攻心封技','spear',mental('白衣渡江',65,28,4,1.05,{debuff:'seal',steps:3}),['assault','scholar','spear','combo'],cap('克己')),
 'person-603':entry('陆逊','火攻削弱','archer',mental('火烧连营',100,32,4,1.35,{targets:3,radius:1,burn:30,steps:5}),['scholar','discipline','combo','calm'],cap('燎原')),
 'person-119':entry('甘宁','近战袭扰','cavalry',physical('百骑劫营',65,28,2,1.45,{drain:20}),['assault','spirit','rider','interdict'],cap('锦帆')),
 'person-390':entry('太史慈','连射压制','cavalry',physical('弦无虚发',65,26,4,.9,{hits:2}),['martial','spirit','cavalryGeneral','joint'],cap('笃烈')),
 'person-164':entry('黄盖','火攻承伤','archer',physical('苦肉火船',60,28,4,1.45,{burn:40,steps:6,selfCost:.01}),['assault','endurance','bow','desperate'],cap('苦肉')),
 'person-226':entry('司马懿','后发压制','crossbow',mental('鹰视狼顾',70,32,4,.8,{drain:24,debuff:'weaken',steps:5,highIntent:{threshold:60,scale:.65,drain:16},tempo:{cost:30,role:'交锋专属'}}),['scholar','discipline','suppress','stifle'],cap('隐忍')),
 'person-291':entry('徐晃','破阵削弱','spear',physical('长驱直入',65,26,1,1.6,{debuff:'weaken',steps:5}),['martial','discipline','spear','joint'],cap('长驱')),
 'person-472':entry('典韦','承压反击','halberd',physical('古之恶来',45,28,1,.75,{selfWard:15,selfWardSteps:8,selfRiposte:8,tempo:{cost:15,role:'持续专属'}}),['iron','endurance','halberdDrill','desperate'],cap('恶来')),
 'person-661':entry('吕布','震军强攻','cavalry',physical('人中吕布',100,38,1,1.6,{targets:3,radius:1,debuff:'attackSlow',steps:4,exploit:{statuses:['armorBreak','slow'],scale:.7},tempo:{cost:70,role:'决胜专属'}}),['assault','martial','rider','joint'],cap('飞将')),
 'person-425':entry('貂蝉','单体扰乱','crossbow',mental('闭月离间',65,30,4,1.1,{control:'confuse',steps:3}),['scholar','discipline','combo','calm'],cap('倾城')),
 'person-404':entry('张角','范围谋攻','archer',mental('黄天当立',100,32,4,1.4,{targets:3,radius:1}),['scholar','spirit','combo','discipline'],cap('天公')),
 'person-494':entry('董卓','强攻夺气','cavalry',physical('暴戾横征',70,30,1,1.7,{drain:25,selfCost:.03}),['assault','endurance','rider','desperate'],cap('暴虐')),
};
export const famousTacticId=id=>'unique-'+id;
export const famousPassiveId=id=>'hero-'+id;
export const ultimateDescription=p=>p.description;
export function famousTacticDescription(s){
 const parts=[`${s.range} 格内${s.mode==='support'?'友军':'敌军'}，最多 ${s.targets||1} 队`];
 if(s.targets>1&&s.mode==='attack')parts.push(`目标周围 ${s.radius} 格，优先覆盖更多敌军`);
 if(s.scale)parts.push(`造成${s.category==='force'?'武技':'谋略'}伤害${s.hits?'，连续攻击 '+s.hits+' 次':''}`);
 if(s.execute)parts.push(`目标兵力低于 40% 时伤害提高`);
 if(s.exploit)parts.push(`施放前目标已有${s.exploit.statuses.map(key=>({armorBreak:'破甲',slow:'迟滞',confuse:'混乱',burn:'灼烧',curse:'衰咒'})[key]).join('／')}时，伤害提高；本次新施加的状态不触发`);
 if(s.highIntent)parts.push(`施放前目标战意至少 ${s.highIntent.threshold} 时，提高伤害并削减 ${s.highIntent.drain||0} 战意`);
 if(s.excludeSelf)parts.push('只支援其他友军，不作用于自身');
 if(s.debuff)parts.push(`${({armorBreak:'防御 −20%',weaken:'攻击 −20%',slow:'移动减慢',seal:'封技',shaken:'普攻间隔 +25%、谋略威力 −15%'})[s.debuff]} ${s.steps} 日`);
 if(s.control)parts.push(`${s.control==='confuse'?'混乱':'混乱'} ${s.steps} 日（受军纪减免和免控限制）`);
 if(s.burn)parts.push(`叠加一层灼烧（最多三层），单层每日基础 ${s.burn}，刷新 ${s.steps} 日，按兵力与目标军纪衰减`);
 if(s.shield)parts.push(`给予护盾，护盾量与目标兵力上限、谋略威力有关，持续 8 日`);
 if(s.heal)parts.push(`救治本场伤兵，恢复量与友军兵力上限、战法威力有关；无伤兵不发动`);
 if(s.buffs)parts.push(Object.entries(s.buffs).map(([key,value])=>`${{valor:'攻击',camp:'防御'}[key]} +${Math.round(value*25)}%`).join('、')+`，持续 ${s.buffSteps} 日（幅度随战法威力成长）`);
 if(s.allyIntent)parts.push(`命中后为自身 ${s.allyRange} 格内最多 ${s.allyTargets} 队其他友军增加 ${s.allyIntent} 战意；优先战意低者`);
 if(s.intent)parts.push(`战意 +${s.intent}`);
 if(s.drain)parts.push(`敌方战意 −${s.drain}`);
 if(s.cooldownReduction)parts.push(`其他友军冷却缩短 ${s.cooldownReduction} 日`);
 if(s.ward||s.selfWard)parts.push(`${s.selfWard?'自身':'目标'}减伤 ${s.ward||s.selfWard}%，持续 ${s.selfWard?s.selfWardSteps||5:5} 日`);
 if(s.selfRiposte)parts.push(`自身进入反击 ${s.selfRiposte} 日：受相邻直接攻击后以武技反击，每日最多一次，无反击链或额外战意`);
 if(s.valor)parts.push('目标攻击 +25%，持续 5 日');
 if(s.cleanse||s.selfCleanse)parts.push(`镇静${s.selfCleanse?'自身':'目标'}，免控 3 日`);
 if(s.selfCost)parts.push(`自身损失当前兵力 ${s.selfCost*100}%（保留至少 1 人，不产生战意）`);
 return parts.join('；');
}
