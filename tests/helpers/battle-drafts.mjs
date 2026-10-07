// Authoritative design data. Runtime imports this table.
export const REGRESSION_DRAFTS = [
  {
    "id": "history-guandu",
    "name": "官渡之战",
    "seed": 2000918,
    "limit": 360,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "ju",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "history-chibi",
    "name": "赤壁之战",
    "seed": 2080918,
    "limit": 360,
    "battleKind": "field",
    "terrain": "river",
    "shieldPercent": 0,
    "waves": [],
    "ownTeam": [
      {
        "id": "person-246",
        "type": "archer",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      },
      {
        "id": "person-164",
        "type": "archer",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      },
      {
        "id": "person-467",
        "type": "archer",
        "troops": 2800,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
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
        "type": "archer",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      },
      {
        "id": "jin",
        "type": "archer",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
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
        "type": "archer",
        "troops": 2400,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      }
    ],
    "ownTeamRoles": {
      "leader": "person-246",
      "advisor": "person-246",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "history-hefei",
    "name": "合肥之战",
    "seed": 2150918,
    "limit": 360,
    "battleKind": "defense",
    "terrain": "land",
    "gateHp": 6000,
    "shieldPercent": 20,
    "waves": [],
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
        "type": "halberd",
        "troops": 1400,
        "level": 3,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": null,
          "siege": "siege"
        }
      }
    ],
    "ownTeamRoles": {
      "leader": "liao",
      "advisor": "person-610",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "person-368",
      "advisor": "person-662",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 3,
    "enemy": 6
  },
  {
    "id": "history-yiling",
    "name": "夷陵之战",
    "seed": 2220918,
    "limit": 360,
    "battleKind": "field",
    "terrain": "forest",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-603",
      "advisor": "person-603",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "person-636",
      "advisor": "person-167",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "tactical-control-lv",
    "name": "谋定飞将",
    "seed": 521301,
    "limit": 480,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-646",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "person-661",
      "advisor": "person-661",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 4,
    "enemy": 1
  },
  {
    "id": "tactical-control-zhang",
    "name": "智困燕人",
    "seed": 521302,
    "limit": 480,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-646",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "person-433",
      "advisor": "person-433",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 4,
    "enemy": 1
  },
  {
    "id": "tactical-three-heroes",
    "name": "三英战吕布",
    "seed": 521303,
    "limit": 480,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-636",
      "advisor": "person-636",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "person-661",
      "advisor": "person-661",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 3,
    "enemy": 1
  },
  {
    "id": "tactical-shu-defense",
    "name": "蜀军拒曹",
    "seed": 521304,
    "limit": 480,
    "battleKind": "defense",
    "terrain": "forest",
    "gateHp": 8500,
    "holdUntil": 240,
    "shieldPercent": 20,
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
    "ownTeamRoles": {
      "leader": "person-636",
      "advisor": "person-290",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 10
  },
  {
    "id": "tactical-lv-cao",
    "name": "兖州争锋",
    "seed": 521305,
    "limit": 480,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-661",
      "advisor": "person-447",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 5,
    "enemy": 6
  },
  {
    "id": "terrain",
    "name": "演武 · 因地制宜",
    "seed": 521218,
    "limit": 240,
    "battleKind": "field",
    "terrain": "forest",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "eight-arms",
    "name": "演武 · 诸兵协同",
    "seed": 521216,
    "limit": 240,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": null,
          "siege": "siege"
        }
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
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": null,
          "siege": "siege"
        }
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "river",
    "name": "演武 · 水陆交锋",
    "seed": 521217,
    "limit": 240,
    "battleKind": "field",
    "terrain": "river",
    "shieldPercent": 0,
    "waves": [],
    "ownTeam": [
      {
        "id": "cao",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      },
      {
        "id": "liao",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
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
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": null,
          "siege": "siege"
        }
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
    "enemyTeam": [
      {
        "id": "shao",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
      },
      {
        "id": "yan",
        "type": "archer",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": "ship",
          "siege": null
        }
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
        "type": "halberd",
        "troops": 3000,
        "level": 5,
        "formation": "back",
        "first": true,
        "equipment": {
          "ship": null,
          "siege": "siege"
        }
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "breach",
    "name": "演武 · 控阵突击",
    "seed": 521208,
    "limit": 240,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-433",
      "advisor": "person-99",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "shao",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 3,
    "enemy": 3
  },
  {
    "id": "officer-lab",
    "name": "群英 · 武将试炼",
    "seed": 521207,
    "limit": 240,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "person-290",
      "advisor": "person-290",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "field",
    "name": "官渡 · 正面交锋",
    "seed": 521201,
    "limit": 240,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [],
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 6,
    "enemy": 6
  },
  {
    "id": "outnumbered",
    "name": "白马 · 精兵破围",
    "seed": 521202,
    "limit": 360,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [
      {
        "count": 4,
        "tick": 0
      }
    ],
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "yu",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 4,
    "enemy": 10
  },
  {
    "id": "reinforcements",
    "name": "界桥 · 三路来援",
    "seed": 521203,
    "limit": 480,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 8,
    "enemy": 10
  },
  {
    "id": "siege",
    "name": "邺城 · 破门攻坚",
    "seed": 521204,
    "limit": 420,
    "battleKind": "siege",
    "terrain": "land",
    "gateHp": 5000,
    "shieldPercent": 20,
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
    "ownTeamRoles": {
      "leader": "cao",
      "advisor": "jia",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 8,
    "enemy": 10
  },
  {
    "id": "defense",
    "name": "许昌 · 孤城拒敌",
    "seed": 521205,
    "limit": 360,
    "battleKind": "defense",
    "terrain": "land",
    "gateHp": 6500,
    "shieldPercent": 20,
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
    "ownTeamRoles": {
      "leader": "jin",
      "advisor": "yu",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 8,
    "enemy": 10
  },
  {
    "id": "rotation",
    "name": "陈留 · 轮番鏖战",
    "seed": 521206,
    "limit": 360,
    "battleKind": "field",
    "terrain": "land",
    "shieldPercent": 0,
    "waves": [
      {
        "count": 4,
        "tick": 0
      }
    ],
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
    "ownTeamRoles": {
      "leader": "jin",
      "advisor": "yu",
      "deputy": null
    },
    "enemyTeamRoles": {
      "leader": "shao",
      "advisor": "tian",
      "deputy": null
    },
    "ownTeamTactic": "balanced",
    "enemyTeamTactic": "balanced",
    "own": 8,
    "enemy": 10
  }
];
