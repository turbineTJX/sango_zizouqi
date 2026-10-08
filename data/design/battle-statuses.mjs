// Authoritative shared status definitions. Runtime and exported tables read this file.
export const STATUS_DEFINITIONS = {
  "commandInvincible": {"name":"军阵无敌","icon":"shield","tone":"buff","priority":0,"description":"军略赋予短暂伤害免疫，仍可行动；不驱散控制，不免除缺粮或主动代价"},
  "stun": {"name":"眩晕","icon":"confuse","tone":"control","priority":1,"description":"停止移动、普攻、反击与战法，不产生ZOC；打断待结算战法，可驱散，遵守魔免、坚定和控制保护"},
  "swiftRush": {"name":"突进","icon":"move","tone":"buff","priority":2,"description":"疾驰窗口内移动力提高、无视ZOC并优先合法后排；仍须实际在场、具有激活羁绊且可以行动，受占位、地形和定身约束"},
  "guardInvincible": {"name":"护卫免伤","icon":"shield","tone":"buff","priority":0,"description":"护卫护盾破裂后短暂免疫直接、持续、分担及传导伤害，可以正常行动；每队每场一次，不回滚同批致命伤害"},
  "magicImmune": {"name":"魔免","icon":"shield","tone":"buff","priority":0,"description":"解除并免疫战斗异常，仅承受物理普攻伤害；不免除缺粮或主动代价"},
  "rapidAdvance": {"name":"神速","icon":"wind","tone":"buff","priority":2,"moveBonus":1,"attackFraction":0.25,"description":"移动力 +1，攻击间隔缩短25%，无视ZOC；不能穿越部队或不可通行地形"},
  "powerDown": {
    "name": "挫锐",
    "icon": "sword",
    "tone": "debuff",
    "priority": 10,
    "fraction": 0.2,
    "description": "武技威力与谋略威力降低20%；重复施加只刷新持续时间，可整军解除"
  },
  "stasis": {
    "name": "避战",
    "icon": "shield",
    "tone": "buff",
    "priority": 0,
    "description": "免疫直接与持续伤害、无法被敌方选中；停止移动、攻击与施法，不产生 ZOC"
  },
  "stasisLock": {
    "name": "避战间隔",
    "icon": "shield",
    "tone": "buff",
    "priority": 30,
    "description": "暂时不能再次获得避战无敌"
  },
  "hunger": {
    "name": "缺粮",
    "icon": "plague",
    "tone": "debuff",
    "priority": 6,
    "description": "军团口粮不足，削弱攻击与战法威力；恢复补给后逐日解除，无法用战场镇静消除"
  },
  "confuse": {
    "name": "混乱",
    "icon": "confuse",
    "tone": "control",
    "priority": 1,
    "description": "随机转移阵位，无法攻击或施法，暂时失阵能力"
  },
  "burn": {
    "name": "灼烧",
    "icon": "fire",
    "tone": "damage",
    "priority": 2,
    "description": "持续损失兵力，最多三层，受地形影响；可扑火解除"
  },
  "plague": {
    "name": "疫伤",
    "icon": "target",
    "tone": "damage",
    "priority": 5,
    "description": "持续损失兵力，救治效果降低50%；可救护解除",
    "healReduction": 0.5
  },
  "seal": {
    "name": "封技",
    "icon": "seal",
    "tone": "control",
    "priority": 5,
    "description": "无法施放战法，仍可普攻与移动"
  },
  "taunt": {
    "name": "嘲讽",
    "icon": "target",
    "tone": "control",
    "priority": 6,
    "description": "优先攻击或合法接近嘲讽来源"
  },
  "disrupted": {
    "name": "失阵",
    "icon": "confuse",
    "tone": "control",
    "priority": 5,
    "description": "失去ZOC，仍可移动、普攻和施法"
  },
  "slow": {
    "name": "迟滞",
    "icon": "slow",
    "tone": "debuff",
    "priority": 7,
    "description": "移动速度减半"
  },
  "armorBreak": {
    "name": "破甲",
    "icon": "shield",
    "tone": "debuff",
    "priority": 8,
    "description": "防御降低 20%"
  },
  "weaken": {
    "name": "疲弱",
    "icon": "sword",
    "tone": "debuff",
    "priority": 10,
    "description": "攻击降低 20%"
  },
  "shield": {
    "name": "护盾",
    "icon": "shield",
    "tone": "buff",
    "priority": 13,
    "description": "不同来源独立到期，优先消耗最早到期层"
  },
  "resolve": {
    "name": "坚定",
    "icon": "shield",
    "tone": "buff",
    "priority": 14,
    "description": "暂时免疫眩晕、混乱、定身、缴械、封技、嘲讽和失阵"
  },
  "phalanx": {
    "name": "方阵",
    "icon": "shield",
    "tone": "buff",
    "priority": 15,
    "description": "减伤 30%，停止移动并免疫击退"
  },
  "ward": {
    "name": "减伤",
    "icon": "shield",
    "tone": "buff",
    "priority": 16,
    "description": "减少所受直接伤害"
  },
  "regrowth": {
    "name": "休整",
    "icon": "heal",
    "tone": "buff",
    "priority": 18,
    "description": "每回合救治已有伤兵，受伤兵预算和减疗限制"
  },
  "phase": {
    "name": "穿阵",
    "icon": "move",
    "tone": "buff",
    "priority": 19,
    "description": "暂时无视敌方拦截，仍遵守占位及水陆限制"
  },
  "pursuit": {
    "name": "后阵追击",
    "icon": "target",
    "tone": "buff",
    "priority": 20,
    "description": "优先追击后排，对弓弩普攻增强"
  },
  "bulwark": {
    "name": "坚阵",
    "icon": "shield",
    "tone": "buff",
    "priority": 21,
    "description": "防御 +30%、军纪 +20%，移动减半"
  },
  "riposte": {
    "name": "反击",
    "icon": "sword",
    "tone": "buff",
    "priority": 22,
    "description": "受到近邻直接攻击时反击，每回合最多一次"
  },
  "camp": {
    "name": "营垒",
    "icon": "shield",
    "tone": "buff",
    "priority": 23,
    "description": "防御提高 25%"
  },
  "nexus": {
    "name": "阵枢",
    "icon": "confuse",
    "tone": "buff",
    "priority": 24,
    "description": "谋略威力与军纪提高 20%"
  },
  "anchored": {
    "name": "抛锚",
    "icon": "shield",
    "tone": "buff",
    "priority": 25,
    "amount": 1,
    "description": "停止移动，普攻最大射程增加1；不改变最小射程与战法范围"
  },
  "emplaced": {
    "name": "架设",
    "icon": "target",
    "tone": "buff",
    "priority": 26,
    "description": "攻击 +20%、普攻与投石射程 +1，停止移动"
  },
  "burningAttack": {
    "name": "燃击",
    "icon": "fire",
    "tone": "buff",
    "priority": 27,
    "description": "普通攻击续叠灼烧"
  },
  "peachFury": {"name":"桃园奋战","icon":"sword","tone":"buff","priority":12,"description":"攻击、武技与谋略威力提高40%，攻速提高30%，持续12回合，不叠加倍率"},
  "peachInvincible": {"name":"无敌","icon":"shield","tone":"buff","priority":0,"description":"桃园最后一人获得3回合伤害免疫，仍可行动；不解除控制，不免除主动代价"},
  "heavyAttack": {"name":"重击","icon":"sword","tone":"buff","priority":15,"description":"限次物理主动普攻伤害提高50%，主目标尝试混乱1回合；遵守控制保护，范围普攻仅消耗一次，战法、反击、谋略普攻、城门和诱饵不触发"},
  "attackOrb": {
    "name": "强化普攻",
    "icon": "target",
    "tone": "buff",
    "priority": 14,
    "description": "下几次普攻附带战法效果"
  },
  "strategyAttack": {
    "name": "谋攻",
    "icon": "sword",
    "tone": "buff",
    "priority": 29,
    "description": "普攻改用 0.8 倍谋略威力，受军纪抵御"
  },
  "haste": {
    "name": "疾行",
    "icon": "move",
    "tone": "buff",
    "priority": 30,
    "description": "移动力增加 1"
  },
  "valor": {
    "name": "奋战",
    "icon": "sword",
    "tone": "buff",
    "priority": 31,
    "description": "攻击提高 25%"
  },
  "root": {
    "name": "定身",
    "icon": "confuse",
    "tone": "control",
    "priority": 5,
    "description": "不能移动，仍可普攻、施法并保留ZOC"
  },
  "disarm": {
    "name": "缴械",
    "icon": "confuse",
    "tone": "control",
    "priority": 5,
    "description": "不能普攻，仍可移动和施法"
  },
  "despair": {
    "name": "丧志",
    "icon": "target",
    "tone": "debuff",
    "priority": 5,
    "description": "每步损失5战意，最低降至零",
    "amount": 5
  },
  "intentSuppression": {
    "name": "抑气",
    "icon": "target",
    "tone": "debuff",
    "priority": 5,
    "description": "攻击与受击获得的战意减少30%，不影响直接给予的战意",
    "fraction": 0.3
  },
  "attackSlow": {
    "name": "缓攻",
    "icon": "target",
    "tone": "debuff",
    "priority": 5,
    "description": "普攻间隔增加25%，不影响战法冷却",
    "fraction": 0.25
  },
  "attackHaste": {
    "name": "速攻",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "普攻间隔缩短20%，不影响战法冷却",
    "fraction": 0.2
  },
  "shortRange": {
    "name": "短射",
    "icon": "target",
    "tone": "debuff",
    "priority": 5,
    "description": "远程普攻最大射程减少1，最低不小于最小射程及1",
    "amount": 1
  },
  "longRange": {
    "name": "远射",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "远程普攻最大射程增加1，不改变最小射程或战法范围",
    "amount": 1
  },
  "stealth": {
    "name": "伏兵",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "获得后潜行，最多12回合；接触敌方ZOC即攻击拦截部队并显形，首击并使目标混乱1回合；攻击、施法或受伤提前显形",
    "duration": 12,
    "confuseDays": 1
  },
  "insight": {
    "name": "洞察",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "识别2格内伏兵和疑兵，信息供己方共享",
    "range": 2
  },
  "decoy": {
    "name": "疑兵",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "产生无攻击力的幻象，承受200%伤害，不占上场名额；每队同时一个",
    "duration": 6,
    "hpFraction": 0.3,
    "damageMultiplier": 2
  },
  "guard": {
    "name": "护卫",
    "icon": "shield",
    "tone": "buff",
    "priority": 5,
    "description": "指定相邻友军分担25%直接伤害，不连锁分担",
    "fraction": 0.25,
    "range": 1
  },
  "link": {
    "name": "连环",
    "icon": "target",
    "tone": "debuff",
    "priority": 5,
    "description": "同组其他部队平分额外传导总额，比例由施加来源决定，不递归传导",
    "fraction": 0.2
  }
};
STATUS_DEFINITIONS.plague.priority=4;
for(const id of ['attackHaste','longRange','stealth','insight','decoy','guard'])STATUS_DEFINITIONS[id].priority=15;
export const REMEDIES = {
  "calm": [
    "stun",
    "confuse",
    "taunt",
    "despair",
    "intentSuppression"
  ],
  "rally": [
    "powerDown",
    "root",
    "disarm",
    "seal",
    "disrupted",
    "slow",
    "armorBreak",
    "weaken",
    "attackSlow",
    "shortRange"
  ],
  "aid": [
    "plague"
  ],
  "quench": [
    "burn"
  ],
  "breakFormation": [
    "rapidAdvance",
    "shield",
    "guard",
    "resolve",
    "ward",
    "phalanx",
    "bulwark",
    "camp",
    "nexus",
    "anchored",
    "emplaced",
    "haste",
    "valor",
    "attackHaste",
    "longRange",
    "regrowth"
  ]
};
export const CONTROL_STATUSES = ['stun','confuse','root','disarm','seal','taunt','disrupted'];
export default {schemaVersion:1,id:'battle-statuses',name:'战斗状态与效果一览表',integration:'integrated',records:Object.entries(STATUS_DEFINITIONS).map(([id,parameters])=>({id,name:parameters.name,parameters,source:'data/design/battle-statuses.mjs',todo:''}))};
