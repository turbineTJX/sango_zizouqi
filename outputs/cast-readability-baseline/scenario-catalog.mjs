import { HISTORICAL_CAMPAIGNS } from './historical-campaigns.mjs';
import { TACTICAL_CAMPAIGNS } from './tactical-campaigns.mjs';
// Historical battles and fictional fixtures share the current combat simulation.
export const SCENARIOS = [
 ...HISTORICAL_CAMPAIGNS,
 ...TACTICAL_CAMPAIGNS,
 {id:'terrain',name:'演武 · 因地制宜',kind:'野战',difficulty:'地形战法',terrain:'forest',description:'两翼林地利于伏弩与火攻，中央平地适合冲阵；高地利射击、湿地阻机动。布阵时可切换地形并重配战法，对比同一种子的实战效果。',own:6,enemy:6,ownTroops:3000,enemyTroops:3000,level:5,enemyLevel:5,waves:[],seed:521218,limit:240,goal:'利用地形布阵；查看战法记录中的增强、减弱及部队属性中的行军修正。'},
 {id:'eight-arms',name:'演武 · 诸兵协同',kind:'野战',difficulty:'新兵种',description:'枪戟稳阵，骑兵突击，后勤用奇门开路，兵器疫伤减疗，弓兵持续输出。双方同兵力同等级，从零战意开战。',own:6,enemy:6,ownTroops:3000,enemyTroops:3000,level:5,enemyLevel:5,waves:[],seed:521216,limit:240,goal:'观察衰咒、减疗、幻卫与开路的配合；可在开战前重配六选三。'},
 {id:'river',name:'演武 · 水陆交锋',kind:'水战',difficulty:'水陆协同',description:'双水道与中央桥梁；舰船沿水道作战，陆军只能走陆地和桥面。岸上火力可以攻击舰船，水陆共用六个上场名额。',own:6,enemy:6,ownTroops:3000,enemyTroops:3000,level:5,enemyLevel:5,waves:[],seed:521217,limit:240,goal:'舰船占据水道，配合岸上枪戟、后勤和兵器，比较突击与护航配装。'},
  {id:'breach',name:'演武 · 控阵突击',kind:'野战',difficulty:'ZOC 配合',description:'张飞控住前排，关羽以冲阵抓住缺口，黄忠远程策应。观察前排受控后骑兵抓住突破窗口；可换掉控制战法作对照。',own:3,enemy:3,ownTroops:3000,enemyTroops:3000,level:10,enemyLevel:10,waves:[],seed:521208,limit:240,officers:['person-433','person-99','person-186'],goal:'让骑兵在敌方前排仍存活时突入后阵；击溃全部敌军获胜。'},
  {id:'officer-lab',name:'群英 · 武将试炼',kind:'野战',difficulty:'自由选将',description:'在武将名录选 1～6 人参战；首位为主将，智力最高者为军师。所有武将都有成长技能，可自由配置兵种通用战法。',own:6,enemy:6,ownTroops:3000,enemyTroops:2500,level:10,enemyLevel:3,waves:[],seed:521207,limit:240,officers:['person-290','person-246','person-661','person-99','person-396','person-433'],goal:'击溃陪练敌军，查看实际属性与通用战法效果。'},

  { id: 'field', name: '官渡 · 正面交锋', kind: '野战', difficulty: '基准', description: '六队对六队，比较低战意叠层、高战意战法与军略的配合。', own: 6, enemy: 6, ownTroops: 2600, enemyTroops: 2500, level: 3, enemyLevel: 3, waves: [], seed: 521201, limit: 240, goal: '击溃敌军；日暮按剩余兵力比例判定。' },
  { id: 'outnumbered', name: '白马 · 精兵破围', kind: '野战', difficulty: '以少胜多', description: '四队精兵迎战十二队敌军，敌军另有六队预备。荀攸任军师，使用急救、远射与高阶被动维持战线。', own: 4, enemy: 12, ownTroops: 3000, enemyTroops: 1050, level: 10, enemyLevel: 1, waves: [{ count: 6, tick: 0 }], seed: 521202, limit: 360, goal: '以 12,000 人迎战 12,600 人，利用精兵与治疗击溃更多队伍。' },
  { id: 'reinforcements', name: '界桥 · 三路来援', kind: '野战', difficulty: '连续增援', description: '敌军六队首发，三批各四队援军先后抵达；测试断援、战意续航与预备队接防。', own: 8, enemy: 18, ownTroops: 3000, enemyTroops: 1500, level: 8, enemyLevel: 3, waves: [{ count: 4, tick: 25 }, { count: 4, tick: 55 }, { count: 4, tick: 85 }], seed: 521203, limit: 480, goal: '击溃全部十八队敌军；援军未到时不会提前判胜。' },
  { id: 'siege', name: '邺城 · 破门攻坚', kind: '攻城', difficulty: '城门攻坚', description: '守方半场有独立城门，首发守军自带护盾，另有两批无护盾援军。测试进攻路线与集火破门。', own: 8, enemy: 12, ownTroops: 3000, enemyTroops: 1800, level: 8, enemyLevel: 3, waves: [{ count: 3, tick: 35 }, { count: 3, tick: 70 }], seed: 521204, limit: 420, gateHp: 5000, goal: '城门耐久归零，守方立即败北；日暮沿用剩余兵力比例判定。' },
  { id: 'defense', name: '许昌 · 孤城拒敌', kind: '守城', difficulty: '多队攻城', description: '八队满编守军保护后方城门，敌军十八队分批来袭。于禁主将、荀攸军师提供恢复与接防护盾，首发另有开场护盾。', own: 8, enemy: 18, ownTroops: 3000, enemyTroops: 1300, level: 5, enemyLevel: 3, waves: [{ count: 6, tick: 30 }, { count: 6, tick: 65 }], seed: 521205, limit: 360, gateHp: 6500, goal: '保护城门并击溃攻城军；城门被击破立即失败。' },
  { id: 'rotation', name: '陈留 · 轮番鏖战', kind: '野战', difficulty: '预备轮换', description: '双方均有预备队，敌军十二队轮番接战；于禁主将、荀攸军师解锁接防护盾、急救与持续恢复。', own: 8, enemy: 12, ownTroops: 2600, enemyTroops: 1700, level: 5, enemyLevel: 5, waves: [{ count: 6, tick: 0 }], seed: 521206, limit: 360, goal: '击溃敌军；保留残部，比较轮换前后的伤亡。' },
];
