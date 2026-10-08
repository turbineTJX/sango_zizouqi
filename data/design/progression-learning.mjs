import {MERIT_RULES} from './progression.mjs';
// Current design reference; runtime source is recorded on each row.
export default {
  "schemaVersion": 1,
  "id": "progression-learning",
  "name": "功绩成长与固定战法一览表",
  "integration": "pending",
  "description": "现有实现的设计底稿；可独立修改，尚未替换主程序来源。内部分类与待办不进入游戏界面。",
  "records": [
    {
      "id": "merit",
      "name": "等级与功绩",
      "parameters": MERIT_RULES,
      "source": "data/design/progression.mjs",
      "todo": "双方共用实际贡献、失败扣罚、满级余额、降级与20%改仕折算；参数统一读取正式来源"
    },
    {
      "id": "C",
      "name": "C适性固定战法",
      "parameters": {
        "small": 1,
        "major": 0,
        "allLevels": true
      },
      "source": "tactic-learning.mjs",
      "todo": "固定配置已由运行模块实现；本表为同步设计说明"
    },
    {
      "id": "B",
      "name": "B适性固定战法",
      "parameters": {
        "small": 1,
        "major": 0,
        "allLevels": true
      },
      "source": "tactic-learning.mjs",
      "todo": "固定配置已由运行模块实现；本表为同步设计说明"
    },
    {
      "id": "A",
      "name": "A适性固定战法",
      "parameters": {
        "small": 1,
        "major": 1,
        "allLevels": true
      },
      "source": "tactic-learning.mjs",
      "todo": "固定配置已由运行模块实现；本表为同步设计说明"
    },
    {
      "id": "S",
      "name": "S适性固定战法",
      "parameters": {
        "small": 2,
        "major": 1,
        "allLevels": true
      },
      "source": "tactic-learning.mjs",
      "todo": "固定配置已由运行模块实现；本表为同步设计说明"
    },
    {
      "id": "selection",
      "name": "小战法选择",
      "parameters": {
        "first": [
          "force",
          "intellect"
        ],
        "second": [
          "leadership",
          "politics"
        ],
        "tieCharm": 50
      },
      "source": "tactic-learning.mjs",
      "todo": "两轮相同时，魅力≥50选谋略，否则武技"
    },
    {
      "id": "special",
      "name": "稀缺专属",
      "parameters": {
        "owners": 16,
        "allLevels": true,
        "allTroops": true,
        "extraSlot": true
      },
      "source": "data/design/assignments.mjs",
      "todo": "按已确认16人身份固定分配"
    }
  ]
};
