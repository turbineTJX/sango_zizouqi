// Authoritative playable presets; every entry is validated by the custom battle generator.
export const BATTLE_PRESETS = [
  {
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
    "briefing": "枪兵接住正面，张辽从侧翼寻找缺口。军略蓄满后暂停，按战况选择可用军略。",
    "history": "公元 200 年，曹操与袁绍在官渡交战，曹操取胜，北方局势由此转变。",
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 2800,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 2800,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-291",
        "type": "halberd",
        "troops": 2800,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 2800,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "halberd",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1750,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "he",
        "type": "halberd",
        "troops": 1750,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "gao",
        "type": "spear",
        "troops": 1750,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1750,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1750,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1750,
        "level": 3,
        "formation": "left",
        "first": true
      }
    ],
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
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "ju",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
        "type": "ship",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-164",
        "type": "ship",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-467",
        "type": "ship",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-243",
        "type": "halberd",
        "troops": 2800,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-117",
        "type": "archer",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-668",
        "type": "halberd",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 2400,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 2400,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-291",
        "type": "ship",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "jin",
        "type": "ship",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "halberd",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-429",
        "type": "ship",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
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
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-246",
      "advisor": "person-246",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
        "type": "cavalry",
        "troops": 3000,
        "level": 8,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-70",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-610",
        "type": "crossbow",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "person-368",
        "type": "spear",
        "troops": 1400,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-119",
        "type": "cavalry",
        "troops": 1400,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-652",
        "type": "halberd",
        "troops": 1400,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-662",
        "type": "halberd",
        "troops": 1400,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-268",
        "type": "archer",
        "troops": 1400,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-243",
        "type": "siege",
        "troops": 1400,
        "level": 3,
        "formation": "back",
        "first": true
      }
    ],
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
    "battleKind": "defense",
    "shieldPercent": 20,
    "ownTeamRoles": {
      "leader": "liao",
      "advisor": "person-610",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "person-368",
      "advisor": "person-662",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
        "type": "archer",
        "troops": 2700,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-251",
        "type": "spear",
        "troops": 2700,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-117",
        "type": "halberd",
        "troops": 2700,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-295",
        "type": "crossbow",
        "troops": 2700,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-525",
        "type": "spear",
        "troops": 2700,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-360",
        "type": "halberd",
        "troops": 2700,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "person-636",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-537",
        "type": "halberd",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-430",
        "type": "archer",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-237",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-167",
        "type": "crossbow",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-210",
        "type": "halberd",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
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
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-603",
      "advisor": "person-603",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "person-636",
      "advisor": "person-167",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
    "description": "郭嘉、贾诩在后排施计，廖化、周仓在前排接敌，利用吕布智力低、军纪弱的短板争取以谋制勇。",
    "briefing": "使用当前固定配置的战法与合法军团编制，观察各部队的实际贡献。可载入自定义战役，修改单一因素后对照。",
    "ownTeam": [
      {
        "id": "person-646",
        "type": "spear",
        "troops": 2400,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-242",
        "type": "halberd",
        "troops": 2300,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "archer",
        "troops": 1700,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-61",
        "type": "crossbow",
        "troops": 1700,
        "level": 8,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "person-661",
        "type": "cavalry",
        "troops": 8500,
        "level": 8,
        "formation": "left",
        "first": true
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
    "history": "本场为角色与阵容的战术推演，兵力与等级为玩法预设，战法按当前固定战法规则获得，不对应真实历史战役。",
    "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-646",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "person-661",
      "advisor": "person-661",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
    "description": "廖化、周仓牵制张飞，郭嘉、贾诩利用其低智力与军纪短板，以计谋制造普通武将也能进攻的窗口。",
    "briefing": "使用当前固定配置的战法与合法军团编制，观察各部队的实际贡献。可载入自定义战役，修改单一因素后对照。",
    "ownTeam": [
      {
        "id": "person-646",
        "type": "spear",
        "troops": 2800,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-242",
        "type": "halberd",
        "troops": 2600,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "archer",
        "troops": 1900,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-61",
        "type": "crossbow",
        "troops": 1900,
        "level": 8,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "person-433",
        "type": "spear",
        "troops": 8200,
        "level": 8,
        "formation": "front",
        "first": true
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
    "history": "本场为角色与阵容的战术推演，兵力与等级为玩法预设，战法按当前固定战法规则获得，不对应真实历史战役。",
    "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-646",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "person-433",
      "advisor": "person-433",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
    "description": "刘备、关羽、张飞同时在前排接敌，从三个方向合围吕布。双方总兵力相当，以三英近战协同对抗飞将强攻。",
    "briefing": "使用当前固定配置的战法与合法军团编制，观察各部队的实际贡献。可载入自定义战役，修改单一因素后对照。",
    "ownTeam": [
      {
        "id": "person-636",
        "type": "spear",
        "troops": 2300,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-99",
        "type": "cavalry",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-433",
        "type": "spear",
        "troops": 3200,
        "level": 8,
        "formation": "front",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "person-661",
        "type": "cavalry",
        "troops": 8500,
        "level": 8,
        "formation": "left",
        "first": true
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
    "history": "本场为角色与阵容的战术推演，兵力与等级为玩法预设，战法按当前固定战法规则获得，不对应真实历史战役。",
    "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-636",
      "advisor": "person-636",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "person-661",
      "advisor": "person-661",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
    "level": 10,
    "enemyLevel": 3,
    "limit": 480,
    "waves": [
      {
        "count": 2,
        "tick": 90
      },
      {
        "count": 2,
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
    "description": "六将守城，对抗十队曹军；敌军四队分两批到达。",
    "briefing": "使用当前固定配置的战法与合法军团编制，观察各部队的实际贡献。可载入自定义战役，修改单一因素后对照。",
    "ownTeam": [
      {
        "id": "person-636",
        "type": "spear",
        "troops": 4400,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-99",
        "type": "halberd",
        "troops": 6800,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-433",
        "type": "spear",
        "troops": 6200,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-290",
        "type": "crossbow",
        "troops": 3600,
        "level": 10,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-396",
        "type": "cavalry",
        "troops": 6000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-123",
        "type": "halberd",
        "troops": 2200,
        "level": 10,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3400,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "dun",
        "type": "halberd",
        "troops": 3400,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 3000,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-472",
        "type": "spear",
        "troops": 3200,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 2300,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "halberd",
        "troops": 2500,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 5500,
        "level": 3,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-342",
        "type": "halberd",
        "troops": 5500,
        "level": 3,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-337",
        "type": "cavalry",
        "troops": 5500,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-70",
        "type": "spear",
        "troops": 5500,
        "level": 3,
        "formation": "front",
        "first": false
      }
    ],
    "seed": 521304,
    "campaign": true,
    "historical": false,
    "era": "演义推演",
    "own": 6,
    "enemy": 10,
    "officers": [
      "person-636",
      "person-99",
      "person-433",
      "person-290",
      "person-396",
      "person-123"
    ],
    "history": "本场为角色与阵容的战术推演，兵力与等级为玩法预设，战法按当前固定战法规则获得，不对应真实历史战役。",
    "goal": "坚守至第 240 日，保住城门及至少一队可战守军；提前击溃敌军亦获胜。",
    "battleKind": "defense",
    "shieldPercent": 20,
    "ownTeamRoles": {
      "leader": "person-636",
      "advisor": "person-290",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
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
    "description": "吕布、高顺与张辽在前线寻找突破，陈宫提供谋略支援，貂蝉扰乱敌军；对阵曹操及早期核心将领组成的完整阵容。",
    "briefing": "使用当前固定配置的战法与合法军团编制，观察各部队的实际贡献。可载入自定义战役，修改单一因素后对照。",
    "ownTeam": [
      {
        "id": "person-661",
        "type": "cavalry",
        "troops": 6800,
        "level": 8,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-425",
        "type": "archer",
        "troops": 2000,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-447",
        "type": "halberd",
        "troops": 2300,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-170",
        "type": "halberd",
        "troops": 4200,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 4300,
        "level": 8,
        "formation": "left",
        "first": true
      }
    ],
    "enemyTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 4200,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "dun",
        "type": "halberd",
        "troops": 3400,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 3100,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-472",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 1900,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "halberd",
        "troops": 2100,
        "level": 8,
        "formation": "back",
        "first": true
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
    "history": "本场为角色与阵容的战术推演，兵力与等级为玩法预设，战法按当前固定战法规则获得，不对应真实历史战役。",
    "goal": "击溃敌军；日暮按剩余兵力比例判定胜负。",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeamRoles": {
      "leader": "person-661",
      "advisor": "person-447",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
    "id": "terrain",
    "name": "演武 · 因地制宜",
    "kind": "野战",
    "difficulty": "地形战法",
    "terrain": "forest",
    "description": "在同一阵容、兵力和种子下比较地形与布阵。双方战法按当前适性与主将属性固定配置。",
    "own": 6,
    "enemy": 6,
    "ownTroops": 3000,
    "enemyTroops": 3000,
    "level": 5,
    "enemyLevel": 5,
    "waves": [],
    "seed": 521218,
    "limit": 240,
    "goal": "观察地形对移动、射击和实际战法的影响。",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu"
    ]
  },
  {
    "id": "eight-arms",
    "name": "演武 · 诸兵协同",
    "kind": "野战",
    "difficulty": "新兵种",
    "description": "双方各六队，以相同兵力和等级观察兵种分工与协同。",
    "own": 6,
    "enemy": 6,
    "ownTroops": 3000,
    "enemyTroops": 3000,
    "level": 5,
    "enemyLevel": 5,
    "waves": [],
    "seed": 521216,
    "limit": 240,
    "goal": "查看已学战法和实际战斗记录，不预设必须发动的战法。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "siege",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "he",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "ju",
        "type": "siege",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu"
    ]
  },
  {
    "id": "river",
    "name": "演武 · 水陆交锋",
    "kind": "水战",
    "difficulty": "水陆协同",
    "description": "舰船沿水道、陆军沿陆地和桥面接战，双方共用当前战斗规则。",
    "own": 6,
    "enemy": 6,
    "ownTroops": 3000,
    "enemyTroops": 3000,
    "level": 5,
    "enemyLevel": 5,
    "waves": [],
    "seed": 521217,
    "limit": 240,
    "goal": "观察航道接敌、射程与岸上协同。",
    "terrain": "river",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "ship",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "liao",
        "type": "ship",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "chu",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "siege",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "ship",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yan",
        "type": "ship",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "wen",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "he",
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "ju",
        "type": "siege",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu"
    ]
  },
  {
    "id": "breach",
    "name": "演武 · 控阵突击",
    "kind": "野战",
    "difficulty": "ZOC 配合",
    "description": "步骑与远程配合突破防线；战法由当前固定战法规则生成。",
    "own": 3,
    "enemy": 3,
    "ownTroops": 3000,
    "enemyTroops": 3000,
    "level": 10,
    "enemyLevel": 10,
    "waves": [],
    "seed": 521208,
    "limit": 240,
    "officers": [
      "person-433",
      "person-99",
      "person-186"
    ],
    "goal": "观察控制、穿阵与射程内远程优先，记录未能突破的原因。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "person-433",
        "type": "spear",
        "troops": 3000,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "person-99",
        "type": "cavalry",
        "troops": 3000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-186",
        "type": "archer",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "person-433",
      "advisor": "person-99",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 3000,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "crossbow",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      },
      {
        "id": "wen",
        "type": "archer",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "shao",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
    "id": "officer-lab",
    "name": "群英 · 武将试炼",
    "kind": "野战",
    "difficulty": "自由选将",
    "description": "选取一至六名真实武将，以当前属性、特性和固定战法规则进行试炼。",
    "own": 6,
    "enemy": 6,
    "ownTroops": 3000,
    "enemyTroops": 2500,
    "level": 10,
    "enemyLevel": 3,
    "waves": [],
    "seed": 521207,
    "limit": 240,
    "officers": [
      "person-290",
      "person-246",
      "person-661",
      "person-99",
      "person-396",
      "person-433"
    ],
    "goal": "观察实际贡献；本场为非等预算练习，不作为平衡结论。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "person-290",
        "type": "crossbow",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-246",
        "type": "archer",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      },
      {
        "id": "person-661",
        "type": "cavalry",
        "troops": 3000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-99",
        "type": "cavalry",
        "troops": 3000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-396",
        "type": "cavalry",
        "troops": 3000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "person-433",
        "type": "spear",
        "troops": 3000,
        "level": 10,
        "formation": "front",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "person-290",
      "advisor": "person-290",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 2500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 2500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 2500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 2500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 2500,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 2500,
        "level": 3,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced"
  },
  {
    "id": "field",
    "name": "官渡 · 正面交锋",
    "kind": "野战",
    "difficulty": "基准",
    "description": "六队对六队，比较低战意叠层、高战意战法与军略的配合。",
    "own": 6,
    "enemy": 6,
    "ownTroops": 2600,
    "enemyTroops": 2500,
    "level": 3,
    "enemyLevel": 3,
    "waves": [],
    "seed": 521201,
    "limit": 240,
    "goal": "击溃敌军；日暮按剩余兵力比例判定。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 2600,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 2600,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 2600,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 2600,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 2600,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 2600,
        "level": 3,
        "formation": "back",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 2500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 2500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 2500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 2500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 2500,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 2500,
        "level": 3,
        "formation": "back",
        "first": true
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu"
    ]
  },
  {
    "id": "outnumbered",
    "name": "白马 · 精兵破围",
    "kind": "野战",
    "difficulty": "以少胜多",
    "description": "四队精兵迎战十队敌军，敌军四队预备；比较人数、等级与兵力差异。",
    "own": 4,
    "enemy": 10,
    "ownTroops": 3000,
    "enemyTroops": 1050,
    "level": 10,
    "enemyLevel": 1,
    "waves": [
      {
        "count": 4,
        "tick": 0
      }
    ],
    "seed": 521202,
    "limit": 360,
    "goal": "观察精兵与多队配合，不预设获胜方。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 10,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 10,
        "formation": "left",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 3000,
        "level": 10,
        "formation": "back",
        "first": true
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1050,
        "level": 1,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 1050,
        "level": 1,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 1050,
        "level": 1,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 1050,
        "level": 1,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1050,
        "level": 1,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1050,
        "level": 1,
        "formation": "back",
        "first": true
      },
      {
        "id": "gao",
        "type": "cavalry",
        "troops": 1050,
        "level": 1,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1050,
        "level": 1,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-337",
        "type": "spear",
        "troops": 1050,
        "level": 1,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-338",
        "type": "cavalry",
        "troops": 1050,
        "level": 1,
        "formation": "left",
        "first": false
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "jia",
      "yu"
    ]
  },
  {
    "id": "reinforcements",
    "name": "界桥 · 三路来援",
    "kind": "野战",
    "difficulty": "连续增援",
    "description": "敌军六队首发，四队援军分三批抵达，检验补位与到达限制。",
    "own": 8,
    "enemy": 10,
    "ownTroops": 3000,
    "enemyTroops": 1500,
    "level": 8,
    "enemyLevel": 3,
    "waves": [
      {
        "count": 2,
        "tick": 25
      },
      {
        "count": 1,
        "tick": 55
      },
      {
        "count": 1,
        "tick": 85
      }
    ],
    "seed": 521203,
    "limit": 480,
    "goal": "未到援军不能参战，也不能提前判定其战败。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 8,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": false
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": false
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 1500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 1500,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 1500,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1500,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1500,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "gao",
        "type": "cavalry",
        "troops": 1500,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1500,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-337",
        "type": "spear",
        "troops": 1500,
        "level": 3,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-338",
        "type": "cavalry",
        "troops": 1500,
        "level": 3,
        "formation": "left",
        "first": false
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu",
      "yuanxia",
      "jin"
    ]
  },
  {
    "id": "siege",
    "name": "邺城 · 破门攻坚",
    "kind": "攻城",
    "difficulty": "城门攻坚",
    "description": "双方各一个合法军团；敌军四队分两批增援，城门为独立目标。",
    "own": 8,
    "enemy": 10,
    "ownTroops": 3000,
    "enemyTroops": 1800,
    "level": 8,
    "enemyLevel": 3,
    "waves": [
      {
        "count": 2,
        "tick": 35
      },
      {
        "count": 2,
        "tick": 70
      }
    ],
    "seed": 521204,
    "limit": 420,
    "gateHp": 5000,
    "goal": "城门失守立即失败；观察攻城路线、射程与补位。",
    "terrain": "land",
    "battleKind": "siege",
    "shieldPercent": 20,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 8,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 3000,
        "level": 8,
        "formation": "back",
        "first": false
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 3000,
        "level": 8,
        "formation": "front",
        "first": false
      }
    ],
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1800,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 1800,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 1800,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 1800,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1800,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1800,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "gao",
        "type": "cavalry",
        "troops": 1800,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1800,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-337",
        "type": "spear",
        "troops": 1800,
        "level": 3,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-338",
        "type": "cavalry",
        "troops": 1800,
        "level": 3,
        "formation": "left",
        "first": false
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu",
      "yuanxia",
      "jin"
    ]
  },
  {
    "id": "defense",
    "name": "许昌 · 孤城拒敌",
    "kind": "守城",
    "difficulty": "多队攻城",
    "description": "八队守军对十队攻城部队，敌军四队分两批到达。",
    "own": 8,
    "enemy": 10,
    "ownTroops": 3000,
    "enemyTroops": 1300,
    "level": 5,
    "enemyLevel": 3,
    "waves": [
      {
        "count": 2,
        "tick": 30
      },
      {
        "count": 2,
        "tick": 65
      }
    ],
    "seed": 521205,
    "limit": 360,
    "gateHp": 6500,
    "goal": "保护城门，观察守城部署与援军补位。",
    "terrain": "land",
    "battleKind": "defense",
    "shieldPercent": 20,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 3000,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": false
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 3000,
        "level": 5,
        "formation": "front",
        "first": false
      }
    ],
    "ownTeamRoles": {
      "leader": "jin",
      "advisor": "yu",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1300,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 1300,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 1300,
        "level": 3,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 1300,
        "level": 3,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1300,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1300,
        "level": 3,
        "formation": "back",
        "first": true
      },
      {
        "id": "gao",
        "type": "cavalry",
        "troops": 1300,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1300,
        "level": 3,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-337",
        "type": "spear",
        "troops": 1300,
        "level": 3,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-338",
        "type": "cavalry",
        "troops": 1300,
        "level": 3,
        "formation": "left",
        "first": false
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu",
      "yuanxia",
      "jin"
    ]
  },
  {
    "id": "rotation",
    "name": "陈留 · 轮番鏖战",
    "kind": "野战",
    "difficulty": "预备轮换",
    "description": "八队对十队，首发各至多六队，余下部队按合法空位补入。",
    "own": 8,
    "enemy": 10,
    "ownTroops": 2600,
    "enemyTroops": 1700,
    "level": 5,
    "enemyLevel": 5,
    "waves": [
      {
        "count": 4,
        "tick": 0
      }
    ],
    "seed": 521206,
    "limit": 360,
    "goal": "观察预备队贡献与消耗，不预设胜率。",
    "terrain": "land",
    "battleKind": "field",
    "shieldPercent": 0,
    "ownTeam": [
      {
        "id": "cao",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "liao",
        "type": "cavalry",
        "troops": 2600,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "chu",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "jia",
        "type": "crossbow",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "dun",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yu",
        "type": "crossbow",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "yuanxia",
        "type": "archer",
        "troops": 2600,
        "level": 5,
        "formation": "back",
        "first": false
      },
      {
        "id": "jin",
        "type": "spear",
        "troops": 2600,
        "level": 5,
        "formation": "front",
        "first": false
      }
    ],
    "ownTeamRoles": {
      "leader": "jin",
      "advisor": "yu",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeam": [
      {
        "id": "shao",
        "type": "spear",
        "troops": 1700,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "yan",
        "type": "cavalry",
        "troops": 1700,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "wen",
        "type": "cavalry",
        "troops": 1700,
        "level": 5,
        "formation": "left",
        "first": true
      },
      {
        "id": "he",
        "type": "spear",
        "troops": 1700,
        "level": 5,
        "formation": "front",
        "first": true
      },
      {
        "id": "ju",
        "type": "crossbow",
        "troops": 1700,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "tian",
        "type": "archer",
        "troops": 1700,
        "level": 5,
        "formation": "back",
        "first": true
      },
      {
        "id": "gao",
        "type": "cavalry",
        "troops": 1700,
        "level": 5,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-429",
        "type": "cavalry",
        "troops": 1700,
        "level": 5,
        "formation": "left",
        "first": false
      },
      {
        "id": "person-337",
        "type": "spear",
        "troops": 1700,
        "level": 5,
        "formation": "front",
        "first": false
      },
      {
        "id": "person-338",
        "type": "cavalry",
        "troops": 1700,
        "level": 5,
        "formation": "left",
        "first": false
      }
    ],
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "enemyTeamTactic": "balanced",
    "officers": [
      "cao",
      "liao",
      "chu",
      "jia",
      "dun",
      "yu",
      "yuanxia",
      "jin"
    ]
  }
];
