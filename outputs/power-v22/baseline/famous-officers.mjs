// Stable catalogue IDs; no name matching at runtime. This is the shared design data.
const attack=(name,category,threshold,cooldown,range,scale,extra={})=>({name,category,threshold,cooldown,range,scale,mode:'attack',...extra});
const support=(name,threshold,cooldown,extra={})=>({name,category:'intellect',threshold,cooldown,range:3,mode:'support',targets:2,...extra});
const physical=(name,t,c,r,s,e)=>attack(name,'force',t,c,r,s,e);
const mental=(name,t,c,r,s,e)=>attack(name,'intellect',t,c,r,s,e);
const entry=(name,role,type,tactic,route=null,ultimate=null)=>({name,role,type,tactic,route,ultimate});
const cap=(name,trigger,kind,bonus)=>({name,trigger,kind,bonus});
export const FAMOUS_OFFICERS={
 cao:entry('曹操','统御援护','spear',support('魏武挥鞭',70,32,{shield:.04,intent:12})),
 dun:entry('夏侯惇','反压前锋','spear',physical('拔矢啖睛',65,26,1,1.6,{selfWard:15})),
 liao:entry('张辽','突击控制','cavalry',null),
 chu:entry('许褚','贴身护卫','spear',null),
 jia:entry('郭嘉','压制战意','crossbow',null),
 yu:entry('荀攸','解围支援','crossbow',support('奇策解围',65,34,{shield:.025,cleanse:true})),
 yuanxia:entry('夏侯渊','远程快攻','archer',physical('千里奔袭',65,26,4,1.35,{debuff:'slow',steps:5})),
 jin:entry('于禁','军阵守备','spear',support('持军毅重',65,32,{range:2,ward:12,shield:.025})),
 shao:entry('袁绍','集群进攻','spear',support('四世三公',60,30,{intent:24,valor:true})),
 yan:entry('颜良','单体破阵','cavalry',physical('河北先登',70,26,1,1.8,{debuff:'armorBreak',steps:5})),
 wen:entry('文丑','追击残军','cavalry',physical('骁骑追斩',65,26,1,1.5,{execute:.6})),
 he:entry('张郃','侧翼牵制','spear',physical('巧变袭阵',65,26,2,1.25,{debuff:'weaken',steps:5})),
 ju:entry('沮授','筹策护军','crossbow',support('监军持重',65,34,{shield:.025,cooldownReduction:2})),
 tian:entry('田丰','封技谋攻','archer',mental('刚谏破谋',70,28,4,1.05,{debuff:'seal',steps:3})),
 gao:entry('高览','前线承压','spear',physical('奋武坚阵',60,26,1,1.35,{selfWard:18})),
 'person-636':entry('刘备','仁德救援','spear',support('仁德济众',55,30,{shield:.05,intent:12}),['iron','discipline','shield','calm'],cap('昭烈','woundedAlly','support',.22)),
 'person-99':entry('关羽','破甲斩将','cavalry',physical('青龙偃月',75,28,1,1.65,{execute:.55,debuff:'armorBreak',steps:5}),['martial','spirit','rider','joint'],cap('武圣','healthy','force',.18)),
 'person-433':entry('张飞','邻阵震慑','spear',physical('长坂怒喝',65,30,1,1.15,{targets:2,radius:1,control:'stun',steps:3}),['assault','endurance','spear','desperate'],cap('燕人','adjacent','force',.18)),
 'person-396':entry('赵云','攻守救援','cavalry',physical('七进七出',60,26,2,1.45,{selfCleanse:true,selfWard:12}),['martial','discipline','rider','calm'],cap('龙胆','healthy','defense',.18)),
 'person-516':entry('马超','骑阵破防','cavalry',physical('西凉铁骑',70,28,1,1.2,{targets:2,radius:1,debuff:'armorBreak',steps:4}),['assault','martial','rider','joint'],cap('锦骑','isolated','force',.22)),
 'person-186':entry('黄忠','远距点杀','archer',physical('百步穿杨',70,28,5,1.65,{execute:.45}),['assault','spirit','bow','joint'],cap('老当益壮','distant','basic',.12)),
 'person-290':entry('诸葛亮','破谋控场','crossbow',mental('八阵奇门',70,30,4,.7,{targets:2,radius:1,debuff:'seal',steps:3}),['scholar','discipline','combo','calm'],cap('卧龙','readyEnemy','intellect',.18)),
 'person-558':entry('庞统','连环谋攻','archer',mental('连环奇计',70,30,4,.9,{targets:3,radius:1,debuff:'slow',steps:4}),['scholar','spirit','combo','discipline'],cap('凤雏','debuffed','intellect',.14)),
 'person-137':entry('姜维','文武压制','spear',mental('麒麟破阵',65,26,3,1.15,{drain:20}),['martial','scholar','discipline','combo'],cap('幼麟','readyEnemy','intellect',.18)),
 'person-125':entry('魏延','孤军斩击','spear',physical('子午奇袭',65,26,1,1.65,{execute:.4}),['assault','martial','joint','desperate'],cap('奇兵','isolated','force',.22)),
 'person-368':entry('孙权','制衡援军','spear',support('江东制衡',60,32,{shield:.04,cooldownReduction:3}),['iron','discipline','shield','calm'],cap('碧眼','woundedAlly','support',.2)),
 'person-371':entry('孙策','突阵压制','cavalry',physical('霸王讨逆',70,28,2,1.5,{debuff:'weaken',steps:5}),['assault','martial','rider','joint'],cap('霸业','healthy','force',.18)),
 'person-246':entry('周瑜','集群火攻','archer',mental('赤壁业火',75,30,4,1,{targets:2,radius:1,burn:36,steps:5}),['scholar','spirit','combo','discipline'],cap('都督','burning','intellect',.22)),
 'person-668':entry('鲁肃','战意补给','crossbow',support('榻上定策',55,30,{intent:20,shield:.025}),['scholar','discipline','shield','calm'],cap('济军','woundedAlly','support',.22)),
 'person-662':entry('吕蒙','攻心封技','crossbow',mental('白衣渡江',65,28,4,1.05,{debuff:'seal',steps:3}),['assault','scholar','crossbow','combo'],cap('克己','readyEnemy','intellect',.18)),
 'person-603':entry('陆逊','火攻削弱','archer',mental('火烧连营',75,32,4,.95,{targets:3,radius:1,burn:30,steps:5}),['scholar','discipline','combo','calm'],cap('儒将','burning','intellect',.2)),
 'person-119':entry('甘宁','近战袭扰','cavalry',physical('百骑劫营',65,28,2,1.45,{drain:20}),['assault','spirit','rider','interdict'],cap('锦帆','isolated','force',.22)),
 'person-390':entry('太史慈','连射破甲','archer',physical('弦无虚发',65,26,4,.9,{hits:2}),['martial','spirit','bow','joint'],cap('笃烈','distant','force',.18)),
 'person-164':entry('黄盖','火攻承伤','archer',physical('苦肉火船',60,28,4,1.45,{burn:40,steps:6,selfCost:.01}),['assault','endurance','bow','desperate'],cap('苦肉','wounded','force',.22)),
 'person-226':entry('司马懿','后发压制','crossbow',mental('鹰视狼顾',70,30,4,1.1,{drain:25,debuff:'weaken',steps:4}),['scholar','discipline','suppress','stifle'],cap('隐忍','late','intellect',.2)),
 'person-291':entry('徐晃','破阵削弱','spear',physical('长驱直入',65,26,1,1.6,{debuff:'weaken',steps:5}),['martial','discipline','spear','joint'],cap('周亚夫之风','healthy','defense',.18)),
 'person-472':entry('典韦','承压反击','spear',physical('古之恶来',65,28,1,1.55,{selfWard:18}),['iron','endurance','spear','desperate'],cap('恶来','wounded','force',.22)),
 'person-661':entry('吕布','范围强攻','cavalry',physical('无双乱舞',80,32,1,1.1,{targets:3,radius:1}),['assault','martial','rider','joint'],cap('飞将','isolated','force',.22)),
 'person-425':entry('貂蝉','单体扰乱','crossbow',mental('闭月离间',65,30,4,1.1,{control:'confuse',steps:3}),['scholar','discipline','combo','calm'],cap('倾城','debuffed','intellect',.2)),
 'person-404':entry('张角','范围谋攻','archer',mental('苍天雷殛',75,32,4,.85,{targets:3,radius:1}),['scholar','spirit','combo','discipline'],cap('天公','debuffed','intellect',.2)),
 'person-494':entry('董卓','强攻夺气','cavalry',physical('暴戾横征',70,30,1,1.7,{drain:25,selfCost:.03}),['assault','endurance','rider','desperate'],cap('暴虐','wounded','force',.22)),
};
export const famousTacticId=id=>'unique-'+id;
export const famousPassiveId=id=>'hero-'+id;
const triggerText={healthy:'自身兵力不低于 70% 时',wounded:'自身兵力低于 50% 时',adjacent:'与目标相邻时',isolated:'目标相邻无其友军时',distant:'距离目标至少 3 格时',readyEnemy:'目标战意不低于 60 时',lowIntent:'目标战意低于 60 时',debuffed:'目标存在控制或减益时',burning:'目标处于灼烧时',late:'第 40 步起',woundedAlly:'支援兵力低于 60% 的其他友军时'};
const kindText={force:'武力战法伤害',intellect:'谋略伤害',basic:'普攻伤害',defense:'防御与军纪',support:'治疗、护盾、战意及冷却缩减量'};
export const ultimateDescription=p=>`${triggerText[p.trigger]}，${kindText[p.kind]} +${Math.round(p.bonus*100)}%`;
export function famousTacticDescription(s){
 const parts=[`${s.range} 格内${s.mode==='support'?'友军':'敌军'}，最多 ${s.targets||1} 队`];
 if(s.targets>1&&s.mode==='attack')parts.push(`目标周围 ${s.radius} 格，优先覆盖更多敌军`);
 if(s.scale)parts.push(`${s.scale} 倍${s.category==='force'?'武技':'谋略'}伤害${s.hits?' ×'+s.hits:''}`);
 if(s.execute)parts.push(`目标兵力低于 40% 时另加 ${s.execute} 倍伤害系数`);
 if(s.debuff)parts.push(`${({armorBreak:'防御 −20%',weaken:'攻击 −20%',slow:'移动减慢',seal:'封技'})[s.debuff]} ${s.steps} 步`);
 if(s.control)parts.push(`${s.control==='stun'?'眩晕':'混乱'} ${s.steps} 步（受军纪减免和免控限制）`);
 if(s.burn)parts.push(`叠加一层灼烧（最多三层），单层每步基础 ${s.burn}，刷新 ${s.steps} 步，按兵力与目标军纪衰减`);
 if(s.shield)parts.push(`护盾为目标兵力上限 ${Number((s.shield*100).toFixed(2))}% ×（0.5＋谋略/200），持续 8 步`);
 if(s.intent)parts.push(`战意 +${s.intent}`);
 if(s.drain)parts.push(`敌方战意 −${s.drain}`);
 if(s.cooldownReduction)parts.push(`其他友军冷却缩短 ${s.cooldownReduction} 步`);
 if(s.ward||s.selfWard)parts.push(`${s.selfWard?'自身':'目标'}减伤 ${s.ward||s.selfWard}%，持续 5 步`);
 if(s.valor)parts.push('目标攻击 +25%，持续 5 步');
 if(s.cleanse||s.selfCleanse)parts.push(`净化${s.selfCleanse?'自身':'目标'}，免控 3 步`);
 if(s.selfCost)parts.push(`自身损失当前兵力 ${s.selfCost*100}%（保留至少 1 人，不产生战意）`);
 return parts.join('；');
}
