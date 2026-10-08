// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "officer-fate-rules",
  "name": "人员战后去向与俘虏一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "loss",
      "name": "败军人员去向",
      "parameters": {
        "deathThreshold": 0.02,
        "captiveThreshold": 0.35,
        "usesSameRoll": true,
        "noPrison": "脱身",
        "noHomeWaitDays": 31
      },
      "source": "officer-fates.mjs",
      "todo": "有敌方且具关押处时：战死2%、被俘33%、脱身65%"
    },
    {
      "id": "ransom",
      "name": "赎金与返城",
      "parameters": {
        "base": 300,
        "perHighestStat": 5,
        "stats": [
          "leadership",
          "force",
          "intellect"
        ],
        "actualReturnJourney": true
      },
      "source": "officer-fates.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "transport",
      "name": "运输遇敌",
      "parameters": {
        "unitsLost": true,
        "cargoLost": true,
        "battle": false
      },
      "source": "personnel-movement.mjs",
      "todo": "核对运输人员逐人去向"
    }
  ]
};
