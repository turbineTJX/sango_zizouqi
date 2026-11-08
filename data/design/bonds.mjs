// Authoritative shared bond designs.
export const BOND_DESIGNS = {
  "bondPower": {
    "name": "强攻",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "attack",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "attackPower",
    "specialValue": 0,
    "summary": "攻击提高8%／14%／20%。",
    "tradeoff": "稳定提高攻击，适合持续普攻；武技和谋略威力沿用各自属性。",
    "description": "强攻合计2／6／12点时，实际在场且已获得强攻的持有者攻击提高8%／14%／20%，只取最高档；离场或降档立即更新。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondArmor": {
    "name": "铁壁",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "defense",
    "values": [
      0.1,
      0.2,
      0.3
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "defenseArmor",
    "specialValue": 0,
    "summary": "防御提高10%／20%／30%。",
    "tradeoff": "提高实际防御，抵挡物理伤害；抵挡谋略伤害仍依靠军纪。",
    "description": "铁壁合计2／6／12点时，实际在场且已获得铁壁的持有者防御提高10%／20%／30%，只取最高档；离场或降档立即更新。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondHaste": {
    "name": "迅击",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "attackSpeed",
    "values": [
      0.04,
      0.07,
      0.1
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "rapidAttack",
    "specialValue": 0,
    "summary": "攻速提高4%／7%／10%。",
    "tradeoff": "不要求邻接，稳定缩短普攻间隔；聚势需要邻接但提供更高攻速。",
    "description": "迅击合计2／6／12点时，实际在场且已获得迅击的持有者攻速提高4%／7%／10%，实际普攻间隔分别除以1.04／1.07／1.10。只取最高档，不增加额外攻击，不缩短战法冷却或调息；离场或降档立即更新。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSpirit": {
    "name": "昂扬",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "intentIncome",
    "specialValue": 0,
    "incomeBonus": [
      0.5,
      1,
      1.5
    ],
    "summary": "普攻与受击战意获取提高50%／100%／150%。",
    "tradeoff": "加快持有者依靠实际交战获得战意，可与攻速及勇武配合。",
    "description": "昂扬合计2／6／12点时，实际在场且已获得昂扬的持有者普攻与受击战意获取提高50%／100%／150%，按最终收入四舍五入、最多100战意。一次分击或范围普攻仍只获得一份攻击收入，多段战法对同一目标仍只发一份受击收入；战歌、鼓舞、入场奖励等固定增益沿用原数值。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSuppress": {
    "name": "截气",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "hitIntentDeny",
    "specialValue": 0,
    "chance": [
      0.3,
      0.6,
      1
    ],
    "summary": "有效普攻有30%／60%／100%概率阻止该次受击战意。",
    "tradeoff": "压制敌方被击时的战意收入；敌方攻击收入和友军鼓舞仍正常。",
    "description": "截气合计2／6／12点时，实际在场持有者普攻造成真实兵力伤害且目标存活，有30%／60%／100%概率使目标不获得该次受击战意，满档必定生效。分击对各命中目标独立判定；不削减已有战意，不阻止目标自身攻击或友军增益。战法、反击、持续伤害、分担、传导、全额护盾、城门与疑兵不触发；满勇武仍保护低战意来源的有害效果。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondValor": {
    "name": "勇武",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      6
    ],
    "stat": "martialPower",
    "values": [
      0.2,
      0.35,
      0.5
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "valorIntent",
    "specialValue": 0,
    "description": "同方实际在场勇武合计2／4／6点时，持有者对当前战意严格低于自身的敌军造成伤害提高20%／35%／50%，自身战意领先来源至少25点时，才有40%／65%／100%概率免疫其伤害。满6点且自身战意领先来源至少25点时，免疫该来源的任意伤害、有害状态与战法有害效果；治疗、护盾、增益及支援战法正常生效，不拒绝低战意来源的增益。相等或更高战意来源不受影响。普攻、战法、反击、持续伤害、分担与传导共用结算，既有有害状态和军略按来源当前战意判定。自身效果、无部队来源的环境伤害与主动代价不受影响；离场或降档立即按当前在场点数计算。 吕布2点、赵云1点、典韦1点、许褚1点、马超1点、张辽1点；最高档至少5名指定持有者同时在场，后备不能凑点。",
    "grade": "advanced",
    "summary": "对低战意敌军增伤；领先至少25战意才启用免伤，满档同时免疫该来源有害效果。",
    "tradeoff": "吕布2点、赵云1点、典韦1点、许褚1点、马超1点、张辽1点；最高档至少5名指定持有者同时在场，后备不能凑点。",
    "immunityChance": [
      0.4,
      0.65,
      1
    ],
    "roster": [
      "person-661",
      "person-396",
      "person-472",
      "chu",
      "person-516",
      "liao"
    ],
    "core": "person-661",
    "minContributors": [
      1,
      3,
      5
    ],
    "immunityGap": 25
  },
  "bondWisdom": {
    "name": "深谋",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      4,
      6
    ],
    "stat": "strategyPower",
    "values": [
      0.2,
      0.35,
      0.5
    ],
    "extra": "discipline",
    "extraValue": 0.2,
    "special": "lowIntent",
    "specialValue": 0,
    "description": "同方在场部队的深谋等级相加，2／4／6点激活对应档，只取最高档。在场已获得本羁绊的持有者谋略威力提高20%／35%／50%。最高档另外提高军纪20%。对命中前战意低于60且已有生效中战斗异常的目标，谋略直接伤害额外提高20%／30%／40%；逐目标检查，不放大持续伤害，本次新施加的异常不提供本次增伤。不赠送入场法球。 贾诩1点、郭嘉1点、司马懿1点、周瑜1点、荀攸1点、诸葛亮2点、庞统1点、陆逊1点；最高档至少5名指定持有者同时在场，后备不能凑点。",
    "grade": "advanced",
    "summary": "谋略威力提高，利用低战意且已有异常的目标获得额外直接伤害。",
    "tradeoff": "贾诩1点、郭嘉1点、司马懿1点、周瑜1点、荀攸1点、诸葛亮2点、庞统1点、陆逊1点；最高档至少5名指定持有者同时在场，后备不能凑点。",
    "roster": [
      "person-61",
      "jia",
      "person-226",
      "person-246",
      "yu",
      "person-290",
      "person-558",
      "person-603"
    ],
    "core": "person-290",
    "minContributors": [
      1,
      3,
      5
    ],
    "openingBonus": [
      0.2,
      0.3,
      0.4
    ],
    "intentThreshold": 60
  },
  "bondRaid": {
    "name": "破军",
    "category": "tactic",
    "family": null,
    "thresholds": [
      3,
      6,
      12
    ],
    "stat": "attack",
    "values": [
      0.04,
      0.08,
      0.12
    ],
    "extra": "attackSpeed",
    "extraValue": 0,
    "special": "routMomentum",
    "specialValue": 0,
    "killBonus": [
      0.03,
      0.04,
      0.05
    ],
    "killGoal": 3,
    "burstDuration": 10,
    "burstSpeed": [
      0.12,
      0.18,
      0.25
    ],
    "description": "同方在场破军合计3／6／12点时，持有者对敌方部队的直接伤害提高4%／8%／12%。激活期间己方每击溃一支真实敌军，再提高3%／4%／5%，最多计三队；不要求持有者补刀，撤离、诱饵与城门不计。累计第三次击溃时触发一次乘胜：破军持有者攻速提高12%／18%／25%，持续10回合；若触发时为最高档，改为惠及己方所有实际在场部队。各敌军只计一次，补位不重置，之后凑高档不补发乘胜。持续期间正常离场即停止受益。最高档乘胜期间补入的己方部队只享受剩余时长。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "grade": "basic",
    "summary": "击溃积累，第三次触发乘胜。",
    "tradeoff": "需要先击溃真实敌军；最高档把乘胜攻速扩大至己方全军。"
  },
  "bondEscort": {
    "name": "护卫",
    "category": "tactic",
    "family": null,
    "thresholds": [
      1,
      6,
      12
    ],
    "stat": "defense",
    "values": [
      0,
      0,
      0
    ],
    "extra": "discipline",
    "extraValue": 0,
    "special": "escort",
    "specialValue": 0,
    "range": 1,
    "description": "护卫合计1／6／12点时，为相邻其他友军中现役兵力比例最低且不高于40%的一队提供最大兵力10%／15%／20%的护盾，持续3回合；每名提供者至多每6回合一次，同名护盾取较强者。满档护盾被伤害打破且受益者在本次伤害批次结束后仍存活，则获得1回合可行动的伤害免疫，每队每场仅一次；不回滚同批致命伤害，不因自然到期触发。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "grade": "basic",
    "summary": "残血友军获得护盾，满档破盾短暂免伤。",
    "tradeoff": "保护相邻残血友军，不保护自己；免伤每队每场一次，盾不抬高背水判定兵力。",
    "hpThreshold": 0.4,
    "shieldFraction": [
      0.1,
      0.15,
      0.2
    ],
    "shieldSteps": 3,
    "period": 6,
    "invincibleSteps": 1
  },
  "bondBeauty": {
    "name": "倾国",
    "family": null,
    "category": "tactic",
    "thresholds": [
      2,
      3,
      5
    ],
    "stat": "discipline",
    "values": [
      0,
      0,
      0
    ],
    "extra": "defense",
    "extraValue": 0,
    "special": "beautyHit",
    "specialValue": 0,
    "intentDrain": [
      12,
      18,
      24
    ],
    "statusChance": [
      0.4,
      0.55,
      0.7
    ],
    "statusSteps": 3,
    "statuses": [
      "confuse",
      "seal",
      "disrupted",
      "slow",
      "weaken",
      "armorBreak"
    ],
    "description": "倾国仅貂蝉、甄氏、大乔、小乔持有，貂蝉上限2点，其余各1点。实际在场合计2／3／5点时，持有者有效普攻削减命中目标12／18／24战意，并有40%／55%／70%概率附加3回合随机异常。各档均对普攻命中单位判定；满5点时每次有效普攻另锁定主目标周围1格，延迟1回合对格内最多两队其他敌军分别判定异常，移出可躲避、移入可受影响，不追踪主目标，不额外削战意、不递归扩散；分击每次普攻只产生一个扩散区域。异常从混乱、封技、失阵、迟滞、疲弱、破甲中等概率选择尚未拥有且可施加的一项，遵守异常免疫、避战与控制保护；后备、离场、溃败、城门、疑兵不参与，不限制目标性别。 貂蝉2点、甄氏1点、大乔1点、小乔1点；最高档至少4名指定持有者同时在场，后备不能凑点。",
    "grade": "advanced",
    "summary": "普攻削战意并概率附加异常；满档另产生延迟1回合的局部异常扩散。",
    "tradeoff": "貂蝉2点、甄氏1点、大乔1点、小乔1点；最高档至少4名指定持有者同时在场，后备不能凑点。",
    "roster": [
      "person-425",
      "person-301",
      "person-388",
      "person-267"
    ],
    "core": "person-425",
    "minContributors": [
      1,
      2,
      4
    ],
    "spreadRadius": 1,
    "spreadDelay": 1,
    "spreadTargets": 2
  },
  "bondPeach": {
    "name": "桃园",
    "category": "rare",
    "family": null,
    "thresholds": [
      1,
      2,
      3
    ],
    "stat": "discipline",
    "values": [
      0.15,
      0.25,
      0.35
    ],
    "extra": "defense",
    "extraValue": 0,
    "special": "swornLink",
    "specialValue": 0,
    "furyPower": 0.6,
    "furySpeed": 0.45,
    "furySteps": 16,
    "invincibleSteps": 5,
    "description": "桃园仅刘备、关羽、张飞各持有1点，按1／2／3点激活：持有者军纪提高15%／25%／35%；2点起在场结义成员平均分担伤害，2／3档分担前受到的直接伤害降低15%／30%。一名成员溃败后其余成员获得16回合奋战，攻击、武技、谋略威力提高60%，攻速提高45%；满3点且三人曾同时在场，两人溃败后最后一人额外获得5回合无敌。后备与离场不贡献，增益不拒绝，分担不递归；持续伤害不享受新增减伤，不复活、不回滚同批致命伤害。",
    "grade": "advanced",
    "summary": "分档军纪、结义分担及减伤，溃败后奋战，满档最后一人5回合无敌。",
    "tradeoff": "刘备1点、关羽1点、张飞1点；最高档至少3名指定持有者同时在场，后备不能凑点。",
    "roster": [
      "person-636",
      "person-99",
      "person-433"
    ],
    "core": null,
    "minContributors": [
      1,
      2,
      3
    ],
    "protection": [
      0,
      0.15,
      0.3
    ]
  },
  "bondReserve": {
    "name": "蓄锐",
    "category": "tactic",
    "family": null,
    "thresholds": [
      2,
      3,
      5
    ],
    "stat": "discipline",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "special": "reserveEntry",
    "specialValue": 0,
    "slots": [
      1,
      2,
      3
    ],
    "intent": [
      30,
      45,
      60
    ],
    "entrySteps": [
      6,
      8,
      10
    ],
    "description": "开战时按实际在场蓄锐合计2／3／5点，锁定后续1／2／3支预备队受益。按实际首次补入顺序领取，不限兵种，无需自身持有蓄锐；首发不领取，未到援军不提前领取。按开场档位获得30／45／60战意、6／8／10回合疾行与速攻，以及最大兵力10%／20%／30%的同期限护盾。最高档另为固定顺序中的首个普通小战法增加一次使用额度，不影响大战法、专属、冷却与调息。名额开战锁定，提供者离场不取消，重新凑档不补名额，每队只领一次。 黄忠2点、徐晃1点、邓艾1点、吕蒙1点；最高档至少4名指定持有者同时在场，后备不能凑点。",
    "grade": "advanced",
    "summary": "后备入场强化，最高档额外战法次数。",
    "tradeoff": "黄忠2点、徐晃1点、邓艾1点、吕蒙1点；最高档至少4名指定持有者同时在场，后备不能凑点。",
    "roster": [
      "person-186",
      "person-291",
      "person-482",
      "person-662"
    ],
    "core": "person-186",
    "minContributors": [
      1,
      2,
      4
    ],
    "entryShield": [
      0.1,
      0.2,
      0.3
    ]
  },
  "bondSwift": {
    "name": "疾驰",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "special": "swiftBurst",
    "values": [
      0.3,
      0.4,
      0.5
    ],
    "stat": "move",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "period": 12,
    "burstSteps": [
      4,
      5,
      6
    ],
    "summary": "短暂加速、无视ZOC，优先追击可达后排。",
    "tradeoff": "抓住突进窗口绕过前排控制区；仍受占位、地形、定身、嘲讽与有效集火约束。",
    "description": "疾驰合计2／6／12点时，实际在场持有者可行动且3格内有合法可见敌军时进入突进，此后每12回合可再次触发：移动力提高30%／40%／50%，持续4／5／6回合，有效移速最多1；窗口内无视普通ZOC，枪兵仍能拦截骑兵，普攻追击及进攻战法优先合法后排。后排不可达时攻击合法目标，不穿过占位部队或不可通行地形，不取消定身；嘲讽与有效集火优先。失去羁绊资格或不能行动时效果暂停，窗口与冷却继续计时，不因换阵重置。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondBulwark": {
    "name": "坚守",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "special": "physicalGuard",
    "values": [
      0.06,
      0.1,
      0.16
    ],
    "stat": "defense",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "减少受到的物理伤害。",
    "tradeoff": "给前排承伤者减伤；不能抵挡谋略和持续伤害。",
    "description": "坚守合计2／6／12点时，实际在场持有者受到的物理普攻和武技直接伤害降低6%／10%／16%。不减免谋略或持续伤害，不限定兵种。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondVolley": {
    "name": "远击",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "special": "distantStrike",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "stat": "attack",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "远距离增伤，利用控制追加伤害，满档穿透部分防御。",
    "tradeoff": "保持至少两格距离；近身接敌即失去增伤，不增加射程。",
    "description": "远击合计2／6／12点时，实际在场持有者对至少两格外敌军造成的直接伤害提高8%／14%／20%。不限定兵种，不增加射程；持续伤害、城门、诱饵不受益。对混乱、封技或失阵的上述敌军，额外直接增伤6%／10%／15%；满档该条件下物理直接伤害无视35%防御，谋略伤害不忽略军纪。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "minDistance": 2,
    "controlBonus": [
      0.06,
      0.1,
      0.15
    ],
    "defenseIgnore": 0.35
  },
  "bondLastStand": {
    "name": "背水",
    "category": "tactic",
    "family": null,
    "grade": "advanced",
    "thresholds": [
      2,
      4,
      7
    ],
    "special": "lastStand",
    "values": [
      0.35,
      0.55,
      0.8
    ],
    "stat": "attack",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "残血大幅增强输出并获得减伤。",
    "tradeoff": "夏侯惇1点、甘宁1点、魏延1点、周泰2点、庞德1点、凌统1点；最高档至少6名指定持有者同时在场，后备不能凑点。",
    "description": "背水合计2／4／7点且持有者现役兵力不高于本场最大兵力60%时，攻击、武技威力、谋略威力提高35%／55%／80%，受到的直接伤害降低15%／25%／40%。超过60%立即停止，不减免持续伤害；按受击前兵力判定，不拦截越过阈值的致命伤害，不复活、不刷新战法。 夏侯惇1点、甘宁1点、魏延1点、周泰2点、庞德1点、凌统1点；最高档至少6名指定持有者同时在场，后备不能凑点。",
    "hpThreshold": 0.6,
    "protection": [
      0.15,
      0.25,
      0.4
    ],
    "roster": [
      "dun",
      "person-119",
      "person-125",
      "person-243",
      "person-559",
      "person-652"
    ],
    "core": "person-243",
    "minContributors": [
      1,
      3,
      6
    ]
  },
  "bondScholar": {
    "name": "智略",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "special": "scholarPower",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "stat": "strategyPower",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "提高谋略威力。",
    "tradeoff": "容易搭配谋略战法；不发放深谋的挫志法球。",
    "description": "智略合计2／6／12点时，实际在场持有者谋略威力提高8%／14%／20%。不限定兵种，只取最高档，不增加战法次数或施放额度。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSpread": {
    "name": "散阵",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      11
    ],
    "special": "spreadGuard",
    "values": [
      0.06,
      0.1,
      0.16
    ],
    "stat": "discipline",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "分散站位时抵挡谋略伤害。",
    "tradeoff": "自身周围一格没有真实友军才生效；聚拢后失去减伤。",
    "description": "散阵合计2／6／11点且持有者没有相邻实际在场友军时，受到的谋略直接伤害降低6%／10%／16%。后备、离场者、诱饵不视为相邻友军；不减免物理或持续伤害。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondFinisher": {
    "name": "锐锋",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      3,
      6,
      12
    ],
    "special": "finishStrike",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "stat": "attack",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "对半血敌军增伤；已有破甲时，中档普攻暴击率至少50%，满档必暴。",
    "tradeoff": "适合集中火力收尾，满兵目标不受额外伤害。",
    "description": "锐锋合计3／6／12点时，持有者对现役兵力不高于本场最大兵力50%的敌军造成的直接伤害提高8%／14%／20%。按受击前兵力判断，不增加持续伤害，不对城门或诱饵生效。6点时普攻命中前已有破甲且兵力不高于50%的敌军，暴击率至少50%；满12点必定暴击，沿用共用暴击倍率，本次新施加的破甲不提供本次暴击；战法、反击和持续伤害不触发本项条件暴击。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "hpThreshold": 0.5,
    "criticalChance": [
      0,
      0.5,
      1
    ]
  },
  "bondAntiHorse": {
    "name": "克骑",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      11
    ],
    "special": "counterHorse",
    "values": [
      0.1,
      0.18,
      0.25
    ],
    "stat": "attack",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "对骑兵增伤。",
    "tradeoff": "面对骑兵时收益明确；对其它兵种不增伤。",
    "description": "克骑合计2／6／11点时，实际在场持有者对骑兵造成的直接伤害提高10%／18%／25%。持有者不限兵种，不增加对其他兵科、持续伤害、城门或诱饵的伤害。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSiegebreak": {
    "name": "攻坚",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      1,
      6,
      11
    ],
    "special": "siegeStrike",
    "values": [
      0.12,
      0.2,
      0.3
    ],
    "stat": "siege",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "提高攻城门伤害。",
    "tradeoff": "用于攻城，野战没有该增伤；不能提前获得攻城行动。",
    "description": "攻坚合计1／6／11点时，实际在场持有者对城门伤害提高12%／20%／30%。攻击真实城门并遵守射程和兵种攻城结算，不增加对部队或诱饵的伤害。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSteady": {
    "name": "稳军",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      11
    ],
    "special": "steadyDiscipline",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "stat": "discipline",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "提高军纪。",
    "tradeoff": "减轻谋略伤害与控制持续时间；不直接增加攻击。",
    "description": "稳军合计2／6／11点时，实际在场持有者军纪提高8%／14%／20%。沿用现有军纪对谋略伤害及控制时长的结算，不额外给予异常免疫。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondMuster": {
    "name": "聚势",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      3,
      6,
      11
    ],
    "special": "nearAllySpeed",
    "values": [
      0.04,
      0.08,
      0.12
    ],
    "stat": "attackSpeed",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "靠近友军时提高攻速。",
    "tradeoff": "保持至少一名相邻真实友军；落单即失去攻速加成。",
    "description": "聚势合计3／6／11点且持有者有至少一名相邻实际在场友军时，攻速提高4%／8%／12%。后备、离场者与诱饵不算友军；不增加战法次数或额外攻击行动。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondSkirmish": {
    "name": "袭后",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "special": "isolatedStrike",
    "values": [
      0.06,
      0.1,
      0.16
    ],
    "stat": "attack",
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "summary": "攻击孤立敌军增伤，满档命中后穿阵。",
    "tradeoff": "挑选没有相邻友军保护的敌军，打乱敌方阵形。",
    "description": "袭后合计2／6／12点时，持有者对没有相邻实际在场友军的敌军造成的直接伤害提高6%／10%／16%。不增加持续伤害，不对城门、诱饵生效；正常遵守目标与攻击范围规则。满档有效普攻命中孤立敌军后，自身获得2回合穿阵，可无视ZOC但不能穿越占位或阻挡。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "phaseSteps": 2
  },
  "bondSong": {
    "name": "战歌",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "songAttack",
    "intentGain": [
      4,
      7,
      10
    ],
    "range": 2,
    "shieldSteps": 3,
    "overflowShieldRate": 0.01,
    "overflowShieldCap": 0.08,
    "description": "有效普攻后，为2格内其他在场友军中的一队增加4／7／10战意，每次攻击只触发一次。优先选择尚有战法次数且距离下一战意门槛最近的一队；均无需补足门槛时选择战意最低者。满档把该次超出100战意的部分转为护盾，每溢出一点获得最大兵力1%的护盾，上限8%，持续3回合，同名护盾取较强者。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "有效普攻后，为2格内一队友军增加4／7／10战意，优先帮助达到尚有次数的战法门槛。",
    "tradeoff": "依靠实际普攻、合法在场目标与站位形成配合；满档需六名专攻此羁绊的部队。"
  },
  "bondCrusher": {
    "name": "摧锋",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      11
    ],
    "stat": "attack",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "crusherAttack",
    "description": "摧锋合计2／6／11点且本场尚未施加时，直接使当时所有在场敌军防御降低8%／14%／20%，持续180战斗回合；无需普攻命中、概率判定或消耗战意。可在开场或后续首次凑齐条件时施加，每场只施加一次，锁定当时的档位、对象和期限。之后补入的敌军不补发；来源离场、羁绊升降档、普攻与读档都不撤销、不加强、不重复施加或刷新已有窗口。同类取较强值，各来源独立到期，可整军、驱散或魔免解除；免疫目标仍走共同免疫规则，解除或免疫结束后不重新施加。城门与疑兵不受影响。满档至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "首次满足条件时，使当时所有在场敌军防御降低8%／14%／20%，持续180战斗回合，每场一次。",
    "tradeoff": "达到羁绊门槛时一次施加，后备不贡献；之后补入者不补发，升降档、普攻和读档均不重复施加，可整军、驱散或魔免解除。",
    "statusKey": "armorBreak",
    "onceDebuff": true,
    "debuffSteps": 180
  },
  "bondDoubt": {
    "name": "疑阵",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      10
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "doubtPulse",
    "chance": [
      0.2,
      0.3,
      0.4
    ],
    "period": 6,
    "statusSteps": 2,
    "range": 2,
    "description": "每6回合对当前合法普攻目标，以20%／30%／40%概率附加2回合失阵。满档再对目标两格内一名其他敌军独立判定；无合法目标时保留就绪，不刷新已有异常。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "每6回合对当前合法普攻目标，以20%／30%／40%概率附加2回合失阵。",
    "tradeoff": "依靠实际普攻、合法在场目标与站位形成配合；满档需六名专攻此羁绊的部队。"
  },
  "bondLure": {
    "name": "诱敌",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      10
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "lureAttack",
    "chance": [
      0.2,
      0.3,
      0.4
    ],
    "statusSteps": 2,
    "description": "有效普攻有20%／30%／40%概率对命中单位附加2回合嘲讽。满档成功嘲讽后锁定目标当时周围1格，延迟1回合使区域内最多两队其他敌军迟滞2回合；移出可躲避、移入可受影响，不追踪、不连锁触发；正常遵守控制保护与异常免疫。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "普攻概率嘲讽；满档锁定周围1格，延迟1回合使最多两队其他敌军迟滞。",
    "tradeoff": "依靠实际普攻、合法在场目标与站位形成配合；满档需六名专攻此羁绊的部队。",
    "spreadRadius": 1,
    "spreadDelay": 1,
    "spreadTargets": 2
  },
  "bondFire": {
    "name": "火谋",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      10
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "fireAttack",
    "chance": [
      0.2,
      0.3,
      0.4
    ],
    "statusSteps": 4,
    "burnRate": 0.06,
    "period": 4,
    "range": 2,
    "description": "有效普攻有20%／30%／40%概率附加4回合灼烧，单层伤害按自身谋略威力6%及目标军纪计算。满档每4回合把己方来源的既有灼烧传播给其两格内一名未灼烧敌军；保留原始单层威力和来源，不延长原火，共用最多三层灼烧。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "有效普攻有20%／30%／40%概率附加4回合灼烧，单层伤害按自身谋略威力6%及目标军纪计算。",
    "tradeoff": "依靠实际普攻、合法在场目标与站位形成配合；满档需六名专攻此羁绊的部队。"
  },
  "bondChain": {
    "name": "连环",
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      10
    ],
    "stat": "attack",
    "values": [
      0,
      0,
      0
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "special": "chainAttack",
    "fraction": [
      0.2,
      0.3,
      0.4
    ],
    "period": 5,
    "statusSteps": 3,
    "range": 2,
    "targets": [
      2,
      2,
      3
    ],
    "description": "有效普攻命中灼烧敌军时，每5回合至多把目标与两格内其他敌军连环3回合。后续直接兵力伤害的20%／30%／40%作为额外传导总额平均分给其余连环单位；满档最多连环三队，其余档两队。已有连环取较强效果，同强度保留原组，较强效果可替换较弱组且不继承旧时限，传导不递归，不触发普攻羁绊，持续伤害不传导。 满档必须至少六名真实持有者同时在场，后备不能凑点。",
    "summary": "有效普攻命中灼烧敌军时，每5回合至多把目标与两格内其他敌军连环3回合。",
    "tradeoff": "依靠实际普攻、合法在场目标与站位形成配合；满档需六名专攻此羁绊的部队。"
  },
  "bondMartial": {
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "name": "骁勇",
    "stat": "martialPower",
    "special": "martialPower",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "summary": "武技威力提高8%／14%／20%，羁绊激活期间常驻。",
    "tradeoff": "稳定加强武技战法，攻击与谋略威力沿用各自属性。",
    "description": "骁勇合计2／6／12点时，实际在场且已获得骁勇的持有者武技威力提高8%／14%／20%，羁绊激活期间常驻，只取最高档；离场或降档立即更新。 满档必须至少六名真实持有者同时在场，后备不能凑点。"
  },
  "bondDisciplineBreak": {
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "name": "乱纪",
    "stat": "discipline",
    "special": "disciplineAttack",
    "statusKey": "disciplineDown",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "summary": "首次满足条件时，使当时所有在场敌军军纪降低8%／14%／20%，持续180战斗回合，每场一次。",
    "tradeoff": "达到羁绊门槛时一次施加，后备不贡献；之后补入者不补发，升降档、普攻和读档均不重复施加，可整军、驱散或魔免解除。",
    "description": "乱纪合计2／6／12点且本场尚未施加时，直接使当时所有在场敌军军纪降低8%／14%／20%，持续180战斗回合；无需普攻命中、概率判定或消耗战意。可在开场或后续首次凑齐条件时施加，每场只施加一次，锁定当时的档位、对象和期限。之后补入的敌军不补发；来源离场、羁绊升降档、普攻与读档都不撤销、不加强、不重复施加或刷新已有窗口。同类取较强值，各来源独立到期，可整军、驱散或魔免解除；免疫目标仍走共同免疫规则，解除或免疫结束后不重新施加。城门与疑兵不受影响。满档至少六名真实持有者同时在场，后备不能凑点。",
    "onceDebuff": true,
    "debuffSteps": 180
  },
  "bondEnfeeble": {
    "category": "tactic",
    "family": null,
    "grade": "basic",
    "thresholds": [
      2,
      6,
      12
    ],
    "extra": "attack",
    "extraValue": 0,
    "specialValue": 0,
    "name": "折威",
    "stat": "martialPower",
    "special": "powerDownAttack",
    "statusKey": "powerDown",
    "values": [
      0.08,
      0.14,
      0.2
    ],
    "summary": "首次满足条件时，使当时所有在场敌军武技威力与谋略威力降低8%／14%／20%，持续180战斗回合，每场一次。",
    "tradeoff": "达到羁绊门槛时一次施加，后备不贡献；之后补入者不补发，升降档、普攻和读档均不重复施加，可整军、驱散或魔免解除。",
    "description": "折威合计2／6／12点且本场尚未施加时，直接使当时所有在场敌军武技威力与谋略威力降低8%／14%／20%，持续180战斗回合；无需普攻命中、概率判定或消耗战意。可在开场或后续首次凑齐条件时施加，每场只施加一次，锁定当时的档位、对象和期限。之后补入的敌军不补发；来源离场、羁绊升降档、普攻与读档都不撤销、不加强、不重复施加或刷新已有窗口。同类取较强值，各来源独立到期，可整军、驱散或魔免解除；免疫目标仍走共同免疫规则，解除或免疫结束后不重新施加。城门与疑兵不受影响。满档至少六名真实持有者同时在场，后备不能凑点。",
    "onceDebuff": true,
    "debuffSteps": 180
  }
};
