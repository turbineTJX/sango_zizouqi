// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "supply-rules",
  "name": "后勤与补给一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "range",
      "name": "补给范围",
      "parameters": {
        "range": 180,
        "distanceDivisor": 90
      },
      "source": "strategic-campaign.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "dispatch",
      "name": "粮仓发送能力",
      "parameters": {
        "minimum": 30,
        "base": 240,
        "perGranary": 120,
        "formula": "max(30,floor((240+granary*120)/(1+distance/90)))"
      },
      "source": "strategic-campaign.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "hunger",
      "name": "缺粮战斗惩罚",
      "parameters": {
        "thresholds": [
          {
            "minimum": 3,
            "inclusive": true,
            "penalty": 0.35
          },
          {
            "minimum": 1,
            "inclusive": true,
            "penalty": 0.2
          },
          {
            "minimum": 0,
            "inclusive": false,
            "penalty": 0.1
          }
        ]
      },
      "source": "strategic-campaign.mjs",
      "todo": "补齐每日耗粮、减员与恢复；大地图减速仍引用 movement-rules"
    }
  ]
};
