// Authoritative design data. Edit here; no generated overview edits.
export const BUILDING_DESIGNS = {
  "commerce": {
    "name": "市场",
    "direction": "commerce",
    "cost": 500,
    "days": 10,
    "description": "每级增加100金／旬",
    "projectName": "发展商业",
    "projectDescription": "每级增加 100 金／旬",
    "durability": 1000
  },
  "farm": {
    "name": "农田",
    "direction": "agriculture",
    "cost": 500,
    "days": 10,
    "description": "每级增加770粮／旬",
    "projectName": "开垦农田",
    "projectDescription": "每级增加 770 粮／旬",
    "durability": 1000
  },
  "granary": {
    "name": "粮仓",
    "direction": "agriculture",
    "cost": 500,
    "days": 10,
    "description": "库容+10000、每日发送能力+120",
    "projectName": "扩建粮仓",
    "projectDescription": "每级增加 10,000 库容及 120 日运输量",
    "durability": 1000
  },
  "workshop": {
    "name": "工坊",
    "direction": "technology",
    "cost": 700,
    "days": 20,
    "description": "每级提高每日研发效率",
    "projectName": "建设工坊",
    "projectDescription": "每级提高每日研发效率",
    "durability": 1000
  },
  "barracks": {
    "name": "兵营",
    "direction": "military",
    "cost": 500,
    "days": 10,
    "description": "预备兵收入+294／旬、征募额度+1000",
    "projectName": "修建兵营",
    "projectDescription": "每级增加 294 兵源／旬，提高整补额度",
    "durability": 1000
  },
  "clinic": {
    "name": "医馆",
    "direction": "technology",
    "cost": 500,
    "days": 10,
    "description": "每级每队每日额外恢复6名真实伤兵",
    "projectName": "建设医馆",
    "projectDescription": "每级每队每日额外恢复6名真实伤兵",
    "durability": 1000
  },
  "drill": {
    "name": "校场",
    "direction": "martial",
    "cost": 600,
    "days": 10,
    "description": "每级守城首发战意+3，最高15",
    "projectName": "建设校场",
    "projectDescription": "每级守城首发战意+3，最高15",
    "durability": 1000
  },
  "walls": {
    "name": "城防工事",
    "direction": "military",
    "cost": 700,
    "days": 20,
    "description": "耐久上限+3000、守城首发护盾比例+2%",
    "projectName": "加固城防",
    "projectDescription": "每级增加 3,000 城门耐久上限",
    "durability": 3000
  },
  "arrowTower": {
    name:'箭塔',direction:'military',cost:800,days:20,durability:1000,
    technology:'towerDefense',maximumLevel:3,
    description:'守备箭术解锁；射程4格，每4回合射击一支可见敌军，每级提高射击威力',
    projectName:'建造箭塔',projectDescription:'建成原址箭塔，提供战场射击支援',
    combat:{effect:'shoot',range:4,interval:4,power:180,powerPerLevel:60}
  },
  "musicStage": {
    name:'军乐台',direction:'martial',cost:600,days:10,durability:1000,
    technology:'militaryMusic',maximumLevel:3,
    description:'军乐鼓吹解锁；每6回合使3格内在场友军每级获得2战意，同类不叠加',
    projectName:'建造军乐台',projectDescription:'建成原址军乐台，持续鼓舞附近友军',
    combat:{effect:'intent',range:3,interval:6,intentPerLevel:2}
  },
  "aidCamp": {
    name:'救护营',direction:'technology',cost:700,days:10,durability:1000,
    technology:'battlefieldMedicine',maximumLevel:3,
    description:'战地救护解锁；每8回合救治3格内友军本场真实伤兵，每级至多为本队初始兵力的0.4%，同类不叠加',
    projectName:'建造救护营',projectDescription:'建成原址救护营，救治附近友军真实伤兵',
    combat:{effect:'heal',range:3,interval:8,healPerLevel:.004}
  },
  "hall": {
    "name": "招贤馆",
    "direction": "talent",
    "cost": 600,
    "days": 10,
    "description": "每级提高探索、登用成功把握",
    "projectName": "建设招贤馆",
    "projectDescription": "每级提高探索、登用成功把握",
    "durability": 1000
  }
};

// Research-built facilities use the same physical durability and repair records.
export const AUXILIARY_BUILDINGS = {watchtower:{name:'瞭望塔',durability:1000,direction:'military',cost:400,days:10}};
