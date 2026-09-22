# 战略AI与任务评分一览表

数据源：`data/design/ai-parameters.mjs`。本页由 `npm run design:export` 生成，请修改数据源后重新生成。内部分类与设计备注不进入游戏界面。

**接入状态：设计底稿，待接入主程序。** 修改本表暂不改变游戏行为。空值表示待设计，不表示零、禁用或无限制。

| ID | 条目 | 现有配置／待填字段 | 当前实现来源 | 后续工作 |
| --- | --- | --- | --- | --- |
| shared-recommendation | 共用选将评分 | source：officerRecommendation；weights：待完善；sharedWithPlayer：true | officer-recommendation.mjs | 按内政、编队、军团长、军师、运输等任务分别提取权重 |
| battle-boundary | 固定阵容AI边界 | mayReorderDeployment：true；mayChooseStratagem：true；mayChooseTiming：true；mayChangeTactics：false；mayReorderTactics：false；extraResources：false | battle-ai.mjs | 细化字段并接入对应处理器 |
| strategic-policy | 战略决策 | attackRatio：待完善；foodDays：待完善；targetWeights：待完善 | strategic-campaign.mjs | 当前战略AI模块正在改动；参数暂留空，避免固化过期配置 |
