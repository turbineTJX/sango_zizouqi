import {ATTACK_ORBS} from './attack-orbs.mjs';
import {hexCenter, HEX_GRID} from './hex-grid.mjs';
import {outcomeLines} from './tactic-outcomes.mjs';
import {drawFeaturedBanner,drawBattleAtmosphere,cinematicViewport} from './battle-cinematic.mjs';
import {BattleSignals} from './battle-signals.mjs';
import {TACTICS_BOOK} from './tactics.mjs';
import {AbilityCues,isHighlightedAbility} from './ability-cues.mjs';
import {hidden} from './battle-status-rules.mjs';
import {battleDay} from './player-time.mjs';
import {scheduleBattleActions,observedUnitAction} from './battle-presentation.mjs';
import {castPalette,castVisualEvents,drawCastSource,drawCastTarget} from './battle-cast-animation.mjs';
import {BattleFeedback} from './battle-feedback.mjs';
import {battleMapStatusMarkup} from './battle-labels.mjs';
import {BattleTextCache} from './battle-text-cache.mjs';
import {presentationStyle} from './presentation-style.mjs';
// Presentation-only effects. All hits and casualties come from engine events.

const COLORS = {
  charge: ['#ffe5a3', '#efac45'], fire: ['#ffe6a1', '#ff7543'],
  shockwave: ['#e7f8ff', '#74c6ea'], banner: ['#fff2b8', '#d9bd65'],
  volley: ['#d3ffe2', '#79d6ac'], slash: ['#f4faff', '#a0d9f1'],
};
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const ease = t => 1 - (1 - t) ** 3;
const damageLabel = e => `${e.critical?'暴击 ':''}−${e.damage}`;

const majorTactics = new Set(Object.values(TACTICS_BOOK).filter(s=>s.threshold>=100).map(s=>s.name));
export const isMajorCast = events => events.some(e=>!e.ongoing&&e.skill&&(majorTactics.has(e.label)||e.comboLevel>=2||e.combo?.level>=2));

