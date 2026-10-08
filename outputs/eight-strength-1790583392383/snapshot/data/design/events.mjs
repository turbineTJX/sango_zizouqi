// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "events",
  "name": "内政机会与事件一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "master",
      "name": "名匠",
      "parameters": {
        "randomInterval": [
          0,
          0.1
        ],
        "expiresAfterDays": 19,
        "duplicateKindAllowed": false
      },
      "source": "domestic.mjs",
      "todo": "区间边界以处理器为准"
    },
    {
      "id": "disaster",
      "name": "灾损",
      "parameters": {
        "randomInterval": [
          0.1,
          0.18
        ],
        "expiresAfterDays": 19,
        "grainRatio": 0.08,
        "maximumLoss": 600
      },
      "source": "domestic.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "mold",
      "name": "霉变",
      "parameters": {
        "randomInterval": [
          0.18,
          0.28
        ],
        "expiresAfterDays": 19,
        "grainRatio": 0.08,
        "maximumLoss": 600
      },
      "source": "domestic.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "capture",
      "name": "缴获",
      "parameters": {
        "trigger": "战后机会",
        "probability": null,
        "duration": null
      },
      "source": "domestic.mjs",
      "todo": "核对战后产生条件、有效期与可用技术；未知值未填"
    }
  ]
};
