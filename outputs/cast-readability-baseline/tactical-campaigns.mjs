// Fictional tactical encounters inspired by Romance characters, not historical reconstructions.
const unit=(id,type,troops,tactics,position)=>({id,type,troops,tactics,position});
const U={liu:'person-636',guan:'person-99',zhang:'person-433',zhuge:'person-290',zhao:'person-396',jian:'person-123',lv:'person-661',diao:'person-425',chen:'person-447',gao:'person-170'};
export const TACTICAL_CAMPAIGNS=[
  {
    id:'tactical-control-lv',name:'谋定飞将',chapter:'壹',subtitle:'控制压制，智取吕布',difficulty:'配合',feature:'控制与减益',kind:'野战',terrain:'land',
    ownName:'谋士联阵',enemyName:'吕布军',ownAdvisor:'jia',enemyAdvisor:U.lv,
    description:'以谋士的混乱、迟滞与战意压制对抗重兵吕布。分散站位，避免被无双乱舞同时命中。',
    briefing:'控制有冷却与军纪减免，不会无限连控。伏弩先减速削攻，疑阵与谋略普攻接续输出；被追近时仍可能被击溃。',
    ownTeam:[unit('jia','spear',3200,['doubt','phalanx','ward']),unit('person-61','archer',2300,['smoke','wildfire','rally']),unit(U.chen,'crossbow',2200,['ambush','seal','screen'])],
    enemyTeam:[unit(U.lv,'cavalry',8500,['unique-person-661','gallop','rush'])],seed:521301,
  },
  {
    id:'tactical-control-zhang',name:'智困燕人',chapter:'贰',subtitle:'封技诱敌，压住猛攻',difficulty:'配合',feature:'高武低谋',kind:'野战',terrain:'land',
    ownName:'谋士联阵',enemyName:'张飞军',ownAdvisor:'jia',enemyAdvisor:U.zhang,
    description:'张飞以强力近战与怒喝压阵，谋士利用其军纪短板，从控制窗口中逐步消耗兵力。',
    briefing:'封技只能限制战法，无法阻止普攻。让前线谋士承伤积累战意，后排持续削弱、治疗，避免所有部队贴身。',
    ownTeam:[unit('jia','spear',3200,['doubt','phalanx','ward']),unit('person-61','archer',2300,['smoke','wildfire','rally']),unit(U.chen,'crossbow',2200,['ambush','seal','screen'])],
    enemyTeam:[unit(U.zhang,'spear',8200,['unique-person-433','phalanx','strike'])],seed:521302,
  },
  {
    id:'tactical-three-heroes',name:'三英战吕布',chapter:'叁',subtitle:'三军协力，独战飞将',difficulty:'均势',feature:'等兵力对决',kind:'野战',terrain:'land',
    ownName:'刘关张联军',enemyName:'吕布军',ownAdvisor:U.liu,enemyAdvisor:U.lv,
    description:'刘备支援、关羽突击、张飞承伤，对阵集中兵力的吕布。双方总兵力相当，比较协同与单队强攻。',
    briefing:'刘备保持支援距离，关张分担火力。过度聚集会被吕布范围战法压制；同一种子与操作会得到相同结果。',
    ownTeam:[unit(U.liu,'logistics',1900,['unique-person-636','supply','regrowth']),unit(U.guan,'cavalry',3600,['unique-person-99','gallop','rush']),unit(U.zhang,'spear',3000,['unique-person-433','phalanx','strike'])],
    enemyTeam:[unit(U.lv,'spear',8500,['unique-person-661','strike','ward'])],seed:521303,
  },
  {
    id:'tactical-shu-defense',name:'蜀军拒曹',chapter:'肆',subtitle:'六将协同，抵御大军',difficulty:'挑战',feature:'限时坚守',kind:'守城',terrain:'forest',defending:true,gateHp:8500,holdUntil:240,
    ownName:'刘备守军',enemyName:'曹军诸部',ownAdvisor:U.zhuge,enemyAdvisor:'jia',
    description:'刘关张、诸葛亮、赵云与简雍合守城门。曹军在场与预备兵力远多于我军，需要承伤、控制、突击和支援同时发挥。',
    briefing:'简雍随前排治疗与输粮，诸葛亮封技，关张稳住阵线，赵云追击后排。守到第 240 步、城门完好且尚有可战部队即完成掩护；城门失守、守军全灭或撤退失败。',
    ownTeam:[unit(U.liu,'spear',4400,['unique-person-636','phalanx','cleanse'],[3,3]),unit(U.guan,'halberd',6800,['unique-person-99','bulwark','riposte'],[4,3]),unit(U.zhang,'spear',6200,['unique-person-433','phalanx','strike'],[4,4]),unit(U.zhuge,'crossbow',3600,['unique-person-290','ambush','screen'],[3,4]),unit(U.zhao,'cavalry',6000,['unique-person-396','gallop','rush'],[4,2]),unit(U.jian,'logistics',2200,['supply','regrowth','purify'],[2,3])],
    enemyTeam:[unit('cao','spear',3400),unit('dun','halberd',3400),unit('yuanxia','archer',3000),unit('person-472','spear',3200),unit('jia','crossbow',2300),unit('yu','logistics',2500),unit('jin','spear',5500),unit('person-342','halberd',5500),unit('person-337','cavalry',5500),unit('person-70','spear',5500),unit('person-610','spear',5500),unit('person-338','cavalry',5500),unit('chu','spear',5500),unit('person-255','logistics',5500)],seed:521304,level:10,enemyLevel:3,waves:[{count:4,tick:90},{count:4,tick:180}],
  },
  {
    id:'tactical-lv-cao',name:'兖州争锋',chapter:'伍',subtitle:'吕布群将，对阵曹操',difficulty:'均势',feature:'完整阵容',kind:'野战',terrain:'land',
    ownName:'吕布军',enemyName:'曹操军',ownAdvisor:U.chen,enemyAdvisor:'jia',
    description:'吕布、高顺与张辽在前线寻找突破，陈宫提供谋略支援，貂蝉扰乱敌军；对阵曹操及早期核心将领组成的完整阵容。',
    briefing:'高顺吸引火力，吕布张辽从侧翼突击。陈宫紧跟前排救护，貂蝉控制危险目标；分工比单纯堆满攻击战法更重要。',
    ownTeam:[unit(U.lv,'cavalry',6800,['unique-person-661','gallop','rush'],[4,2]),unit(U.diao,'archer',2000,['unique-person-425','smoke','rally'],[3,4]),unit(U.chen,'logistics',2300,['regrowth','purify','supply'],[3,3]),unit(U.gao,'halberd',4200,['bulwark','riposte','cleave'],[4,3]),unit('liao','cavalry',4300,['terror','gallop','relay'],[4,4])],
    enemyTeam:[unit('cao','spear',3800),unit('dun','halberd',3000),unit('yuanxia','archer',2700),unit('person-472','spear',2600),unit('jia','crossbow',1600),unit('yu','logistics',1800)],seed:521305,
  },
].map(s=>({level:8,enemyLevel:8,limit:480,waves:[],...s,campaign:true,historical:false,era:'演义推演',own:s.ownTeam.length,enemy:s.enemyTeam.length,officers:s.ownTeam.map(u=>u.id),history:'本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。',goal:s.holdUntil?`坚守至第 ${s.holdUntil} 步，保住城门及至少一队可战守军；提前击溃敌军亦获胜。`:'击溃敌军；日暮按剩余兵力比例判定胜负。'}));
export const scenarioTroops=(scenario,side)=>{
  const team=side?scenario.enemyTeam:scenario.ownTeam,base=side?scenario.enemyTroops:scenario.ownTroops;
  return team?team.reduce((n,u)=>n+(u.troops??base),0):(side?scenario.enemy:scenario.own)*base;
};
