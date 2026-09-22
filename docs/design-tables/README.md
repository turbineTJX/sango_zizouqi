# 设计表入口

机制与能力设计请先读[当前规则总览](../README.md)和[能力设计指南](../能力设计指南.md)。

可编辑设计底稿目录已建立，见[待接入设计表目录](待接入设计表目录.md)。经济收入、容量及自动内政用人数值现已接入 `economy-rules.mjs`，见[经济规则一览表](经济规则一览表.md)。现有配置已填入，可逐表继续设计；标为待接入的表尚未改变游戏行为。


游戏内容以项目内数据文件为正式设计源，按表逐项讨论、修改和验证。Markdown 一览表由数据文件生成，供核阅，不作为第二份手工维护的数据。

| 一览表 | 正式设计源 | 当前范围 |
| --- | --- | --- |
| [特技一览表](特技一览表.md) | [traits.mjs](../../data/design/traits.mjs) | 94项；含部队、军团、内政、人才、行旅特性 |
| [战法一览表](战法一览表.md) | [tactics.mjs](../../data/design/tactics.mjs) | 75项效果定义；标明当前携带兵种／16名将专属／未配置效果库，以及门槛、冷却、次数和效果参数 |
| [军略一览表](军略一览表.md) | [stratagems.mjs](../../data/design/stratagems.mjs) | 20项；效果、持续时间、普通／专属池、专属来源 |
| [兵种一览表](兵种一览表.md) | [troops.mjs](../../data/design/troops.mjs) | 9种；基础属性、攻城系数、克制 |
| [武将一览表](武将一览表.md) | [officers.mjs](../../data/design/officers.mjs) | 832名；五维、适性、身份、关系、默认部队资料 |
| [城市一览表](城市一览表.md) | [cities.mjs](../../data/design/cities.mjs) | 全国87据点及入门地图9据点；两个数据集分开 |
| [能力分配一览表](能力分配一览表.md) | [assignments.mjs](../../data/design/assignments.mjs) | 武将的特技／军略／专属战法，以及各兵种固定三项普通战法 |
| [内政动作库](内政动作一览表.md) | [domestic-actions.mjs](../../data/design/domestic-actions.mjs) | 各方向41项动作；9项建设动作引用建筑表 |
| [城市建筑](建筑一览表.md) | [buildings.mjs](../../data/design/buildings.mjs) | 9种；名称、方向、费用、工期 |
| [大地图道路](大地图道路一览表.md) | [roads.mjs](../../data/design/roads.mjs) | 全国187条、入门16条连接；含实际野外路口 |
| [移动规则](移动规则一览表.md) | [movement-rules.mjs](../../data/design/movement-rules.mjs) | 道路代价、军团及人才运输移动参数 |
| 内部设计备注 | [notes.mjs](../../data/design/notes.mjs) | 稀有度、设计定位、理由、后续待办；不被游戏导入 |
| [战役预设](战役预设一览表.md) | [battles.mjs](../../data/design/battles.mjs) | 20个预设，全部通过自定义战役生成器校验和创建 |
| [战斗验证对照](战斗验证对照表.md) | [battle-validation.mjs](../../data/design/battle-validation.mjs) | 同预算对照、固定开发与独立验证种子 |

军团特技另有[筛选一览表](军团特技一览表.md)，与总表、分配表使用同一数据源。

设计表中“待接入”表示当前仍在维护的底稿，尚未改变运行行为，不能当作已经生效的机制。

## 修改流程

1. 先讨论一张表中的具体条目与目标，再修改正式设计源。ID用于跨表关联，姓名和名称不是关联键。
2. 改名称、描述、已接入参数或能力分配后，运行 `npm run design:check`。错误定位到表、ID和字段。
3. 运行 `npm run design:export` 更新全部一览表，运行 `npm run design:verify` 检查一览表与数据一致。
4. 运行 `npm run test:design` 和受影响机制的行为回归。使用现有的存档规则：机制或有效数据变更时更新规则版本，不做旧档迁移。
5. 主程序直接导入 `.mjs` 设计文件，无需手工复制回引擎，也无需从 Markdown 导入。已打开的页面须重新加载；发布更新时同时更新离线缓存版本。

