// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "formation-deployment",
  "name": "编制军团与出阵一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "unit",
      "name": "单队编制",
      "parameters": {
        "minimumTroops": 1000,
        "capacity": "floor((3000+leadership*50+(level-1)*200)/100)*100"
      },
      "source": "troop-capacity.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "army",
      "name": "军团与出阵",
      "parameters": {
        "maximumUnits": 10,
        "maximumActiveUnits": 6,
        "roles": [
          "leader",
          "advisor"
        ],
        "cityPersistentArmy": false
      },
      "source": "strategic-campaign.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "reinforcements",
      "name": "援军与补位",
      "parameters": {
        "arrival": "沿用场景到达时刻",
        "fill": "仅空位产生时合法补位",
        "playerOrder": "既定队列",
        "enemyOrder": "规则41择序"
      },
      "source": "engine.mjs",
      "todo": "细化字段并接入对应处理器"
    }
  ]
};
