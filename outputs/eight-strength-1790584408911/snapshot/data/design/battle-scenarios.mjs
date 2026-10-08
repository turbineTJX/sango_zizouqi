// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "battle-scenarios",
  "name": "战役场景一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "history-guandu",
      "name": "官渡之战",
      "parameters": {
        "category": "historical",
        "id": "history-guandu",
        "name": "官渡之战",
        "year": 200,
        "chapter": "壹",
        "subtitle": "官渡对垒，步骑破阵",
        "kind": "野战",
        "difficulty": "入门",
        "terrain": "land",
        "ownName": "曹操军",
        "enemyName": "袁绍军",
        "description": "袁曹两军相持官渡。率曹军守住正面，以骑兵突破配合远程压制，寻找击溃袁军的机会。",
        "feature": "步骑协同",
        "briefing": "枪兵接住正面，张辽从侧翼寻找缺口。军略蓄满后暂停，按战况选择进攻或整军。",
        "history": "公元 200 年，曹操与袁绍在官渡交战，曹操取胜，北方局势由此转变。",
        "ownTeam": [
          {
            "id": "cao",
            "type": "spear"
          },
          {
            "id": "liao",
            "type": "cavalry"
          },
          {
            "id": "person-291",
            "type": "halberd"
          },
          {
            "id": "jin",
            "type": "spear"
          },
          {
            "id": "yu",
            "type": "halberd"
          },
          {
            "id": "jia",
            "type": "crossbow"
          }
        ],
        "enemyTeam": [
          {
            "id": "shao",
            "type": "spear"
          },
          {
            "id": "he",
            "type": "halberd"
          },
          {
            "id": "gao",
            "type": "spear"
          },
          {
            "id": "ju",
            "type": "crossbow"
          },
          {
            "id": "tian",
            "type": "archer"
          },
          {
            "id": "person-429",
            "type": "cavalry"
          }
        ],
        "ownAdvisor": "yu",
        "enemyAdvisor": "ju",
        "ownTroops": 2800,
        "enemyTroops": 1750,
        "level": 5,
        "enemyLevel": 3,
        "seed": 2000918,
        "goal": "击溃袁军；到达时限时，按双方剩余兵力比例判定胜负。",
        "campaign": true,
        "historical": true,
        "own": 6,
        "enemy": 6,
        "officers": [
          "cao",
          "liao",
          "person-291",
          "jin",
          "yu",
          "jia"
        ],
        "waves": [],
        "limit": 360,
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "historical-campaigns.mjs",
      "todo": "沿用当前固定配置；不导入旧配装战法列表"
    },
    {
      "id": "history-chibi",
      "name": "赤壁之战",
      "parameters": {
        "category": "historical",
        "id": "history-chibi",
        "name": "赤壁之战",
        "year": 208,
        "chapter": "贰",
        "subtitle": "江上鏖兵，水陆并进",
        "kind": "水战",
        "difficulty": "进阶",
        "terrain": "river",
        "ownName": "孙刘联军 · 周瑜部",
        "enemyName": "曹操军",
        "description": "曹军南下，孙刘联军迎敌。指挥周瑜所部，以舰船控制水道，配合岸上火攻与补给推进。",
        "feature": "舰船与岸线",
        "briefing": "舰船只能走水道，陆军经桥面接战。水面会削弱火攻，优先利用涡流与舰队配合；岸上弓兵可用火矢压制。",
        "history": "公元 208 年，孙刘联军在赤壁击败曹操军，周瑜、程普与黄盖参与此役。",
        "ownTeam": [
          {
            "id": "person-246",
            "type": "ship"
          },
          {
            "id": "person-164",
            "type": "ship"
          },
          {
            "id": "person-467",
            "type": "ship"
          },
          {
            "id": "person-243",
            "type": "halberd"
          },
          {
            "id": "person-117",
            "type": "archer"
          },
          {
            "id": "person-668",
            "type": "halberd"
          }
        ],
        "enemyTeam": [
          {
            "id": "cao",
            "type": "spear"
          },
          {
            "id": "liao",
            "type": "cavalry"
          },
          {
            "id": "person-291",
            "type": "ship"
          },
          {
            "id": "jin",
            "type": "ship"
          },
          {
            "id": "yu",
            "type": "halberd"
          },
          {
            "id": "person-429",
            "type": "ship"
          }
        ],
        "ownAdvisor": "person-246",
        "enemyAdvisor": "yu",
        "ownTroops": 2800,
        "enemyTroops": 2400,
        "level": 5,
        "enemyLevel": 5,
        "seed": 2080918,
        "goal": "击溃曹军水陆部队；到达时限时，按双方剩余兵力比例判定胜负。",
        "campaign": true,
        "historical": true,
        "own": 6,
        "enemy": 6,
        "officers": [
          "person-246",
          "person-164",
          "person-467",
          "person-243",
          "person-117",
          "person-668"
        ],
        "waves": [],
        "limit": 360,
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "historical-campaigns.mjs",
      "todo": "沿用当前固定配置；不导入旧配装战法列表"
    },
    {
      "id": "history-hefei",
      "name": "合肥之战",
      "parameters": {
        "category": "historical",
        "id": "history-hefei",
        "name": "合肥之战",
        "year": 215,
        "chapter": "叁",
        "subtitle": "三将守城，迎击吴军",
        "kind": "守城",
        "difficulty": "挑战",
        "terrain": "land",
        "ownName": "张辽守军",
        "enemyName": "孙权军",
        "defending": true,
        "gateHp": 6000,
        "description": "孙权进攻合肥，张辽、乐进、李典合力拒敌。以三队精兵保护城门，在防守与主动出击之间作出取舍。",
        "feature": "精兵守城",
        "briefing": "守军开场有护盾，城门失守立即败北。张辽负责突击，乐进与李典掩护城门；善用暂停观察敌军路线。",
        "history": "公元 215 年，张辽、乐进、李典守合肥，张辽出击孙权军，随后守住城池。",
        "ownTeam": [
          {
            "id": "liao",
            "type": "cavalry"
          },
          {
            "id": "person-70",
            "type": "spear"
          },
          {
            "id": "person-610",
            "type": "crossbow"
          }
        ],
        "enemyTeam": [
          {
            "id": "person-368",
            "type": "spear"
          },
          {
            "id": "person-119",
            "type": "cavalry"
          },
          {
            "id": "person-652",
            "type": "halberd"
          },
          {
            "id": "person-662",
            "type": "halberd"
          },
          {
            "id": "person-268",
            "type": "archer"
          },
          {
            "id": "person-243",
            "type": "siege"
          }
        ],
        "ownAdvisor": "person-610",
        "enemyAdvisor": "person-662",
        "ownTroops": 3000,
        "enemyTroops": 1400,
        "level": 8,
        "enemyLevel": 3,
        "seed": 2150918,
        "goal": "保住城门并击溃吴军；城门被击破立即失败。时限到达按剩余兵力比例判定，不自动判守方胜利。",
        "source": "https://zh.wikisource.org/zh-hant/三國志_(四庫全書本)/卷17",
        "campaign": true,
        "historical": true,
        "own": 3,
        "enemy": 6,
        "officers": [
          "liao",
          "person-70",
          "person-610"
        ],
        "waves": [],
        "limit": 360,
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "historical-campaigns.mjs",
      "todo": "沿用当前固定配置；不导入旧配装战法列表"
    },
    {
      "id": "history-yiling",
      "name": "夷陵之战",
      "parameters": {
        "category": "historical",
        "id": "history-yiling",
        "name": "夷陵之战",
        "year": 222,
        "chapter": "肆",
        "subtitle": "林间列阵，伺机破敌",
        "kind": "野战",
        "difficulty": "进阶",
        "terrain": "forest",
        "ownName": "陆逊军",
        "enemyName": "刘备军",
        "description": "刘备东征，陆逊率军迎战。利用两翼林地的火攻与伏弩优势，压住蜀军攻势，再寻找反击机会。",
        "feature": "林地火攻",
        "briefing": "林地增强火攻与伏弩，但限制射击和骑兵冲锋。让前排接敌，给陆逊与远程部队争取持续输出空间。",
        "history": "公元 222 年，陆逊在夷陵击败刘备军，火攻是此役的重要转折。",
        "ownTeam": [
          {
            "id": "person-603",
            "type": "archer"
          },
          {
            "id": "person-251",
            "type": "spear"
          },
          {
            "id": "person-117",
            "type": "halberd"
          },
          {
            "id": "person-295",
            "type": "crossbow"
          },
          {
            "id": "person-525",
            "type": "spear"
          },
          {
            "id": "person-360",
            "type": "halberd"
          }
        ],
        "enemyTeam": [
          {
            "id": "person-636",
            "type": "spear"
          },
          {
            "id": "person-537",
            "type": "halberd"
          },
          {
            "id": "person-430",
            "type": "archer"
          },
          {
            "id": "person-237",
            "type": "spear"
          },
          {
            "id": "person-167",
            "type": "crossbow"
          },
          {
            "id": "person-210",
            "type": "halberd"
          }
        ],
        "ownAdvisor": "person-603",
        "enemyAdvisor": "person-167",
        "ownTroops": 2700,
        "enemyTroops": 2600,
        "level": 5,
        "enemyLevel": 5,
        "seed": 2220918,
        "goal": "利用林地击溃蜀军；到达时限时，按双方剩余兵力比例判定胜负。",
        "campaign": true,
        "historical": true,
        "own": 6,
        "enemy": 6,
        "officers": [
          "person-603",
          "person-251",
          "person-117",
          "person-295",
          "person-525",
          "person-360"
        ],
        "waves": [],
        "limit": 360,
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "historical-campaigns.mjs",
      "todo": "沿用当前固定配置；不导入旧配装战法列表"
    },
    {
      "id": "tactical-control-lv",
      "name": "谋定飞将",
      "parameters": {
        "category": "fictional",
        "level": 8,
        "enemyLevel": 8,
        "limit": 480,
        "waves": [],
        "id": "tactical-control-lv",
        "name": "谋定飞将",
        "chapter": "壹",
        "subtitle": "控制压制，智取吕布",
        "difficulty": "配合",
        "feature": "控制与减益",
        "kind": "野战",
        "terrain": "land",
        "ownName": "谋武联军",
        "enemyName": "吕布军",
        "ownAdvisor": "jia",
        "enemyAdvisor": "person-661",
        "description": "郭嘉、贾诩在后排施计，廖化、周仓在前排接敌，利用吕布智力低、军纪弱的短板争取以谋制勇。",
        "briefing": "普通武将牵制吕布，顶级谋士接续混乱、封技与伏弩削弱。计谋有成功率、冷却和控制保护；抓住控制间隙集火，前排失守后谋士仍会被击溃。",
        "ownTeam": [
          {
            "id": "person-646",
            "type": "spear",
            "troops": 2400,
            "position": [
              4,
              2
            ]
          },
          {
            "id": "person-242",
            "type": "halberd",
            "troops": 2300,
            "position": [
              4,
              4
            ]
          },
          {
            "id": "jia",
            "type": "archer",
            "troops": 1700,
            "position": [
              3,
              2
            ]
          },
          {
            "id": "person-61",
            "type": "crossbow",
            "troops": 1700,
            "position": [
              3,
              4
            ]
          }
        ],
        "enemyTeam": [
          {
            "id": "person-661",
            "type": "cavalry",
            "troops": 8500
          }
        ],
        "seed": 521301,
        "campaign": true,
        "historical": false,
        "era": "演义推演",
        "own": 4,
        "enemy": 1,
        "officers": [
          "person-646",
          "person-242",
          "jia",
          "person-61"
        ],
        "history": "本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。",
        "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "tactical-campaigns.mjs",
      "todo": "沿用当前固定配置；预期行为及平衡验收指标后续填写"
    },
    {
      "id": "tactical-control-zhang",
      "name": "智困燕人",
      "parameters": {
        "category": "fictional",
        "level": 8,
        "enemyLevel": 8,
        "limit": 480,
        "waves": [],
        "id": "tactical-control-zhang",
        "name": "智困燕人",
        "chapter": "贰",
        "subtitle": "封技诱敌，压住猛攻",
        "difficulty": "配合",
        "feature": "高武低谋",
        "kind": "野战",
        "terrain": "land",
        "ownName": "谋武联军",
        "enemyName": "张飞军",
        "ownAdvisor": "jia",
        "enemyAdvisor": "person-433",
        "description": "廖化、周仓牵制张飞，郭嘉、贾诩利用其低智力与军纪短板，以计谋制造普通武将也能进攻的窗口。",
        "briefing": "让普通武将承担近战，谋士保持策应距离。混乱中断猛攻，封技限制怒喝，伏弩削弱普攻；控制失败或衔接中断时，张飞仍可能突破前排。",
        "ownTeam": [
          {
            "id": "person-646",
            "type": "spear",
            "troops": 2800,
            "position": [
              4,
              2
            ]
          },
          {
            "id": "person-242",
            "type": "halberd",
            "troops": 2600,
            "position": [
              4,
              4
            ]
          },
          {
            "id": "jia",
            "type": "archer",
            "troops": 1900,
            "position": [
              3,
              2
            ]
          },
          {
            "id": "person-61",
            "type": "crossbow",
            "troops": 1900,
            "position": [
              3,
              4
            ]
          }
        ],
        "enemyTeam": [
          {
            "id": "person-433",
            "type": "spear",
            "troops": 8200
          }
        ],
        "seed": 521302,
        "campaign": true,
        "historical": false,
        "era": "演义推演",
        "own": 4,
        "enemy": 1,
        "officers": [
          "person-646",
          "person-242",
          "jia",
          "person-61"
        ],
        "history": "本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。",
        "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "tactical-campaigns.mjs",
      "todo": "沿用当前固定配置；预期行为及平衡验收指标后续填写"
    },
    {
      "id": "tactical-three-heroes",
      "name": "三英战吕布",
      "parameters": {
        "category": "fictional",
        "level": 8,
        "enemyLevel": 8,
        "limit": 480,
        "waves": [],
        "id": "tactical-three-heroes",
        "name": "三英战吕布",
        "chapter": "叁",
        "subtitle": "三军协力，独战飞将",
        "difficulty": "均势",
        "feature": "等兵力对决",
        "kind": "野战",
        "terrain": "land",
        "ownName": "刘关张联军",
        "enemyName": "吕布军",
        "ownAdvisor": "person-636",
        "enemyAdvisor": "person-661",
        "description": "刘备、关羽、张飞同时在前排接敌，从三个方向合围吕布。双方总兵力相当，以三英近战协同对抗飞将强攻。",
        "briefing": "刘备亲自近战并以仁德策应，关羽侧击，张飞牵制，三人共同围攻吕布。分担接敌压力，也要承受吕布范围战法的反击。",
        "ownTeam": [
          {
            "id": "person-636",
            "type": "spear",
            "troops": 2300,
            "position": [
              4,
              2
            ]
          },
          {
            "id": "person-99",
            "type": "cavalry",
            "troops": 3000,
            "position": [
              4,
              3
            ],
            "formation": "front"
          },
          {
            "id": "person-433",
            "type": "spear",
            "troops": 3200,
            "position": [
              4,
              4
            ]
          }
        ],
        "enemyTeam": [
          {
            "id": "person-661",
            "type": "cavalry",
            "troops": 8500,
            "position": [
              8,
              3
            ]
          }
        ],
        "seed": 521303,
        "campaign": true,
        "historical": false,
        "era": "演义推演",
        "own": 3,
        "enemy": 1,
        "officers": [
          "person-636",
          "person-99",
          "person-433"
        ],
        "history": "本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。",
        "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "tactical-campaigns.mjs",
      "todo": "沿用当前固定配置；预期行为及平衡验收指标后续填写"
    },
    {
      "id": "tactical-shu-defense",
      "name": "蜀军拒曹",
      "parameters": {
        "category": "fictional",
        "level": 10,
        "enemyLevel": 3,
        "limit": 480,
        "waves": [
          {
            "count": 4,
            "tick": 90
          },
          {
            "count": 4,
            "tick": 180
          }
        ],
        "id": "tactical-shu-defense",
        "name": "蜀军拒曹",
        "chapter": "肆",
        "subtitle": "六将协同，抵御大军",
        "difficulty": "挑战",
        "feature": "限时坚守",
        "kind": "守城",
        "terrain": "forest",
        "defending": true,
        "gateHp": 8500,
        "holdUntil": 240,
        "ownName": "刘备守军",
        "enemyName": "曹军诸部",
        "ownAdvisor": "person-290",
        "enemyAdvisor": "jia",
        "description": "刘关张、诸葛亮、赵云与简雍合守城门。曹军在场与预备兵力远多于我军，需要承伤、控制、突击和支援同时发挥。",
        "briefing": "简雍随前排救护与鼓舞，诸葛亮封技，关张稳住阵线，赵云追击后排。守到第 240 日、城门未破且尚有可战部队即完成掩护；城门失守、守军全灭或撤退失败。",
        "ownTeam": [
          {
            "id": "person-636",
            "type": "spear",
            "troops": 4400,
            "position": [
              3,
              3
            ]
          },
          {
            "id": "person-99",
            "type": "halberd",
            "troops": 6800,
            "position": [
              4,
              3
            ]
          },
          {
            "id": "person-433",
            "type": "spear",
            "troops": 6200,
            "position": [
              4,
              4
            ]
          },
          {
            "id": "person-290",
            "type": "crossbow",
            "troops": 3600,
            "position": [
              3,
              4
            ]
          },
          {
            "id": "person-396",
            "type": "cavalry",
            "troops": 6000,
            "position": [
              4,
              2
            ]
          },
          {
            "id": "person-123",
            "type": "halberd",
            "troops": 2200,
            "position": [
              2,
              3
            ]
          }
        ],
        "enemyTeam": [
          {
            "id": "cao",
            "type": "spear",
            "troops": 3400
          },
          {
            "id": "dun",
            "type": "halberd",
            "troops": 3400
          },
          {
            "id": "yuanxia",
            "type": "archer",
            "troops": 3000
          },
          {
            "id": "person-472",
            "type": "spear",
            "troops": 3200
          },
          {
            "id": "jia",
            "type": "crossbow",
            "troops": 2300
          },
          {
            "id": "yu",
            "type": "halberd",
            "troops": 2500
          },
          {
            "id": "jin",
            "type": "spear",
            "troops": 5500
          },
          {
            "id": "person-342",
            "type": "halberd",
            "troops": 5500
          },
          {
            "id": "person-337",
            "type": "cavalry",
            "troops": 5500
          },
          {
            "id": "person-70",
            "type": "spear",
            "troops": 5500
          },
          {
            "id": "person-610",
            "type": "spear",
            "troops": 5500
          },
          {
            "id": "person-338",
            "type": "cavalry",
            "troops": 5500
          },
          {
            "id": "chu",
            "type": "spear",
            "troops": 5500
          },
          {
            "id": "person-255",
            "type": "halberd",
            "troops": 5500
          }
        ],
        "seed": 521304,
        "campaign": true,
        "historical": false,
        "era": "演义推演",
        "own": 6,
        "enemy": 14,
        "officers": [
          "person-636",
          "person-99",
          "person-433",
          "person-290",
          "person-396",
          "person-123"
        ],
        "history": "本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。",
        "goal": "坚守至第 240 日，保住城门及至少一队可战守军；提前击溃敌军亦获胜。",
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "tactical-campaigns.mjs",
      "todo": "沿用当前固定配置；预期行为及平衡验收指标后续填写"
    },
    {
      "id": "tactical-lv-cao",
      "name": "兖州争锋",
      "parameters": {
        "category": "fictional",
        "level": 8,
        "enemyLevel": 8,
        "limit": 480,
        "waves": [],
        "id": "tactical-lv-cao",
        "name": "兖州争锋",
        "chapter": "伍",
        "subtitle": "吕布群将，对阵曹操",
        "difficulty": "均势",
        "feature": "完整阵容",
        "kind": "野战",
        "terrain": "land",
        "ownName": "吕布军",
        "enemyName": "曹操军",
        "ownAdvisor": "person-447",
        "enemyAdvisor": "jia",
        "description": "吕布、高顺与张辽在前线寻找突破，陈宫提供谋略支援，貂蝉扰乱敌军；对阵曹操及早期核心将领组成的完整阵容。",
        "briefing": "高顺吸引火力，吕布张辽从侧翼突击。陈宫紧跟前排救护，貂蝉控制危险目标；分工比单纯堆满攻击战法更重要。",
        "ownTeam": [
          {
            "id": "person-661",
            "type": "cavalry",
            "troops": 6800,
            "position": [
              4,
              2
            ]
          },
          {
            "id": "person-425",
            "type": "archer",
            "troops": 2000,
            "position": [
              3,
              4
            ]
          },
          {
            "id": "person-447",
            "type": "halberd",
            "troops": 2300,
            "position": [
              3,
              3
            ]
          },
          {
            "id": "person-170",
            "type": "halberd",
            "troops": 4200,
            "position": [
              4,
              3
            ]
          },
          {
            "id": "liao",
            "type": "cavalry",
            "troops": 4300,
            "position": [
              4,
              4
            ]
          }
        ],
        "enemyTeam": [
          {
            "id": "cao",
            "type": "spear",
            "troops": 4200
          },
          {
            "id": "dun",
            "type": "halberd",
            "troops": 3400
          },
          {
            "id": "yuanxia",
            "type": "archer",
            "troops": 3100
          },
          {
            "id": "person-472",
            "type": "spear",
            "troops": 3000
          },
          {
            "id": "jia",
            "type": "crossbow",
            "troops": 1900
          },
          {
            "id": "yu",
            "type": "halberd",
            "troops": 2100
          }
        ],
        "seed": 521305,
        "campaign": true,
        "historical": false,
        "era": "演义推演",
        "own": 5,
        "enemy": 6,
        "officers": [
          "person-661",
          "person-425",
          "person-447",
          "person-170",
          "liao"
        ],
        "history": "本场为角色与阵容的战术推演，兵力、等级和配装为玩法预设，不对应真实历史战役。",
        "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
        "expectedBehaviors": null,
        "acceptanceMetrics": null
      },
      "source": "tactical-campaigns.mjs",
      "todo": "沿用当前固定配置；预期行为及平衡验收指标后续填写"
    }
  ]
};
