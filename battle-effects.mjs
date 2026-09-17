// Presentation-only effects. All hits and casualties come from engine events.
import { COMBAT, GRID } from './engine.mjs';

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
    this.batch = null; this.consumed = 0; this.paused = true; this.speed = 1; this.destroyed = false;
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
  update(battle, { paused, speed }) {
    this.paused = paused; this.speed = speed;
    const batch = `${battle.id}:${battle.tick}`;
    if (this.batch !== batch) {this.batch = batch;this.consumed = 0;}
    // Commands may append new effects while paused at the same simulation tick.
    const added = battle.effects.slice(this.consumed);this.consumed = battle.effects.length;
    for (const event of added) {
      const source = battle.sides.flatMap(s => s.units).find(u => u.id === event.from);
      const e = { ...event, fromX: event.fromX ?? source?.x ?? event.x, fromY: event.fromY ?? source?.y ?? event.y, visual: event.visual || 'slash', name: event.name || source?.name || '', label: event.label || source?.skill || '', side: event.side ?? source?.side ?? 0, troop: event.troop || source?.type || 'spear', phase: event.phase || 'impact', start: this.clock };
      e.duration = e.phase === 'cast' ? COMBAT.stepMs * COMBAT.skillWindup / speed : e.skill ? Math.max(1100, 1800 / Math.sqrt(speed)) : Math.max(340, 620 / Math.sqrt(speed));
      this.items.push(e);
      if (e.combo)e.duration=Math.max(1600,2400/Math.sqrt(speed));
      if (e.skill && e.phase === 'cast' || e.combo) this.notice(e);
    }
    this.items = this.items.slice(-100);
  }
  notice(e) {
    const item = document.createElement('div'); item.className = `skill-announcement side-${e.side} fx-${e.visual}${e.combo?' combo-announcement':''}`;
    const badge = document.createElement('span'); badge.className = 'skill-seal'; badge.textContent = e.combo ? e.label : '战法';
    const name = document.createElement('span'); name.className = 'skill-officer'; name.textContent = `${e.side ? '敌军' : '我军'} · ${e.combo ? e.combo.actors.map(a=>a.name).join(' × ')+' → '+e.combo.targetName : e.name}`;
    const title = document.createElement('strong'); title.textContent = e.combo ? '效果增强 +'+e.combo.bonus+'%' : e.label;
    item.append(badge, name, title); this.feed.append(item);
    this.notices.push({ element: item, expires: this.clock + (e.combo?4200:3100) });
    while (this.notices.length > 3) this.notices.shift().element.remove();
  }
  isBusy() { return this.items.some(e => this.clock - e.start < e.duration); }
  destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.resize.disconnect(); this.items = []; }
  point(x, y) { return { x: (x + .5) * this.width / GRID.cols, y: (y + .5) * this.height / GRID.rows }; }
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
  drawCast(e, p, from, to, color, accent, cell) {
    const c = this.ctx, r = cell * (.35 + p * .45);
    this.glow(from.x, from.y, cell * 1.3, accent, .26 + p * .3);
    this.ring(from.x, from.y, r, color, 2, .75);
    this.ring(from.x, from.y, cell * .8, accent, 1, .6);
    c.save(); c.translate(from.x, from.y); c.rotate(p * 2);
    c.strokeStyle = color; c.lineWidth = 1.5; c.globalAlpha = .7;
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(cell * .52, -3); c.lineTo(cell * .65, 0); c.lineTo(cell * .52, 3); c.stroke();
    }
    c.restore();
    for (let i = 0; i < 7; i++) {
      const a = i * .9 + p * 4, radius = cell * (1.15 - .75 * p);
      this.glow(from.x + Math.cos(a) * radius, from.y + Math.sin(a) * radius * .7, 5, color, .8);
    }
    c.setLineDash([3, 7]); this.line(from.x, from.y, to.x, to.y, accent, 1, .35); c.setLineDash([]);
    this.ring(to.x, to.y, cell * .42, accent, 1, .4);
    this.label('蓄势', from.x, from.y - cell * .75, color, 1, Math.max(11, cell * .23));
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
  draw(time) {
    if (this.destroyed) return;
    const delta = this.lastFrame ? Math.min(80, time - this.lastFrame) : 0; this.lastFrame = time;
    if (!this.paused && !document.hidden) this.clock += delta;
    const c = this.ctx; c.clearRect(0, 0, this.width, this.height);
    this.items = this.items.filter(e => this.clock - e.start < e.duration);
    for (const notice of this.notices.filter(n => n.expires <= this.clock)) notice.element.remove();
    this.notices = this.notices.filter(n => n.expires > this.clock);
    const cell = Math.min(this.width / GRID.cols, this.height / GRID.rows);
    for (const e of this.items) {
      c.save();
      const p = clamp((this.clock - e.start) / e.duration, 0, 1), from = this.point(e.fromX, e.fromY), to = this.point(e.x, e.y);
      const [color, accent] = COLORS[e.visual] || COLORS.slash;
      if (this.reduced) {
        if(e.combo)this.label(e.label+' · 效果 +'+e.combo.bonus+'%',to.x,to.y-cell*.8,color,1,14);
        else if (e.skill) this.label(e.phase === 'cast' ? `蓄势 · ${e.label}` : e.text || `${e.label}${e.damage ? ` −${e.damage}` : ''}`, to.x, to.y - cell * .8, color, 1, 12);
      } else if(e.combo)this.drawCombo(e,p,to,cell);
      else if (!e.skill) this.drawNormal(e, p, from, to, cell);
      else if (e.phase === 'cast') this.drawCast(e, p, from, to, color, accent, cell);
      else {
        this.drawImpact(e, p, from, to, color, accent, cell);
        if(e.comboLevel)this.ring(to.x,to.y,cell*(.7+p*1.3),'#ffe28c',3,(1-p)*.8);
        if (p > .2 && (e.damage || e.text)) this.label(e.text || `−${e.damage}`, to.x, to.y - cell * (.2 + p * .4), e.comboLevel?'#ffe38a':'#fff1b4', Math.min(1, (1 - p) * 2), clamp(cell * (e.comboLevel?.52:.43), 14, e.comboLevel?30:26));
      }
      c.restore();
    }
    this.frame = requestAnimationFrame(t => this.draw(t));
  }
}
