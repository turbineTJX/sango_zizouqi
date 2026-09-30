// Authoritative current design data.
export const BOND_DESIGNS = {
  "bondSpear": {
    "name": "枪将",
    "family": "spear",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "defense",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "attack",
    "extraValue": 0.15,
    "description": "同方在场部队的枪将等级相加，2／4／6／9点激活对应档，只取最高档。对应兵科在场部队防御提高8%／14%／22%／30%。最高档另外提高攻击15%。最高档特殊效果：对骑兵造成的直接伤害提高20%。",
    "special": "antiCavalry",
    "specialValue": 0.2,
    "category": "troop"
  },
  "bondHorse": {
    "name": "骑将",
    "family": "cavalry",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "move",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "attackSpeed",
    "extraValue": 0.15,
    "description": "同方在场骑将等级合计2／4／6／9点时，在场骑兵移速提高8%／14%／22%／30%；最高档攻速另提高15%。骑兵首次实际入场时，按该批部队全部入场后的点数，获得2／3／4／6回合无视ZOC；不能穿越占位。首发在确认布阵时统一结算；未到援军和后备不计数。每场每队仅一次，后续凑档不追补，不刷新。",
    "special": "entryZoc",
    "category": "troop",
    "entryDuration": [
      2,
      3,
      4,
      6
    ],
    "specialValue": 0
  },
  "bondBow": {
    "name": "弓将",
    "family": "archer",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "attack",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "attackSpeed",
    "extraValue": 0.15,
    "description": "同方在场部队的弓将等级相加，2／4／6／9点激活对应档，只取最高档。对应兵科在场部队攻击提高8%／14%／22%／30%。最高档另外提高攻速15%。最高档特殊效果：对没有相邻敌军的目标造成的直接伤害提高20%。 首次实际入场的弓兵、弩兵获得1／2／3／3次火矢法球，无需自身持有弓将；每次普攻附加35%武技威力并施加6回合灼烧。 入场装备不占战法名额、不消耗战法次数或战意，每队每场只发一次，按该批实际在场点数确定；后续凑档不补发。法球同队只有一种，同时符合时挫志优先于火矢，已有法球不覆盖、不叠加、不排队；不消耗于战法、反击、城门和诱饵。重击仅物理主动普攻命中并造成兵力或护盾损失时消耗，范围普攻每次行动仅消耗一次、仅主目标判定混乱；挫志等谋略普攻不触发重击。",
    "special": "rearStrike",
    "specialValue": 0.2,
    "category": "troop",
    "entryEquipment": {
      "kind": "orb",
      "skillId": "fire",
      "charges": [
        1,
        2,
        3,
        3
      ],
      "holder": false,
      "families": [
        "archer"
      ],
      "priority": 10
    }
  },
  "bondHalberd": {
    "name": "戟将",
    "family": "halberd",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "defense",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "martialPower",
    "extraValue": 0.15,
    "description": "同方在场部队的戟将等级相加，2／4／6／9点激活对应档，只取最高档。对应兵科在场部队防御提高8%／14%／22%／30%。最高档另外提高武技威力15%。最高档特殊效果：相邻敌军至少两队时承受的直接伤害降低15%。",
    "special": "surrounded",
    "specialValue": 0.15,
    "category": "troop"
  },
  "bondSiege": {
    "name": "械师",
    "family": "siege",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "siege",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "attack",
    "extraValue": 0.15,
    "description": "同方在场部队的械师等级相加，2／4／6／9点激活对应档，只取最高档。对应兵科在场部队攻城威力提高8%／14%／22%／30%。最高档另外提高攻击15%。最高档特殊效果：对城门伤害提高25%。",
    "special": "gateStrike",
    "specialValue": 0.25,
    "category": "troop"
  },
  "bondShip": {
    "name": "水师",
    "family": "ship",
    "thresholds": [
      2,
      4,
      6,
      9
    ],
    "stat": "defense",
    "values": [
      0.08,
      0.14,
      0.22,
      0.3
    ],
    "extra": "move",
    "extraValue": 0.15,
    "description": "同方在场部队的水师等级相加，2／4／6／9点激活对应档，只取最高档。对应兵科在场部队防御提高8%／14%／22%／30%。最高档另外提高移速15%。最高档特殊效果：相邻有友军时承受的直接伤害降低15%。",
    "special": "formation",
    "specialValue": 0.15,
    "category": "troop"
  },
  "bondValor": {
    "name": "勇武",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "martialPower",
    "values": [
      0.06,
      0.1,
      0.15
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "valorRamp",
    "specialValue": 0.04,
    "description": "同方在场勇武合计2／4／8点时，持有者武技威力提高6%／10%／15%。每回合首次造成实际兵力损失的主动普攻，积累一层奋战，攻速每层提高2%／3%／4%，最多5层；战法、反击、持续伤害和诱饵不计。最高档达到5层时额外获得15战意，每队每场一次。降档立即按现档计算攻速，未激活时无加成；凑回档位不重置层数或限次。",
    "stackRates": [
      0.02,
      0.03,
      0.04
    ],
    "maxStacks": 5,
    "rallyIntent": 15
  },
  "bondWisdom": {
    "name": "深谋",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "strategyPower",
    "values": [
      0.1,
      0.2,
      0.3
    ],
    "extra": "discipline",
    "extraValue": 0.1,
    "special": "lowIntent",
    "specialValue": 0.2,
    "description": "同方在场部队的深谋等级相加，2／4／8点激活对应档，只取最高档。在场已获得本羁绊的持有者谋略威力提高10%／20%／30%。最高档另外提高军纪10%。最高档特殊效果：对战意低于60的目标造成的谋略伤害提高20%。 首次实际入场的深谋持有者获得1／2／3次挫志法球，不限兵种；普攻改按谋略威力结算并施加10回合丧志。 入场装备不占战法名额、不消耗战法次数或战意，每队每场只发一次，按该批实际在场点数确定；后续凑档不补发。法球同队只有一种，同时符合时挫志优先于火矢，已有法球不覆盖、不叠加、不排队；不消耗于战法、反击、城门和诱饵。重击仅物理主动普攻命中并造成兵力或护盾损失时消耗，范围普攻每次行动仅消耗一次、仅主目标判定混乱；挫志等谋略普攻不触发重击。",
    "entryEquipment": {
      "kind": "orb",
      "skillId": "curse",
      "charges": [
        1,
        2,
        3
      ],
      "holder": true,
      "families": [],
      "priority": 20
    }
  },
  "bondGuard": {
    "name": "军阵",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "attack",
    "values": [
      0.06,
      0.1,
      0.14
    ],
    "extra": "defense",
    "extraValue": 0,
    "special": "formationTiles",
    "specialValue": 0,
    "holderMultiplier": 2,
    "entryDuration": [
      8,
      10,
      12
    ],
    "fullDuration": 24,
    "description": "战前显示三个军阵阵位，依地形选择阵形，双方优先镜像，阻挡处调整为附近可用格；水战按舰船与陆军编制选择可用阵位，不随机重抽。场上军阵合计2／4／8点时，己方部队首次实际入场若站在阵位，攻击、武技威力、谋略威力提高6%／10%／14%，持续8／10／12回合；自身已获得军阵者效果翻倍。最高档且该批入场时三个阵位均有己方现役部队，阵位入场增益延长至24回合。离开阵位不丢失已获增益，之后走上阵位不补发；后备、未到援军、诱饵不占阵位，不因补位刷新原部队。",
    "patterns": {
      "land": [
        [
          4,
          2
        ],
        [
          2,
          4
        ],
        [
          4,
          6
        ]
      ],
      "forest": [
        [
          3,
          1
        ],
        [
          4,
          3
        ],
        [
          3,
          6
        ]
      ],
      "hill": [
        [
          3,
          2
        ],
        [
          2,
          4
        ],
        [
          4,
          5
        ]
      ],
      "marsh": [
        [
          4,
          1
        ],
        [
          2,
          3
        ],
        [
          4,
          6
        ]
      ],
      "river": [
        [
          4,
          2
        ],
        [
          2,
          5
        ],
        [
          4,
          6
        ]
      ],
      "naval": [
        [
          4,
          3
        ],
        [
          2,
          4
        ],
        [
          3,
          3
        ]
      ],
      "mixed": [
        [
          4,
          3
        ],
        [
          2,
          2
        ],
        [
          3,
          5
        ]
      ]
    }
  },
  "bondRaid": {
    "name": "破军",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "attack",
    "values": [
      0.04,
      0.08,
      0.12
    ],
    "extra": "attackSpeed",
    "extraValue": 0,
    "special": "routMomentum",
    "specialValue": 0,
    "killBonus": [
      0.03,
      0.04,
      0.05
    ],
    "killGoal": 3,
    "burstDuration": 10,
    "burstSpeed": [
      0.12,
      0.18,
      0.25
    ],
    "description": "同方在场破军合计2／4／8点时，持有者对敌方部队的直接伤害提高4%／8%／12%。激活期间己方每击溃一支真实敌军，再提高3%／4%／5%，最多计三队；不要求持有者补刀，撤离、诱饵与城门不计。累计第三次击溃时触发一次乘胜：破军持有者攻速提高12%／18%／25%，持续10回合；若触发时为最高档，改为惠及己方所有实际在场部队。各敌军只计一次，补位不重置，之后凑高档不补发乘胜。持续期间正常离场即停止受益。最高档乘胜期间补入的己方部队只享受剩余时长。"
  },
  "bondEscort": {
    "name": "护卫",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "defense",
    "values": [
      0.06,
      0.12,
      0.18
    ],
    "extra": "discipline",
    "extraValue": 0.1,
    "special": "escort",
    "specialValue": 0.18,
    "protection": [
      0.06,
      0.1,
      0.14
    ],
    "range": 1,
    "description": "同方在场部队的护卫等级相加，2／4／8点激活对应档，只取最高档。在场已获得本羁绊的持有者防御提高6%／12%／18%。最高档另外提高军纪10%。最高档特殊效果：相邻其他友军承受的直接伤害降低18%，同类取最高。各档保护相邻其他友军，直接伤害降低6%／10%／18%，同类取最高。提供支援者须实际在场，混乱、避战、脱战准备或撤离时停止提供支援。"
  },
  "bondAid": {
    "name": "整军",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "discipline",
    "values": [
      0.08,
      0.15,
      0.22
    ],
    "extra": "defense",
    "extraValue": 0.1,
    "special": "entryIntent",
    "specialValue": 0,
    "entryIntent": [
      10,
      20,
      30
    ],
    "description": "同方在场整军等级合计2／4／8点时，持有者军纪提高8%／15%／22%，最高档防御另提高10%。己方每队首次实际入场时，按该批部队全部入场后的整军点数获得10／20／30初始战意；无需自身持有整军。首发确认布阵时统一结算，战意不超过100。每场每队仅一次，后续凑档不追补，不随替补刷新已在场部队。"
  },
  "bondMaster": {
    "name": "谋主",
    "category": "rare",
    "family": null,
    "thresholds": [
      1,
      2,
      3
    ],
    "stat": "strategyPower",
    "values": [
      0.12,
      0.24,
      0.36
    ],
    "extra": "discipline",
    "extraValue": 0.15,
    "special": "command",
    "specialValue": 0,
    "commandRate": [
      1.15,
      1.3,
      1.5
    ],
    "description": "同方在场谋主等级合计1／2／3点时，持有者谋略威力提高12%／24%／36%，最高档军纪另提高15%。同时令己方军略积累贡献提高至1.15／1.30／1.50倍；多个来源不叠加。提供增益者须在场有兵；混乱、避战、脱战准备或撤离期间停止提供增益。不提供军略资格或次数。"
  },
  "bondVanguard": {
    "name": "先登",
    "category": "rare",
    "family": null,
    "thresholds": [
      1,
      2,
      3
    ],
    "stat": "martialPower",
    "values": [
      0.2,
      0.3,
      0.4
    ],
    "extra": "attackSpeed",
    "extraValue": 0.15,
    "special": "entryPower",
    "specialValue": 0,
    "entryDuration": [
      6,
      8,
      10
    ],
    "description": "同方在场先登等级合计1／2／3点时，先登持有者首次实际入场后6／8／10回合内，武技威力提高20%／30%／40%；3点另提高攻速15%，期限相同。入场时按同时在场阵容确定效果，后续凑档不追补、不刷新；每场仅一次。首发从确认布阵开始计时。 先登持有者使用枪兵、戟兵、骑兵首次实际入场时，另获得1／2／3次重击：物理主动普攻伤害提高50%，对主目标尝试施加1回合混乱，遵守控制保护；其它兵种不获得重击。 入场装备不占战法名额、不消耗战法次数或战意，每队每场只发一次，按该批实际在场点数确定；后续凑档不补发。法球同队只有一种，同时符合时挫志优先于火矢，已有法球不覆盖、不叠加、不排队；不消耗于战法、反击、城门和诱饵。重击仅物理主动普攻命中并造成兵力或护盾损失时消耗，范围普攻每次行动仅消耗一次、仅主目标判定混乱；挫志等谋略普攻不触发重击。",
    "entryEquipment": {
      "kind": "heavy",
      "charges": [
        1,
        2,
        3
      ],
      "holder": true,
      "families": [
        "spear",
        "halberd",
        "cavalry"
      ],
      "priority": 0,
      "bonus": 0.5,
      "control": "confuse",
      "steps": 1
    }
  },
  "bondCommand": {
    "name": "督军",
    "category": "rare",
    "family": null,
    "thresholds": [
      1,
      2,
      3
    ],
    "stat": "discipline",
    "values": [
      0.1,
      0.2,
      0.3
    ],
    "extra": "defense",
    "extraValue": 0.15,
    "special": "commandStrength",
    "specialValue": 0,
    "strengthBonus": [
      0.1,
      0.2,
      0.3
    ],
    "enhancedEffects": [
      "assault",
      "fortify",
      "disrupt",
      "heal",
      "regenerate",
      "relief",
      "inspire",
      "demoralize",
      "cycle"
    ],
    "description": "同方在场督军等级合计1／2／3点时，持有者军纪提高10%／20%／30%，最高档防御另提高15%。己方普通军略的增攻、增防、属性削弱、救治、补位护盾及战意增减数值额外提高10%／20%／30%，同类取最高；施放时确定并保存效果。军略进度、冷却、范围、时长及整备冷却缩短量不变；不强化火攻、八阵、魏武挥鞭、兵贵神速等未列入的效果。提供者须实际在场，混乱、避战、脱战准备或撤离时停止提供增益。"
  },
  "bondBeauty": {
    "name": "倾国",
    "family": null,
    "category": "tactic",
    "thresholds": [
      2,
      3,
      5
    ],
    "stat": "discipline",
    "values": [
      0,
      0,
      0
    ],
    "extra": "defense",
    "extraValue": 0,
    "special": "beautyHit",
    "specialValue": 0.1,
    "hitDuration": [
      2,
      3,
      3
    ],
    "controlSteps": 2,
    "description": "同方在场倾国等级合计2／3／5点生效：持有者有效普攻命中后，施加挫锐，使目标武技、谋略威力降低10%，分别持续2／3／3回合；最高档同时尝试施加2回合迟滞。遵守异常免疫与控制保护，同名幅度不叠加，不限制目标性别。"
  },
  "bondPeach": {
    "name": "桃园",
    "category": "rare",
    "family": null,
    "thresholds": [
      2,
      3
    ],
    "stat": "discipline",
    "values": [
      0,
      0
    ],
    "extra": "defense",
    "extraValue": 0,
    "special": "swornLink",
    "specialValue": 0,
    "furyPower": 0.4,
    "furySpeed": 0.3,
    "furySteps": 12,
    "invincibleSteps": 3,
    "description": "仅刘备、关羽、张飞持有，各上限1。两支以上桃园部队实际在场时，不限距离平均分担敌方普攻、战法、军略与持续伤害。先按原目标抗性结算，再分担并由各自护盾吸收，不重复计算抗性、不递归触发护卫或连环；兵力与护盾不足的份额继续分配，不凭残血吞伤害。缺粮与主动代价不分担。成员本场兵力归零溃败时，在场且存活的结义成员获得12回合攻击、武技威力、谋略威力+40%、攻速+30%。三人曾同时实际在场即记录三人结义；累计两人溃败后，最后一人另获3回合无敌并刷新奋战时长，不叠加倍率。无敌只免疫伤害，仍可正常行动，不解除既有控制。同次攻击或持续伤害批次结束后统一判定，不复活、不回滚致命伤害；撤离不计溃败，后备不承伤或领取奋战。"
  },
  "bondReserve": {
    "name": "蓄锐",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      8
    ],
    "stat": "discipline",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "reserveEntry",
    "specialValue": 0,
    "slots": [
      1,
      2,
      3
    ],
    "intent": 20,
    "entrySteps": 4,
    "description": "开战时按实际在场蓄锐合计2／4／8点，锁定后续1／2／3支预备队受益。按实际首次补入顺序领取，不限兵种，无需自身持有蓄锐；首发不领取，未到援军不提前领取。受益者获得20战意及4回合疾行、速攻；最高档另为固定顺序中的首个普通小战法增加一次使用额度，不影响大战法、专属、冷却与调息。名额开战锁定，提供者离场不取消，重新凑档不补名额，每队只领一次。"
  }
};