## 数据与机制的边界

- 兵种基础数值、武将属性与当前兵种适性、军团特技参数、本人事务特性参数、名将部队特性 `personal` 参数、战法已支持参数、军略已支持参数及能力分配由表提供。
- 战法表保存最终战斗参数；加载时只计算说明和派生描述，不再另跑隐藏的门槛、冷却、次数调整。`threshold` 与 `learningTier` 独立，不能以战意门槛重新推测学习等级。
- 名称、描述是文案，不会执行。部分既有基础特技、战法的具体效果仍由引擎按ID或 `effect` 判定；只改文字不会改变伤害或控制机制。设计新机制时，先实现对应处理器，再登记 `schema.mjs`，最后写表并做行为回归。
- 各表引用和已支持字段、效果由 [design-catalog.mjs](../../design-catalog.mjs) 校验；引擎启动时同样校验，未知字段和无效引用不会被静默忽略。
- 武将原始来源文件与全国地图原始文件仅保留资料、港口附属、剧本来源等信息。修改来源数据不会自动覆盖已经确认的设计表。
- 城市表是据点定义；剧本开局归属、初始资源、人才分布、道路连接、建筑费用工期和内政动作条目已独立成表；经济产出、建筑效果、动作条件与自动选事权重等仍在对应模块，具体待补范围见设计表补全清单。
- 内部的高级／稀有分类和设计理由放在 `notes.mjs`；玩家界面只提供名称、效果及必要的使用条件，不导入设计备注。

## 字段约定

| 表 | 主要字段及含义 |
| --- | --- |
| 特技 | `domain` 生效领域；`scope` 作用范围；`role` 指挥任职；`stats` 军团属性增幅；`kinds/direction/value` 适用事务；`quantity/chance/recruitDiscount` 事务加成；`effects` 太守等内政效果；`personal` 名将部队特性触发条件和属性增幅 |
| 战法 | `effect` 已实现处理器；`category` 威力来源；`threshold` 战意门槛；`intentCost` 消耗；`cooldown` 独立冷却；`maxUses` 单队单项每场次数，光环0；`learningTier` 学习类别；`range/scale/targets` 等依具体处理器读取 |
| 军略 | `effect` 处理器；`duration` 持续步数；`baseStrength` 基础效果（未填沿用处理器基准）；`weights` 统率与智力权重；`pool/owner` 普通／专属及归属 |
| 兵种 | `attack/defense/discipline` 基础数值；`move` 移速；`interval` 普攻间隔；`range/minRange` 射程；`siegeFactor` 攻城系数；`beats` 克制兵种ID |
| 武将 | `leadership/force/intellect/politics/charm` 五维；`aptitudes` 当前兵种适性，0/1/2/3=C/B/A/S；`relations` 人物关系ID；`type/formation` 默认兵种／编制位置；`skill/trait` 原有武将展示文案，不额外产生能力 |
| 城市 | `id/sourceId` 游戏／来源标识；`name/kind/province/subtitle` 展示资料；`x/y` 地图坐标；`owner` 基础来源归属，剧本可覆盖；入门数据还包含初始 `garrison` |
| 分配 | `traits/stratagems` 固定能力ID数组；`specialTactic` 专属战法ID或null；兵种配置固定指定武技小战法、谋略小战法、大战法各一项 |

内政建设动作只保存 kind/value/stat/cooperation，其名称、方向、费用与工期通过 `domestic-designs.mjs` 读取建筑表，不重复维护。大地图道路是双向据点ID对，距离由坐标计算，路口与横向小路由正式路网定义；同一连接仅保留一条道路。

全部允许字段见 [schema.mjs](../../data/design/schema.mjs)。新增内政、建筑、道路与移动字段的检查见 [design-strategy-validation.mjs](../../design-strategy-validation.mjs)。参数不适用时保持缺省，勿把未知字段写入文案后误认为已经实现。
