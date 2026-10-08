// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "talent-rules",
  "name": "人才招揽与任职一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "lifecycle",
      "name": "出仕与求仕",
      "parameters": {
        "adultAge": 16,
        "seekDays": 180,
        "graceDays": 90,
        "standardSoldiers": 6000
      },
      "source": "talent-core.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "project",
      "name": "招揽进度",
      "parameters": {
        "base": 80,
        "qualityThreshold": 70,
        "perQuality": 2,
        "persuadeExtra": 40,
        "progressByFactor": [
          {
            "condition": ">1",
            "progress": 20
          },
          {
            "condition": "=1",
            "progress": 12
          },
          {
            "condition": ">0",
            "progress": 6
          },
          {
            "condition": "其他",
            "progress": 0
          }
        ]
      },
      "source": "talent-core.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "eligibility",
      "name": "任职与外出",
      "parameters": {
        "residentRequired": true,
        "preformedUnitBlocksDomestic": false,
        "returnBeforeReassignment": true
      },
      "source": "city-personnel.mjs",
      "todo": "补齐冷却、并行名额、忠诚与义理判定"
    }
  ]
};
