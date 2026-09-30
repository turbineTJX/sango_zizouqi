// Internal design notes, not player effects.
export const DESIGN_NOTES = {
  "traits": {
    "hero-person-368": {
      "classification": "人物独有机制",
      "rationale": "军略同时承担解控与重新组织职责；本项目游戏化设计，不作为史实能力断言。"
    },
    "hero-person-668": {
      "classification": "人物独有机制",
      "rationale": "军团军师持续处理控制压力；本项目游戏化设计，不作为史实能力断言。"
    },
    "hero-person-226": {
      "classification": "人物独有机制",
      "rationale": "敌方军略形成自身后发反制资源；本项目游戏化设计，不作为史实能力断言。"
    },
    "hero-cao": {
      "classification": "人物独有机制",
      "rationale": "undefined；本项目游戏化设计，不作为史实能力断言。"
    },
    "marketYield": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "merchantReach": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证duration只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "partnershipDeal": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证discount只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "grainSale": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证price只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "taxOrder": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证effect只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "marketConstruction": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证setbackDays只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "farmYield": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "irrigationYield": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证effect只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "purchaseFill": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "harvestRescue": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "storageRescue": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "farmConstruction": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证setbackDays只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "recruitFill": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "urgentRisk": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证riskReduction只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "wallRepair": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "urgentRepair": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "wallInspection": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "laborDeal": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证discount只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "militaryConstruction": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证criticalRefund只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "defenseDrill": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证effect只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "patrolReadiness": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证durationDays只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "drillConstruction": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证setbackDays只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "steadyResearch": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "focusedResearch": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "craftsmanResearch": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证riskReduction只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "masterResearch": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "capturedResearch": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "trialChance": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证chance只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "acuteHealing": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "longHealing": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证partialFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "talentHire": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证chance只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "talentPersuade": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证riskReduction只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "talentCalm": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证quantity只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "hallConstruction": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证setbackDays只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "liuTrust": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证secondaryTargets只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "zhugeCoordination": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证cooperationMultiplier只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "zhouDrill": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证readinessDuration只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "caoFortress": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证shieldPreparation只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "liuEngines": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证siegeTrialChance只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "jiaContingency": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证failureFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    }
  },
  "tactics": {},
  "stratagems": {},
  "troops": {},
  "officers": {},
  "cities": {}
};
