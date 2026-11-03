# 战法设计局部 A/B

用于2026-11-02用户授权的基础战法与组合强化对照。通过正式生成器与真实战斗引擎运行，不接入普通游戏菜单，不自动采用。

在项目根目录运行，输出必须是新的 `.local` 子目录：

```powershell
node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=init
node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=mechanisms
node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=development
node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=validation
node scripts/battle-design-ab/run.mjs --out=.local/<new-id> --stage=report
```

`init`先冻结实际工作区并封存协议，再建立实验来源。只有实验副本的战法数据、两个窄范围处理分支及普通魔免来源校验有变化；两个比较臂使用同一公共引擎。每个配置由独立进程加载，不在同一模块缓存里反复改效果。已存在的任务输出不会被覆盖，失败需保留并在新登记中修复。

`protocol.mjs`登记三组方案、数值初值、阵容、地图、开发／验证种子、双方布局、预算与观察指标。所有名单、人物、适性、资源、共同军略和羁绊保持；存档副本只检查确定性，不计作新对局。没有综合趣味分或自动通过门槛。全国节奏、完整平衡和真人感受另行评价。

`review.mjs`包含本轮人工复核的解释，绑定本轮实验来源指纹。它可以为本轮生成报告与同步示意回放，不能直接将解释套给后续实验。

本轮正式证据位于 `.local/battle-design-ab-20261102-04`；01至03保留接入失败，不混入正式统计。`.local`是本机实验产物，不应暂存上传。
