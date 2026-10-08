// Fictional tactical encounters inspired by Romance characters, not historical reconstructions.
const unit=(id,type,troops,tactics,position)=>({id,type,troops,tactics,position});
const U={liu:'person-636',guan:'person-99',zhang:'person-433',zhuge:'person-290',zhao:'person-396',jian:'person-123',lv:'person-661',diao:'person-425',chen:'person-447',gao:'person-170'};
export const TACTICAL_CAMPAIGNS=[
  {
    id:'tactical-control-lv',name:'谋定飞将',chapter:'壹',subtitle:'控制压制，智取吕布',difficulty:'配合',feature:'控制与减益',kind:'野战',terrain:'land',
    ownName:'谋武联军',enemyName:'吕布军',ownAdvisor:'jia',enemyAdvisor:U.lv,
    description:'郭嘉、贾诩在后排施计，廖化、周仓在前排接敌，利用吕布智力低、军纪弱的短板争取以谋制勇。',
    briefing:'普通武将牵制吕布，顶级谋士接续混乱、封技与伏弩削弱。计谋有成功率、冷却和控制保护；抓住控制间隙集火，前排失守后谋士仍会被击溃。',
    ownTeam:[unit('person-646','spear',2400,['phalanx','ward','strike'],[4,2]),unit('person-242','halberd',2300,['bulwark','riposte','cleave'],[4,4]),unit('jia','archer',1700,['smoke','wildfire','rally'],[3,2]),unit('person-61','crossbow',1700,['ambush','seal','screen'],[3,4])],
    enemyTeam:[unit(U.lv,'cavalry',8500,['unique-person-661','gallop','rush'])],seed:521301,
  },
  {
    id:'tactical-control-zhang',name:'智困燕人',chapter:'贰',subtitle:'封技诱敌，压住猛攻',difficulty:'配合',feature:'高武低谋',kind:'野战',terrain:'land',
    ownName:'谋武联军',enemyName:'张飞军',ownAdvisor:'jia',enemyAdvisor:U.zhang,
    description:'廖化、周仓牵制张飞，郭嘉、贾诩利用其低智力与军纪短板，以计谋制造普通武将也能进攻的窗口。',
    briefing:'让普通武将承担近战，谋士保持策应距离。混乱中断猛攻，封技限制怒喝，伏弩削弱普攻；控制失败或衔接中断时，张飞仍可能突破前排。',
    ownTeam:[unit('person-646','spear',2800,['phalanx','ward','strike'],[4,2]),unit('person-242','halberd',2600,['bulwark','riposte','cleave'],[4,4]),unit('jia','archer',1900,['smoke','wildfire','rally'],[3,2]),unit('person-61','crossbow',1900,['ambush','seal','screen'],[3,4])],
    enemyTeam:[unit(U.zhang,'spear',8200,['unique-person-433','phalanx','strike'])],seed:521302,
  },
  {
    id:'tactical-three-heroes',name:'三英战吕布',chapter:'叁',subtitle:'三军协力，独战飞将',difficulty:'均势',feature:'等兵力对决',kind:'野战',terrain:'land',
    ownName:'刘关张联军',enemyName:'吕布军',ownAdvisor:U.liu,enemyAdvisor:U.lv,
    description:'刘备、关羽、张飞同时在前排接敌，从三个方向合围吕布。双方总兵力相当，以三英近战协同对抗飞将强攻。',
    briefing:'刘备亲自近战并以仁德策应，关羽侧击，张飞牵制，三人共同围攻吕布。分担接敌压力，也要承受吕布范围战法的反击。',
    ownTeam:[unit(U.liu,'spear',2300,['unique-person-636','phalanx','strike'],[4,2]),{...unit(U.guan,'cavalry',3000,['unique-person-99','gallop','rush'],[4,3]),formation:'front'},unit(U.zhang,'spear',3200,['unique-person-433','phalanx','strike'],[4,4])],
    enemyTeam:[unit(U.lv,'cavalry',8500,['unique-person-661','gallop','rush'],[8,3])],seed:521303,
  },
  {
    id:'tactical-shu-defense',name:'蜀军拒曹',chapter:'肆',subtitle:'六将协同，抵御大军',difficulty:'挑战',feature:'限时坚守',kind:'守城',terrain:'forest',defending:true,gateHp:8500,holdUntil:240,
    ownName:'刘备守军',enemyName:'曹军诸部',ownAdvisor:U.zhuge,enemyAdvisor:'jia',
    description:'刘关张、诸葛亮、赵云与简雍合守城门。曹军在场与预备兵力远多于我军，需要承伤、控制、突击和支援同时发挥。',
    briefing:'简雍随前排救护与鼓舞，诸葛亮封技，关张稳住阵线，赵云追击后排。守到第 240 步、城门未破且尚有可战部队即完成掩护；城门失守、守军全灭或撤退失败。',
    ownTeam:[unit(U.liu,'spear',4400,['unique-person-636','phalanx','cleanse'],[3,3]),unit(U.guan,'halberd',6800,['unique-person-99','bulwark','riposte'],[4,3]),unit(U.zhang,'spear',6200,['unique-person-433','phalanx','strike'],[4,4]),unit(U.zhuge,'crossbow',3600,['unique-person-290','ambush','screen'],[3,4]),unit(U.zhao,'cavalry',6000,['unique-person-396','gallop','rush'],[4,2]),unit(U.jian,'logistics',2200,['supply','regrowth','purify'],[2,3])],
    enemyTeam:[unit('cao','spear',3400),unit('dun','halberd',3400),unit('yuanxia','archer',3000),unit('person-472','spear',3200),unit('jia','crossbow',2300),unit('yu','logistics',2500),unit('jin','spear',5500),unit('person-342','halberd',5500),unit('person-337','cavalry',5500),unit('person-70','spear',5500),unit('person-610','spear',5500),unit('person-338','cavalry',5500),unit('chu','spear',5500),unit('person-255','logistics',5500)],seed:521304,level:10,enemyLevel:3,waves:[{count:4,tick:90},{count:4,tick:180}],
  },
  {
    id:'tactical-lv-cao',name:'兖州争锋',chapter:'伍',subtitle:'吕布群将，对阵曹操',difficulty:'均势',feature:'完整阵容',kind:'野战',terrain:'land',
    ownName:'吕布军',enemyName:'曹操军',ownAdvisor:U.chen,enemyAdvisor:'jia',
    description:'吕布、高顺与张辽在前线寻找突破，陈宫提供谋略支援，貂蝉扰乱敌军；对阵曹操及早期核心将领组成的完整阵容。',
    briefing:'高顺吸引火力，吕布张辽从侧翼突击。陈宫紧跟前排救护，貂蝉控制危险目标；分工比单纯堆满攻击战法更重要。',
    ownTeam:[unit(U.lv,'cavalry',6800,['unique-person-661','gallop','rush'],[4,2]),unit(U.diao,'archer',2000,['unique-person-425','smoke','rally'],[3,4]),unit(U.chen,'logistics',2300,['regrowth','purify','supply'],[3,3]),unit(U.gao,'halberd',4200,['bulwark','riposte','cleave'],[4,3]),unit('liao','cavalry',4300,['terror','gallop','relay'],[4,4])],
    enemyTeam:[unit('cao','spear',4200),unit('dun','halberd',3400),unit('yuanxia','archer',3100),unit('person-472','spear',3000),unit('jia','crossbow',1900),unit('yu','logistics',2100)],seed:521305,
  },
].map(s=>({level:8,enemyLevel:8,limit:480,waves:[],...s,campaign:true,historical:false,era:'演义推演',own:s.ownTeam.length,enemy:s.enemyTeam.length,officers:s.ownTeam.map(u=>u.id),history:'本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。',goal:s.holdUntil?`坚守至第 ${s.holdUntil} 步，保住城门及至少一队可战守军；提前击溃敌军亦获胜。`:'击溃敌军；日暮按剩余兵力比例判定胜负。'}));
export const scenarioTroops=(scenario,side)=>{
  const team=side?scenario.enemyTeam:scenario.ownTeam,base=side?scenario.enemyTroops:scenario.ownTroops;
  return team?team.reduce((n,u)=>n+(u.troops??base),0):(side?scenario.enemy:scenario.own)*base;
};
