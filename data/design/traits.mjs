import {EYE_ACTIONS,TREASURE_RULES} from './treasures.mjs';
export const TRAIT_DESIGNS = {
 treasureEye:{name:'眼力',tier:'普通',domain:'domestic',scope:'actor',kinds:[],strategic:{effect:'treasureDiscovery',chance:TREASURE_RULES.eyeChance,actions:EYE_ACTIONS},description:'本人主办合资格内政并取得真实成果，或实际参战有贡献且存活未被俘时，发现宝物的单次概率由2%提高到4%；不叠加、不缩短30日发现间隔。'},
 treasurePlunder:{name:'夺宝',tier:'普通',domain:'personnel',scope:'actor',kinds:[],strategic:{effect:'treasureCapture',chance:TREASURE_RULES.plunderChance,damage:TREASURE_RULES.plunderDamage},description:'本方获胜，本人实际参战、存活未被俘，并对候选宝物原持有者造成至少其初始兵力10%的真实伤害时，缴获概率由5%提高到10%；不改变战斗目标、不生成新宝物。'},
  "hero-person-368": {
    "name": "碧眼",
    "tier": "专属",
    "description": "任军团长或军师时，施放军略后为所属军团在场部队解除镇静与整军类异常，给予5回合坚定及最大兵力12%的护盾；每8回合一次。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "ownCommand",
        "effect": "armyCleanse",
        "roles": [
          "leader",
          "advisor"
        ],
        "steps": 5,
        "interval": 8,
        "remedies": [
          "calm",
          "rally"
        ],
        "fraction": 0.12
      }
    ]
  },
  "hero-person-668": {
    "name": "济军",
    "tier": "普通",
    "description": "任军团长或军师时，每6回合为所属军团最多两队在场友军解除镇静与整军类异常，并给予3回合坚定及最大兵力10%的护盾；优先兵力比例最低者，只在存在可解除异常时触发。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "pulse",
        "effect": "armyRemedy",
        "roles": [
          "leader",
          "advisor"
        ],
        "interval": 6,
        "targets": 2,
        "steps": 3,
        "fraction": 0.1,
        "remedies": [
          "calm",
          "rally"
        ]
      }
    ]
  },
  "hero-person-226": {
    "name": "隐忍",
    "tier": "专属",
    "description": "任军团长或军师时，敌方施放军略后恢复本方军略进度上限的25%；每8回合一次，不影响敌方施放与消耗。",
    "domain": "battle",
    "mechanics": [
      {
        "event": "enemyCommand",
        "effect": "commandRefund",
        "roles": [
          "leader",
          "advisor"
        ],
        "fraction": 0.25,
        "interval": 8
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
    "description": "本人青囊治疗时，不需医馆，本次实际治疗量提高100%；照付真实费用与粮食，只恢复实际伤兵。",
    "work": {
      "actions": [
        "heal",
        "recover"
      ],
      "quantity": 1
    },
    "direction": "technology"
  },
  "reserveGrain": {
    "name": "备荒",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "rescue"
    ],
    "strategic": {
      "effect": "reserveGrain",
      "days": 20
    },
    "description": "本人备荒办理抢收或仓储救灾时，部分成果足额兑现，失败保留60%，并同时保护本城另一类有效灾情；只减少真实灾损，原费用、机会和工期照常。",
    "work": {
      "actions": [
        "harvest",
        "store"
      ],
      "partialFloor": 1,
      "failureFloor": 0.6
    },
    "direction": "agriculture"
  },
  "provision": {
    "name": "筹粮",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "trade"
    ],
    "strategic": {
      "effect": "provision"
    },
    "description": "本人筹粮购粮时，办理工期减半，部分成交足额兑现，失败保留60%成交；只购买已付货款范围内的粮，仍须道路、余仓和实际购粮需求。",
    "work": {
      "actions": [
        "buy"
      ],
      "partialFloor": 1,
      "failureFloor": 0.6,
      "durationFactor": 0.5
    },
    "direction": "agriculture"
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
    "description": "本人抚伤治疗时，治疗量提高100%；原对象实际伤兵用尽后，剩余额度用于本城其他真实伤兵，包括办理中新增伤兵，仍只付一次原粮费。",
    "work": {
      "actions": [
        "heal",
        "recover"
      ],
      "quantity": 1
    },
    "direction": "technology"
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
      "count": 2,
      "relation": 70
    },
    "description": "本人成功搜索、招揽或劝说后，最多举荐两名关系至少70的真实未确认在野亲近者；取得实际所在地情报，仍须另行接洽和签约。"
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
    "description": "本人安众时，原目标忠诚恢复提高50%；成功后可立即继续安抚另一名本城合法低忠诚目标，仍付原命令费用且不重复原对象。",
    "work": {
      "actions": [
        "reassure"
      ],
      "quantity": 0.5
    },
    "direction": "talent"
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
    "description": "本人续研时，本轮工期减半、每日进度按同倍提速；完成后有合法研究候选即可继续办理，既有项目接续不重复收费。",
    "work": {
      "actions": [
        "research",
        "breakthrough",
        "craftsmen",
        "master",
        "imitate"
      ],
      "durationFactor": 0.5
    },
    "direction": "technology"
  },
  "successor": {
    "name": "勤政",
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
    "description": "任商业、农业、军务、技术或人才负责人，正常办理市集、精耕、修复、治疗或安抚时，实际成果提高100%、工期减半；直接资源产能最多基础两倍，仍共用本城当旬已产出数。",
    "work": {
      "actions": [
        "fair",
        "cultivate",
        "repair",
        "rush",
        "inspect",
        "heal",
        "recover",
        "reassure"
      ],
      "quantity": 1,
      "capacityMultiplier": 2,
      "durationFactor": 0.5
    }
  },
  "researchHandoff": {
    "name": "研习",
    "tier": "普通",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [
      "research"
    ],
    "description": "任技术负责人，正常办理研究、攻坚、访匠、尊工或仿研时，本轮工期缩至55%、每日研究进度按同倍提速；仍只推进本城一个合法科技项目，支付正常费用并遵守机会期限。",
    "work": {
      "actions": [
        "research",
        "breakthrough",
        "craftsmen",
        "master",
        "imitate"
      ],
      "durationFactor": 0.55
    },
    "direction": "technology"
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
    "description": "任人才负责人，正常办理招揽或劝说时，实际接洽进度提高75%、工作工期减半；本人仍须真实到访，目标意愿与签约条件照常。外交负责亲善、交涉时，实际办理进度为普通的2倍，接洽费减少50%；路程、每日行资与双方批准照常。",
    "work": {
      "actions": [
        "hire",
        "persuade"
      ],
      "quantity": 0.75,
      "durationFactor": 0.5
    },
    "direction": "talent",
    "diplomacy": {
      "directions": [
        "friendship",
        "negotiation"
      ],
      "rate": 2,
      "feeDiscount": 0.5
    }
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
      "bonus": 1
    },
    "description": "本人屯田精耕时，同城实际投入满1000现役兵，每个实际工作日的军屯贡献使本次粮食成果最多提高100%，有界产能按实际贡献同比提高；出征、伤兵和有其他任务的部队不计。"
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
      "effect": "relayCargo",
      "speed": 2
    },
    "description": "运粮出发时可预定一个己方接力据点，先在中转点停驻检查，再携原货继续送达；不重复装货、不瞬移，运输途中照常遇敌损失。 本人实际运粮时速度提高100%，中转前后均生效；不加快空身调任或撤退，真实路程、货物与截击照常。"
  },
  "lightMarch": {
    "name": "轻装",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "lightMarch",
      "capacity": 0.75,
      "speed": 1.5
    },
    "description": "任有兵力军团长时，可在己方城市切换轻装：携粮容量降至75%，实际行军速度提高50%；多余粮须真实卸入可容纳仓库。"
  },
  "forcedMarch": {
    "name": "急行",
    "tier": "普通",
    "domain": "movement",
    "scope": "army",
    "kinds": [],
    "strategic": {
      "effect": "forcedMarch",
      "morale": 4,
      "minimum": 40,
      "speed": 1.65,
      "recovery": 1
    },
    "description": "任有兵力军团长时，无缺粮且士气至少40可急行，速度提高65%，每个实际移动日消耗4士气；停止后休整1天。道路与实际口粮消耗照常。"
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
      "count": 4,
      "relation": 60
    },
    "description": "本人成功搜索、招揽或劝说后，可从本人及本次接洽对象的真实关系中，举荐至多四名关系至少60的未确认在野人才；仍须另行接洽和签约。 外交负责亲善时，实际办理进度为普通的3倍；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "friendship"
      ],
      "rate": 3
    }
  },
  "zhangAdministration": {
    "name": "辅政",
    "tier": "专属",
    "domain": "domestic",
    "scope": "actor",
    "kinds": [],
    "strategic": {
      "effect": "crossCooperate",
      "cooperationBonus": 0.4
    },
    "description": "本人辅政时，可与本城其他方向人员参与现有真实协作，本人参与的协作触发率提高40个百分点、最多95%；仍须真实行动、同址与人员资格，不新增执行槽。 外交负责经贸、交涉时，实际办理进度为普通的2.5倍；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "commerce",
        "negotiation"
      ],
      "rate": 2.5
    }
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
      "bonus": 1.5,
      "garrison": 1
    },
    "description": "本人军屯精耕时，可组织本城合法驻军；每个实际工作日满1000现役兵，本次粮食成果及有界产能最多提高150%。出征、伤兵、在办事务及等待军令人员不计。"
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
    "description": "本人巧思研究时，本轮工期缩至40%、每日进度提高至2.5倍；完成后可立即继续合法研究，不增加项目槽或虚构机会。",
    "work": {
      "actions": [
        "research",
        "breakthrough",
        "craftsmen",
        "master",
        "imitate"
      ],
      "durationFactor": 0.4
    },
    "direction": "technology"
  },
  "cycleCargo": {
    "name": "漕运",
    "tier": "专属",
    "domain": "movement",
    "scope": "transport",
    "kinds": [],
    "strategic": {
      "effect": "cycleCargo",
      "speed": 2
    },
    "description": "本人无部队及伤兵时，可安排最多5批同线往返运粮；每批从源城实际库存装粮，保留源城二十日口粮与军令预留。双方据点失守、道路不通或库存不足即停止继续装粮；往返全程可遭敌军拦截。 本人实际运粮与循环任务的空车返程速度提高100%；不加快普通空身调任或撤退，真实道路与截击照常。"
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
      "quantity": 1,
      "capacityMultiplier": 2
    },
    "description": "本人办理市集时，实际收入提高100%，可用本城商业每旬基础产能的两倍；全城共用已产出数，不按人数叠加额度。"
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
      "duration": 2
    },
    "description": "本人招引商旅取得非零成果时，商业增益覆盖五次旬末结算，比普通多两次；效果到期后才可重新办理。 外交负责经贸时，实际办理进度为普通的2倍；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "commerce"
      ],
      "rate": 2
    }
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
      "discount": 0.15
    },
    "description": "本人谈妥合营时，在本次合作折扣上再减15个百分点建设费用；仍有期限、只抵一次商业建设，总折扣最多50%。"
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
      "price": 0.4
    },
    "description": "本人售粮时，实际成交粮价提高40%；仍只出售真实余粮，保留公共口粮及计划用粮。 外交负责经贸时，实际办理进度为普通的2倍，接洽费减少25%；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "commerce"
      ],
      "rate": 2,
      "feeDiscount": 0.25
    }
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
      "effect": 0.75
    },
    "description": "本人整顿税务时，本次税收加成提高75%；只影响既定有效期内的实际商业收入。"
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
      "setbackDays": 1
    },
    "description": "本次市场建设受阻时，追加工期由5天改为1天；正常建设工期与费用不变。"
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
      "quantity": 1,
      "capacityMultiplier": 2
    },
    "description": "本人精耕时，实际入仓粮提高100%，可用本城农业每旬基础产能的两倍；全城共用已产出数，满仓仍截断。"
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
      "effect": 0.75
    },
    "description": "本人疏渠时，本次农业增益提高75%；只作用于既定有效期内的真实农业收入。"
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
      "partialFloor": 1,
      "failureFloor": 0.6,
      "purchaseDiscount": 0.25
    },
    "description": "本人购粮时，部分成果按足额兑现，失败仍保留60%实际成果；仍须原费用、合法目标与可用容量，失效目标不给成果。 本次购粮实际货款另减25%，联络费照付，退费只退已付未成交货款。"
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
      "partialFloor": 1,
      "failureFloor": 0.6,
      "durationFactor": 0.5
    },
    "description": "本人抢收时，部分成果按足额兑现，失败仍保留60%实际成果；仍须原费用、合法目标与可用容量，失效目标不给成果。 本次救灾办理工期减半。"
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
      "partialFloor": 1,
      "failureFloor": 0.6,
      "durationFactor": 0.5
    },
    "description": "本人仓储救灾时，部分成果按足额兑现，失败仍保留60%实际成果；仍须原费用、合法目标与可用容量，失效目标不给成果。 本次救灾办理工期减半。"
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
      "setbackDays": 1
    },
    "description": "本次农田或粮仓建设受阻时，追加工期由5天改为1天；公共已完成进度照常保留。"
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
      "partialFloor": 1,
      "quantity": 1,
      "capacityMultiplier": 2,
      "failureFloor": 0.6
    },
    "description": "本人征募时，预备兵成果提高100%，军务产能上限提高至基础的两倍；部分成果足额兑现，失败保留60%。整补只使用已预留的真实兵源、军费和部队缺额。"
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
      "riskReduction": 0.15,
      "quantity": 1,
      "capacityMultiplier": 2,
      "partialFloor": 1,
      "failureFloor": 0.6
    },
    "description": "本人速募时，抵消15个百分点命令风险，预备兵成果及有界产能提高100%；部分成果足额兑现，失败保留60%。仍支付紧急费用并受真实兵源与整补预算限制。"
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
      "quantity": 0.75
    },
    "description": "本人缮城时，每个实际工作日恢复的城墙或哨塔耐久提高75%；不超过建筑真实耐久缺额。"
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
      "partialFloor": 1,
      "quantity": 0.5,
      "failureFloor": 0.6
    },
    "description": "本人应急修复时，每日耐久恢复提高50%，部分成果足额兑现，失败保留60%；只修复实际受损建筑。"
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
      "quantity": 1
    },
    "description": "本人固防巡检时，本次真实修复量提高100%；不增加完好建筑的耐久上限。"
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
      "discount": 0.15
    },
    "description": "本人协调劳役时，本次军务工程合作额外减少15个百分点费用；只抵一次建设，总折扣最多50%。"
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
      "criticalRefund": 0.5,
      "completionRefund": 0.3
    },
    "description": "本人完成兵营或城墙建设时，普通成功返还实付费用的30%，卓有成效返还50%；受阻期间不返款，不改变原施工投入。"
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
      "effect": 0.5
    },
    "description": "本人武练时，本次下一场本城守城战的训练准备提高50%；强化准备与公共设施合计战意最多60。"
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
      "durationDays": 60,
      "effect": 0.5
    },
    "description": "本人巡备时，本次守城护盾准备提高50%，有效期延长至60天；只供本城下一场守城战使用，合计护盾最多60%。"
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
      "setbackDays": 1
    },
    "description": "练兵场建设受阻时，追加工期由5天改为1天；正常工期、费用和建筑等级上限不变。"
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
      "quantity": 1
    },
    "description": "本人求精研究时，每个实际工作日的研究进度提高100%；只推进本城既有的一个科技项目。"
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
      "partialFloor": 1,
      "quantity": 0.75,
      "failureFloor": 0.3
    },
    "description": "本人攻坚时，每日真实研究进度提高75%，部分成果足额兑现，失败保留30%；科技费用只支付一次。"
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
      "riskReduction": 0.2,
      "quantity": 0.75
    },
    "description": "本人访匠时，抵消20个百分点命令风险，每日真实研究进度提高75%；仍须实际匠人机会。"
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
      "quantity": 1
    },
    "description": "本人尊工时，每日真实研究进度提高100%；仍须有效大师机会，机会失效不继续增加进度。"
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
      "quantity": 1.25
    },
    "description": "本人仿研时，每日真实研究进度提高125%；仍须缴获机会，只推进实际选中的本城项目。"
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
      "chance": 0.2,
      "durationFactor": 0.7
    },
    "description": "本人复验时，研究成功率提高20个百分点，并把本轮工期缩至70%、每日进度按同倍提速；高成功率下仍有进度收益，至多推进一个实际项目。"
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
      "quantity": 1.25
    },
    "description": "本人疗伤时，本次实际治疗量提高125%；只恢复真实伤兵，粮费和医馆资格照常。"
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
      "partialFloor": 0.9,
      "quantity": 0.75,
      "failureFloor": 0.4
    },
    "description": "本人养复时，本次实际治疗量提高75%，部分成果至少90%，失败保留40%；不超过真实伤兵人数。"
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
      "chance": 0.25,
      "quantity": 0.5
    },
    "description": "本人好贤接洽时，成功率提高25个百分点，实际招揽进度提高50%；仍需本人实际到达，目标接受意愿和签约条件照常。 外交负责亲善时，实际办理进度为普通的2倍；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "friendship"
      ],
      "rate": 2
    }
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
      "riskReduction": 0.25,
      "quantity": 0.75
    },
    "description": "本人游说时，抵消至多25个百分点命令风险，实际劝说进度提高75%；不跳过实际出使、目标意愿与签约条件。 外交负责交涉时，实际办理进度为普通的2.5倍；路程、每日行资与双方批准照常。",
    "diplomacy": {
      "directions": [
        "negotiation"
      ],
      "rate": 2.5
    }
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
      "quantity": 1,
      "secondaryTargets": 1,
      "secondaryFraction": 1
    },
    "description": "本人抚众时，原目标实际忠诚恢复提高100%；成功后同时安抚另一名本城合法低忠诚目标，各目标仍受实际忠诚上限限制。"
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
      "setbackDays": 1
    },
    "description": "人才馆建设受阻时，追加工期由5天改为1天；不改变建设上限与人才出仕资格。"
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
      "secondaryTargets": 3,
      "secondaryFraction": 1,
      "quantity": 0.5
    },
    "description": "本人仁望安抚时，原目标恢复量提高50%；成功后最多另安抚三名本城合法目标，每人取得原目标实际恢复量的100%，仍受各自忠诚上限限制。"
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
      "cooperationMultiplier": 2,
      "teamMultiplier": 2
    },
    "description": "任技术负责人，正常研究时自动安排另一名同城技术负责人协助，每日研究进度翻倍；协助期间不另开新事务，无需玩家指定待命。只组织实际空闲、同址且无使命、侦察或等待军令的人员，不打断其已开办事务或提案。原单次协作增量也翻倍，不新增研究项目。"
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
      "durationDays": 90,
      "effect": 1
    },
    "description": "本人督练时，本次守城训练准备提高100%，有效期90天；只供本城下一场守城战使用，准备与设施合计战意最多60。"
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
      "effect": 1,
      "partialFloor": 1,
      "failureFloor": 0.6
    },
    "description": "本人坚壁时，本次守城护盾准备提高100%，部分成果足额兑现，失败保留60%；只供下一场本城守城战使用，护盾合计最多60%。"
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
        "research",
        "breakthrough",
        "craftsmen",
        "master",
        "imitate"
      ],
      "quantity": 1.5
    },
    "description": "任技术负责人，正常办理任一合法研究事务时，每日真实进度提高150%；无需指定科技项目或研究方式。同类进度修正取强，与复验工期提速共同生效；仍只推进本城一个实际项目，支付正常费用并遵守机会期限。"
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
      "failureFloor": 0.75,
      "quantity": 0.75,
      "partialFloor": 0.9
    },
    "description": "本人审势办理攻坚或访匠时，每日真实研究进度提高75%；部分成果至少90%，失败仍保留75%进度，目标或机会失效不保底。"
  }
};
