const fraction=(n,d)=>Math.max(0,Math.min(1,n/Math.max(1,d)));
const labels={expansion:'扩张领土',eliminateThreat:'消除敌方势力威胁',secureRegion:'巩固区域',connectTerritory:'连接领土与道路',protectBorder:'减轻边境压力',maintainObjective:'继续主攻方向',provisions:'取得前线粮源',funds:'补充军费',replacements:'补充兵源与接收伤兵',personnel:'取得人才接洽机会'};

// Bounded utility dimensions describe WHY to act. They are policy scores,
// not prices, win probabilities or a forecast balance sheet. Physical budget,
// road, garrison and casualty admission remain separate shared checks.
export function scoreCapturePurpose(f,p,profile={developmentWeight:1}){
 const v=f.victoryValue||{},gain=f.occupationPayoff,needs=f.purposeNeeds||{grain:f.foodUse*20,gold:p.replacementGold+p.militaryGold,manpower:p.estimatedLosses};
 const aims={
  expansion:50,
  eliminateThreat:v.elimination>0?30:0,
  secureRegion:20*fraction((v.regional||0)+(v.completion||0),42),
  connectTerritory:20*fraction((v.connection||0)+(v.corridor||0),38),
  protectBorder:f.relieveBorder?12:0,
  maintainObjective:10*fraction(v.focus||0,12),
  provisions:gain?12*fraction(gain.expected.grain,needs.grain):0,
  funds:gain?8*fraction(gain.expected.gold,needs.gold):0,
  replacements:gain?12*fraction(gain.expected.manpower+gain.recoveredWounded+gain.earlierRecovered,needs.manpower):0,
  personnel:gain?8*fraction(gain.expectedCaptives,2):0,
 };
 // A defended operation benefits from committing a proper fighting army.
 // Occupying an empty objective should instead leave most troops available.
 // Emergency muster still belongs to admission; it does not turn an empty
 // observed garrison into a reason to send every resident soldier.
 const fightingOpposition=(f.opposition?.field||0)+(f.opposition?.reinforcementPower||0)+(f.opposition?.contestingPower||0)>0;
 const burden={
  casualties:40*fraction(p.estimatedLosses,f.men),
  commitment:15*fraction(f.duration,180)+(fightingOpposition?2:10)*fraction(f.men,f.purposeNeeds?.standingTroops||90000)+8*fraction((f.sources?.length||1)-1,1),
  disruptedWork:Math.min(20,f.work.reduce((n,w)=>n+5*fraction(w.remaining,20)*fraction(w.ability??100,100),0)*profile.developmentWeight),
  uncertainty:10*fraction(f.opposition?.staleMargin||0,.3),
 };
 const benefit=Object.values(aims).reduce((n,v)=>n+v,0),cost=Object.values(burden).reduce((n,v)=>n+v,0);
 return {version:1,aims,burden,score:benefit-cost,benefit,cost};
}

export function evaluateActionPurpose({facts,prediction,profile}){
 const result=scoreCapturePurpose(facts,prediction,profile);
 return {score:result.score,benefit:result.benefit,cost:result.cost,workCost:result.burden.disruptedWork};
}
export function purposeReason(p){return '推进全国统一：'+Object.entries(p.aims).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>labels[k]).join('、')+'；实际兵粮、守备与恢复条件可执行';}
export function validPurposeScore(p){
 const finite=n=>Number.isFinite(n)&&n>=0;
 return p?.version===1&&p.aims&&Object.keys(p.aims).length===Object.keys(labels).length&&Object.keys(labels).every(k=>finite(p.aims[k])&&p.aims[k]<=50)
  &&p.burden&&Object.keys(p.burden).length===4&&['casualties','commitment','disruptedWork','uncertainty'].every(k=>finite(p.burden[k])&&p.burden[k]<=40)
  &&Math.abs(p.benefit-Object.values(p.aims).reduce((n,v)=>n+v,0))<1e-8&&Math.abs(p.cost-Object.values(p.burden).reduce((n,v)=>n+v,0))<1e-8&&Math.abs(p.score-p.benefit+p.cost)<1e-8;
}
