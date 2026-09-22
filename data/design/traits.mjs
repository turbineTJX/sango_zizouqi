// Authoritative design data. Runtime imports this table.
export const TRAIT_DESIGNS = {
  "merchant": {
    "name": "善商",
    "description": "办理集市与商业增收事务时，成果 +20%；不增加常规税收。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "cash",
      "effect"
    ],
    "direction": "commerce",
    "quantity": 0.2
  },
  "farming": {
    "name": "农政",
    "description": "办理督耕、灌溉事务时，成果 +20%；仍受粮仓上限约束。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "grain",
      "effect"
    ],
    "direction": "agriculture",
    "quantity": 0.2
  },
  "inventor": {
    "name": "巧匠",
    "description": "办理研究事务时，研究进度 +20%；仍须完成试制。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "quantity": 0.2
  },
  "builder": {
    "name": "筑城",
    "description": "办理城防修缮时，恢复耐久 +25%，不超过城防上限。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "repair"
    ],
    "quantity": 0.25
  },
  "recruiter": {
    "name": "征募",
    "description": "本人办理征兵时，每名士兵的金钱费用 −15%；不减少预备兵和粮食消耗。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "recruit"
    ],
    "recruitDiscount": 0.15
  },
  "trainer": {
    "name": "练兵",
    "description": "办理守城操演与战前动员时，准备战意 +20%；沿用守城首发与总上限。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "prepare"
    ],
    "value": "intent",
    "quantity": 0.2
  },
  "physician": {
    "name": "医术",
    "description": "本人办理救治、疗养时，恢复量 +25%；只恢复原部队的真实伤兵。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "heal"
    ],
    "quantity": 0.25
  },
  "insight": {
    "name": "眼力",
    "description": "本人探索人才时，成功机会 +8 个百分点；仍需存在未知人才。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "explore"
    ],
    "chance": 0.08
  },
  "persuader": {
    "name": "说客",
    "description": "本人登用、劝说人才时，成功机会 +8 个百分点；不绕过意愿、忠诚和行程。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "hire",
      "persuade"
    ],
    "chance": 0.08
  },
  "mediator": {
    "name": "调和",
    "description": "同城同方向协作的参与者有此特性时，协作机会 +10 个百分点；双方同名不叠加。",
    "tier": "共享特性",
    "domain": "domestic",
    "scope": "cooperation"
  },
  "transporter": {
    "name": "运输",
    "description": "本人带领运输队时，行进速度 +20%；遇敌仍直接损失。",
    "tier": "共享特性",
    "domain": "movement",
    "scope": "transport"
  },
  "traveler": {
    "name": "健行",
    "description": "轻装调任、在野移动、赴访及返程速度 +15%；不加速军团或运输队。",
    "tier": "共享特性",
    "domain": "movement",
    "scope": "personnel"
  },
  "armyDiscipline": {
    "name": "治军",
    "description": "仅任军团长时，所属军团全部部队军纪 +10%。",
    "tier": "共享特性",
    "domain": "command",
    "scope": "army",
    "role": "leader",
    "stats": {
      "discipline": 0.1
    }
  },
  "armyAssault": {
    "name": "督战",
    "description": "仅任军团长时，所属军团全部部队攻击 +6%。",
    "tier": "共享特性",
    "domain": "command",
    "scope": "army",
    "role": "leader",
    "stats": {
      "attack": 0.06
    }
  },
  "armyPlanning": {
    "name": "运筹",
    "description": "仅任军师时，所属军团全部部队谋略威力 +8%。",
    "tier": "共享特性",
    "domain": "command",
    "scope": "army",
    "role": "advisor",
    "stats": {
      "strategyPower": 0.08
    }
  },
  "armyProtection": {
    "name": "料敌",
    "description": "仅任军师时，所属军团全部部队防御 +6%。",
    "tier": "共享特性",
    "domain": "command",
    "scope": "army",
    "role": "advisor",
    "stats": {
      "defense": 0.06
    }
  },
  "spearGeneral": {
    "name": "枪将",
    "tier": "兵种专长",
    "description": "本队为枪兵时，武技战法对武力低于自己的部队伤害 +20%；不强化普攻、谋略或攻城",
    "domain": "battle"
  },
  "halberdGeneral": {
    "name": "戟将",
    "tier": "兵种专长",
    "description": "本队为戟兵时，武技战法对武力低于自己的部队伤害 +20%；不强化普攻、谋略或攻城",
    "domain": "battle"
  },
  "cavalryGeneral": {
    "name": "骑将",
    "tier": "兵种专长",
    "description": "本队为骑兵时，武技战法对武力低于自己的部队伤害 +20%；不强化普攻、谋略或攻城",
    "domain": "battle"
  },
  "bowGeneral": {
    "name": "弓将",
    "tier": "兵种专长",
    "description": "本队为弓兵时，武技战法对武力低于自己的部队伤害 +20%；不强化普攻、谋略或攻城",
    "domain": "battle"
  },
  "wealth": {
    "name": "富豪",
    "tier": "内政",
    "description": "任太守时，本城每旬金收入 +25%；只加成结算收入，不增殖现有府库",
    "domain": "domestic",
    "effects": {
      "gold": 0.25
    }
  },
  "rice": {
    "name": "米道",
    "tier": "内政",
    "description": "任太守时，本城每旬粮收入 +25%；仍受粮仓容量限制",
    "domain": "domestic",
    "effects": {
      "grain": 0.25
    }
  },
  "administration": {
    "name": "能吏",
    "tier": "内政",
    "description": "本人办理建设，或任本城太守时，新开工费用 −20%；同名不叠加，不追溯退款",
    "domain": "domestic",
    "effects": {
      "projectDiscount": 0.2
    }
  },
  "fame": {
    "name": "名声",
    "tier": "内政",
    "description": "任太守时，本城每旬兵源恢复 +20%；不增加已编制兵力或征募额度",
    "domain": "domestic",
    "effects": {
      "manpower": 0.2
    }
  },
  "benevolence": {
    "name": "仁政",
    "tier": "内政",
    "description": "本人办理安抚，或任本城太守时，安抚基础忠诚恢复 +5；同名不叠加，仍受人才忠诚上限限制",
    "domain": "domestic",
    "effects": {
      "relief": 5
    }
  },
  "orator": {
    "name": "论客",
    "tier": "外交预留",
    "description": "外交系统预留：拟影响交涉成功率；当前版本未开放，无战斗或内政加成",
    "domain": "diplomacy",
    "available": false
  },
  "affinity": {
    "name": "亲善",
    "tier": "外交预留",
    "description": "外交系统预留：拟影响关系改善；当前版本未开放，无战斗或内政加成",
    "domain": "diplomacy",
    "available": false
  },
  "halberdDrill": {
    "name": "戟阵",
    "tier": "定位通用",
    "description": "本队为戟兵时，防御 +15%、攻速 +10%",
    "domain": "battle"
  },
  "siegeDrill": {
    "name": "机巧",
    "tier": "定位通用",
    "description": "本队为兵器时，攻击 +10%、攻城威力 +20%",
    "domain": "battle"
  },
  "shipDrill": {
    "name": "操舵",
    "tier": "定位通用",
    "description": "本队为舰船时，防御 +15%、移速 +10%",
    "domain": "battle"
  },
  "assault": {
    "name": "强攻",
    "tier": "基础通用",
    "description": "攻击 +8%",
    "domain": "battle"
  },
  "iron": {
    "name": "铁壁",
    "tier": "基础通用",
    "description": "防御 +10%",
    "domain": "battle"
  },
  "discipline": {
    "name": "严整",
    "tier": "基础通用",
    "description": "军纪 +12%",
    "domain": "battle"
  },
  "martial": {
    "name": "勇武",
    "tier": "基础通用",
    "description": "武技威力 +10%",
    "domain": "battle"
  },
  "scholar": {
    "name": "博识",
    "tier": "基础通用",
    "description": "谋略威力 +10%",
    "domain": "battle"
  },
  "spirit": {
    "name": "振奋",
    "tier": "基础通用",
    "description": "普攻获得攻击战意时额外 +2",
    "domain": "battle"
  },
  "endurance": {
    "name": "坚忍",
    "tier": "基础通用",
    "description": "获得受击战意时额外 +2，同次多段战法对本队只计一次",
    "domain": "battle"
  },
  "interdict": {
    "name": "截气",
    "tier": "定位通用",
    "description": "本队普攻不让目标获得该次受击战意（含坚忍）；不阻止目标自己攻击或接受友军补给",
    "domain": "battle"
  },
  "stifle": {
    "name": "断势",
    "tier": "定位通用",
    "description": "本队伤害战法不让目标获得该次受击战意（含坚忍）；可配合减战意持续压制，普攻不享受此效果",
    "domain": "battle"
  },
  "shelter": {
    "name": "护身",
    "tier": "基础通用",
    "description": "受到普攻伤害降低 8%",
    "domain": "battle"
  },
  "spear": {
    "name": "枪阵",
    "tier": "定位通用",
    "description": "枪兵相邻有友军时，防御 +15%",
    "domain": "battle"
  },
  "rider": {
    "name": "骑术",
    "tier": "定位通用",
    "description": "骑兵移速 +20%",
    "domain": "battle"
  },
  "bow": {
    "name": "弓术",
    "tier": "定位通用",
    "description": "弓兵相邻无敌军时，攻击 +15%",
    "domain": "battle"
  },
  "crossbow": {
    "name": "弩术",
    "tier": "定位通用",
    "description": "弩兵连续普攻同一目标，从第三次起普攻伤害 +18%；换目标重置",
    "domain": "battle"
  },
  "joint": {
    "name": "合击",
    "tier": "定位通用",
    "description": "普攻目标与其他己方部队相邻时，普攻伤害 +15%",
    "domain": "battle"
  },
  "steady": {
    "name": "持重",
    "tier": "定位通用",
    "description": "连续 3 日未移动，防御 +15%；任何位移重置",
    "domain": "battle"
  },
  "desperate": {
    "name": "临危",
    "tier": "定位通用",
    "description": "兵力低于上限 40% 时，防御、军纪各 +15%",
    "domain": "battle"
  },
  "prepared": {
    "name": "备战",
    "tier": "定位通用",
    "description": "预备队首次入场时，战意 +25；每场一次",
    "domain": "battle"
  },
  "shield": {
    "name": "护持",
    "tier": "定位通用",
    "description": "本队战法提供的护盾量 +20%",
    "domain": "battle"
  },
  "combo": {
    "name": "协谋",
    "tier": "定位通用",
    "description": "作为后续一招触发连携，数值加成额外 +5 个百分点",
    "domain": "battle"
  },
  "suppress": {
    "name": "挫锐",
    "tier": "定位通用",
    "description": "本队战法降低敌方战意的数值 +20%",
    "domain": "battle"
  },
  "calm": {
    "name": "镇定",
    "tier": "定位通用",
    "description": "受到的战意降低效果减弱 20%",
    "domain": "battle"
  },
  "veteran": {
    "name": "百战",
    "tier": "高级通用",
    "description": "攻击、防御各 +15%",
    "domain": "battle"
  },
  "valor": {
    "name": "骁勇",
    "tier": "高级通用",
    "description": "武技威力 +25%",
    "domain": "battle"
  },
  "wisdom": {
    "name": "深谋",
    "tier": "高级通用",
    "description": "谋略威力 +25%",
    "domain": "battle"
  },
  "fortress": {
    "name": "坚守",
    "tier": "高级通用",
    "description": "本队受到所有伤害降低 12%；野战、守城均生效",
    "domain": "battle"
  },
  "rapid": {
    "name": "疾射",
    "tier": "高级通用",
    "description": "弓兵、弩兵攻速 +20%",
    "domain": "battle"
  },
  "aid": {
    "name": "辅军",
    "tier": "高级通用",
    "description": "战法给予其他友军的护盾、战意及冷却缩减量 +25%",
    "domain": "battle"
  },
  "command": {
    "name": "御众",
    "tier": "专属",
    "description": "在场时，周围 2 格内其他友军攻击、防御各 +10%",
    "domain": "battle"
  },
  "defiant": {
    "name": "刚烈",
    "tier": "专属",
    "description": "兵力越低，攻击与武技威力越高；兵力降至 50% 时各达 +25%",
    "domain": "battle"
  },
  "isolated": {
    "name": "摧锋",
    "tier": "专属",
    "description": "目标相邻没有其友军时，普攻、武力战法伤害 +25%",
    "domain": "battle"
  },
  "guard": {
    "name": "虎卫",
    "tier": "专属",
    "description": "相邻其他友军受到普攻、武力战法伤害降低 15%；自身降低 10%",
    "domain": "battle"
  },
  "foresight": {
    "name": "料敌",
    "tier": "专属",
    "description": "对战意低于 60 的敌军部队，谋略伤害 +30%",
    "domain": "battle"
  },
  "rescue": {
    "name": "解危",
    "tier": "专属",
    "description": "战法支援兵力低于 50% 的其他友军时，护盾、战意及冷却缩减量 +35%",
    "domain": "battle"
  },
  "swift": {
    "name": "神行",
    "tier": "专属",
    "description": "相邻无敌军时，移速 +30%、攻速 +20%",
    "domain": "battle"
  },
  "adapt": {
    "name": "巧变",
    "tier": "专属",
    "description": "预备队首次入场后 15 日，攻击、武技威力各 +20%，受到伤害降低 15%",
    "domain": "battle"
  },
  "hero-person-636": {
    "name": "昭烈",
    "tier": "专属",
    "description": "本队自身兵力低于 50% 时：防御 +18%、军纪 +22%",
    "domain": "battle",
    "personal": {
      "name": "昭烈",
      "troops": null,
      "stats": {
        "defense": 0.18,
        "discipline": 0.22
      },
      "trigger": "wounded"
    }
  },
  "hero-person-99": {
    "name": "武圣",
    "tier": "专属",
    "description": "本队为骑兵时，常驻：攻击 +18%、攻速 +12%",
    "domain": "battle",
    "personal": {
      "name": "武圣",
      "troops": [
        "cavalry"
      ],
      "stats": {
        "attack": 0.18,
        "attackSpeed": 0.12
      },
      "trigger": "always"
    }
  },
  "hero-person-433": {
    "name": "燕人",
    "tier": "专属",
    "description": "本队为枪兵／戟兵时，相邻有敌军时：攻击 +20%、防御 +12%",
    "domain": "battle",
    "personal": {
      "name": "燕人",
      "troops": [
        "spear",
        "halberd"
      ],
      "stats": {
        "attack": 0.2,
        "defense": 0.12
      },
      "trigger": "engaged"
    }
  },
  "hero-person-396": {
    "name": "龙胆",
    "tier": "专属",
    "description": "本队为骑兵时，常驻：防御 +20%、军纪 +25%",
    "domain": "battle",
    "personal": {
      "name": "龙胆",
      "troops": [
        "cavalry"
      ],
      "stats": {
        "defense": 0.2,
        "discipline": 0.25
      },
      "trigger": "always"
    }
  },
  "hero-person-516": {
    "name": "锦骑",
    "tier": "专属",
    "description": "本队为骑兵时，常驻：移速 +25%、攻击 +15%",
    "domain": "battle",
    "personal": {
      "name": "锦骑",
      "troops": [
        "cavalry"
      ],
      "stats": {
        "move": 0.25,
        "attack": 0.15
      },
      "trigger": "always"
    }
  },
  "hero-person-186": {
    "name": "老健",
    "tier": "专属",
    "description": "本队为弓兵时，连续 3 日未移动时：攻击 +22%",
    "domain": "battle",
    "personal": {
      "name": "老健",
      "troops": [
        "archer"
      ],
      "stats": {
        "attack": 0.22
      },
      "trigger": "steady"
    }
  },
  "hero-person-290": {
    "name": "卧龙",
    "tier": "专属",
    "description": "本队常驻：军纪 +30%、攻速 +12%",
    "domain": "battle",
    "personal": {
      "name": "卧龙",
      "troops": null,
      "stats": {
        "discipline": 0.3,
        "attackSpeed": 0.12
      },
      "trigger": "always"
    }
  },
  "hero-person-558": {
    "name": "凤雏",
    "tier": "专属",
    "description": "本队常驻：攻速 +22%、移速 +10%",
    "domain": "battle",
    "personal": {
      "name": "凤雏",
      "troops": null,
      "stats": {
        "attackSpeed": 0.22,
        "move": 0.1
      },
      "trigger": "always"
    }
  },
  "hero-person-137": {
    "name": "幼麟",
    "tier": "专属",
    "description": "本队为枪兵时，常驻：攻击 +15%、军纪 +20%",
    "domain": "battle",
    "personal": {
      "name": "幼麟",
      "troops": [
        "spear"
      ],
      "stats": {
        "attack": 0.15,
        "discipline": 0.2
      },
      "trigger": "always"
    }
  },
  "hero-person-125": {
    "name": "奇兵",
    "tier": "专属",
    "description": "本队为枪兵／戟兵时，相邻无其他友军时：攻击 +22%、移速 +18%",
    "domain": "battle",
    "personal": {
      "name": "奇兵",
      "troops": [
        "spear",
        "halberd"
      ],
      "stats": {
        "attack": 0.22,
        "move": 0.18
      },
      "trigger": "alone"
    }
  },
  "hero-person-368": {
    "name": "碧眼",
    "tier": "专属",
    "description": "本队常驻：防御 +15%、军纪 +15%",
    "domain": "battle",
    "personal": {
      "name": "碧眼",
      "troops": null,
      "stats": {
        "defense": 0.15,
        "discipline": 0.15
      },
      "trigger": "always"
    }
  },
  "hero-person-371": {
    "name": "霸业",
    "tier": "专属",
    "description": "本队为骑兵时，自身兵力不低于 70% 时：攻击 +25%",
    "domain": "battle",
    "personal": {
      "name": "霸业",
      "troops": [
        "cavalry"
      ],
      "stats": {
        "attack": 0.25
      },
      "trigger": "healthy"
    }
  },
  "hero-person-246": {
    "name": "都督",
    "tier": "专属",
    "description": "本队为弓兵／舰船时，常驻：攻速 +18%、军纪 +15%",
    "domain": "battle",
    "personal": {
      "name": "都督",
      "troops": [
        "archer",
        "ship"
      ],
      "stats": {
        "attackSpeed": 0.18,
        "discipline": 0.15
      },
      "trigger": "always"
    }
  },
  "hero-person-668": {
    "name": "济军",
    "tier": "专属",
    "description": "本队为弩兵／戟兵时，常驻：防御 +22%、移速 +15%",
    "domain": "battle",
    "personal": {
      "name": "济军",
      "troops": [
        "crossbow",
        "halberd"
      ],
      "stats": {
        "defense": 0.22,
        "move": 0.15
      },
      "trigger": "always"
    }
  },
  "hero-person-662": {
    "name": "克己",
    "tier": "专属",
    "description": "本队为枪兵／舰船时，常驻：攻击 +20%、军纪 +18%",
    "domain": "battle",
    "personal": {
      "name": "克己",
      "troops": [
        "spear",
        "ship"
      ],
      "stats": {
        "attack": 0.2,
        "discipline": 0.18
      },
      "trigger": "always"
    }
  },
  "hero-person-603": {
    "name": "儒将",
    "tier": "专属",
    "description": "本队为弓兵／舰船时，连续 3 日未移动时：防御 +18%、攻击 +18%",
    "domain": "battle",
    "personal": {
      "name": "儒将",
      "troops": [
        "archer",
        "ship"
      ],
      "stats": {
        "defense": 0.18,
        "attack": 0.18
      },
      "trigger": "steady"
    }
  },
  "hero-person-119": {
    "name": "锦帆",
    "tier": "专属",
    "description": "本队为骑兵／舰船时，常驻：攻速 +20%、移速 +15%",
    "domain": "battle",
    "personal": {
      "name": "锦帆",
      "troops": [
        "cavalry",
        "ship"
      ],
      "stats": {
        "attackSpeed": 0.2,
        "move": 0.15
      },
      "trigger": "always"
    }
  },
  "hero-person-390": {
    "name": "笃烈",
    "tier": "专属",
    "description": "本队为骑兵／戟兵时，常驻：攻速 +25%",
    "domain": "battle",
    "personal": {
      "name": "笃烈",
      "troops": [
        "cavalry",
        "halberd"
      ],
      "stats": {
        "attackSpeed": 0.25
      },
      "trigger": "always"
    }
  },
  "hero-person-164": {
    "name": "苦肉",
    "tier": "专属",
    "description": "本队为弓兵／舰船时，自身兵力低于 50% 时：防御 +30%、军纪 +20%",
    "domain": "battle",
    "personal": {
      "name": "苦肉",
      "troops": [
        "archer",
        "ship"
      ],
      "stats": {
        "defense": 0.3,
        "discipline": 0.2
      },
      "trigger": "wounded"
    }
  },
  "hero-person-226": {
    "name": "隐忍",
    "tier": "专属",
    "description": "本队第 40 日起：攻击 +20%、防御 +20%",
    "domain": "battle",
    "personal": {
      "name": "隐忍",
      "troops": null,
      "stats": {
        "attack": 0.2,
        "defense": 0.2
      },
      "trigger": "late"
    }
  },
  "hero-person-291": {
    "name": "严整",
    "tier": "专属",
    "description": "本队为枪兵／戟兵时，相邻有其他友军时：防御 +20%、军纪 +15%",
    "domain": "battle",
    "personal": {
      "name": "严整",
      "troops": [
        "spear",
        "halberd"
      ],
      "stats": {
        "defense": 0.2,
        "discipline": 0.15
      },
      "trigger": "formation"
    }
  },
  "hero-person-472": {
    "name": "恶来",
    "tier": "专属",
    "description": "本队为戟兵时，相邻有敌军时：防御 +25%、攻速 +15%",
    "domain": "battle",
    "personal": {
      "name": "恶来",
      "troops": [
        "halberd"
      ],
      "stats": {
        "defense": 0.25,
        "attackSpeed": 0.15
      },
      "trigger": "engaged"
    }
  },
  "hero-person-661": {
    "name": "飞将",
    "tier": "专属",
    "description": "本队为骑兵时，相邻无其他友军时：攻击 +30%、移速 +15%",
    "domain": "battle",
    "personal": {
      "name": "飞将",
      "troops": [
        "cavalry"
      ],
      "stats": {
        "attack": 0.3,
        "move": 0.15
      },
      "trigger": "alone"
    }
  },
  "hero-person-425": {
    "name": "倾城",
    "tier": "专属",
    "description": "本队常驻：移速 +20%、军纪 +20%",
    "domain": "battle",
    "personal": {
      "name": "倾城",
      "troops": null,
      "stats": {
        "move": 0.2,
        "discipline": 0.2
      },
      "trigger": "always"
    }
  },
  "hero-person-404": {
    "name": "天公",
    "tier": "专属",
    "description": "本队自身兵力低于 50% 时：攻速 +20%、军纪 +20%",
    "domain": "battle",
    "personal": {
      "name": "天公",
      "troops": null,
      "stats": {
        "attackSpeed": 0.2,
        "discipline": 0.2
      },
      "trigger": "wounded"
    }
  },
  "hero-person-494": {
    "name": "暴虐",
    "tier": "专属",
    "description": "本队自身兵力低于 50% 时：攻击 +30%",
    "domain": "battle",
    "personal": {
      "name": "暴虐",
      "troops": null,
      "stats": {
        "attack": 0.3
      },
      "trigger": "wounded"
    }
  },
  "formationSupport": {
    "name": "协阵",
    "domain": "battle",
    "description": "每6日为相邻其他友军救治已有伤兵并恢复战意；不限兵种，不占战法名额。效果随持有者政治、现役兵力提高；同名光环只取最强，混乱、混乱、撤退或溃败时中断",
    "aura": {
      "interval": 6,
      "range": 1,
      "healFraction": 0.005,
      "intent": 2,
      "basePower": 80,
      "politicsScale": 2
    }
  },
  "campCare": {
    "name": "营务",
    "domain": "battle",
    "description": "本队防御提高政治×0.2%，军纪提高政治×0.1%（政治按0至100计算）；不限兵种",
    "politicsStats": {
      "defense": 0.002,
      "discipline": 0.001
    }
  }
};
