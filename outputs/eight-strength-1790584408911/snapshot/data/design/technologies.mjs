export default {
  "schemaVersion": 1,
  "id": "technologies",
  "name": "科技与兵种解锁一览表",
  "integration": "runtime",
  "description": "据点独立研究并试制解锁兵种；枪兵、弓兵为初始基础技术。",
  "records": [
    {
      "id": "halberd",
      "name": "戟兵技术",
      "parameters": {
        "troopId": "halberd",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": "补齐各科技机会条件与试制成功率；试制费用工期引用内政动作表"
    },
    {
      "id": "cavalry",
      "name": "骑兵技术",
      "parameters": {
        "troopId": "cavalry",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": "补齐各科技机会条件与试制成功率；试制费用工期引用内政动作表"
    },
    {
      "id": "crossbow",
      "name": "弩兵技术",
      "parameters": {
        "troopId": "crossbow",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": "补齐各科技机会条件与试制成功率；试制费用工期引用内政动作表"
    },
    {
      "id": "siege",
      "name": "投石技术",
      "parameters": {
        "troopId": "siege",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": "补齐各科技机会条件与试制成功率；试制费用工期引用内政动作表"
    },
    {
      "id": "ship",
      "name": "舰船技术",
      "parameters": {
        "troopId": "ship",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": true,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": "补齐各科技机会条件与试制成功率；试制费用工期引用内政动作表"
    },
    {
      "id": "ram",
      "name": "冲车技术",
      "parameters": {
        "troopId": "ram",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": ""
    },
    {
      "id": "tower",
      "name": "井栏技术",
      "parameters": {
        "troopId": "tower",
        "requiredProgress": 100,
        "requiresTrial": true,
        "waterRequired": false,
        "trialActionId": "trial"
      },
      "source": "domestic.mjs",
      "todo": ""
    }
  ]
};
