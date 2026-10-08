import {EYE_ACTIONS,TREASURE_RULES} from './treasures.mjs';
export const TRAIT_DESIGNS = {
 treasureEye:{name:'眼力',tier:'普通',domain:'domestic',scope:'actor',kinds:[],strategic:{effect:'treasureDiscovery',chance:TREASURE_RULES.eyeChance,actions:EYE_ACTIONS},description:'本人主办合资格内政并取得真实成果，或实际参战有贡献且存活未被俘时，发现宝物的单次概率由2%提高到4%；不叠加、不缩短30日发现间隔。'},
 treasurePlunder:{name:'夺宝',tier:'普通',domain:'personnel',scope:'actor',kinds:[],strategic:{effect:'treasureCapture',chance:TREASURE_RULES.plunderChance,damage:TREASURE_RULES.plunderDamage},description:'本方获胜，本人实际参战、存活未被俘，并对候选宝物原持有者造成至少其初始兵力10%的真实伤害时，缴获概率由5%提高到10%；不改变战斗目标、不生成新宝物。'},
  "hero-person-368": {
    "name": "碧眼",
    "tier": "专属",
    "description": "任军团长或军师时，施放军略后为所属军团在场部队解除混乱、嘲讽、丧志与抑气，并给予3回合坚定；每12回合一次。",
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
  "hero-person-668": {
    "name": "济军",
    "tier": "普通",
    "description": "任军团长或军师时，每8回合为所属军团一队在场友军解除混乱、嘲讽、丧志与抑气；优先兵力比例最低者。",
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
  "hero-person-226": {
    "name": "隐忍",
    "tier": "专属",
    "description": "任军团长或军师时，敌方施放军略后恢复本方军略进度上限的15%；每12回合一次，不影响敌方施放与消耗。",
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
  "hero-cao": {
    "name": "奸雄",
    "tier": "专属",
    "domain": "battle",
    "description": "作为军团长参战时，所属军团获得一个额外上场名额，上场上限由6队增至7队；军师任职无效。额外名额只能由本军团使用，仍遵守援军到达与部署规则；本场编制确定后保留该名额。",
    "mechanics": [
      {
        "event": "passive",
        "effect": "frontline",
        "roles": [
          "leader"
        ],
        "targets": 1
      }
    ]
  },
  "fieldMedicine": {
    "name": "青囊",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "heal"
    ],
    "clinicIndependent": true,
    "description": "本人可在没有医馆的据点办理救治、疗养事务；仍须在城任职并支付正常费用及粮食，只恢复本地原部队的真实伤兵。"
  },
  "reserveGrain": {
    "name": "备荒",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "grain",
      "trade",
      "rescue"
    ],
    "strategic": {
      "effect": "reserveGrain",
      "days": 20
    },
    "description": "任农业负责人且实际在城时，售粮与自动购粮按本城二十日口粮保留粮食；征兵、补给仍遵守共用预算，不凭空增加库存。"
  },
  "provision": {
    "name": "筹粮",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "trade",
      "grain"
    ],
    "strategic": {
      "effect": "provision"
    },
    "description": "任农业负责人时，出征预留导致可用粮草不足，可提前办理购粮；仍需道路畅通、粮仓空间及实际金钱。"
  },
  "healRemainder": {
    "name": "抚伤",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "heal"
    ],
    "strategic": {
      "effect": "healRemainder"
    },
    "description": "救治原目标后，将本次未用完的救治额度转用于同城其它已有伤兵；不增加总额度，不重复扣粮。"
  },
  "recommendTalent": {
    "name": "举荐",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "explore",
      "hire",
      "persuade"
    ],
    "strategic": {
      "effect": "referral",
      "count": 1,
      "relation": 70
    },
    "description": "成功完成人才搜索或接洽后，从本人关系网揭示一名可实际找到的在野人才；不直接招募，不忽略出仕条件。"
  },
  "calmChain": {
    "name": "安众",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "reassure"
    ],
    "strategic": {
      "effect": "chain"
    },
    "description": "安抚成功后，若同城还有其他合法对象，可立即启动下一次安抚；重新支付费用和完整办理时间，等待军令时不续办。"
  },
  "trialChain": {
    "name": "续研",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "strategic": {
      "effect": "chain"
    },
    "description": "完成一轮研究后，当天接续本城未完成项目或下一项合法科技；新项目支付费用，仍按实际工作日推进，等待军令时不续办。"
  },
  "successor": {
    "name": "接任",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "cash",
      "grain",
      "repair",
      "heal",
      "reassure"
    ],
    "strategic": {
      "effect": "handoff"
    },
    "description": "同城同方向负责人被改任或调离时，可承接其已付费、目标仍合法的进行中事务；自身须空闲，继承进度，不额外获得一次行动。"
  },
  "researchHandoff": {
    "name": "传习",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "strategic": {
      "effect": "handoff"
    },
    "description": "同城技术负责人被改任或调离时，可承接其正在办理的研究；保留行动进度和已付费用，城市项目仍可由其他负责人继续。"
  },
  "speakerHandoff": {
    "name": "说客",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "hire",
      "persuade"
    ],
    "strategic": {
      "effect": "handoff"
    },
    "description": "可接续同城人才负责人中止的接洽行动；本人仍须实际赴访，到达后才推进接洽，原执行人实际返程。"
  },
  "armyFarm": {
    "name": "屯田",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "grain"
    ],
    "strategic": {
      "effect": "farmTroops",
      "requiredTroops": 1000,
      "bonus": 0.25
    },
    "description": "任农业负责人办理督耕时，可使用本人实际驻城的闲置部队协作；按士兵实际参与日数折算一次协作成果，守城或出征立即停止，不占用其他武将。"
  },
  "receiveGrain": {
    "name": "接粮",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "receiveGrain"
    },
    "description": "任军团长且仍有兵力时，可与抵达同一节点的己方粮食运输队交接；先检查敌军拦截，转移不超过携粮空额，运输队货物等量减少。"
  },
  "resupplyStop": {
    "name": "留粮",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "resupplyStop"
    },
    "description": "任军团长且仍有兵力时，途经己方据点可装载该城口粮和军令预留以外的粮食；不超过携粮上限，不凭空生成补给。"
  },
  "relayCargo": {
    "name": "转漕",
    "tier": "普通",
    "domain": "movement",
    "scope": "transport",
    "kinds": [],
    "strategic": {
      "effect": "relayCargo"
    },
    "description": "运粮出发时可预定一个己方接力据点，先在中转点停驻检查，再携原货继续送达；不重复装货、不瞬移，运输途中照常遇敌损失。"
  },
  "lightMarch": {
    "name": "轻装",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "lightMarch",
      "capacity": 0.5,
      "speed": 1.2
    },
    "description": "任军团长时可选择轻装行军：只能在己方据点启用，携粮上限减半，超出粮食返还本城，移动行动力提高20%；退出须在己方据点。"
  },
  "forcedMarch": {
    "name": "急行",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "forcedMarch",
      "morale": 5,
      "minimum": 40,
      "speed": 1.35,
      "recovery": 2
    },
    "description": "任军团长时可选择急行：每个实际行军日消耗5士气，行动力提高35%；士气不足40或缺粮时停止急行，退出后至少休整2天才可重启。"
  },
  "xunTalent": {
    "name": "王佐",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "explore",
      "hire",
      "persuade"
    ],
    "strategic": {
      "effect": "referral",
      "count": 2,
      "relation": 70
    },
    "description": "成功完成人才搜索或接洽后，可沿本人及本次已结识人才的关系链揭示最多两名在野人才；须真实在野且无在途状态，不直接招募。"
  },
  "zhangAdministration": {
    "name": "辅政",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [],
    "strategic": {
      "effect": "crossCooperate"
    },
    "description": "本人实际在城任职且未等待军令时，可与同城不同方向的负责人协作；仍按执行事务方向的唯一属性计算，同一人每天最多参与一次协作。"
  },
  "dengFarm": {
    "name": "军屯",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "grain"
    ],
    "strategic": {
      "effect": "farmTroops",
      "requiredTroops": 1000,
      "bonus": 0.25
    },
    "description": "任农业负责人时，可组织本城未出征且主将空闲的驻城部队参与督耕；按实际参与日数结算协作，正在办事、等待军令和参与守城的人员不计。"
  },
  "maCraft": {
    "name": "巧思",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "strategic": {
      "effect": "chain"
    },
    "description": "完成一轮研究后，立即接续本城未完成项目或下一项合法科技；仍需真实费用和工作时间。"
  },
  "cycleCargo": {
    "name": "漕运",
    "tier": "专属",
    "domain": "movement",
    "scope": "transport",
    "kinds": [],
    "strategic": {
      "effect": "cycleCargo"
    },
    "description": "本人无部队及伤兵时，可安排最多5批同线往返运粮；每批从源城实际库存装粮，保留源城二十日口粮与军令预留。双方据点失守、道路不通或库存不足即停止继续装粮；往返全程可遭敌军拦截。"
  },
  "marketYield": {
    "name": "市集",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "cash"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "fair"
      ],
      "successQuantity": 0.25
    },
    "description": "成功时本次集市收入提高25%；失败与部分达成按原结算。"
  },
  "merchantReach": {
    "name": "通商",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "effect"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "merchants"
      ],
      "duration": 1
    },
    "description": "成功时招徕商旅的原产金增益延长1次旬末结算，幅度不变。"
  },
  "partnershipDeal": {
    "name": "合营",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "discount"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "partnership"
      ],
      "discount": 0.1
    },
    "description": "非失败时，本次招商取得的一次性建设优惠增加10个百分点，仍遵守原优惠上限。"
  },
  "grainSale": {
    "name": "善贾",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "trade"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "sell"
      ],
      "price": 0.2
    },
    "description": "成交时出售同量余粮所得金提高20%，售粮数量与粮食预留规则不变。"
  },
  "taxOrder": {
    "name": "理税",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "effect"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "tax"
      ],
      "effect": 0.5
    },
    "description": "非失败时，本次整顿税务产生的产金增益幅度提高50%，有效次数不变。"
  },
  "marketConstruction": {
    "name": "营市",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "build"
    ],
    "direction": "commerce",
    "work": {
      "actions": [
        "build_commerce"
      ],
      "setbackDays": 3
    },
    "description": "本次市场建设受阻时，追加工期由5天改为3天；正常建设工期与费用不变。"
  },
  "farmYield": {
    "name": "精耕",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "grain"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "cultivate"
      ],
      "successQuantity": 0.25
    },
    "description": "成功时本次督耕入仓粮食提高25%，超过现有粮仓空间的部分不生成。"
  },
  "irrigationYield": {
    "name": "疏渠",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "effect"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "irrigate"
      ],
      "effect": 0.4
    },
    "description": "非失败时，本次灌溉产生的产粮增益幅度提高40%，有效次数不变。"
  },
  "purchaseFill": {
    "name": "丰籴",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "trade"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "buy"
      ],
      "partialFloor": 0.75
    },
    "description": "购粮部分达成时，成交比例由45%提高到75%；成功、失败结果不改，未成交货款按实际成交量退回。"
  },
  "harvestRescue": {
    "name": "抢收",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "rescue"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "harvest"
      ],
      "partialFloor": 0.75
    },
    "description": "抢收部分达成时，本次灾情挽回比例由45%提高到75%；不影响其它灾情。"
  },
  "storageRescue": {
    "name": "仓储",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "rescue"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "store"
      ],
      "partialFloor": 0.8
    },
    "description": "整理仓储部分达成时，本次霉变损失挽回比例由45%提高到80%；不增加正常粮仓容量。"
  },
  "farmConstruction": {
    "name": "垦殖",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "build"
    ],
    "direction": "agriculture",
    "work": {
      "actions": [
        "build_farm",
        "build_granary"
      ],
      "setbackDays": 3
    },
    "description": "本次农田或粮仓建设受阻时，追加工期由5天改为3天；公共已完成进度照常保留。"
  },
  "recruitFill": {
    "name": "募众",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "recruit"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "recruit"
      ],
      "partialFloor": 0.75
    },
    "description": "常规征兵部分达成时，实际整补比例由45%提高到75%；上限仍为本次已预留兵员及目标真实缺额。"
  },
  "urgentRisk": {
    "name": "速募",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "recruit"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "urgent"
      ],
      "riskReduction": 0.15
    },
    "description": "只抵消加急征兵自带的15个百分点风险扣减；仍需正常成功判定与真实兵员预算。"
  },
  "wallRepair": {
    "name": "缮城",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "repair"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "repair"
      ],
      "quantity": 0.3
    },
    "description": "非失败时，本次常规修缮恢复城门耐久提高30%，不超过本城实际城防上限。"
  },
  "urgentRepair": {
    "name": "应急",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "repair"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "rush"
      ],
      "partialFloor": 0.8
    },
    "description": "紧急抢修部分达成时，实际修复比例由45%提高到80%；不改变费用与办理时间。"
  },
  "wallInspection": {
    "name": "固防",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "repair"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "inspect"
      ],
      "quantity": 0.5
    },
    "description": "非失败时，本次检查整固恢复城门耐久提高50%，满耐久时无额外成果。"
  },
  "laborDeal": {
    "name": "工务",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "discount"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "labor"
      ],
      "discount": 0.1
    },
    "description": "非失败时，本次征集工匠的一次性军事建设优惠增加10个百分点，仍遵守原优惠上限。"
  },
  "militaryConstruction": {
    "name": "营筑",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "build"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "build_barracks",
        "build_walls"
      ],
      "criticalRefund": 0.25
    },
    "description": "兵营或城墙建设大成功时，返还费用比例由15%提高到25%；普通成功和受阻结果不改。"
  },
  "defenseDrill": {
    "name": "武练",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "prepare"
    ],
    "direction": "martial",
    "work": {
      "actions": [
        "exercise"
      ],
      "effect": 0.25
    },
    "description": "非失败时，本次守城操演的战意准备幅度提高25%；原准备强度上限、有效期及一次守城限制不变。"
  },
  "patrolReadiness": {
    "name": "巡备",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "prepare"
    ],
    "direction": "martial",
    "work": {
      "actions": [
        "patrol"
      ],
      "durationDays": 45
    },
    "description": "非失败时，本次城防巡查的护盾准备有效期由30天延至45天；强度和仅一场本城守城战限制不变。"
  },
  "drillConstruction": {
    "name": "筑场",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "build"
    ],
    "direction": "martial",
    "work": {
      "actions": [
        "build_drill"
      ],
      "setbackDays": 3
    },
    "description": "练兵场建设受阻时，追加工期由5天改为3天；正常工期、费用和建筑等级上限不变。"
  },
  "steadyResearch": {
    "name": "求精",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "research"
      ],
      "quantity": 0.3
    },
    "description": "非失败时，常规研制的每日研究进度提高30%；仍需实际工作时间，达到100%按公共规则完成科技。"
  },
  "focusedResearch": {
    "name": "攻坚",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "breakthrough"
      ],
      "partialFloor": 0.75
    },
    "description": "集中攻关部分达成时，研究成果比例由45%提高到75%；原失败概率、费用和目标不变。"
  },
  "craftsmanResearch": {
    "name": "访匠",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "craftsmen"
      ],
      "riskReduction": 0.2
    },
    "description": "只抵消寻访工匠自带的20个百分点风险扣减；仍使用本次原成功判定。"
  },
  "masterResearch": {
    "name": "尊工",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "master"
      ],
      "quantity": 0.3
    },
    "description": "非失败时，本次聘请名匠取得的研究进度提高30%；仍须真实存在且消耗原名匠机会。"
  },
  "capturedResearch": {
    "name": "仿研",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "imitate"
      ],
      "quantity": 0.35
    },
    "description": "非失败时，本次仿制改良研究进度提高35%；不生成新的缴获机会，原机会照常消耗。"
  },
  "trialChance": {
    "name": "复验",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "research"
      ],
      "chance": 0.1
    },
    "description": "办理常规研制时，成果判定成功机会增加10个百分点，遵守统一上限；按实际工作日推进研究。"
  },
  "acuteHealing": {
    "name": "疗伤",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "heal"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "heal"
      ],
      "quantity": 0.3
    },
    "description": "非失败时，集中救治对原受治部队的治疗额度提高30%；仍只恢复真实伤兵，按原费用和粮耗办理。"
  },
  "longHealing": {
    "name": "养复",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "heal"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "recover"
      ],
      "partialFloor": 0.8
    },
    "description": "精心疗养部分达成时，实际救治比例由45%提高到80%；不向未在受治名单的部队复制治疗额度。"
  },
  "talentHire": {
    "name": "好贤",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "hire"
    ],
    "direction": "talent",
    "work": {
      "actions": [
        "hire"
      ],
      "chance": 0.1
    },
    "description": "登用在野人才的成功机会增加10个百分点；基础资格、目标状态和实际赴访返程不变。"
  },
  "talentPersuade": {
    "name": "游说",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "persuade"
    ],
    "direction": "talent",
    "work": {
      "actions": [
        "persuade"
      ],
      "riskReduction": 0.15
    },
    "description": "只抵消劝说周边人才自带风险中的15个百分点；不抵消目标忠诚等其它影响，不直接招募。"
  },
  "talentCalm": {
    "name": "抚众",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "reassure"
    ],
    "direction": "talent",
    "work": {
      "actions": [
        "reassure"
      ],
      "quantity": 0.4
    },
    "description": "非失败时，本次安抚对原目标增加的忠诚提高40%；受该武将实际安抚上限限制。"
  },
  "hallConstruction": {
    "name": "礼士",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "build"
    ],
    "direction": "talent",
    "work": {
      "actions": [
        "build_hall"
      ],
      "setbackDays": 3
    },
    "description": "人才馆建设受阻时，追加工期由5天改为3天；不改变建设上限与人才出仕资格。"
  },
  "liuTrust": {
    "name": "仁望",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "reassure"
    ],
    "direction": "talent",
    "work": {
      "actions": [
        "reassure"
      ],
      "secondaryTargets": 2,
      "secondaryFraction": 0.5
    },
    "description": "安抚成功后，对同城最多两名其它合法安抚对象，各应用原目标本次实际忠诚增量的50%；所有目标分别受安抚上限限制；排除已被其它安抚事务锁定的目标，按忠诚从低到高选取。"
  },
  "zhugeCoordination": {
    "name": "统筹",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "research",
        "breakthrough",
        "craftsmen",
        "master",
        "imitate"
      ],
      "cooperationMultiplier": 2
    },
    "description": "本次研究若成功触发实际数量协作，将该次协作额外研究进度提高至原来的2倍；原研究成果、机会资格与项目门槛不变。"
  },
  "zhouDrill": {
    "name": "督练",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "prepare"
    ],
    "direction": "martial",
    "work": {
      "actions": [
        "exercise"
      ],
      "durationDays": 60,
      "effect": 0.25
    },
    "description": "守城操演取得准备后，原战意准备只供下一场本城守城战使用，但有效期从30天延至60天；其幅度另提高25%，仍受原准备上限限制。"
  },
  "caoFortress": {
    "name": "坚壁",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "prepare"
    ],
    "direction": "military",
    "work": {
      "actions": [
        "fortify"
      ],
      "effect": 0.25,
      "partialFloor": 0.75
    },
    "description": "布置守备非失败时，基础护盾准备额度提高25%；部分达成至少按75%成果结算，仍受本城护盾准备总上限限制。"
  },
  "liuEngines": {
    "name": "筹械",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "research"
      ],
      "chance": 0.2,
      "targets": [
        "siegeEngineering"
      ]
    },
    "description": "办理攻城器械研究时，常规研制的成功机会增加20个百分点；其它科技不生效，仍需真实研究时间。"
  },
  "jiaContingency": {
    "name": "审势",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "direction": "technology",
    "work": {
      "actions": [
        "breakthrough",
        "craftsmen"
      ],
      "failureFloor": 0.3
    },
    "description": "目标仍合法时，本次集中攻关或寻访工匠完全失败改为取得30%研究成果；不改变原成功和部分达成结果，也不额外抽签。"
  }
};
