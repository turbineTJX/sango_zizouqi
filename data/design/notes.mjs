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
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证目标限定的研究概率只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    },
    "jiaContingency": {
      "classification": "已有内政命令效果",
      "rationale": "仅对应实际命令生效，双方共用结算；人选为游戏设计分配，不作为史实断言。",
      "acceptance": "固定同一合法命令、投入和随机种子，对照有无特性；验证failureFloor只影响本命令对应结算字段，目标失效、中断与存读档不重复获益。"
    }
  },
  "tactics": {},
  "stratagems": {
    "fortify": {
      "rationale": "防御优先初值：护盾45%，高于同系数雷火单次含最高浮动31.25%的伤害；实际保护受护盾上限与伤害处理影响。"
    },
    "heal": {
      "rationale": "救治基准上限40%，提高防御恢复额度；仅救本场真实伤兵，实际恢复可低于上限。"
    },
    "cleanse": {
      "rationale": "完整选区解控与预防控制；基准坚定8回合、冷却20，AI仍有可驱散异常才触发，手动可提前保护。"
    },
    "storm": {
      "rationale": "仅张角持有，采用宗教、演义雷火意象；李儒改持实际火攻，保持全游戏15项。"
    },
    "all-out": {
      "rationale": "舍守强攻通过已有护盾、减伤或敌军受控窗口减轻代价；全部持续时间按施放时统智保存。固定持有者：高顺、董袭、曲义。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    },
    "hold-relief": {
      "rationale": "固守待援通过实际守御站位与既有射程减轻代价；全部持续时间按施放时统智保存。固定持有者：霍峻、郝昭、朱桓、严颜、文聘。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    },
    "focused-plan": {
      "rationale": "专力运筹通过谋略战法分工与战意支援减轻代价；全部持续时间按施放时统智保存。固定持有者：司马师、蒋济、诸葛瑾。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    },
    "seize-opening": {
      "rationale": "乘隙猛攻通过真实战法冷却与普攻窗口减轻代价；全部持续时间按施放时统智保存。固定持有者：贺齐、徐盛、陈泰。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    },
    "morale-bulwark": {
      "rationale": "励军固阵通过真实战意储备及支援减轻代价；全部持续时间按施放时统智保存。固定持有者：于禁、李典、吕岱。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    },
    "selfless-guard": {
      "rationale": "舍己护军通过实际在场辅助的任命与初始布阵减轻代价；全部持续时间按施放时统智保存。固定持有者：曹洪、邓芝、吴懿。人物定位与副作用属于玩法设计，不声称对应精确史实事件。"
    }
  },
  "troops": {},
  "officers": {
    "person-518": {
      "militaryRationale": "马腾统领西凉部众，以快速机动组织进军。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-167": {
      "militaryRationale": "黄权具有统军与审势经历，以临敌应变和军阵组织承担防护。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-424": {
      "militaryRationale": "张任守御益州，以据地守备和军阵护盾体现防御定位。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-20": {
      "militaryRationale": "阎象作为袁术谋臣，以整军肃阵体现谏谋、纠正失序的支援定位。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-147": {
      "militaryRationale": "纪灵作为袁术主要统军者，以真实奇兵投入体现军队调度。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-181": {
      "militaryRationale": "公孙瓒统领边军与骑兵，以快速进军体现机动定位。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-478": {
      "militaryRationale": "田予沿用公共名册姓名，其边地统军、临敌应变定位用于军阵防护。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-180": {
      "militaryRationale": "公孙康统领辽东军政，以据地组织守备体现防护。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-475": {
      "militaryRationale": "田畴引军经隐蔽道路的经历用于伏兵与奇袭定位。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-35": {
      "militaryRationale": "王修救济、安民与组织支持的经历用于抚军救护；救治仅恢复真实本场伤兵。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-556": {
      "militaryRationale": "鲍信起兵与统军经历用于守备保护，避免以纯智力门槛分配。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-456": {
      "militaryRationale": "陈登守御广陵的经历用于组织军阵防护。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-438": {
      "militaryRationale": "张杨组织部众与援助友军的统军经历用于重整部队；刷新战法为玩法抽象。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-152": {
      "militaryRationale": "虞翻具有随军参谋经历，以整军解控体现谋士支援；不使用祛邪意象。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-239": {
      "militaryRationale": "周昕具有举兵及军事谋划定位，以通用伏兵军略体现。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-569": {
      "militaryRationale": "孟获凝聚南中部众，以众志成城体现部众协同；无敌为玩法抽象。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-190": {
      "militaryRationale": "皇甫嵩长社火攻的经历与实际范围火攻对应。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-670": {
      "militaryRationale": "卢植统军平乱的经历用于整肃军纪、解除混乱与保护阵列。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-289": {
      "militaryRationale": "诸葛诞据寿春固守的经历用于防御军阵。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-102": {
      "militaryRationale": "毌丘俭远征统军的经历用于机动进军。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-110": {
      "militaryRationale": "韩遂统领西凉部众，以军队奇袭谋划体现伏兵定位。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-107": {
      "militaryRationale": "韩浩军务与屯田组织经历用于重整军队；不直接生成兵员。",
      "classification": "人物经历与定位的游戏化分配，不作为史实超自然能力"
    },
    "person-605": {
      "militaryRationale": "李儒改持火烧连营；取《三国演义》焚都谋议的火攻意象，不再施放雷火，不将演义改编作为正史能力。"
    }
  },
  "cities": {}
};
