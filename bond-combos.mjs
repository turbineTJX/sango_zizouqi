import {activeBonds,bondOnField,bondOperational,bondSource,bondBlocksEffect,adjacentBondAlly,topBond} from './bonds.mjs';
import {hasStatus,setStatus,shieldLayers} from './tactics.mjs';
import {STATUS_DEFINITIONS,CONTROL_STATUSES,statusNotice} from './battle-status-rules.mjs';
import {traitImmune} from './trait-mechanics.mjs';
import {hexDistance} from './hex-grid.mjs';
import {COMBAT} from './combat-rules.mjs';
import {recordContribution} from './progression.mjs';
import {BOND_DESIGNS} from './data/design/bonds.mjs';

const rule=(b,u,special)=>activeBonds(b,u).find(d=>d.special===special);
const origin=(u,name)=>({sourceId:u.id,sourceName:u.name,sourceSkillName:name});
const enemies=(b,u)=>b.sides[1-u.side].units.filter(v=>bondOnField(v)&&v.type!=='gate');
const nearest=(center,a,c)=>hexDistance(center,a)-hexDistance(center,c)||a.id.localeCompare(c.id);
function eligible(b,u,target,key){
 return !!target&&bondOnField(target)&&target.type!=='gate'&&!hasStatus(b,target,'stasis')&&!hasStatus(b,target,'magicImmune')&&!bondBlocksEffect(b,target,u)&&!traitImmune(target,key)&&!(CONTROL_STATUSES.includes(key)&&hasStatus(b,target,'resolve'));
}
function status(b,u,target,key,steps,d,api,extra={}){
 if(!eligible(b,u,target,key)||hasStatus(b,target,key))return false;
 const source={...origin(u,d.name),...extra};
 if(CONTROL_STATUSES.includes(key))api.control(target,steps,key,source);else setStatus(b,target,key,steps,source);
 if(!hasStatus(b,target,key))return false;
 recordContribution(u,'control',steps);api.signal(u,target,d.name,{text:d.name+' · '+STATUS_DEFINITIONS[key].name});statusNotice(b,target,d.name+' · '+STATUS_DEFINITIONS[key].name);return true;
}
function shield(b,u,target,amount,steps,name,extra={}){
 const source='bond:'+name,prior=shieldLayers(b,target).find(l=>l.source===source);
 if(amount<=0||prior&&prior.amount>=amount)return false;
 setStatus(b,target,'shield',steps,{...origin(u,name),source,label:name,amount,...extra});
 return shieldLayers(b,target).some(l=>l.source===source&&l.amount>0);
}
export function resolveBondAttack(b,u,api){
 if(!bondOperational(b,u))return;
 const d=rule(b,u,'songAttack');if(!d)return;
 const target=b.sides[u.side].units.filter(v=>v!==u&&bondOnField(v)&&hexDistance(u,v)<=d.range).sort((a,c)=>a.intent-c.intent||a.id.localeCompare(c.id))[0];if(!target)return;
 const amount=d.intentGain[d.tier-1],overflow=Math.max(0,target.intent+amount-COMBAT.intentCap),gain=api.intent(target,amount,u);
 let protectedAmount=0;
 if(d.tier===d.thresholds.length&&overflow){const size=Math.floor(target.maxHp*Math.min(d.overflowShieldCap,overflow*d.overflowShieldRate));if(shield(b,u,target,size,d.shieldSteps,'战歌'))protectedAmount=size;}
 if(gain||protectedAmount){recordContribution(u,'support',1);api.signal(u,target,d.name,{text:'战歌 · 战意 +'+gain+(protectedAmount?' · 护盾 +'+protectedAmount:''),intentGained:gain});}
}
export function resolveBondHit(b,u,target,api,{isolated=!adjacentBondAlly(b,target)}={}){
 if(!bondOperational(b,u)||target.isDecoy||target.type==='gate')return;
 if(topBond(b,u,'bondSkirmish')&&isolated){setStatus(b,u,'phase',BOND_DESIGNS.bondSkirmish.phaseSteps,origin(u,'袭后'));api.signal(u,u,'袭后',{text:'袭后 · 穿阵'});}
 if(!bondOnField(target))return;
 const crusher=rule(b,u,'crusherAttack');
 if(crusher&&eligible(b,u,target,'armorBreak')&&!hasStatus(b,target,'armorBreak')&&api.random(b)<crusher.chance[crusher.tier-1]&&status(b,u,target,'armorBreak',crusher.statusSteps,crusher,api)&&crusher.tier===crusher.thresholds.length){const n=api.drain(target,crusher.intentDrain,u);if(n)api.signal(u,target,crusher.name,{text:'摧锋 · 战意 −'+n,intentDrained:n});}
 const lure=rule(b,u,'lureAttack');
 if(lure&&eligible(b,u,target,'taunt')&&!hasStatus(b,target,'taunt')&&api.random(b)<lure.chance[lure.tier-1]&&status(b,u,target,'taunt',lure.statusSteps,lure,api)&&lure.tier===lure.thresholds.length)for(const other of enemies(b,u).filter(v=>v!==target&&hexDistance(v,target)<=lure.range))status(b,u,other,'slow',lure.statusSteps,lure,api);
 const fire=rule(b,u,'fireAttack');
 if(fire&&eligible(b,u,target,'burn')&&api.random(b)<fire.chance[fire.tier-1]){const amount=Math.max(1,Math.round(api.attributes(u).strategyPower*fire.burnRate*100/(100+api.attributes(target).discipline)));setStatus(b,target,'burn',fire.statusSteps,{...origin(u,fire.name),amount});api.signal(u,target,fire.name,{text:'火谋 · 灼烧'});recordContribution(u,'control',1);}
 const chain=rule(b,u,'chainAttack');
 if(chain&&hasStatus(b,target,'burn')&&!hasStatus(b,target,'link')&&(u.bondState.linkReady||0)<=b.tick&&eligible(b,u,target,'link')){
  const others=enemies(b,u).filter(v=>v!==target&&hexDistance(v,target)<=chain.range&&!hasStatus(b,v,'link')&&eligible(b,u,v,'link')).sort((a,c)=>nearest(target,a,c)).slice(0,chain.targets[chain.tier-1]-1);
  if(!others.length)return;
  const group=u.id+':bondChain:'+b.tick;for(const v of [target,...others])status(b,u,v,'link',chain.statusSteps,chain,api,{group,fraction:chain.fraction[chain.tier-1]});u.bondState.linkReady=b.tick+chain.period;
 }
}
export function pulseBondCombos(b,u,target,api){
 if(!bondOperational(b,u))return;
 const swift=rule(b,u,'swiftBurst');
 if(swift&&(u.bondState.swiftReady||0)<=b.tick){
  setStatus(b,u,'swiftRush',swift.burstSteps[swift.tier-1]-1,{...origin(u,swift.name),castTick:b.tick,bondSwiftTier:swift.tier});
  u.bondState.swiftReady=b.tick+swift.period;api.signal(u,u,swift.name,{text:'疾驰 · 突进'});
 }
 const escort=rule(b,u,'escort');
 if(escort&&(u.bondState.escortReady||0)<=b.tick){const friend=b.sides[u.side].units.filter(v=>v!==u&&bondOnField(v)&&v.hp<=v.maxHp*escort.hpThreshold&&hexDistance(v,u)<=escort.range).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||a.id.localeCompare(c.id))[0];if(friend){const size=Math.floor(friend.maxHp*escort.shieldFraction[escort.tier-1]);if(shield(b,u,friend,size,escort.shieldSteps,'护卫',{bondGuardTier:escort.tier,sourceId:u.id,castTick:b.tick})){u.bondState.escortReady=b.tick+escort.period;recordContribution(u,'support',1);api.signal(u,friend,'护卫',{text:'护卫 · 护盾 +'+size});}}}
 const doubt=rule(b,u,'doubtPulse');
 if(doubt&&b.tick>=(u.bondState.doubtReady??(u.bondEntry?.tick||0)+doubt.period)&&target&&bondOnField(target)&&target.side!==u.side){
  u.bondState.doubtReady=b.tick+doubt.period;
  const list=[target];if(doubt.tier===doubt.thresholds.length){const other=enemies(b,u).filter(v=>v!==target&&hexDistance(v,target)<=doubt.range&&eligible(b,u,v,'disrupted')&&!hasStatus(b,v,'disrupted')).sort((a,c)=>nearest(target,a,c))[0];if(other)list.push(other);}
  for(const v of list)if(eligible(b,u,v,'disrupted')&&!hasStatus(b,v,'disrupted')&&api.random(b)<doubt.chance[doubt.tier-1])status(b,u,v,'disrupted',doubt.statusSteps-1,doubt,api);
 }
 const fire=rule(b,u,'fireAttack');
 if(fire&&fire.tier===fire.thresholds.length&&b.tick>=(u.bondState.fireSpreadReady??(u.bondEntry?.tick||0)+fire.period)){
  for(const burning of enemies(b,u).filter(v=>hasStatus(b,v,'burn')).sort((a,c)=>a.id.localeCompare(c.id))){const burn=burning.statuses.burn,source=bondSource(b,burn);if(!source||source.side!==u.side)continue;
   const other=enemies(b,u).filter(v=>v!==burning&&!hasStatus(b,v,'burn')&&hexDistance(v,burning)<=fire.range&&eligible(b,source,v,'burn')).sort((a,c)=>nearest(burning,a,c))[0];if(!other)continue;
   const steps=Math.max(0,Math.min(fire.statusSteps-1,burn.until-b.tick-1));setStatus(b,other,'burn',steps,{sourceId:burn.sourceId,sourceName:burn.sourceName,sourceSkillName:burn.sourceSkillName,amount:burn.baseAmount});u.bondState.fireSpreadReady=b.tick+fire.period;recordContribution(u,'control',1);api.signal(u,other,fire.name,{text:'火谋 · 传火'});break;
  }
 }
}
export function settleEscortBreak(b,target,layer,api){
 if(layer.bondGuardTier!==BOND_DESIGNS.bondEscort.thresholds.length||!bondOnField(target)||target.bondState.escortInvincibleUsed)return;
 const source=bondSource(b,layer);if(!source||source.side!==target.side)return;
 target.bondState.escortInvincibleUsed=true;setStatus(b,target,'guardInvincible',BOND_DESIGNS.bondEscort.invincibleSteps,{...origin(source,'护卫'),castTick:b.tick});api.signal(source,target,'护卫',{text:'护卫 · 破盾免伤'});
}
export function validEscortStatus(b,u,key,s){
 if(key==='guardInvincible'){const source=bondSource(b,s);return u.bondState?.escortInvincibleUsed===true&&s.sourceSkillName==='护卫'&&source?.side===u.side&&source!==u&&(source?.bondGrowth?.levels?.bondEscort||0)>0&&Number.isInteger(s.castTick)&&s.castTick>=0&&s.castTick<=b.tick&&s.until===s.castTick+BOND_DESIGNS.bondEscort.invincibleSteps+1;}
 return s.layers.every(l=>l.source!=='bond:护卫'&&l.bondGuardTier===undefined||l.source==='bond:护卫'&&Number.isInteger(l.bondGuardTier)&&l.bondGuardTier>=1&&l.bondGuardTier<=3&&Number.isInteger(l.castTick)&&l.castTick>=0&&l.castTick<=b.tick&&l.until===l.castTick+BOND_DESIGNS.bondEscort.shieldSteps+1&&b.sides[u.side].units.some(v=>v.id===l.sourceId&&v!==u&&(v.bondGrowth?.levels?.bondEscort||0)>0)&&l.amount<=u.maxHp*BOND_DESIGNS.bondEscort.shieldFraction[l.bondGuardTier-1]);
}
