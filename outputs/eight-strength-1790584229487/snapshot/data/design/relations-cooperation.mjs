// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "relations-cooperation",
  "name": "关系相性与协作一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "disliked",
      "name": "厌恶",
      "parameters": {
        "label": "厌恶",
        "base": 20,
        "min": 0,
        "max": 20
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "distant",
      "name": "疏远",
      "parameters": {
        "label": "疏远",
        "base": 30,
        "min": 21,
        "max": 39
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "ordinary",
      "name": "普通",
      "parameters": {
        "label": "普通",
        "base": 50,
        "min": 40,
        "max": 59
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "friendly",
      "name": "友好",
      "parameters": {
        "label": "友好",
        "base": 65,
        "min": 60,
        "max": 69
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "liked",
      "name": "亲爱",
      "parameters": {
        "label": "亲爱",
        "base": 70,
        "min": 70,
        "max": 79
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "parent",
      "name": "父母子女",
      "parameters": {
        "label": "父母子女",
        "base": 75,
        "min": 75,
        "max": 90
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "spouse",
      "name": "夫妻",
      "parameters": {
        "label": "夫妻",
        "base": 80,
        "min": 80,
        "max": 95
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "sworn",
      "name": "义兄弟",
      "parameters": {
        "label": "义兄弟",
        "base": 80,
        "min": 80,
        "max": 100
      },
      "source": "relationships.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "compatibility",
      "name": "相性分段",
      "parameters": {
        "circle": 150,
        "bands": [
          {
            "maxDistance": 10,
            "modifier": 8,
            "growth": 3
          },
          {
            "maxDistance": 25,
            "modifier": 4,
            "growth": 2
          },
          {
            "maxDistance": 45,
            "modifier": 0,
            "growth": 2
          },
          {
            "maxDistance": 60,
            "modifier": -4,
            "growth": 1
          },
          {
            "maxDistance": 75,
            "modifier": -8,
            "growth": 1
          }
        ]
      },
      "source": "domestic-cooperation.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "cooperation",
      "name": "协作",
      "parameters": {
        "chance": "clamp(20+0.4*(relationship-50)+2*modifier+mediatorBonus,5,65)/100",
        "mediatorBonus": 10,
        "quantityGain": "0.1+0.15*stat/100",
        "chanceGain": "0.03+0.05*stat/100",
        "pairGrowthPerTurn": 1
      },
      "source": "domestic-cooperation.mjs",
      "todo": "细化字段并接入对应处理器"
    }
  ]
};
