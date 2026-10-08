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
    "description": "每8日救援2格内兵力低于40%的另一队友军：解除混乱、嘲讽、丧志与抑气，并给予兵力上限8%的护盾，持续5日。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "rescue",
        "interval": 8,
        "range": 2,
        "health": 0.4,
        "fraction": 0.08,
        "steps": 5
      }
    ]
  },
  "hero-person-99": {
    "name": "武圣",
    "tier": "专属",
    "description": "骑兵相邻普攻命中武力低于自己的敌军时，30%概率缴械2日；每6日最多判定一次，遵守控制保护。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "status",
        "troops": [
          "cavalry"
        ],
        "range": 1,
        "status": "disarm",
        "steps": 2,
        "chance": 0.3,
        "greater": "force",
        "interval": 6
      }
    ]
  },
  "hero-person-433": {
    "name": "燕人",
    "tier": "专属",
    "description": "枪兵、戟兵相邻普攻命中后，30%概率击退目标一格并使其失去ZOC 2日；每6日最多判定一次。无空格、方阵或控制保护时不能击退。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "push",
        "troops": [
          "spear",
          "halberd"
        ],
        "range": 1,
        "chance": 0.3,
        "steps": 2,
        "interval": 6
      }
    ]
  },
  "hero-person-396": {
    "name": "龙胆",
    "tier": "专属",
    "description": "本队免疫混乱与嘲讽；任何兵种均生效，其他控制仍按正常规则结算。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "passive",
        "effect": "immunity",
        "statuses": [
          "confuse",
          "taunt"
        ]
      }
    ]
  },
  "hero-person-516": {
    "name": "锦骑",
    "tier": "专属",
    "description": "骑兵移动后的3日内，相邻普攻命中使目标失去ZOC并迟滞3日；每8日最多触发一次，遵守控制保护。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "disrupt",
        "troops": [
          "cavalry"
        ],
        "range": 1,
        "movedWithin": 3,
        "steps": 3,
        "interval": 8
      }
    ]
  },
  "hero-person-186": {
    "name": "老健",
    "tier": "专属",
    "description": "弓兵、弩兵连续3日未移动后获得远射：普攻射程+1；移动后失去此特性提供的远射。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "steadyRange",
        "troops": [
          "archer",
          "crossbow"
        ],
        "steady": 3,
        "interval": 1,
        "steps": 2
      }
    ]
  },
  "hero-person-290": {
    "name": "卧龙",
    "tier": "专属",
    "description": "任军团长或军师且本队仍有兵力、未撤离时，所属军团的军略恢复速度×2；同名不叠加，预备队任职也生效。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "passive",
        "effect": "commandRate",
        "roles": [
          "leader",
          "advisor"
        ],
        "multiplier": 2
      }
    ]
  },
  "hero-person-558": {
    "name": "凤雏",
    "tier": "专属",
    "description": "伤害战法命中后，将目标及其相邻最多两队敌军连接6日，直接伤害可传导；每12日一次，沿用连环传导上限，不递归。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "tacticHit",
        "effect": "link",
        "range": 1,
        "targets": 3,
        "steps": 6,
        "interval": 12
      }
    ]
  },
  "hero-person-137": {
    "name": "幼麟",
    "tier": "专属",
    "description": "枪兵施放战法后，为2格内兵力比例最低的另一队友军提供兵力上限6%的护盾，持续5日；每8日一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "cast",
        "effect": "allyShield",
        "troops": [
          "spear"
        ],
        "range": 2,
        "fraction": 0.06,
        "steps": 5,
        "interval": 8
      }
    ]
  },
  "hero-person-125": {
    "name": "奇兵",
    "tier": "专属",
    "description": "枪兵、戟兵首次入场获得8日伏兵；攻击、受伤或接触敌军ZOC后显形，洞察可识破，每场一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "entryStealth",
        "troops": [
          "spear",
          "halberd"
        ],
        "steps": 8,
        "maxUses": 1
      }
    ]
  },
  "hero-person-368": {
    "name": "碧眼",
    "tier": "专属",
    "description": "任军团长或军师时，施放军略后为所属军团在场部队解除混乱、嘲讽、丧志与抑气，并给予3日坚定；每12日一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "ownCommand",
        "effect": "armyCleanse",
        "roles": [
          "leader",
          "advisor"
        ],
        "steps": 3,
        "interval": 12
      }
    ]
  },
  "hero-person-371": {
    "name": "霸业",
    "tier": "专属",
    "description": "骑兵直接击溃敌军后，自身获得25战意、所有普通战法冷却缩短4日；每6日一次，不恢复次数与调息。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "kill",
        "effect": "rallySelf",
        "troops": [
          "cavalry"
        ],
        "intent": 25,
        "reduction": 4,
        "interval": 6
      }
    ]
  },
  "hero-person-246": {
    "name": "都督",
    "tier": "专属",
    "description": "弓兵、舰船普攻命中后施加一层灼烧，最多三层、持续4日；每4日一次，伤害随谋略威力及目标军纪结算。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "burn",
        "troops": [
          "archer",
          "ship"
        ],
        "steps": 4,
        "interval": 4,
        "scale": 0.04
      }
    ]
  },
  "hero-person-668": {
    "name": "济军",
    "tier": "专属",
    "description": "任军团长或军师时，每8日为所属军团一队在场友军解除混乱、嘲讽、丧志与抑气；优先兵力比例最低者。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "armyRemedy",
        "roles": [
          "leader",
          "advisor"
        ],
        "interval": 8
      }
    ]
  },
  "hero-person-662": {
    "name": "克己",
    "tier": "专属",
    "description": "枪兵、舰船普攻命中后，若自身智力高于目标，30%概率封技2日；每8日最多判定一次，遵守控制保护。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "status",
        "troops": [
          "spear",
          "ship"
        ],
        "status": "seal",
        "greater": "intellect",
        "chance": 0.3,
        "steps": 2,
        "interval": 8
      }
    ]
  },
  "hero-person-603": {
    "name": "燎原",
    "tier": "专属",
    "description": "弓兵、舰船伤害战法命中仍在燃烧的目标后，向其相邻一队未燃烧敌军传播一层灼烧，持续4日；每8日一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "tacticHit",
        "effect": "spreadFire",
        "troops": [
          "archer",
          "ship"
        ],
        "range": 1,
        "steps": 4,
        "interval": 8,
        "scale": 0.04
      }
    ]
  },
  "hero-person-119": {
    "name": "锦帆",
    "tier": "专属",
    "description": "骑兵、舰船首次入场获得10日伏兵；攻击、受伤或接触敌军ZOC后显形，洞察可识破，每场一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "entryStealth",
        "troops": [
          "cavalry",
          "ship"
        ],
        "steps": 10,
        "maxUses": 1
      }
    ]
  },
  "hero-person-390": {
    "name": "笃烈",
    "tier": "专属",
    "description": "骑兵、戟兵普攻完成后，25%概率对原目标追加一次60%武技威力攻击；每4日最多判定一次，不触发普攻附着或递归追击。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basic",
        "effect": "followUp",
        "troops": [
          "cavalry",
          "halberd"
        ],
        "chance": 0.25,
        "scale": 0.6,
        "interval": 4
      }
    ]
  },
  "hero-person-164": {
    "name": "苦肉",
    "tier": "专属",
    "description": "弓兵、舰船兵力低于40%时，普攻造成实际伤害后使目标破甲、疲弱，防御与攻击各降低15%，持续3日；重复命中刷新持续时间，不叠加，可整军解除。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "debuff",
        "troops": [
          "archer",
          "ship"
        ],
        "health": 0.4,
        "statuses": [
          "armorBreak",
          "weaken"
        ],
        "steps": 3,
        "fraction": 0.15
      }
    ]
  },
  "hero-person-226": {
    "name": "隐忍",
    "tier": "专属",
    "description": "任军团长或军师时，敌方施放军略后恢复本方军略进度上限的15%；每12日一次，不影响敌方施放与消耗。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "enemyCommand",
        "effect": "commandRefund",
        "roles": [
          "leader",
          "advisor"
        ],
        "fraction": 0.15,
        "interval": 12
      }
    ]
  },
  "hero-person-291": {
    "name": "长驱",
    "tier": "专属",
    "description": "枪兵、戟兵施放战法后，清除自身迟滞、定身并获得4日无视ZOC；每10日一次，仍不能穿过部队。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "cast",
        "effect": "phase",
        "troops": [
          "spear",
          "halberd"
        ],
        "steps": 4,
        "interval": 10
      }
    ]
  },
  "hero-person-472": {
    "name": "恶来",
    "tier": "专属",
    "description": "戟兵每6日护卫相邻兵力比例最低的另一队友军6日，分担25%直接伤害；同目标只保留一名护卫，不递归分担。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "guard",
        "troops": [
          "halberd"
        ],
        "range": 1,
        "steps": 6,
        "interval": 6
      }
    ]
  },
  "hero-person-661": {
    "name": "飞将",
    "tier": "专属",
    "description": "本队无视敌方ZOC；每次普攻有35%概率变为范围普攻，命中原目标及其相邻最多两队可攻击敌军，各承受完整普攻伤害。仍受自身射程限制，只计一次攻击间隔、攻击战意和附着次数，不追加攻击；不可穿过部队或不可通行地形。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "passive",
        "effect": "ignoreZoc"
      },
      {
        "event": "basic",
        "effect": "areaBasic",
        "chance": 0.35,
        "range": 1,
        "targets": 3
      }
    ]
  },
  "hero-person-425": {
    "name": "倾城",
    "tier": "专属",
    "description": "普攻造成实际伤害后，使目标武技威力与谋略威力降低10%，持续2日；重复命中刷新持续时间，不叠加，可整军解除。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "debuff",
        "statuses": [
          "powerDown"
        ],
        "steps": 2,
        "fraction": 0.1
      }
    ]
  },
  "hero-person-404": {
    "name": "天公",
    "tier": "专属",
    "description": "伤害战法命中后，30%概率雷击目标相邻最多两队其他敌军，各造成40%谋略威力伤害；每8日最多判定一次，不递归。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "tacticHit",
        "effect": "thunder",
        "chance": 0.3,
        "range": 1,
        "targets": 2,
        "scale": 0.4,
        "interval": 8
      }
    ]
  },
  "hero-person-494": {
    "name": "暴虐",
    "tier": "专属",
    "description": "相邻普攻实际削减敌军兵力后，按伤害20%救治自身已有伤兵，单次不超过本队兵力上限3%；每3日一次，受减疗影响，护盾吸收与疑兵伤害不计。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "basicHit",
        "effect": "drain",
        "range": 1,
        "fraction": 0.2,
        "cap": 0.03,
        "interval": 3
      }
    ]
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
  },
  "hero-cao": {
    "name": "奸雄", "tier": "专属", "domain": "battle",
    "description": "作为军团长参战时，所属军团获得一个额外上场名额，上场上限由6队增至7队；军师任职无效。额外名额只能由本军团使用，仍遵守援军到达与部署规则；本场编制确定后保留该名额。",
    "mechanics": [{"event":"passive","effect":"frontline","roles":["leader"],"targets":1}]
  },
  "fieldMedicine": {
    "name": "青囊", "tier": "专属", "domain": "domestic", "scope": "actor", "kinds": ["heal"], "clinicIndependent": true,
    "description": "本人可在没有医馆的据点办理救治、疗养事务；仍须在城任职并支付正常费用及粮食，只恢复本地原部队的真实伤兵。"
  },
  "rapidMarch": {
    "name": "神速", "tier": "专属", "domain": "movement", "scope": "army",
    "description": "作为军团长且所部仍有兵力时，所属军团大地图行军速度提高25%；沿实际道路移动，仍受最慢兵种、士气与缺粮影响。不加速战场移动、运输队或轻装人员。",
    "mechanics": [{"event":"passive","effect":"armySpeed","roles":["leader"],"multiplier":1.25}]
  }
};
