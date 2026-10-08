// Authoritative design data. Edit here; no generated overview edits.
export const DOMESTIC_OUTCOME_RULES=Object.freeze({baseChance:.48,abilityFactor:.004,minChance:.12,maxChance:.94,criticalShare:.15,partialChance:.15,partialCeiling:.98,partialFactor:.45,criticalFactor:1.2});
export const DOMESTIC_DIRECTIONS = {
  "commerce": "商业",
  "agriculture": "农业",
  "military": "军务",
  "martial": "武备",
  "technology": "技术",
  "talent": "人才"
};

export const DOMESTIC_DIRECTION_STATS = {
  "commerce": "politics",
  "agriculture": "politics",
  "military": "leadership",
  "martial": "force",
  "technology": "intellect",
  "talent": "charm"
};

export const DOMESTIC_ACTION_DESIGNS = {
  build_arrowTower:{kind:'build',value:'arrowTower',stat:'leadership',cooperation:'progress'},
  build_musicStage:{kind:'build',value:'musicStage',stat:'force',cooperation:'progress'},
  build_aidCamp:{kind:'build',value:'aidCamp',stat:'intellect',cooperation:'progress'},
  "build_commerce": {
    "kind": "build",
    "value": "commerce",
    "stat": "politics",
    "cooperation": "progress"
  },
  "build_farm": {
    "kind": "build",
    "value": "farm",
    "stat": "politics",
    "cooperation": "progress"
  },
  "build_granary": {
    "kind": "build",
    "value": "granary",
    "stat": "politics",
    "cooperation": "progress"
  },
  "build_workshop": {
    "kind": "build",
    "value": "workshop",
    "stat": "intellect",
    "cooperation": "progress"
  },
  "build_barracks": {
    "kind": "build",
    "value": "barracks",
    "stat": "leadership",
    "cooperation": "progress"
  },
  "build_clinic": {
    "kind": "build",
    "value": "clinic",
    "stat": "intellect",
    "cooperation": "progress"
  },
  "build_drill": {
    "kind": "build",
    "value": "drill",
    "stat": "force",
    "cooperation": "progress"
  },
  "build_walls": {
    "kind": "build",
    "value": "walls",
    "stat": "leadership",
    "cooperation": "progress"
  },
  "build_hall": {
    "kind": "build",
    "value": "hall",
    "stat": "charm",
    "cooperation": "progress"
  },
  "fair": {
    "name": "举办集市",
    "direction": "commerce",
    "cost": 0,
    "days": 10,
    "kind": "cash",
    "value": 200,
    "stat": "politics",
    "cooperation": "quantity"
  },
  "merchants": {
    "name": "招徕商旅",
    "direction": "commerce",
    "cost": 180,
    "days": 10,
    "kind": "effect",
    "value": "gold",
    "stat": "politics",
    "cooperation": "quantity",
    "power": 0.25
  },
  "partnership": {
    "name": "招商合作",
    "direction": "commerce",
    "cost": 120,
    "days": 10,
    "kind": "discount",
    "value": "commerce",
    "stat": "politics",
    "cooperation": "quantity"
  },
  "sell": {
    "name": "出售余粮",
    "direction": "commerce",
    "cost": 30,
    "days": 10,
    "kind": "trade",
    "value": "sell",
    "stat": "politics",
    "cooperation": "chance"
  },
  "tax": {
    "name": "整顿税务",
    "direction": "commerce",
    "cost": 100,
    "days": 10,
    "kind": "effect",
    "value": "gold",
    "stat": "politics",
    "cooperation": "quantity",
    "power": 0.15
  },
  "cultivate": {
    "name": "督耕",
    "direction": "agriculture",
    "cost": 0,
    "days": 10,
    "kind": "grain",
    "value": 1538,
    "stat": "politics",
    "cooperation": "quantity"
  },
  "irrigate": {
    "name": "修整灌溉",
    "direction": "agriculture",
    "cost": 200,
    "days": 10,
    "kind": "effect",
    "value": "grain",
    "stat": "politics",
    "cooperation": "quantity",
    "power": 0.3
  },
  "buy": {
    "name": "购粮",
    "direction": "agriculture",
    "cost": 330,
    "days": 10,
    "kind": "trade",
    "value": "buy",
    "stat": "politics",
    "cooperation": "chance"
  },
  "harvest": {
    "name": "抢收保粮",
    "direction": "agriculture",
    "cost": 100,
    "days": 5,
    "kind": "rescue",
    "value": "disaster",
    "stat": "politics",
    "cooperation": "chance"
  },
  "store": {
    "name": "整理仓储",
    "direction": "agriculture",
    "cost": 80,
    "days": 5,
    "kind": "rescue",
    "value": "mold",
    "stat": "politics",
    "cooperation": "chance"
  },
  "research": {
    "name": "常规研制",
    "direction": "technology",
    "cost": 180,
    "days": 10,
    "kind": "research",
    "value": 100,
    "stat": "intellect",
    "cooperation": "quantity"
  },
  "breakthrough": {
    "name": "集中攻关",
    "direction": "technology",
    "cost": 400,
    "days": 10,
    "kind": "research",
    "value": 135,
    "stat": "intellect",
    "cooperation": "quantity",
    "risk": 0.15
  },
  "craftsmen": {
    "name": "寻访工匠",
    "direction": "technology",
    "cost": 100,
    "days": 10,
    "kind": "research",
    "value": 110,
    "stat": "intellect",
    "cooperation": "quantity",
    "risk": 0.2
  },
  "master": {
    "name": "聘请名匠",
    "direction": "technology",
    "cost": 450,
    "days": 10,
    "kind": "research",
    "value": 150,
    "stat": "intellect",
    "cooperation": "quantity",
    "opportunity": "master"
  },
  "imitate": {
    "name": "仿制改良",
    "direction": "technology",
    "cost": 120,
    "days": 10,
    "kind": "research",
    "value": 125,
    "stat": "intellect",
    "cooperation": "quantity",
    "opportunity": "capture"
  },
  "recruit": {
    "name": "常规征兵",
    "direction": "military",
    "cost": 60,
    "days": 10,
    "kind": "recruit",
    "value": 1400,
    "reserveValue": 588,
    "stat": "leadership",
    "cooperation": "quantity"
  },
  "urgent": {
    "name": "加急征兵",
    "direction": "military",
    "cost": 160,
    "days": 5,
    "kind": "recruit",
    "value": 1800,
    "reserveValue": 900,
    "stat": "leadership",
    "cooperation": "quantity",
    "risk": 0.15
  },
  "heal": {
    "name": "集中救治",
    "direction": "technology",
    "cost": 30,
    "days": 5,
    "kind": "heal",
    "value": 430,
    "stat": "intellect",
    "cooperation": "quantity"
  },
  "recover": {
    "name": "精心疗养",
    "direction": "technology",
    "cost": 20,
    "days": 10,
    "kind": "heal",
    "value": 410,
    "stat": "intellect",
    "cooperation": "quantity"
  },
  "repair": {
    "name": "常规修缮",
    "direction": "military",
    "cost": 160,
    "days": 10,
    "kind": "repair",
    "value": 3000,
    "stat": "leadership",
    "cooperation": "quantity"
  },
  "rush": {
    "name": "紧急抢修",
    "direction": "military",
    "cost": 320,
    "days": 5,
    "kind": "repair",
    "value": 3000,
    "stat": "leadership",
    "cooperation": "quantity",
    "risk": 0.12
  },
  "labor": {
    "name": "征集工匠",
    "direction": "military",
    "cost": 100,
    "days": 10,
    "kind": "discount",
    "value": "military",
    "stat": "leadership",
    "cooperation": "quantity"
  },
  "inspect": {
    "name": "检查整固",
    "direction": "military",
    "cost": 60,
    "days": 5,
    "kind": "repair",
    "value": 1000,
    "stat": "leadership",
    "cooperation": "quantity"
  },
  "exercise": {
    "name": "守城操演",
    "direction": "martial",
    "cost": 120,
    "days": 10,
    "kind": "prepare",
    "value": "intent",
    "stat": "force",
    "cooperation": "quantity",
    "power": 12
  },
  "mobilize": {
    "name": "战前动员",
    "direction": "military",
    "cost": 220,
    "days": 5,
    "kind": "prepare",
    "value": "intent",
    "stat": "leadership",
    "cooperation": "quantity",
    "power": 12,
    "risk": 0.12
  },
  "fortify": {
    "name": "布置守备",
    "direction": "military",
    "cost": 180,
    "days": 10,
    "kind": "prepare",
    "value": "shield",
    "stat": "leadership",
    "cooperation": "quantity",
    "power": 0.1
  },
  "patrol": {
    "name": "城防巡查",
    "direction": "martial",
    "cost": 120,
    "days": 5,
    "kind": "prepare",
    "value": "shield",
    "stat": "force",
    "cooperation": "quantity",
    "power": 0.06
  },
  "explore": {
    "name": "探索未知人才",
    "direction": "technology",
    "cost": 100,
    "days": 10,
    "kind": "explore",
    "value": 0,
    "stat": "intellect",
    "cooperation": "chance"
  },
  "hire": {
    "name": "登用在野人才",
    "direction": "talent",
    "cost": 180,
    "days": 10,
    "kind": "hire",
    "value": 0,
    "stat": "charm",
    "cooperation": "chance",
    "risk": 0.15
  },
  "persuade": {
    "name": "劝说周边人才",
    "direction": "talent",
    "cost": 240,
    "days": 10,
    "kind": "persuade",
    "value": 0,
    "stat": "charm",
    "cooperation": "chance",
    "risk": 0.25
  },
  "reassure": {
    "name": "安抚本城人才",
    "direction": "talent",
    "cost": 120,
    "days": 10,
    "kind": "reassure",
    "value": 15,
    "stat": "charm",
    "cooperation": "chance"
  }
};
