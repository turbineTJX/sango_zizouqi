// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "building-effects",
  "name": "建筑效果一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "commerce",
      "name": "市场",
      "parameters": {
        "description": "每级增加100金／旬",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "farm",
      "name": "农田",
      "parameters": {
        "description": "每级增加770粮／旬",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "granary",
      "name": "粮仓",
      "parameters": {
        "description": "库容+10000、每日发送能力+120",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "workshop",
      "name": "工坊",
      "parameters": {
        "description": "每级提高每日研发效率",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "barracks",
      "name": "兵营",
      "parameters": {
        "description": "预备兵收入+294／旬、征募额度+1000",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "clinic",
      "name": "医馆",
      "parameters": {
        "description": "每级每队每日额外恢复6名真实伤兵",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "drill",
      "name": "校场",
      "parameters": {
        "description": "每级守城首发战意+3，最高15",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "walls",
      "name": "城防工事",
      "parameters": {
        "description": "耐久上限+3000、守城首发护盾比例+2%",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    },
    {
      "id": "hall",
      "name": "招贤馆",
      "parameters": {
        "description": "每级提高探索、登用成功把握",
        "maximumLevel": 5
      },
      "source": "strategic-campaign.mjs",
      "todo": "将说明拆成有单位的效果系数，逐项核对实际结算；费用和工期仍引用建筑表"
    }
  ]
};
