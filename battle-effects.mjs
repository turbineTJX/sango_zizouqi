import {hexCenter, HEX_GRID} from './hex-grid.mjs';
// Presentation-only effects. All hits and casualties come from engine events.

const COLORS = {
  charge: ['#ffe5a3', '#efac45'], fire: ['#ffe6a1', '#ff7543'],
  shockwave: ['#e7f8ff', '#74c6ea'], banner: ['#fff2b8', '#d9bd65'],
  volley: ['#d3ffe2', '#79d6ac'], slash: ['#f4faff', '#a0d9f1'],
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const ease = t => 1 - (1 - t) ** 3;

export class BattleEffects {
  constructor(canvas, feed) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.feed = feed;
    this.items = []; this.notices = []; this.clock = 0; this.lastFrame = 0;
    this.cinematics = []; this.battleId = null;
    this.batch = null; this.consumed = 0; this.paused = true; this.speed = 1; this.destroyed = false; this.mode = 'clear';
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize = new ResizeObserver(() => this.resizeCanvas()); this.resize.observe(canvas);
    this.resizeCanvas(); this.frame = requestAnimationFrame(time => this.draw(time));
  }
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  update(battle, { paused, speed, mode = 'clear' }) {
    if (this.battleId !== battle.id) {
      this.items = []; this.cinematics = []; this.batch = null;
      this.notices.forEach(n => n.element.remove()); this.notices = [];
      this.battleId = battle.id;
    }
    if (speed !== this.speed) for (const e of this.items) {
      const ratio = this.speed / speed;
      e.start = this.clock - (this.clock - e.start) * ratio;
      e.duration *= ratio;
    }
    this.paused = paused; this.speed = speed; this.mode = mode;
    const batch = `${battle.id}:${battle.tick}`;
    if (this.batch !== batch) {
      // Stepping through paused turns must not queue historical hits for playback.
      if (paused) { this.items = []; this.cinematics = []; }
      this.batch = batch; this.consumed = 0;
    }
    // Commands may append new effects while paused at the same simulation tick.
    const added = battle.effects.slice(this.consumed);this.consumed = battle.effects.length;
    const casts = new Map();
    for (const event of added) {
      if(event.phase==='cast') continue; // Ignore obsolete windup events restored from older saves.
      const source = battle.sides.flatMap(s => s.units).find(u => u.id === event.from);
      const target = battle.sides.flatMap(s => s.units).find(u => u.id === event.to) || (battle.siege?.gate.id === event.to ? battle.siege.gate : null);
      const e = { ...event, tick:battle.tick, targetName:target?.name || event.combo?.targetName || '', fromX: event.fromX ?? source?.x ?? event.x, fromY: event.fromY ?? source?.y ?? event.y, visual: event.visual || 'slash', name: event.name || source?.name || '', label: event.label || source?.skill || '', side: event.side ?? source?.side ?? 0, troop: event.troop || source?.type || 'spear', phase: event.phase || 'impact', start: this.clock };
      e.duration = (e.combo ? 1000 : e.skill ? 650 : 350) / speed;
      this.items.push(e);
      if (e.skill || e.combo) this.notice(e);
      if (!paused && (e.skill || e.combo)) {
        const key = `${e.side}:${e.from}:${e.label}:${!!e.combo}`;
        if (!casts.has(key)) casts.set(key, []);
        casts.get(key).push(e);
      }
    }
    // One short cut-in per cast, including all its targets and hits. This clock
    // is presentation-only: the app holds subsequent simulation steps for it.
    for (const events of casts.values()) {
      const duration = this.reduced ? 500 : clamp(960 / Math.sqrt(speed), 640, 1100);
      const previous = this.cinematics.at(-1);
      this.cinematics.push({ events, duration, start: previous ? previous.start + previous.duration : this.clock });
    }
    this.syncCinematicState();
    this.items = this.items.slice(-100);
  }
  isCinematicPlaying() { return this.cinematics.length > 0; }
  syncCinematicState() {
    this.canvas.parentElement?.classList.toggle('tactic-cinematic', this.isCinematicPlaying());
  }
  notice(e) {
    // A multi-hit/multi-target skill gets one log row; its actual effects stay intact.
    const key = `${e.tick}:${e.side}:${e.from}:${e.label}:${e.phase}:${!!e.combo}`;
    if (this.notices.some(n => n.key === key)) return;
    const item = document.createElement('div'); item.className = `skill-announcement side-${e.side} fx-${e.visual}${e.combo?' combo-announcement':''}`;
    const badge = document.createElement('span'); badge.className = 'skill-seal'; badge.textContent = e.combo ? e.label : '施放';
    const name = document.createElement('span'); name.className = 'skill-officer'; name.textContent = `${e.side ? '敌' : '我'} · ${e.tick}步 · ${e.combo ? e.combo.actors.map(a=>a.name).join(' + ')+' → '+e.combo.targetName : e.name + (e.targetName && e.to !== e.from ? ' → '+e.targetName : '')}`;
    const title = document.createElement('strong'); title.textContent = e.combo ? '效果 +'+e.combo.bonus+'%' : e.label;
    item.title = `${name.textContent} · ${badge.textContent} · ${title.textContent}`;
    item.append(badge, name, title); this.feed.append(item);
    this.notices.push({ element: item, key, side:e.side });
    while (this.notices.filter(n=>n.side===e.side).length > 2) {
      const index = this.notices.findIndex(n=>n.side===e.side);
      this.notices.splice(index,1)[0].element.remove();
    }
  }
  isBusy() { return this.isCinematicPlaying() || this.items.some(e => this.clock - e.start < e.duration); }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.resize.disconnect(); this.items = []; this.cinematics = []; this.syncCinematicState(); this.notices.forEach(n=>n.element.remove()); this.notices = []; }
  clearEffects() {
    const latest = new Map();
    for (const e of this.items) {
      const key = `hit:${e.to}`;
      latest.set(key,e);
    }
    return [...latest.values()].slice(-12);
  }
  damageSummaries() {
    const totals = new Map();
    for (const e of this.items) {
      if (!e.damage) continue;
      const old = totals.get(e.to);
      if (old?.tick === e.tick) { old.damage += e.damage; old.duration = Math.max(old.duration,e.duration); }
      else totals.set(e.to,{...e});
    }
    return [...totals.values()];
  }
  drawClear(e, p, from, to, cell) {
    const color = e.side ? '#f0ac9a' : '#a1dcc7', c = this.ctx;
    if (p < .5 && e.from !== e.to && !this.reduced) {
      const t = ease(Math.min(1,p*3)), x=from.x+(to.x-from.x)*t, y=from.y+(to.y-from.y)*t;
      // A short travelling stroke communicates direction without a permanent beam.
      this.line(x-(to.x-from.x)*.07,y-(to.y-from.y)*.07,x,y,color,1.5,(1-p)*.7);
    }
    c.globalAlpha=(1-p)*.65;c.strokeStyle=color;c.lineWidth=e.combo?2:1;
    const r=cell*(e.combo?.43:.36);c.strokeRect(to.x-r,to.y-r,r*2,r*2);
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
  label(text, x, y, color, alpha, size = 18) {
    const c = this.ctx; c.globalAlpha = alpha; c.font = `bold ${size}px "Microsoft YaHei",sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const half = c.measureText(text).width / 2 + 5;
    x = clamp(x, half, this.width - half); y = clamp(y, size, this.height - size);
    c.lineWidth = 4; c.strokeStyle = '#101c22'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  }
  drawImpact(e, p, from, to, color, accent, cell) {
    const c = this.ctx, reach = clamp(p / .3, 0, 1), q = clamp((p - .15) / .85, 0, 1);
    const px = from.x + (to.x - from.x) * ease(reach), py = from.y + (to.y - from.y) * ease(reach);
    c.lineCap = 'round';
    if (e.visual === 'charge') {
      const angle = Math.atan2(to.y - from.y, to.x - from.x), nx = -Math.sin(angle), ny = Math.cos(angle);
      for (let i = -2; i <= 2; i++) this.line(from.x + nx * i * 6, from.y + ny * i * 6, px + nx * i * 6, py + ny * i * 6, i === 0 ? color : accent, i === 0 ? 5 : 2, (1 - p) * .85);
      this.glow(px, py, cell * .65, color, .7 * (1 - p));
      this.ring(to.x, to.y, cell * (q * 1.7 + .1), accent, 4 * (1 - q), .8 * (1 - q));
    } else if (e.visual === 'fire') {
      this.line(from.x, from.y, px, py, accent, 2.5, (1 - p) * .7);
      this.glow(px, py, cell * .6, color, .85 * (1 - p));
      if (p > .13) {
        this.glow(to.x, to.y, cell * 1.8, accent, Math.sin(q * Math.PI) * .65);
        for (let i = 0; i < 11; i++) {
          const spread = (i - 5) * cell * .15, height = cell * (1.1 + (i * 3 % 5) * .12) * Math.sin(q * Math.PI);
          c.globalAlpha = (1 - q) * .8; c.fillStyle = i % 2 ? accent : color;
          c.beginPath(); c.moveTo(to.x + spread - 7, to.y + 12);
          c.quadraticCurveTo(to.x + spread - 13, to.y - height * .4, to.x + spread + Math.sin(p * 8 + i) * 7, to.y - height);
          c.quadraticCurveTo(to.x + spread + 12, to.y - height * .2, to.x + spread + 7, to.y + 12); c.fill();
        }
      }
    } else if (e.visual === 'shockwave') {
      for (let i = 0; i < 3; i++) {
        const t = clamp(p * 1.4 - i * .16, 0, 1);
        this.ring(to.x, to.y, cell * (t * 2.2 + .15), i % 2 ? accent : color, (1 - t) * 4 + 1, (1 - t) * .8);
      }
      this.line(from.x, from.y, to.x, to.y, color, 3, (1 - p) * .6);
    } else if (e.visual === 'banner') {
      this.glow(from.x, from.y, cell * 1.5, accent, .4 * (1 - p));
      c.save(); c.translate(from.x, from.y); c.globalAlpha = 1 - p; c.strokeStyle = color; c.lineWidth = 2;
      c.strokeRect(-cell * .45, -cell * 1.55, cell * .9, cell * 1.2);
      c.font = `${cell * .65}px serif`; c.fillStyle = color; c.textAlign = 'center'; c.fillText('令', 0, -cell * .67); c.restore();
      this.line(from.x, from.y, to.x, to.y, accent, 6 * (1 - p), .7 * (1 - p));
      this.ring(to.x, to.y, cell * (q * 1.5 + .2), color, 3, 1 - q);
    } else if (e.visual === 'volley') {
      for (let i = 0; i < 7; i++) {
        const t = clamp(p * 2.5 - i * .08, 0, 1), offset = (i - 3) * 6;
        const ax = from.x + (to.x - from.x) * t + offset * t, ay = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * cell * 1.4;
        if (t < 1) this.line(ax - (to.x - from.x) * .06, ay - (to.y - from.y) * .06 - 7, ax, ay, color, 2, .9);
        else this.line(to.x + offset - 3, to.y - cell * .6, to.x + offset, to.y + 8, accent, 2, 1 - p);
      }
    } else {
      c.save(); c.translate(to.x, to.y); c.rotate(-.7 + p * .5);
      for (let i = 0; i < 2; i++) {
        c.globalAlpha = Math.max(0, 1 - p * 1.15); c.lineWidth = (i ? 3 : 8) * (1 - p) + 1; c.strokeStyle = i ? color : accent;
        c.beginPath(); c.ellipse(0, 0, cell * (1 + p), cell * .42, i * 1.8, -.2, Math.PI * 1.2 * ease(Math.min(1, p * 4))); c.stroke();
      }
      c.restore();
      this.line(from.x, from.y, to.x, to.y, color, 2, (1 - p) * .4);
    }
    if (p > .16) { this.particles(to.x, to.y, q, color, e.x + e.y, e.visual === 'fire' ? 22 : 14, cell * 1.7); this.glow(to.x, to.y, cell * .6, '#fff6d5', Math.max(0, .4 - q)); }
    this.label(e.label, to.x, to.y - cell * (1.05 + p * .25), color, Math.min(1, (1 - p) * 3), clamp(cell * .32, 12, 20));
  }
  drawCombo(e,p,to,cell) {
    const color=e.side?'#ffb087':'#ffe7a0',accent=e.side?'#e96850':'#ecc34d';
    const fade=Math.min(1,(1-p)*3),reach=ease(clamp(p/.3,0,1));
    for(const actor of e.combo.actors) {
      const from=this.point(actor.x,actor.y);
      this.glow(from.x,from.y,cell*.85,accent,.45*fade);
      this.ring(from.x,from.y,cell*.5,color,2,fade);
      this.line(from.x,from.y,from.x+(to.x-from.x)*reach,from.y+(to.y-from.y)*reach,accent,7,fade*.45);
      this.line(from.x,from.y,from.x+(to.x-from.x)*reach,from.y+(to.y-from.y)*reach,color,2.5,fade);
    }
    this.glow(to.x,to.y,cell*2.1,accent,.35*fade);
    for(let i=0;i<e.combo.level;i++)this.ring(to.x,to.y,cell*(.45+i*.35+p*1.1),i%2?accent:color,3,fade*(1-i*.18));
    if(p>.12)this.particles(to.x,to.y,p,color,e.x+e.y,24,cell*2.4);
    this.label(e.label,to.x,to.y-cell*.7,color,fade,clamp(cell*.58,17,32));
    this.label('效果 +'+e.combo.bonus+'%',to.x,to.y+cell*.35,color,fade,clamp(cell*.32,11,18));
  }
  drawNormal(e, p, from, to, cell) {
    const t = ease(clamp(p / .45, 0, 1)), color = e.side ? '#e2ab8e' : '#c9dfbb';
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t;
    if (['archer','crossbow'].includes(e.troop) && p < .5) this.line(x, y, x - (to.x - from.x) * .1, y - (to.y - from.y) * .1, color, 1.8, .9);
    else if (p < .55) this.line(to.x - cell * .22, to.y + cell * .2, to.x + cell * .22, to.y - cell * .2, color, 2, (1 - p * 1.7) * .75);
    if (p > .25) this.label(`−${e.damage}`, to.x, to.y - cell * (.35 + p * .5), color, 1 - p, clamp(cell * .25, 10, 15));
  }
  drawCinematic(cast, cell) {
    const c = this.ctx, e = cast.events[0];
    const p = clamp((this.clock - cast.start) / cast.duration, 0, 1);
    const fade = Math.min(1, p * 10 + .3, (1 - p) * 7);
    const [color, accent] = COLORS[e.visual] || COLORS.slash;
    const from = this.point(e.fromX, e.fromY);
    c.save();
    c.globalAlpha = fade * .46; c.fillStyle = '#061313'; c.fillRect(0, 0, this.width, this.height);
    this.glow(from.x, from.y, cell * 1.4, accent, fade * .42);
    this.ring(from.x, from.y, cell * (.58 + (this.reduced ? 0 : Math.min(p, .28))), color, 3, fade);
    this.label(e.name, from.x, from.y + cell * .72, color, fade, clamp(cell * .25, 12, 18));
    // A brief reveal precedes the impact; reduced motion keeps a static focus.
    const impact = clamp((p - .22) / .78, 0, 1);
    if (p >= .22) {
      const totals = new Map();
      for (const hit of cast.events) {
        const to = this.point(hit.x, hit.y), origin = this.point(hit.fromX, hit.fromY);
        if (this.reduced) this.ring(to.x, to.y, cell * .55, color, 2, fade);
        else if (hit.combo) this.drawCombo(hit, impact, to, cell);
        else this.drawImpact({...hit, label: ''}, impact, origin, to, color, accent, cell);
        const key = hit.to || `${hit.x}:${hit.y}`;
        const total = totals.get(key) || { ...hit, damage: 0, texts: new Set() };
        total.damage += hit.damage || 0;
        if (hit.text) total.texts.add(hit.text);
        totals.set(key, total);
      }
      if (impact > .18) for (const hit of totals.values()) {
        const to = this.point(hit.x, hit.y);
        const text = [...hit.texts].join(' · ') || (hit.damage ? `−${hit.damage}` : '');
        if (text) this.label(text, to.x, to.y - cell * .72, '#fff1b4', fade, clamp(cell * .44, 16, 28));
      }
    }
    const band = clamp(this.height * .22, 68, 108), slide = this.reduced ? 0 : (1 - ease(clamp(p / .2, 0, 1))) * 35;
    c.globalAlpha = fade * .94; c.fillStyle = '#102323'; c.fillRect(0, 0, this.width, band);
    this.line(0, band, this.width, band, accent, 2, fade * .8);
    const size = clamp(this.width * .043, 24, 42);
    this.label(e.label, this.width / 2 + slide, band * .64, color, fade, size);
    const officer = e.combo ? e.combo.actors.map(a => a.name).join(' · ') : e.name;
    this.label(`${e.side ? '敌军' : '我军'} · ${officer} · ${e.combo ? '连携发动' : '战法发动'}`, this.width / 2, band * .23, '#e1deca', fade, clamp(this.width * .017, 12, 16));
    this.label('战法演出 · 战场暂歇', this.width / 2, this.height - 18, '#d4d9c7', fade * .8, 12);
    c.restore();
  }
  draw(time) {
    if (this.destroyed) return;
    const delta = this.lastFrame ? Math.min(80, time - this.lastFrame) : 0; this.lastFrame = time;
    if (!this.paused && !document.hidden) this.clock += delta;
    const c = this.ctx; c.clearRect(0, 0, this.width, this.height);
    this.items = this.items.filter(e => this.clock - e.start < e.duration);
    this.cinematics = this.cinematics.filter(cast => this.clock - cast.start < cast.duration);
    this.syncCinematicState();
    const cell = Math.min(this.width / HEX_GRID.width, this.height / HEX_GRID.height);
    const clear = this.mode === 'clear' || this.reduced;
    // Paused inspection and single stepping leave a clean board and the external log.
    for (const e of this.isCinematicPlaying() || (clear && this.paused) ? [] : clear ? this.clearEffects() : this.items) {
      c.save();
      const p = clamp((this.clock - e.start) / e.duration, 0, 1), from = this.point(e.fromX, e.fromY), to = this.point(e.x, e.y);
      const [color, accent] = COLORS[e.visual] || COLORS.slash;
      if (clear) this.drawClear(e,p,from,to,cell);
      else if(e.combo)this.drawCombo(e,p,to,cell);
      else if (!e.skill) this.drawNormal(e, p, from, to, cell);
      else {
        this.drawImpact(e, p, from, to, color, accent, cell);
        if(e.comboLevel)this.ring(to.x,to.y,cell*(.7+p*1.3),'#ffe28c',3,(1-p)*.8);
        if (p > .2 && (e.damage || e.text)) this.label(e.text || `−${e.damage}`, to.x, to.y - cell * (.2 + p * .4), e.comboLevel?'#ffe38a':'#fff1b4', Math.min(1, (1 - p) * 2), clamp(cell * (e.comboLevel?.52:.43), 14, e.comboLevel?30:26));
      }
      c.restore();
    }
    if (clear && !this.paused && !this.isCinematicPlaying()) for (const e of this.damageSummaries()) {
      const to=this.point(e.x,e.y),p=clamp((this.clock-e.start)/e.duration,0,1);
      this.label(`−${e.damage}`,to.x,to.y-cell*.38,e.side?'#f5b5a5':'#b9ebd9',1-p,clamp(cell*.21,10,14));
    }
    if (this.cinematics[0]) this.drawCinematic(this.cinematics[0], cell);
    this.frame = requestAnimationFrame(t => this.draw(t));
  }
}
