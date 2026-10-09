// Authoritative design data. Runtime imports this table.
export const HISTORICAL_BATTLES = [
  {
    "id": "xiapi",
    "name": "下邳之战",
    "year": 198,
    "ownName": "吕布守军",
    "enemyName": "曹刘联军",
    "source": "https://ctext.org/sanguozhi/1",
    "sources": [
      {
        "title": "三国志·武帝纪",
        "url": "https://ctext.org/sanguozhi/1"
      },
      {
        "title": "三国志·吕布传",
        "url": "https://ctext.org/sanguozhi/7"
      }
    ],
    "designNote": "城困下邳：吕军没有外援，曹军主力与刘备协同军合围；开战后四天吕军断粮。日期为压缩战役进程，不是史料日期。",
    "expectedWinner": 1,
    "numericalSide": 1,
    "draft": {
      "mapId": "xiapi",
      "terrain": "marsh",
      "battleKind": "defense",
      "limit": 480,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198198,
      "ownTeam": [
        {
          "id": "person-661",
          "type": "cavalry",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-447",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-170",
          "type": "halberd",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "liao",
          "type": "cavalry",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-174",
          "type": "spear",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-334",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-128",
          "type": "cavalry",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-343",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-347",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-425",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "enemyTeam": [
        {
          "id": "cao",
          "type": "spear",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "dun",
          "type": "cavalry",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "yuanxia",
          "type": "archer",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-342",
          "type": "halberd",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "yu",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "jia",
          "type": "crossbow",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "jin",
          "type": "spear",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "chu",
          "type": "halberd",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-337",
          "type": "cavalry",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-610",
          "type": "crossbow",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "ownTeamRoles": {
        "leader": "person-661",
        "advisor": "person-447",

      },
      "enemyTeamRoles": {
        "leader": "cao",
        "advisor": "yu",

      },
      "reinforcements": [
        {
          "side": 1,
          "name": "刘备协同军",
          "tick": 48,
          "team": [
            {
              "id": "person-636",
              "type": "spear",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-99",
              "type": "cavalry",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-433",
              "type": "spear",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-636",
            "advisor": "person-636",

          }
        }
      ],
      "gateHp": 22000,
      "events": [
        {
          "kind": "supply-cut",
          "side": 0,
          "tick": 96,
          "duration": 288
        }
      ]
    }
  },
  {
    "id": "guandu",
    "name": "官渡之战",
    "year": 200,
    "ownName": "曹军",
    "enemyName": "袁绍军",
    "source": "https://w.atwiki.jp/sangokushi11/pages/2161.html",
    "sources": [
      {
        "title": "三国志11·官渡决战资料",
        "url": "https://w.atwiki.jp/sangokushi11/pages/2161.html"
      },
      {
        "title": "三国志·武帝纪",
        "url": "https://ctext.org/sanguozhi/1"
      }
    ],
    "designNote": "官渡相持与乌巢转折：乌巢对应粮道中断，独立战役按日期抽象为现有缺粮效果；淳于琼部队被消灭后曹军后援反攻；河北中军全灭后袁谭后军接替。两天后袁军遭伏兵，三天后断粮；借鉴11代分阶段战局，不搬动兵粮库存或直接减兵。",
    "expectedWinner": 0,
    "numericalSide": 1,
    "draft": {
      "mapId": "guandu",
      "terrain": "land",
      "battleKind": "field",
      "limit": 480,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198200,
      "ownTeam": [
        {
          "id": "cao",
          "type": "spear",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "yu",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-61",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-291",
          "type": "spear",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "liao",
          "type": "cavalry",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "chu",
          "type": "halberd",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "jin",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "jia",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-462",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-70",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "enemyTeam": [
        {
          "id": "shao",
          "type": "spear",
          "troops": 7000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "he",
          "type": "spear",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "gao",
          "type": "halberd",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-256",
          "type": "cavalry",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "ju",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-72",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-304",
          "type": "halberd",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-306",
          "type": "crossbow",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-553",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-266",
          "type": "spear",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "ownTeamRoles": {
        "leader": "cao",
        "advisor": "yu",

      },
      "enemyTeamRoles": {
        "leader": "shao",
        "advisor": "ju",

      },
      "reinforcements": [
        {
          "side": 0,
          "name": "曹军反攻后援",
          "arrivalCondition": {
            "type": "unit-defeated",
            "unitId": "person-256"
          },
          "team": [
            {
              "id": "person-342",
              "type": "halberd",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "yuanxia",
              "type": "archer",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-337",
              "type": "cavalry",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-610",
              "type": "spear",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-342",
            "advisor": "person-610",

          }
        },
        {
          "side": 1,
          "name": "河北中军",
          "tick": 48,
          "team": [
            {
              "id": "person-645",
              "type": "spear",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-309",
              "type": "halberd",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-105",
              "type": "spear",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-259",
              "type": "crossbow",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-461",
              "type": "archer",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-159",
              "type": "cavalry",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-159",
            "advisor": "person-259",

          }
        },
        {
          "side": 1,
          "name": "袁谭后军",
          "arrivalCondition": {
            "type": "army-defeated",
            "armyId": "a4"
          },
          "team": [
            {
              "id": "person-21",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-657",
              "type": "cavalry",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-658",
              "type": "cavalry",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-272",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-429",
              "type": "halberd",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-353",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-21",
            "advisor": "person-353",

          }
        }
      ],
      "events": [
        {
          "kind": "ambush",
          "side": 1,
          "tick": 48,
          "duration": 24
        },
        {
          "kind": "supply-cut",
          "side": 1,
          "tick": 72,
          "duration": 288
        }
      ]
    }
  },
  {
    "id": "chibi",
    "name": "赤壁之战",
    "year": 208,
    "ownName": "孙刘联军",
    "enemyName": "曹军水师",
    "source": "https://w.atwiki.jp/sangokushi11/pages/2159.html",
    "sources": [
      {
        "title": "三国志11·赤壁决战资料",
        "url": "https://w.atwiki.jp/sangokushi11/pages/2159.html"
      },
      {
        "title": "三国志·周瑜传",
        "url": "https://ctext.org/sanguozhi/54"
      }
    ],
    "designNote": "水战与追击：曹军两天后遭突袭失序，三天后补给中断，同时刘备军投入追击。用定时负面状态抽象火攻后战局；舰船适性和战法沿用真实配置，孙权和已死张绣不在此战场。",
    "expectedWinner": 0,
    "numericalSide": 1,
    "draft": {
      "mapId": "chibi",
      "terrain": "river",
      "battleKind": "field",
      "limit": 480,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198208,
      "ownTeam": [
        {
          "id": "person-246",
          "type": "archer",
          "troops": 9000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-467",
          "type": "archer",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-164",
          "type": "archer",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-119",
          "type": "archer",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-117",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-662",
          "type": "archer",
          "troops": 3500,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-668",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-268",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-489",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-470",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        }
      ],
      "enemyTeam": [
        {
          "id": "cao",
          "type": "archer",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-342",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "liao",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-291",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "he",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "yu",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "jin",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-337",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-610",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        },
        {
          "id": "person-568",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false,
          "equipment": {
            "siege": null,
            "ship": "louShip"
          }
        }
      ],
      "ownTeamRoles": {
        "leader": "person-246",
        "advisor": "person-668",

      },
      "enemyTeamRoles": {
        "leader": "cao",
        "advisor": "yu",

      },
      "reinforcements": [
        {
          "side": 0,
          "name": "刘备追击军",
          "tick": 72,
          "team": [
            {
              "id": "person-636",
              "type": "archer",
              "troops": 5500,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-99",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-433",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            }
          ],
          "roles": {
            "leader": "person-636",
            "advisor": "person-636",

          }
        },
        {
          "side": 1,
          "name": "荆州前锋",
          "tick": 0,
          "team": [
            {
              "id": "person-429",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-272",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-541",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-547",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            }
          ],
          "roles": {
            "leader": "person-547",
            "advisor": "person-541",

          }
        },
        {
          "side": 1,
          "name": "曹军后续船队",
          "tick": 96,
          "team": [
            {
              "id": "dun",
              "type": "archer",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-70",
              "type": "archer",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-567",
              "type": "archer",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-642",
              "type": "archer",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-254",
              "type": "archer",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            },
            {
              "id": "person-462",
              "type": "archer",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true,
              "equipment": {
                "siege": null,
                "ship": "louShip"
              }
            }
          ],
          "roles": {
            "leader": "dun",
            "advisor": "person-642",

          }
        }
      ],
      "events": [
        {
          "kind": "ambush",
          "side": 1,
          "tick": 48,
          "duration": 24
        },
        {
          "kind": "supply-cut",
          "side": 1,
          "tick": 72,
          "duration": 240
        }
      ]
    }
  },
  {
    "id": "hefei",
    "name": "合肥之战",
    "year": 215,
    "ownName": "张辽守军",
    "enemyName": "孙权军",
    "source": "https://ctext.org/sanguozhi/17",
    "sources": [
      {
        "title": "三国志·张辽传",
        "url": "https://ctext.org/sanguozhi/17"
      },
      {
        "title": "三国志11·合肥决战资料",
        "url": "https://w.atwiki.jp/sangokushi11/pages/2173.html"
      },
      {
        "title": "三国志12·合肥军师制霸资料",
        "url": "https://sangokushi.grappli.net/sangokushi12/gunshiseiha/gappi/"
      }
    ],
    "designNote": "三将守城：将七千对十万的差距压缩为游戏兵力，十余日围攻压缩为守住七天，守军不设曹操来援。孙军在一天、四天后遭突袭；陈武部队被消灭后江东后军接应。不复制11代直接削减敌军的事件。",
    "expectedWinner": 0,
    "numericalSide": 1,
    "draft": {
      "mapId": "hefei",
      "terrain": "river",
      "battleKind": "defense",
      "limit": 360,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198215,
      "ownTeam": [
        {
          "id": "liao",
          "type": "cavalry",
          "troops": 9000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-610",
          "type": "crossbow",
          "troops": 8000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-70",
          "type": "spear",
          "troops": 8000,
          "level": 10,
          "retreatAt": null,
          "first": true
        }
      ],
      "enemyTeam": [
        {
          "id": "person-368",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-662",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-119",
          "type": "halberd",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-652",
          "type": "cavalry",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-268",
          "type": "archer",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-525",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-335",
          "type": "spear",
          "troops": 2500,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-459",
          "type": "halberd",
          "troops": 2500,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-295",
          "type": "crossbow",
          "troops": 2500,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-243",
          "type": "halberd",
          "troops": 2500,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "ownTeamRoles": {
        "leader": "liao",
        "advisor": "person-610",

      },
      "enemyTeamRoles": {
        "leader": "person-368",
        "advisor": "person-662",

      },
      "reinforcements": [
        {
          "side": 1,
          "name": "江东围城军",
          "tick": 48,
          "team": [
            {
              "id": "person-93",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-660",
              "type": "crossbow",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-382",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-252",
              "type": "halberd",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-467",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-470",
              "type": "crossbow",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-93",
            "advisor": "person-660",

          }
        },
        {
          "side": 1,
          "name": "江东接应后军",
          "arrivalCondition": {
            "type": "unit-defeated",
            "unitId": "person-459"
          },
          "team": [
            {
              "id": "person-375",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-247",
              "type": "halberd",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-370",
              "type": "cavalry",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-595",
              "type": "crossbow",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-375",
            "advisor": "person-595",

          }
        }
      ],
      "gateHp": 26000,
      "holdUntil": 168,
      "events": [
        {
          "kind": "ambush",
          "side": 1,
          "tick": 24,
          "duration": 24
        },
        {
          "kind": "ambush",
          "side": 1,
          "tick": 96,
          "duration": 24
        }
      ]
    }
  },
  {
    "id": "yiling",
    "name": "夷陵之战",
    "year": 222,
    "ownName": "陆逊军",
    "enemyName": "刘备军",
    "source": "https://ctext.org/sanguozhi/58",
    "sources": [
      {
        "title": "三国志·陆逊传",
        "url": "https://ctext.org/sanguozhi/58"
      },
      {
        "title": "三国志·黄权传",
        "url": "https://ctext.org/sanguozhi/43"
      },
      {
        "title": "三国志11·夷陵决战资料",
        "url": "https://w.atwiki.jp/sangokushi11/pages/2165.html"
      }
    ],
    "designNote": "猇亭主战与后段接应：刘军两天后遭突袭、四天后断粮；冯习部队被消灭后接应军投入，孙桓部队被消灭后黄权部队按现有援军条件抵达。赵云接应是战役后段的抽象。使用蜀将张南，不混入同名曹将或已死蒋钦、程普。",
    "expectedWinner": 0,
    "numericalSide": 1,
    "draft": {
      "mapId": "yiling",
      "terrain": "forest",
      "battleKind": "field",
      "limit": 480,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198222,
      "ownTeam": [
        {
          "id": "person-603",
          "type": "archer",
          "troops": 9000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-251",
          "type": "archer",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-117",
          "type": "spear",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-525",
          "type": "halberd",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-360",
          "type": "spear",
          "troops": 6000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-295",
          "type": "crossbow",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        }
      ],
      "enemyTeam": [
        {
          "id": "person-636",
          "type": "spear",
          "troops": 5000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-537",
          "type": "spear",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-430",
          "type": "halberd",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-237",
          "type": "archer",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-210",
          "type": "cavalry",
          "troops": 4000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-520",
          "type": "crossbow",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-542",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-453",
          "type": "halberd",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-273",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-646",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "ownTeamRoles": {
        "leader": "person-603",
        "advisor": "person-603",

      },
      "enemyTeamRoles": {
        "leader": "person-636",
        "advisor": "person-520",

      },
      "reinforcements": [
        {
          "side": 1,
          "name": "秭归接应军",
          "arrivalCondition": {
            "type": "unit-defeated",
            "unitId": "person-537"
          },
          "team": [
            {
              "id": "person-396",
              "type": "cavalry",
              "troops": 8000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-457",
              "type": "spear",
              "troops": 5000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-163",
              "type": "archer",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-46",
              "type": "halberd",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-439",
              "type": "spear",
              "troops": 4000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-396",
            "advisor": "person-163",

          }
        },
        {
          "side": 1,
          "name": "黄权江北军",
          "arrivalCondition": {
            "type": "unit-defeated",
            "unitId": "person-360"
          },
          "team": [
            {
              "id": "person-167",
              "type": "crossbow",
              "troops": 6000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-167",
            "advisor": "person-167",

          }
        }
      ],
      "events": [
        {
          "kind": "ambush",
          "side": 1,
          "tick": 48,
          "duration": 24
        },
        {
          "kind": "supply-cut",
          "side": 1,
          "tick": 96,
          "duration": 192
        }
      ]
    }
  },
  {
    "id": "wuzhang",
    "name": "五丈原之战",
    "year": 234,
    "ownName": "蜀军",
    "enemyName": "魏军",
    "source": "https://ctext.org/sanguozhi/35",
    "sources": [
      {
        "title": "三国志·诸葛亮传",
        "url": "https://ctext.org/sanguozhi/35"
      },
      {
        "title": "三国志11·五丈原决战资料",
        "url": "https://w.atwiki.jp/sangokushi11/pages/2166.html"
      }
    ],
    "designNote": "渭南对峙的局部交锋：双方兵力、队数、轮换后阵及到达日相同。移除已死李恢和人物库中的牛金，不将其他战场守将满宠放入本阵；保留用户确认的均势，不复制11代诸葛亮病逝事件。",
    "expectedWinner": null,
    "numericalSide": null,
    "draft": {
      "mapId": "wuzhang",
      "terrain": "hill",
      "battleKind": "field",
      "limit": 480,
      "shieldPercent": 0,
      "waves": [],
      "seed": 198234,
      "ownTeam": [
        {
          "id": "person-290",
          "type": "crossbow",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-125",
          "type": "spear",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-137",
          "type": "cavalry",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-46",
          "type": "halberd",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-576",
          "type": "crossbow",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-513",
          "type": "cavalry",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-439",
          "type": "halberd",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-408",
          "type": "spear",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-163",
          "type": "archer",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-646",
          "type": "spear",
          "troops": 4200,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "enemyTeam": [
        {
          "id": "person-226",
          "type": "crossbow",
          "troops": 6500,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-77",
          "type": "spear",
          "troops": 6500,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-305",
          "type": "crossbow",
          "troops": 6500,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-308",
          "type": "cavalry",
          "troops": 6500,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-385",
          "type": "halberd",
          "troops": 2600,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-87",
          "type": "spear",
          "troops": 2600,
          "level": 10,
          "retreatAt": null,
          "first": true
        },
        {
          "id": "person-392",
          "type": "cavalry",
          "troops": 2600,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-82",
          "type": "crossbow",
          "troops": 2600,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-205",
          "type": "halberd",
          "troops": 2600,
          "level": 10,
          "retreatAt": null,
          "first": false
        },
        {
          "id": "person-81",
          "type": "spear",
          "troops": 3000,
          "level": 10,
          "retreatAt": null,
          "first": false
        }
      ],
      "ownTeamRoles": {
        "leader": "person-290",
        "advisor": "person-290",

      },
      "enemyTeamRoles": {
        "leader": "person-226",
        "advisor": "person-305",

      },
      "reinforcements": [
        {
          "side": 0,
          "name": "蜀军轮换后阵",
          "tick": 72,
          "team": [
            {
              "id": "person-529",
              "type": "crossbow",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-210",
              "type": "halberd",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-487",
              "type": "crossbow",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-200",
              "type": "spear",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-529",
            "advisor": "person-529",

          }
        },
        {
          "side": 1,
          "name": "魏军轮换后阵",
          "tick": 72,
          "team": [
            {
              "id": "person-78",
              "type": "halberd",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-455",
              "type": "spear",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-27",
              "type": "crossbow",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            },
            {
              "id": "person-43",
              "type": "cavalry",
              "troops": 3000,
              "level": 10,
              "retreatAt": null,
              "first": true
            }
          ],
          "roles": {
            "leader": "person-455",
            "advisor": "person-27",

          }
        }
      ]
    }
  }
];