export class BattleEffects {
  constructor(canvas, feed, result = null, cues = null) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.feed = feed;
    this.signals = new BattleSignals();
    this.feedback = new BattleFeedback();
    this.textCache=new BattleTextCache();this.onFonts=()=>{this.textCache.clear();this.invalidate();};document.fonts?.addEventListener?.('loadingdone',this.onFonts);
    this.cues = new AbilityCues(cues);
    this.items = []; this.notices = []; this.clock = 0; this.lastFrame = 0;
    this.cinematics = []; this.actions=[];this.sounds=[]; this.battleId = null; this.result = result; this.resultKey = null;
    this.batch = null; this.consumed = 0; this.paused = true; this.speed = 1; this.destroyed = false; this.mode = 'clear';
    this.motionPreference=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.motionPreference.matches;
    this.onMotionPreference=e=>{this.reduced=e.matches;this.invalidate();};this.motionPreference.addEventListener?.('change',this.onMotionPreference);
    this.resize = new ResizeObserver(() => this.resizeCanvas()); this.resize.observe(canvas);
    this.stage=canvas.parentElement?.parentElement;
    this.onPan=()=>{this.manualPanUntil=this.clock+5000;this.invalidate();};
    this.stage?.addEventListener?.('pointerdown',this.onPan,{passive:true});this.stage?.addEventListener?.('wheel',this.onPan,{passive:true});
    this.onVisibility=()=>{this.lastFrame=0;this.invalidate();};document.addEventListener?.('visibilitychange',this.onVisibility);this.resizeCanvas();this.invalidate();
  }
  invalidate(){if(!this.destroyed&&!this.frame&&!document.hidden)this.frame=requestAnimationFrame(t=>{this.frame=0;if(this.resetClock){this.lastFrame=t;this.resetClock=false;}this.draw(t);});}
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);this.invalidate();
  }
  update(battle, { paused, speed, mode = 'clear' }) {
    if (this.battleId !== battle.id) {
      this.items = []; this.cinematics = []; this.actions=[];this.sounds=[];this.healthFrom=null;this.healthTo=null;this.focusedUnit=null; this.batch = null;
      this.feedback.reset();
      this.cues.reset();
      this.notices.forEach(n => n.element.remove()); this.notices = [];
      this.resultKey = null;
      if(this.result){this.result.textContent='战斗记录 · 暂停查看';this.result.disabled=true;}
      this.battleId = battle.id;
    }
    // Finish an already visible action at its current pace. Speed changes
    // affect the next batch, without skipping a projectile or its impact.
    if(this.paused!==paused)this.resetClock=true;this.paused = paused; this.speed = speed; this.mode = mode;this.invalidate();
    const changed=this.batch!==`${battle.id}:${battle.tick}`;
    this.signals.update(battle,this.clock);
    const batch = `${battle.id}:${battle.tick}`;
    this.tick=battle.tick;
    if (this.batch !== batch) {
      // Stepping through paused turns must not queue historical hits for playback.
      if (paused) { this.items = []; this.cinematics = [];this.actions=[]; }
      this.healthFrom=this.healthTo;
      this.healthTo=new Map(battle.sides.flatMap(s=>s.units).map(u=>[u.id,{hp:u.hp,maxHp:u.maxHp}]));
      this.healthFrom ||= this.healthTo;
      this.actions=this.actions.filter(a=>a.end>this.clock);
      this.batch = batch; this.consumed = 0;
    }else this.healthTo=new Map(battle.sides.flatMap(s=>s.units).map(u=>[u.id,{hp:u.hp,maxHp:u.maxHp}]));
    this.unitActions=new Map(battle.sides.flatMap(s=>s.units).filter(u=>u.status==='active'&&(u.side===0||!hidden(battle,u))).map(u=>[u.id,observedUnitAction(battle,u)]));
    this.root=this.canvas.parentElement?.closest?.('.battle-layout');
    this.elements=[...(this.root?.querySelectorAll('.unit-nameplate,[data-unit]')||[])];
    // Commands may append new effects while paused at the same simulation tick.
    const added = battle.effects.slice(this.consumed);this.consumed = battle.effects.length;
    const tacticalNotes=new Map(added.filter(e=>['拦截中断','突入后阵'].includes(e.text)).map(e=>[`${e.from}:${e.label}`,e.text]));
    const terrainNotes=new Map();
    for(const e of added.filter(e=>e.terrain&&!e.ongoing)){
      const key=`${e.from}:${e.label}`,notes=terrainNotes.get(key)||new Set();
      notes.add(e.terrain);terrainNotes.set(key,notes);
    }
    const casts = new Map(),traits = new Map(),fresh=[];
    for (const event of added) {
      if(event.phase==='cast'||event.intentOnly) continue; // Ignore obsolete windup events restored from older saves.
      const source = battle.sides.flatMap(s => s.units).find(u => u.id === event.from);
      if(event.abilityKind==='trait'&&source?.side===1&&hidden(battle,source))continue;
      const target = battle.sides.flatMap(s => s.units).find(u => u.id === event.to) || (battle.siege?.gate.id === event.to ? battle.siege.gate : null);
      const e = { ...event, ...(event.intentDrained!==undefined?{text:''}:{}), tick:battle.tick, targetSide:target?.side,targetName:target?.name || event.combo?.targetName || '', fromX: event.fromX ?? source?.x ?? event.x, fromY: event.fromY ?? source?.y ?? event.y, visual: event.visual || 'slash', name: event.name || source?.name || '', label: event.label || source?.skill || '', side: event.side ?? source?.side ?? 0, troop: event.troop || source?.type || 'spear', phase: event.phase || 'impact', start: this.clock };
      e.duration = (e.combo ? 1000 : 650) / speed;
      if(e.damageKind==='dot')e.ongoing=true;
      e.tacticalNote=tacticalNotes.get(`${e.from}:${e.label}`);
      e.terrainNote=[...(terrainNotes.get(`${e.from}:${e.label}`)||[])].join('；');
      this.items.push(e);fresh.push(e);
      if(e.abilityKind==='trait'){
        const key=`${e.side}:${e.from}:${e.traitId}`;
        if(!traits.has(key))traits.set(key,[]);traits.get(key).push(e);
      }
      if (!e.ongoing && (e.skill || e.combo)) {
        const key = `${e.side}:${e.from}:${e.label}:${!!e.combo}`;
        if (!casts.has(key)) casts.set(key, []);
        casts.get(key).push(e);
      }
    }
    // Major tactics receive a featured treatment. A link shares its originating
    // action window, including all actual damage and result information.
    const groups=[...casts.values()],linked=new Set();
    for(const events of traits.values()){this.notice(events);this.cues.push(events,this.clock);if(isHighlightedAbility(events[0]))this.showResult(events);}
    for(const events of groups){this.notice(events);if(paused&&!events[0].combo)this.cues.push(events,this.clock);}
    for(const events of groups.filter(events=>!events[0].combo)){
      const e=events[0];if(e.enchantment)continue;e.showCastLabel=isHighlightedAbility(e);
      const combo=groups.find(group=>group[0].combo&&group[0].from===e.from&&group[0].side===e.side);
      if(combo)linked.add(combo);
      const merged=combo?[...events,...combo]:events;
      if(paused||!isMajorCast(merged)){if(isHighlightedAbility(e))this.showResult(events);continue;}
      // The common action timeline below schedules skills and basic attacks
      // together, preserving the order in which the engine recorded them.
    }
    for(const events of groups.filter(events=>events[0].combo&&!linked.has(events))){
      if(!paused&&isMajorCast(events))events[0].showCastLabel=true;
    }
    const pendingOrders=this.signals.orders.filter(o=>!o.scheduled),orderEvents=new Set();
    for(const order of pendingOrders){
      order.events=fresh.filter(e=>e.side===order.side&&(e.label===order.name||order.key==='heal'&&e.label==='救治伤兵'));
      for(const e of order.events)orderEvents.add(e);
      for(const target of order.targets)target.healing=order.events.filter(e=>e.to===target.id).reduce((n,e)=>n+(e.healing||0),0);
    }
    if(!paused){
      const clock=Math.max(this.clock,...this.actions.map(a=>a.end));
      for(const action of scheduleBattleActions(fresh.filter(e=>!orderEvents.has(e)),{clock,speed,isMajor:isMajorCast})){
        for(const e of action.events){e.start=action.start;e.duration=action.duration;e.cinematic=action.major;e.presentationKind=action.kind;}
        action.announced=action.events[0].abilityKind==='trait';this.actions.push(action);if(action.major)this.cinematics.push(action);
      }
    }
    let orderStart=Math.max(this.clock,...this.actions.map(a=>a.end),...this.signals.orders.filter(o=>o.scheduled).map(o=>o.start+o.duration));
    for(const order of pendingOrders){
      order.start=orderStart;order.scheduled=true;orderStart+=order.duration;
      if(order.events.length){
        const action={events:order.events,start:order.start,duration:order.duration,end:order.start+order.duration,important:true,major:false,announced:true};
        for(const e of action.events){e.start=action.start;e.duration=action.duration;e.militaryOrder=true;e.presentationKind=order.key==='heal'?'heal':order.group==='control'?'control':'support';}
        this.actions.push(action);
      }
    }
    const orders=this.signals.orders.filter(o=>!o.feedbackSeen);
    this.feedback.update(this.signals.units,this.actions,orders,this.clock,{silent:changed&&paused,tick:battle.tick});
    for(const order of orders)order.feedbackSeen=true;
    this.syncCinematicState();
    this.syncPresentation();
    this.cues.advance(this.clock);
    this.items = this.items.slice(-100);
  }
  currentActions(){return this.actions.filter(a=>a.start<=this.clock&&a.end>this.clock);}
  currentCinematic(){return this.cinematics.find(a=>a.start<=this.clock&&a.end>this.clock);}
  isCinematicPlaying() { return !!this.currentCinematic(); }
  isPresentationPlaying(){return this.actions.some(a=>a.end>this.clock)||this.signals.orders.some(o=>o.start+o.duration>this.clock);}
  queueAudio(cue,play){
    const action=cue.from?this.actions.find(a=>a.events.some(e=>e.tick===this.tick&&e.from===cue.from&&e.label===cue.label)):null;
    const order=cue.key==='order'?this.signals.orders.find(o=>o.side===cue.side&&o.serial===cue.serial):null;
    // A voice needs its actual presentation window. Paused snapshots and
    // discarded actions must not turn into an unrelated line on resume.
    if(cue.voice&&(cue.from&&!action||cue.key==='order'&&!order))return;
    const start=order?order.start+order.duration*.12:action?action.start+action.duration*(cue.voice?.08:.52):cue.terminal||['rout','victory','defeat','draw','order'].includes(cue.key)?Math.max(this.clock,...this.actions.map(a=>a.end)):this.clock;
    this.sounds.push({start,play,voice:!!cue.voice});
  }
  clearVoiceAudio(){this.sounds=this.sounds.filter(sound=>!sound.voice);}
  syncCinematicState() {
    this.canvas.parentElement?.classList.toggle('tactic-cinematic', this.isCinematicPlaying());
  }
  showResult(events) {
    if(!this.result)return;
    const e=events[0],key=`${e.tick}:${e.side}:${e.from}:${e.label}`;
    if(key===this.resultKey)return;
    this.resultKey=key;this.result.disabled=false;
    this.result.textContent=`${e.side?'敌军':'我军'} · ${e.name}「${e.label}」 · 点击暂停查看\n${outcomeLines(events,true).join(' / ')}`;
    this.result.title=outcomeLines(events).join('\n');
  }
  notice(events) {
    const e=events[0];
    // A multi-hit/multi-target skill gets one log row; its actual effects stay intact.
    const key = `${e.tick}:${e.side}:${e.from}:${e.label}:${e.phase}:${!!e.combo}`;
    if (this.notices.some(n => n.key === key)) return;
    const item = document.createElement('div'); item.className = `skill-announcement side-${e.side} fx-${e.visual}${e.combo?' combo-announcement':''}`;
    const badge = document.createElement('span'); badge.className = 'skill-seal'; badge.textContent = e.abilityKind==='trait'?'特性':e.enchantment?'装填':e.combo ? e.label : '施放';
    const name = document.createElement('span'); name.className = 'skill-officer'; name.textContent = `${e.side ? '敌' : '我'} · 第${battleDay(e.tick)}天 · ${e.combo ? e.combo.actors.map(a=>a.name).join(' + ')+' → '+e.combo.targetName : e.name + (e.targetName && e.to !== e.from ? ' → '+e.targetName : '')}`;
    const title = document.createElement('strong'); title.textContent = e.combo ? ({focus:'协同集火',supported:'支援接续',cover:'接应掩护'}[e.combo.kind]||'连携')+' · 效果 +'+e.combo.bonus+'%' : e.label+(e.tacticalNote?' · '+e.tacticalNote:'')+(e.terrainNote?' · '+e.terrainNote:'');
    item.title = `${name.textContent} · ${badge.textContent} · ${title.textContent}`;
    const detail=document.createElement('div');detail.className='skill-result';
    for(const line of outcomeLines(events)){const row=document.createElement('p');row.textContent=line;detail.append(row);}
    item.append(badge, name, title, detail); this.feed.prepend(item);
    this.notices.push({ element: item, key, side:e.side });
    while (this.notices.filter(n=>n.side===e.side).length > 20) {
      const index = this.notices.findIndex(n=>n.side===e.side);
      this.notices.splice(index,1)[0].element.remove();
    }
  }
  isBusy() { return this.isPresentationPlaying() || this.items.some(e => this.clock - e.start < e.duration); }
  destroy() { this.destroyed = true;this.textCache.clear();document.fonts?.removeEventListener?.('loadingdone',this.onFonts);document.removeEventListener?.('visibilitychange',this.onVisibility); cancelAnimationFrame(this.frame); this.resize.disconnect();this.motionPreference.removeEventListener?.('change',this.onMotionPreference);this.stage?.removeEventListener?.('pointerdown',this.onPan);this.stage?.removeEventListener?.('wheel',this.onPan); this.items = []; this.cinematics = [];this.actions=[];this.sounds=[]; this.cues.reset();this.syncCinematicState(); this.notices.forEach(n=>n.element.remove()); this.notices = []; }
  clearEffects() {
    const latest = new Map();
    for (const e of this.items) {
      if(this.clock<e.start||this.clock>=e.start+e.duration)continue;
      const key = `hit:${e.tick}:${e.from}:${e.to}:${e.label}`;
      latest.set(key,e);
    }
    return [...latest.values()].slice(-32);
  }
  relatedUnitIds(){
    const related=new Set(this.focusedUnit?[this.focusedUnit]:[]);
    const target=this.unitActions?.get(this.focusedUnit)?.targetId;if(target)related.add(target);
    for(const action of this.currentActions())if(action.events.some(e=>e.from===this.focusedUnit||e.to===this.focusedUnit))for(const e of action.events){related.add(e.from);related.add(e.to);}
    return related;
  }
  syncPresentation(){
    const playing=this.isPresentationPlaying(),active=this.currentActions(),related=this.relatedUnitIds();
    const statusMarkup=new Map();
    for(const u of this.signals.units)u.statuses=this.feedback.statusesFor(u.id,this.clock);
    for(const u of this.signals.units)statusMarkup.set(u.id,battleMapStatusMarkup(u.statuses));
    if(!this.paused)for(const action of active)if(!action.announced){
      action.announced=true;this.cues.push(action.events,this.clock);
      if(action.important&&this.stage?.clientWidth<this.width&&this.clock>=(this.manualPanUntil||0)){
        const e=action.events[0],points=[e.fromX,...action.events.map(hit=>hit.x)].filter(Number.isFinite).map(x=>(x+.5)/HEX_GRID.width*this.width);
        if(points.length)this.stage.scrollTo({left:clamp((Math.min(...points)+Math.max(...points))/2-this.stage.clientWidth/2,0,this.width-this.stage.clientWidth),behavior:this.reduced?'auto':'smooth'});
      }
    }
    this.root?.classList.toggle('observing-unit',!!this.focusedUnit);
    for(const el of this.elements||[]){
      const id=el.dataset.unit||el.dataset.inspect,source=active.find(a=>a.events[0].from===id),target=active.find(a=>a.events.some(e=>e.to===id&&e.from!==id));
      el.classList.toggle('observation-related',related.has(id));
      el.classList.toggle('acting-source',playing&&!!source);el.classList.toggle('acting-target',playing&&!!target);
      const info=this.unitActions?.get(id),tag=el.querySelector?.('.unit-current-action');
      const statuses=el.querySelector?.('.map-statuses'),statusHtml=statusMarkup.get(id);
      if(statuses&&statusHtml!==undefined&&statuses.innerHTML!==statusHtml)statuses.innerHTML=statusHtml;
      if(tag){
        const text=this.focusedUnit===id?(playing&&source?.important?source.events[0].label:[info?.text,info?.targetName].filter(Boolean).join(' → ')):'';if(tag.textContent!==text)tag.textContent=text;
        if(tag.hidden===!!tag.textContent)tag.hidden=!tag.textContent;
      }
      const actual=this.healthTo?.get(id);if(!actual)continue;
      let hp=actual.hp;
      if(playing){
        hp=this.healthFrom?.get(id)?.hp??actual.hp;
        for(const action of this.actions)if(this.clock>=action.start+action.duration*.52)for(const e of action.events)if(e.to===id&&e.tick===this.tick){hp+=e.healing||0;hp-=e.damage||0;}
        hp=clamp(hp,0,actual.maxHp);
      }
      const caption=el.querySelector?.('.unit-map-caption');presentationStyle(caption,'--troop-health',100*hp/Math.max(1,actual.maxHp)+'%');
      const troops=el.querySelector?.('.map-troops');if(troops&&troops.textContent!==Math.round(hp).toString())troops.textContent=Math.round(hp).toString();
      const roster=el.querySelector?.('[data-roster-troops]');if(roster){const text=hp>=10000?(hp/10000).toFixed(1)+'万':Math.round(hp).toLocaleString('zh-CN');if(roster.textContent!==text)roster.textContent=text;}
      const bar=el.querySelector?.('.label-health em');presentationStyle(bar,'width',100*hp/Math.max(1,actual.maxHp)+'%');
      if(el.dataset.unit&&actual.hp===0)el.classList.toggle('playback-fallen',!playing||hp<=0);
    }
  }
  drawFocus(cell){
    if(!this.focusedUnit)return;
    for(const id of this.relatedUnitIds()){
      const p=this.unitPosition?.(id);if(!p)continue;
      const c=this.ctx;c.save();c.globalAlpha=id===this.focusedUnit ? .9 : .5;c.strokeStyle='#f5e4b2';c.lineWidth=1.5;
      c.beginPath();c.ellipse(p.x*this.width,p.y*this.height+cell*.1,cell*.42,cell*.19,0,0,Math.PI*2);c.stroke();c.restore();
    }
  }
  drawOrb(e,p,from,to,cell,showNumber=true){
    const profile=ATTACK_ORBS[e.attackOrb]||Object.values(ATTACK_ORBS).find(o=>o.name===e.label);
    const color=profile?.color||'#d7c490';
    if(e.enchantment){drawCastSource(this,{...e,presentationKind:'support'},p,from,cell);return;}
    this.drawNormal(e,p,from,to,cell,this.mode==='clear'||this.reduced,showNumber);
    const t=clamp((p-.24)/.28),x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
    if(!this.reduced&&p>=.24&&p<.52)this.glow(x,y,cell*.23,color,.85);
  }
  drawClear(e, p, from, to, cell) {
    // Persistent statuses already act on the troop body. No generic halo.
  }
  point(x, y) { const p=hexCenter(x,y); return {x:p.x*this.width,y:p.y*this.height}; }
  line(x1, y1, x2, y2, color, width = 2, alpha = 1) {
    const c = this.ctx; c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  ring(x, y, radius, color, width = 2, alpha = 1) {
    const c = this.ctx; c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath(); c.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); c.stroke();
  }
  glow(x, y, radius, color, alpha) {
    const c = this.ctx; c.globalAlpha = alpha;
    const g = c.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, color); g.addColorStop(1, `${color}00`);
    c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  particles(x, y, t, color, seed, count = 15, spread = 75) {
    const c = this.ctx;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399 + seed, length = spread * (.4 + (i * 7 % 13) / 15) * ease(t);
      const px = x + Math.cos(angle) * length, py = y + Math.sin(angle) * length * .65 + t * t * 12;
      this.line(px, py, px - Math.cos(angle) * (3 + (1 - t) * 9), py - Math.sin(angle) * 5, color, i % 3 === 0 ? 2.5 : 1, (1 - t) * .85);
      c.fillStyle = '#fff4ce'; c.fillRect(px - 1, py - 1, 2, 2);
    }
  }
  label(text, x, y, color, alpha, size = 12) {
    size=Math.min(size,16);
    const ratio=this.width?this.canvas.width/this.width:1,entry=this.textCache?.get(String(text),size,color,Math.max(1,ratio));
    if(entry){
      const half=entry.width/2;x=clamp(x,half,this.width-half);y=clamp(y,size,this.height-size);
      this.ctx.globalAlpha=alpha;this.ctx.drawImage(entry.canvas,x-half,y-entry.height/2,entry.width,entry.height);return;
    }
    const c = this.ctx; c.globalAlpha = alpha; c.font = `500 ${size}px "Microsoft YaHei",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const half = c.measureText(text).width / 2 + 5;
    x = clamp(x, half, this.width - half); y = clamp(y, size, this.height - size);
    c.lineWidth = 2.5; c.strokeStyle = '#101c22'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  }
  drawImpact(e,p,from,to,color,accent,cell){
    drawCastTarget(this,e,p,from,to,cell);
  }
  drawCombo(e,p,to,cell){
    const fade=Math.min(1,p*8,(1-p)*3),color='#ffe4a0';
    // Partners acknowledge the cast with a local gesture. No actor-to-target beams.
    for(const actor of e.combo.actors||[]){
      const from=this.point(actor.x,actor.y);
      drawCastSource(this,{...e,presentationKind:'support'},p,from,cell*.8);
    }
    if(p>=.52){
      const q=clamp((p-.52)/.48);
      if(!this.reduced&&q<.5)this.particles(to.x,to.y,q*2,color,e.x+e.y,3,cell*.25);
    }
  }
  drawLocalSkill(e,p,from,to,cell){
    drawCastTarget(this,e,p,from,to,cell);
    const [color]=castPalette(e),fade=Math.min(1,(1-p)*2);
    if(e.showCastLabel&&this.focusedUnit===e.from)this.label(e.label,from.x,from.y-cell*.72,color,fade,10);
    if(p>.52){
      const text=e.text&&!e.damage&&!e.healing&&(e.text!==e.label||isHighlightedAbility(e))?e.text:'';
      if(text&&this.focusedUnit===e.to)this.label(text,to.x,to.y+cell*.36,color,fade,10);
    }
  }
  drawNormal(e, p, from, to, cell, compact = false, showNumber=true) {
    const ranged=['archer','crossbow','ship','siege'].includes(e.troop);
    drawCastTarget(this,{...e,presentationKind:ranged?'volley':'strike'},p,from,to,cell);
    if(showNumber&&!compact&&p>.52){
      const q=clamp((p-.52)/.48),color=e.critical?'#ffdb82':'#fff0d9';
      this.label(damageLabel(e),to.x,to.y-cell*(.8+q*.35),color,(1-q)*1.2,e.critical?14:12);
    }
  }
  drawCutIn(cast,p,color,accent) {
    const e=cast.events[0],linked=cast.events.some(hit=>hit.combo||hit.comboLevel>=2),critical=cast.events.some(hit=>hit.critical);
    drawFeaturedBanner(this,{id:e.from,name:e.name,title:e.label||'战法发动',side:e.side,kind:'战法',
      subtitle:linked?'连 携 发 动':critical?'大 战 法 · 暴 击':'大 战 法',color,accent},p);
  }
  drawCinematic(cast, cell) {
    const c = this.ctx, e = cast.events[0];
    this.showResult(cast.events);
    const p = clamp((this.clock - cast.start) / cast.duration, 0, 1);
    const fade = Math.min(1, p * 10 + .3, (1 - p) * 7);
    const [color,accent]=castPalette(e),from=this.point(e.fromX,e.fromY);
    c.save();
    drawBattleAtmosphere(this,p,color);
    drawCastSource(this,e,p,from,cell);
    const totals=new Map();
    for(const hit of castVisualEvents(cast.events)){
      const to=this.point(hit.x,hit.y),origin=this.point(hit.fromX,hit.fromY);
      if(hit.combo){this.drawCombo(hit,p,to,cell);continue;}
      drawCastTarget(this,hit,p,origin,to,cell);
      const key=hit.to||`${hit.x}:${hit.y}`;
      const total=totals.get(key)||{...hit,damage:0,healing:0,texts:new Set()};
      total.damage+=hit.damage||0;total.healing+=hit.healing||0;
      total.critical||=hit.critical;total.intentBlock||=hit.intentBlock;
      if(hit.text&&(/免疫|未命中|未生效|未成功|无效/.test(hit.text)||hit.tacticUseChange))total.texts.add(hit.text);
      totals.set(key,total);
    }
    if(p>.55)for(const hit of totals.values()){
      const to=this.point(hit.x,hit.y),flag=this.captionPositions?.get(hit.to);
      const text=[...hit.texts].filter(Boolean).join(' / ');
      if(text&&this.focusedUnit===hit.to)this.label(text,flag?flag.x+flag.width/2:to.x,flag?flag.y-9:to.y-cell*.82,'#d4c59e',fade,10);
    }
    if(this.mode!=='clear'&&!this.reduced&&p<.52)this.drawCutIn(cast,p,color,accent);
    else if(this.mode!=='clear'&&!this.reduced){
      const viewport=cinematicViewport(this);
      const band=clamp(this.height*.1,38,56);
      c.globalAlpha=fade*.9;c.fillStyle='#0b1d23';c.fillRect(viewport.left,0,viewport.width,band);
      this.line(viewport.left,band,viewport.left+viewport.width,band,accent,1,fade);
      this.label(`${e.name} · ${e.label}`,viewport.left+viewport.width/2,band*.5,color,fade,14);
    }
    c.restore();
  }
  draw(time) {
    if (this.destroyed) return;
    const delta = this.lastFrame ? Math.min(80, time - this.lastFrame) : 0; this.lastFrame = time;
    if (!this.paused && !document.hidden) this.clock += delta;
    if(!this.paused&&!document.hidden){const ready=this.sounds.filter(s=>s.start<=this.clock);this.sounds=this.sounds.filter(s=>s.start>this.clock);for(const sound of ready)sound.play();}
    const c = this.ctx; c.clearRect(0, 0, this.width, this.height);
    this.items = this.items.filter(e => this.clock - e.start < e.duration);
    this.cinematics = this.cinematics.filter(cast => this.clock - cast.start < cast.duration);
    this.syncCinematicState();
    this.syncPresentation();
    this.cues.advance(this.clock);
    const cell = Math.min(this.width / HEX_GRID.width, this.height / HEX_GRID.height);
    const clear = this.mode === 'clear' || this.reduced;
    const showTransient=!this.paused||this.isPresentationPlaying()||this.feedback.hits.some(e=>this.clock>=e.start&&this.clock<e.end)||this.feedback.changes.some(e=>this.clock>=e.start&&this.clock<e.end);
    this.signals.draw(this,cell);
    if(showTransient)this.drawFocus(cell);
    // A fresh paused snapshot hides saved hits; pausing live playback keeps
    // the current presentation frame available for inspection.
    const visible=this.isCinematicPlaying()||!showTransient?[]:clear?this.clearEffects():this.items;
    const castSources=new Set();
    for (const e of castVisualEvents(visible)) {
      if(this.clock<e.start||this.clock>=e.start+e.duration)continue;
      if(e.militaryOrder)continue; // The independent order channel renders this cast.
      c.save();
      if(this.focusedUnit&&!this.relatedUnitIds().has(e.from)&&!this.relatedUnitIds().has(e.to)){c.restore();continue;}
      const p = clamp((this.clock - e.start) / e.duration, 0, 1), from = this.point(e.fromX, e.fromY), to = this.point(e.x, e.y);
      const [color, accent] = COLORS[e.visual] || COLORS.slash;
      if(e.enchantment||e.attackOrb)this.drawOrb(e,p,from,to,cell,false);
      else if(e.skill&&!e.cinematic&&!e.combo&&!e.ongoing){
        const key=[e.from,e.label,e.start].join(':');
        if(!castSources.has(key)){drawCastSource(this,e,p,from,cell);castSources.add(key);}
        this.drawLocalSkill(e,p,from,to,cell);
      }
      else if (clear || e.abilityKind==='trait'&&!isHighlightedAbility(e)) {
        if(!e.skill&&!e.ongoing&&!e.abilityKind)this.drawNormal(e,p,from,to,cell,true,false);else this.drawClear(e,p,from,to,cell);
      }
      else if(e.combo)this.drawCombo(e,p,to,cell);
      else if (!e.skill&&!e.ongoing) this.drawNormal(e, p, from, to, cell,false,false);
      else {
        this.drawImpact(e, p, from, to, color, accent, cell);
        if(e.comboLevel)this.ring(to.x,to.y,cell*(.7+p*1.3),'#ffe28c',3,(1-p)*.8);
        if (p > .52 && e.text&&this.focusedUnit===e.to) this.label(e.text, to.x, to.y - cell * (.2 + p * .4), '#d4c59e', Math.min(1, (1 - p) * 2), 10);
      }
      c.restore();
    }
    const cinematic=this.currentCinematic();if(cinematic)this.drawCinematic(cinematic, cell);
    else if(!this.paused&&!this.isPresentationPlaying())this.cues.draw(this,cell);
    if(showTransient)this.feedback.draw(this,cell);
    this.signals.drawOrders(this,cell);
    if(!this.paused)this.invalidate();
  }
}
