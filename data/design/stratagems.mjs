// Authoritative military strategies: explicit holder lists and simple AI triggers.
export const STRATAGEM_DESIGNS = {
  "fortify": {
    "name": "金城汤池",
    "group": "support",
    "cost": 1,
    "duration": 12,
    "cooldown": 40,
    "description": "圆形半径2格；选区内在场友军获得护盾，基准为兵力上限25%，按施放者统率与智力折算；持续12回合，各来源独立吸收，不能为同源重复叠盾",
    "side": 0,
    "effect": "shield",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "baseStrength": 0.25,
    "roster": [
      "shao",
      "person-368",
      "person-637",
      "person-567"
    ],
    "weights": {
      "leadership": 0.7,
      "intellect": 0.3
    },
    "scaling": "strength",
    "ai": "shield"
  },
  "heal": {
    "name": "济世安军",
    "group": "support",
    "cost": 1,
    "duration": 0,
    "cooldown": 36,
    "description": "圆形半径2格；立即救治选区内在场友军本场伤兵，每队基准上限为兵力上限20%，按施放者统率与智力折算；不复活、不凭空补兵",
    "side": 0,
    "effect": "heal",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "baseStrength": 0.2,
    "roster": [
      "person-668",
      "person-255",
      "person-263",
      "person-443"
    ],
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "strength",
    "ai": "heal"
  },
  "cleanse": {
    "name": "扶正祛邪",
    "group": "support",
    "cost": 1,
    "duration": 0,
    "cooldown": 32,
    "description": "圆形半径2格；驱散选区内友军全部战斗异常，保留缺粮；获得坚定，基准持续6回合，按施放者统率与智力折算",
    "side": 0,
    "effect": "cleanse",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "resolve": 6,
    "roster": [
      "person-290",
      "person-294",
      "person-462",
      "person-502"
    ],
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "resolve",
    "ai": "cleanse"
  },
  "invincible": {
    "name": "固若金汤",
    "group": "support",
    "cost": 1,
    "duration": 4,
    "cooldown": 80,
    "description": "圆形半径2格；选区内在场友军获得军阵无敌，基准持续4回合，按施放者统率与智力折算；免疫直接、持续、分担和传导伤害，仍可行动；不驱散控制，不免除缺粮与主动代价",
    "side": 0,
    "effect": "invincible",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "roster": [
      "person-636",
      "person-578",
      "person-304",
      "person-436"
    ],
    "weights": {
      "leadership": 0.7,
      "intellect": 0.3
    },
    "scaling": "duration",
    "ai": "invincible"
  },
  "ambush": {
    "name": "瞒天过海",
    "group": "support",
    "cost": 1,
    "duration": 12,
    "cooldown": 56,
    "description": "圆形半径2格；选区内在场友军获得伏兵，基准持续12回合，按施放者统率与智力折算；沿共同伏兵规则潜行、接敌首击并使目标混乱1回合；攻击或受伤显形，洞察可识破",
    "side": 0,
    "effect": "ambush",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "roster": [
      "person-61",
      "person-557",
      "person-447",
      "person-54",
      "person-146",
      "person-553"
    ],
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "duration",
    "ai": "ambush"
  },
  "disrupt": {
    "name": "威震三军",
    "group": "control",
    "cost": 1,
    "duration": 4,
    "cooldown": 64,
    "description": "圆形半径2格；选区内敌军眩晕，基准持续4回合，按施放者统率与智力折算；停止移动、普攻、反击、战法及ZOC，立即打断待结算战法；遵守魔免、坚定、控制保护与有害来源免疫",
    "side": 1,
    "effect": "stun",
    "icon": "wind",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "roster": [
      "person-558",
      "tian",
      "person-642",
      "person-55"
    ],
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "duration",
    "ai": "stun"
  },
  "ward": {
    "name": "百邪不侵",
    "group": "support",
    "cost": 1,
    "duration": 8,
    "cooldown": 72,
    "description": "圆形半径2格；选区内友军获得魔免，基准持续8回合，按施放者统率与智力折算；驱散战斗异常，仅承受物理普攻；不免除缺粮或主动代价",
    "side": 0,
    "effect": "magicImmunity",
    "icon": "home",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "roster": [
      "person-226",
      "person-601",
      "ju",
      "person-520"
    ],
    "weights": {
      "leadership": 0.7,
      "intellect": 0.3
    },
    "scaling": "duration",
    "ai": "magicImmunity"
  },
  "cao-wuchao": {
    "name": "号令如山",
    "group": "support",
    "cost": 1,
    "duration": 0,
    "description": "我军在场各队获得魔免：解除并免疫所有战斗异常，仅承受物理普攻伤害；免疫战法、谋略普攻及持续与传导伤害。基准持续4＋⌊施放时自身军纪÷25⌋、最多12回合，再按施放者统率与智力折算；不影响缺粮与主动代价",
    "side": 0,
    "icon": "wind",
    "effect": "magicImmunity",
    "history": "名称取曹操统军意象；按部队军纪持续的全军防护为玩法机制，不对应史实中的超自然能力。",
    "source": "https://zh.wikisource.org/zh/三國志/卷01",
    "scope": {
      "shape": "army"
    },
    "disciplineDuration": {
      "base": 4,
      "per": 25,
      "max": 12
    },
    "cooldown": 80,
    "weights": {
      "leadership": 0.7,
      "intellect": 0.3
    },
    "scaling": "disciplineDuration",
    "roster": [
      "cao",
      "person-420"
    ],
    "ai": "magicImmunity"
  },
  "zhou-redcliffs": {
    "name": "火烧连营",
    "group": "control",
    "cost": 1,
    "duration": 16,
    "description": "矩形4×3格，可旋转；按我军在场谋略威力生成基准160%总火势，强度按施放者统率与智力折算；以全部合法在场敌军数分摊，仅向选区内敌军施加灼烧16回合；对舰船火势提高25%；可扑火解除、护盾吸收，不产生战意",
    "side": 1,
    "icon": "wind",
    "effect": "firestorm",
    "shipFireBonus": 0.25,
    "history": "《三国志·周瑜传》：采纳黄盖火攻之议，组织赤壁水战；并非诸葛亮借东风。",
    "source": "https://zh.wikisource.org/zh/三國志/卷54",
    "scope": {
      "shape": "rectangle",
      "width": 4,
      "height": 3
    },
    "cooldown": 64,
    "baseStrength": 1.6,
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "strength",
    "roster": [
      "person-246",
      "person-603"
    ],
    "ai": "firestorm"
  },
  "zhuge-eight": {
    "name": "八阵奇门",
    "group": "control",
    "cost": 1,
    "duration": 24,
    "description": "每场限一次；在选定位置布置半径2格的八阵，基准持续24回合，持续时间按施放者统率与智力折算。每回合行动前，范围内敌军各有100÷（100＋自身当前军纪）的概率陷入一种随机异常，概率最低10%、最高60%。异常为混乱、封技、失阵、迟滞、疲弱或破甲，持续3回合；遵守免疫和控制保护，不重复附加已有异常。可提前布置在空地。",
    "side": 1,
    "icon": "wind",
    "effect": "eightFormation",
    "history": "《三国志·诸葛亮传》记载推演兵法、作八阵图；区域迷阵与随机异常为玩法演绎，不作为史实能力。",
    "source": "https://zh.wikisource.org/zh/三國志/卷35",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "maxUses": 1,
    "zone": {
      "statusSteps": 3,
      "chanceScale": 100,
      "minChance": 0.1,
      "maxChance": 0.6,
      "statuses": [
        "confuse",
        "seal",
        "disrupted",
        "slow",
        "weaken",
        "armorBreak"
      ]
    },
    "cooldown": 96,
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "duration",
    "roster": [
      "person-290",
      "person-281"
    ],
    "ai": "eightFormation"
  },
  "reinforce": {
    "name": "奇兵天降",
    "group": "support",
    "cost": 1,
    "duration": 0,
    "cooldown": 96,
    "maxUses": 1,
    "description": "每场一次；让已经抵达的后备部队额外出场，基准2队，队数按施放者统率与智力折算（1～4队）；突破通常上场人数，使用真实部队及合法空位。额外部队溃败或离场后不补充额外名额。",
    "side": 0,
    "effect": "forceReserve",
    "icon": "wind",
    "scope": {
      "shape": "reserve"
    },
    "baseCount": 2,
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "count",
    "roster": [
      "jia",
      "person-371",
      "person-482",
      "person-441"
    ],
    "ai": "forceReserve"
  },
  "refresh": {
    "name": "重整旗鼓",
    "group": "support",
    "cost": 1,
    "duration": 0,
    "cooldown": 112,
    "maxUses": 1,
    "description": "每场一次；刷新己方已经抵达且仍在场或候补的真实部队全部主动战法使用次数，包括专属，恢复到现有上限；并按施放者统智缩短剩余战法冷却，基准40%（20%～80%）。保留战意、调息、正在蓄力的战法、既有施放与贡献记录；不恢复军略次数。",
    "side": 0,
    "effect": "tacticRefresh",
    "icon": "home",
    "scope": {
      "shape": "army"
    },
    "baseStrength": 0.4,
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "strength",
    "roster": [
      "yu",
      "person-529",
      "person-22",
      "person-411"
    ],
    "ai": "tacticRefresh"
  },
  "storm": {
    "name": "天雷地火",
    "group": "control",
    "cost": 1,
    "duration": 0,
    "cooldown": 128,
    "maxUses": 1,
    "description": "每场一次；全战场随机落下8道雷火，每道影响半径2格内的在场部队，不分敌我。每次基准伤害为被击部队初始兵力的25%，按施放者统智折算，并独立浮动75%～125%；护盾、无敌、魔免及共同伤害保护正常生效，不命中后备或离场部队。结果随战斗种子保存。",
    "side": 2,
    "effect": "catastrophe",
    "icon": "wind",
    "scope": {
      "shape": "battlefield"
    },
    "baseStrength": 0.25,
    "strikes": 8,
    "strikeRadius": 2,
    "randomDamage": {
      "min": 0.75,
      "max": 1.25
    },
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "strength",
    "roster": [
      "person-404",
      "person-605"
    ],
    "ai": "catastrophe"
  },
  "swift": {
    "name": "疾风迅雷",
    "group": "support",
    "cost": 1,
    "duration": 12,
    "cooldown": 56,
    "description": "圆形半径2格；友军获得神速，移动力+1、攻击间隔缩短25%、无视敌军ZOC；基准12回合，按施放者统智折算。",
    "side": 0,
    "effect": "rapidAdvance",
    "icon": "wind",
    "scope": {
      "shape": "circle",
      "radius": 2
    },
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "duration",
    "roster": [
      "person-366",
      "person-137"
    ],
    "ai": "rapidAdvance"
  },
  "blockade": {
    "name": "十面埋伏",
    "group": "control",
    "cost": 1,
    "duration": 20,
    "cooldown": 64,
    "description": "阻止敌方已经抵达的后备部队正常补位；基准20回合，按施放者统智折算。敌军可用奇兵天降突破封锁，未到援军仍按真实条件抵达。",
    "side": 1,
    "effect": "blockade",
    "field": "blockadeUntil",
    "icon": "wind",
    "scope": {
      "shape": "reserve"
    },
    "weights": {
      "leadership": 0.3,
      "intellect": 0.7
    },
    "scaling": "duration",
    "roster": [
      "person-264",
      "person-662"
    ],
    "ai": "blockade"
  }
};
