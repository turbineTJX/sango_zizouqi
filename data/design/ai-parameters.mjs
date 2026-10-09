// 可编辑设计底稿；不自动从引擎覆盖。接入状态见 integration。
export default {
  "schemaVersion": 1,
  "id": "ai-parameters",
  "name": "战略AI与任务评分一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "shared-recommendation",
      "name": "共用选将评分",
      "parameters": {
        "source": "officerRecommendation",
        "weights": null,
        "sharedWithPlayer": true
      },
      "source": "officer-recommendation.mjs",
      "todo": "按内政、编队、军团长、军师、运输等任务分别提取权重"
    },
    {
      "id": "battle-boundary",
      "name": "固定阵容AI边界",
      "parameters": {
        "mayReorderDeployment": true,
        "mayChooseStratagem": true,
        "mayChooseTiming": true,
        "mayChangeTactics": false,
        "mayReorderTactics": false,
        "extraResources": false
      },
      "source": "battle-ai.mjs",
      "todo": "细化字段并接入对应处理器"
    },
    {
      "id": "strategic-policy",
      "name": "战略决策",
      "parameters": {
        "implementedSource": "data/design/economy-rules.mjs:ai.offensive + data/design/strategic-planning-rules.mjs",
        "targetWeights": null
      },
      "source": "strategic-ai.mjs",
      "todo": "君主倾向、研判、势力战略、有限准备预测和攻城任务已接入正式来源；后续校准战损预测并验证长期战略效果"
    }
  ]
};
