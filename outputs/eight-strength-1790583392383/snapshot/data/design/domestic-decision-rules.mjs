// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "domestic-decision-rules",
  "name": "内政自动选事规则一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "build_commerce",
      "name": "发展商业",
      "parameters": {
        "actionId": "build_commerce",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_farm",
      "name": "开垦农田",
      "parameters": {
        "actionId": "build_farm",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_granary",
      "name": "扩建粮仓",
      "parameters": {
        "actionId": "build_granary",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_workshop",
      "name": "建设工坊",
      "parameters": {
        "actionId": "build_workshop",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_barracks",
      "name": "修建兵营",
      "parameters": {
        "actionId": "build_barracks",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_clinic",
      "name": "建设医馆",
      "parameters": {
        "actionId": "build_clinic",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_drill",
      "name": "建设校场",
      "parameters": {
        "actionId": "build_drill",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_walls",
      "name": "加固城防",
      "parameters": {
        "actionId": "build_walls",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "build_hall",
      "name": "建设招贤馆",
      "parameters": {
        "actionId": "build_hall",
        "handler": "build",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "fair",
      "name": "举办集市",
      "parameters": {
        "actionId": "fair",
        "handler": "cash",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "merchants",
      "name": "招徕商旅",
      "parameters": {
        "actionId": "merchants",
        "handler": "effect",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "partnership",
      "name": "招商合作",
      "parameters": {
        "actionId": "partnership",
        "handler": "discount",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "sell",
      "name": "出售余粮",
      "parameters": {
        "actionId": "sell",
        "handler": "trade",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "tax",
      "name": "整顿税务",
      "parameters": {
        "actionId": "tax",
        "handler": "effect",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "cultivate",
      "name": "督耕",
      "parameters": {
        "actionId": "cultivate",
        "handler": "grain",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "irrigate",
      "name": "修整灌溉",
      "parameters": {
        "actionId": "irrigate",
        "handler": "effect",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "buy",
      "name": "购粮",
      "parameters": {
        "actionId": "buy",
        "handler": "trade",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "harvest",
      "name": "抢收保粮",
      "parameters": {
        "actionId": "harvest",
        "handler": "rescue",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "store",
      "name": "整理仓储",
      "parameters": {
        "actionId": "store",
        "handler": "rescue",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "research",
      "name": "常规研制",
      "parameters": {
        "actionId": "research",
        "handler": "research",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "breakthrough",
      "name": "集中攻关",
      "parameters": {
        "actionId": "breakthrough",
        "handler": "research",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "craftsmen",
      "name": "寻访工匠",
      "parameters": {
        "actionId": "craftsmen",
        "handler": "research",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "master",
      "name": "聘请名匠",
      "parameters": {
        "actionId": "master",
        "handler": "research",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "imitate",
      "name": "仿制改良",
      "parameters": {
        "actionId": "imitate",
        "handler": "research",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "trial",
      "name": "试制验证",
      "parameters": {
        "actionId": "trial",
        "handler": "trial",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "recruit",
      "name": "常规征兵",
      "parameters": {
        "actionId": "recruit",
        "handler": "recruit",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "urgent",
      "name": "加急征兵",
      "parameters": {
        "actionId": "urgent",
        "handler": "recruit",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "heal",
      "name": "集中救治",
      "parameters": {
        "actionId": "heal",
        "handler": "heal",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "recover",
      "name": "精心疗养",
      "parameters": {
        "actionId": "recover",
        "handler": "heal",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "repair",
      "name": "常规修缮",
      "parameters": {
        "actionId": "repair",
        "handler": "repair",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "rush",
      "name": "紧急抢修",
      "parameters": {
        "actionId": "rush",
        "handler": "repair",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "labor",
      "name": "征集工匠",
      "parameters": {
        "actionId": "labor",
        "handler": "discount",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "inspect",
      "name": "检查整固",
      "parameters": {
        "actionId": "inspect",
        "handler": "repair",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "exercise",
      "name": "守城操演",
      "parameters": {
        "actionId": "exercise",
        "handler": "prepare",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "mobilize",
      "name": "战前动员",
      "parameters": {
        "actionId": "mobilize",
        "handler": "prepare",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "fortify",
      "name": "布置守备",
      "parameters": {
        "actionId": "fortify",
        "handler": "prepare",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "patrol",
      "name": "城防巡查",
      "parameters": {
        "actionId": "patrol",
        "handler": "prepare",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "explore",
      "name": "探索未知人才",
      "parameters": {
        "actionId": "explore",
        "handler": "explore",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "hire",
      "name": "登用在野人才",
      "parameters": {
        "actionId": "hire",
        "handler": "hire",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "persuade",
      "name": "劝说周边人才",
      "parameters": {
        "actionId": "persuade",
        "handler": "persuade",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    },
    {
      "id": "reassure",
      "name": "安抚本城人才",
      "parameters": {
        "actionId": "reassure",
        "handler": "reassure",
        "conditions": null,
        "score": null,
        "successFormula": null,
        "interruption": "沿用立即执行／完成当前事务后执行与返程规则"
      },
      "source": "domestic.mjs",
      "todo": "逐动作提取前置条件、需求评分、成功率和失败结算；null表示尚未提取，绝非无限制或零概率"
    }
  ]
};
