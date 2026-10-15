import { Stage } from './Stage.js';
import { Bee } from './Bee.js';
import { Horse } from './Horse.js';
import { Crosshair } from './Crosshair.js';
import { InputHandler } from './Input.js';
import { audio } from './Audio.js';

const W = 800;
const H = 600;
const PIXEL = '"Press Start 2P", monospace';
const BODY = '"VT323", monospace';
const COLORS = {
  gold: '#f2b94b',
  cream: '#f1e3c4',
  dim: 'rgba(241, 227, 196, 0.65)',
  red: '#e0474c',
  green: '#5fd38d',
  navy: '#0a0e24',
  shadow: 'rgba(10, 14, 36, 0.9)'
};
const BEST_KEY = 'bee_hunt_best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = W;
    this.height = H;

    this.stage = new Stage(W, H);
    this.crosshair = new Crosshair();
    this.input = new InputHandler(canvas, W, H, (x, y) => this.handleShoot(x, y), () => this.handleReload());

    this.sprites = {};
    this.horse = null;

    this.state = 'LOADING'; // LOADING, MENU, INTRO, PLAYING, ROUND_CLEAR, GAME_OVER
    this.paused = false;

    this.maxBullets = 6;
    this.bullets = this.maxBullets;
    this.reloading = false;
    this.reloadTimer = 0;
    this.reloadDuration = 1.3;
    this.roundDuration = 40;

    this.bees = [];
    this.spawnTimers = [0, 0.7];
    this.horseTimer = 5;
    this.campLimit = 5.5; // seconds firing at one side before the horse reacts
    this.resetCamping();
    this.stateTimer = 0;
    this.lastTime = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) || 0);

    this.resetStats();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isActive()) this.paused = true;
    });

    this.init();
  }

  resetStats() {
    this.score = 0;
    this.round = 1;
    this.totalShots = 0;
    this.totalHits = 0;
    this.combo = 0;
    this.roundHits = 0;
    this.quota = 15;
    this.timerLeft = this.roundDuration;
  }

  isActive() {
    return this.state === 'INTRO' || this.state === 'PLAYING';
  }

  // Render at device resolution, draw in 800x600 logical units
  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.round(r.width * dpr);
    const ph = Math.round(r.height * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.scaleX = pw / W;
    this.scaleY = ph / H;
  }

  async init() {
    await Promise.all([this.loadAssets(), this.loadFonts()]);
    this.sprites.bee50 = this.makeGoldVariant(this.sprites.bee50);
    this.horse = new Horse({
      cheerSprite: this.sprites.horseCheer,
      laughSprite: this.sprites.horseLaugh,
      counterY: this.stage.counterY,
      boundsWidth: W
    });
    this.state = 'MENU';
  }

  async loadFonts() {
    if (!document.fonts) return;
    const timeout = new Promise((r) => setTimeout(r, 2500));
    try {
      await Promise.race([
        Promise.all([document.fonts.load(`16px ${PIXEL}`), document.fonts.load(`20px ${BODY}`)]),
        timeout
      ]);
    } catch {
      /* fall back to monospace */
    }
  }

  loadAssets() {
    const list = {
      bee10: 'bee_10.png', bee15: 'bee_15.png', bee20: 'bee_20.png',
      bee25: 'bee_25.png', bee50: 'bee_50.png',
      horseCheer: 'horse_cheer.png', horseLaugh: 'horse_laugh.png'
    };
    return Promise.all(Object.entries(list).map(([key, file]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.sprites[key] = img; resolve(); };
      img.onerror = () => { console.warn(`Missing sprite ${file}`); resolve(); };
      img.src = `/assets/sprites/${file}`;
    })));
  }

  // Warm golden tint for the rare 50 pt bee
  makeGoldVariant(img) {
    if (!img) return img;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255, 196, 40, 0.28)';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // ---------- FLOW ----------
  startNewGame() {
    this.resetStats();
    this.startRound(1);
  }

  startRound(n) {
    this.round = n;
    this.roundHits = 0;
    this.quota = Math.min(12 + n * 3, 36);
    this.timerLeft = this.roundDuration;
    this.bullets = this.maxBullets;
    this.reloading = false;
    this.combo = 0;
    this.resetCamping();
    this.horseTimer = n === 1 ? (4.5 + Math.random() * 2) : 1.5;
    this.state = 'INTRO';
    this.stateTimer = 1.8;
    audio.playCheer();
  }

  endRound() {
    if (this.roundHits >= this.quota) {
      this.state = 'ROUND_CLEAR';
      this.stateTimer = 2.6;
      audio.playCheer();
    } else {
      this.gameOver();
    }
  }

  gameOver() {
    this.state = 'GAME_OVER';
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    if (this.horse) {
      if (this.horse.isVisible()) this.horse.laugh();
      else this.horse.popup('laugh', 3);
    }
    audio.playGameOver();
    window.dispatchEvent(new CustomEvent('bee-hunt-game-over', {
      detail: {
        score: this.score,
        round: this.round,
        hits: this.totalHits,
        shots: this.totalShots,
        accuracy: this.totalShots ? Math.round((this.totalHits / this.totalShots) * 100) : 0
      }
    }));
  }

  speedMultiplier() {
    if (this.round === 1) return 1.0;
    return 1.55 + (this.round - 2) * 0.30;
  }

  multiplier() {
    return Math.min(3, 1 + Math.floor(this.combo / 5));
  }

  // ---------- SPAWNING ----------
  selectTier() {
    const r = Math.random();
    if (r < 0.04) return 50; // rare golden bee
    if (r < 0.40) return 10;
    if (r < 0.68) return 15;
    if (r < 0.88) return 20;
    return 25;
  }

  canSpawn(row) {
    const gap = 30;
    return !this.bees.some((b) => b.row === row && (b.state === 'MOVING' || b.state === 'FOLDING') &&
      (row === 0 ? b.x < gap : b.x + b.width > W - gap));
  }

  updateSpawns(dt, mul) {
    for (const row of [0, 1]) {
      this.spawnTimers[row] -= dt;
      if (this.spawnTimers[row] > 0) continue;
      if (!this.canSpawn(row)) {
        this.spawnTimers[row] = 0.1;
        continue;
      }
      const tier = this.selectTier();
      this.bees.push(new Bee({
        row,
        tier,
        sprite: this.sprites[`bee${tier}`],
        boundsWidth: W,
        shelfY: row === 0 ? this.stage.topShelfY : this.stage.bottomShelfY,
        speed: this.stage.beltSpeeds[row]
      }));
      if (tier === 50 && this.isActive()) audio.playSpecialBee();
      this.spawnTimers[row] = (1.0 + Math.random() * 1.1) / Math.sqrt(mul);
    }
  }

  // ---------- INPUT ----------
  handleShoot(x, y) {
    if (this.state === 'LOADING') return;
    if (this.state === 'MENU') {
      audio.init();
      this.startNewGame();
      return;
    }
    if (this.paused) {
      this.paused = false;
      return;
    }
    if (this.state !== 'PLAYING') return;

    if (this.reloading) {
      audio.playEmpty();
      return;
    }
    if (this.bullets <= 0) {
      audio.playEmpty();
      this.handleReload();
      return;
    }

    this.bullets--;
    this.totalShots++;
    this.registerShotSector(x);
    this.stage.triggerFlash();
    audio.playShot();

    if (this.horse && this.horse.checkHit(x, y)) {
      this.horse.laugh();
      audio.playBlock();
      audio.playLaugh();
      this.combo = 0;
      this.crosshair.addImpact(x, y, false);
      this.autoReload();
      return;
    }

    const hit = this.bees.find((b) => b.checkHit(x, y));
    if (hit) {
      this.totalHits++;
      this.roundHits++;
      this.combo++;
      const mult = this.multiplier();
      const pts = hit.tier * mult;
      this.score += pts;
      hit.showPoints(pts, mult);
      audio.playHit();
      this.crosshair.addImpact(x, y, true);
    } else {
      this.combo = 0;
      this.crosshair.addImpact(x, y, false);
      if (this.horse && this.horse.isVisible()) {
        this.horse.laugh();
        audio.playLaugh();
      }
    }
    this.autoReload();
  }

  // ---------- ANTI-CAMPING ----------
  resetCamping() {
    this.campSector = -1;
    this.campTime = 0;
    this.campShots = 0;
    this.sinceShot = 0;
  }

  sectorOf(x) {
    return x < 320 ? 0 : (x <= 480 ? 1 : 2);
  }

  registerShotSector(x) {
    const s = this.sectorOf(x);
    if (s !== this.campSector) {
      this.campSector = s;
      this.campTime = 0;
      this.campShots = 0;
    }
    this.campShots++;
    this.sinceShot = 0;
  }

  updateCamping(dt) {
    if (this.campSector < 0) return;
    this.sinceShot += dt;
    // Pause in firing (or long reload) forgives the streak
    if (this.sinceShot > 3) {
      this.resetCamping();
      return;
    }
    this.campTime += dt;
    if (this.campTime >= this.campLimit && this.campShots >= 4 && this.horse) {
      const lane = this.horse.lanes[this.campSector];
      const already = this.horse.intercept(lane, 3.5);
      if (already) {
        this.horse.laugh();
        audio.playLaugh();
      }
      this.horseTimer = Math.max(this.horseTimer, 3);
      // Keep watching: next check after another stretch
      this.campTime = this.campLimit - 3;
      this.campShots = 0;
    }
  }

  autoReload() {
    if (this.bullets === 0) this.handleReload();
  }

  handleReload() {
    if (this.state !== 'PLAYING' || this.reloading || this.bullets === this.maxBullets) return;
    this.reloading = true;
    this.reloadTimer = this.reloadDuration;
    audio.playReload();
  }

  // ---------- UPDATE ----------
  update(dt) {
    this.crosshair.setPosition(this.input.mouseX, this.input.mouseY);
    this.crosshair.visible = !this.input.isTouch && this.input.inside && this.state !== 'LOADING';
    this.crosshair.update(dt);

    if (this.paused) return;

    const mul = this.state === 'MENU' ? 0.8 : this.speedMultiplier();
    this.stage.setBeltSpeeds(95 * mul, 115 * mul);
    this.stage.update(dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.bullets = this.maxBullets;
      }
    }

    if (this.state !== 'LOADING' && this.state !== 'GAME_OVER') {
      this.updateSpawns(dt, mul);
    }
    for (const b of this.bees) b.update(dt);
    this.bees = this.bees.filter((b) => !b.isGone());

    if (this.horse) this.horse.update(dt);

    if (this.state === 'INTRO') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.state = 'PLAYING';
    } else if (this.state === 'PLAYING') {
      this.timerLeft -= dt;
      this.horseTimer -= dt;
      this.updateCamping(dt);
      if (this.horseTimer <= 0 && this.horse) {
        const holdTime = this.round === 1 ? 2.8 : (3.8 + Math.random() * 0.6);
        this.horse.popup('cheer', holdTime);
        this.horseTimer = this.round === 1
          ? (7 + Math.random() * 3)
          : (2.0 + Math.random() * 1.6);
      }
      if (this.timerLeft <= 0) {
        this.timerLeft = 0;
        this.endRound();
      }
    } else if (this.state === 'ROUND_CLEAR') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) this.startRound(this.round + 1);
    }
  }

  // ---------- RENDER ----------
  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.stage.renderBack(ctx);
    for (const b of this.bees) if (b.row === 0) b.render(ctx);
    for (const b of this.bees) if (b.row === 1) b.render(ctx);
    if (this.horse) this.horse.render(ctx);
    this.stage.renderFront(ctx);
    for (const b of this.bees) b.renderPopup(ctx);

    if (this.state !== 'MENU' && this.state !== 'LOADING') this.drawHUD(ctx);
    this.drawOverlay(ctx);
    this.crosshair.render(ctx);
    this.stage.renderFlash(ctx);
  }

  text(ctx, str, x, y, { font = `12px ${PIXEL}`, color = COLORS.cream, align = 'left', shadow = 2 } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    if (shadow) {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillText(str, x + shadow, y + shadow);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  drawHUD(ctx) {
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, W, 48);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, 46, W, 2);

    // Score
    this.text(ctx, 'PUNTOS', 16, 18, { font: `18px ${BODY}`, color: COLORS.dim, shadow: 0 });
    this.text(ctx, String(this.score).padStart(6, '0'), 16, 40, { font: `16px ${PIXEL}`, color: COLORS.gold });
    const mult = this.multiplier();
    if (mult > 1) {
      ctx.fillStyle = COLORS.green;
      ctx.fillRect(132, 25, 34, 17);
      this.text(ctx, `x${mult}`, 149, 39, { font: `10px ${PIXEL}`, color: COLORS.navy, align: 'center', shadow: 0 });
    }

    // Timer + quota
    const secs = Math.ceil(this.timerLeft);
    const urgent = secs <= 10 && this.state === 'PLAYING';
    const blinkOff = urgent && Math.floor(this.timerLeft * 4) % 2 === 0;
    this.text(ctx, String(secs).padStart(2, '0'), W / 2, 28, {
      font: `18px ${PIXEL}`, color: urgent ? (blinkOff ? '#a8323a' : COLORS.red) : COLORS.cream, align: 'center'
    });
    const barW = 180;
    const bx = W / 2 - barW / 2;
    const progress = Math.min(1, this.roundHits / this.quota);
    ctx.fillStyle = 'rgba(241, 227, 196, 0.15)';
    ctx.fillRect(bx, 35, barW, 6);
    ctx.fillStyle = progress >= 1 ? COLORS.green : COLORS.gold;
    ctx.fillRect(bx, 35, barW * progress, 6);
    this.text(ctx, `RONDA ${this.round}`, bx - 12, 42, { font: `18px ${BODY}`, color: COLORS.dim, align: 'right', shadow: 0 });
    this.text(ctx, `${this.roundHits}/${this.quota}`, bx + barW + 12, 42, {
      font: `18px ${BODY}`, color: progress >= 1 ? COLORS.green : COLORS.cream, shadow: 0
    });

    // Ammo shells
    const shown = this.reloading
      ? Math.floor((1 - this.reloadTimer / this.reloadDuration) * this.maxBullets)
      : this.bullets;
    for (let i = 0; i < this.maxBullets; i++) {
      const x = W - 24 - i * 16;
      const y = 13;
      if (i < shown) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x, y + 6, 10, 16);
        ctx.fillStyle = COLORS.red;
        ctx.fillRect(x, y, 10, 7);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x + 2, y + 8, 2, 12);
      } else {
        ctx.strokeStyle = 'rgba(241, 227, 196, 0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, 8, 20);
      }
    }
    const labelX = W - 24 - this.maxBullets * 16;
    if (this.reloading) {
      this.text(ctx, 'RECARGANDO', labelX, 32, { font: `20px ${BODY}`, color: COLORS.dim, align: 'right', shadow: 0 });
    } else if (this.bullets === 0 && this.state === 'PLAYING' && Math.floor(performance.now() / 300) % 2 === 0) {
      this.text(ctx, 'RECARGA', labelX, 32, { font: `20px ${BODY}`, color: COLORS.red, align: 'right', shadow: 0 });
    }
  }

  panel(ctx, y, h) {
    const w = 420;
    const x = W / 2 - w / 2;
    ctx.fillStyle = 'rgba(10, 14, 36, 0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  drawOverlay(ctx) {
    if (this.state === 'LOADING') {
      ctx.fillStyle = COLORS.navy;
      ctx.fillRect(0, 0, W, H);
      this.text(ctx, 'CARGANDO...', W / 2, H / 2, { font: `14px ${PIXEL}`, align: 'center' });
      return;
    }

    if (this.state === 'MENU') {
      ctx.fillStyle = 'rgba(10, 14, 36, 0.6)';
      ctx.fillRect(0, 0, W, H);
      this.text(ctx, 'BEE HUNT', W / 2, 215, { font: `44px ${PIXEL}`, color: COLORS.gold, align: 'center', shadow: 4 });
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        this.text(ctx, 'TOCA O HAZ CLIC PARA EMPEZAR', W / 2, 285, { font: `13px ${PIXEL}`, align: 'center' });
      }
      const lines = [
        'Dispara a las abejas antes de que salgan de la banda.',
        'Si fallas con el caballo enfrente, se burlara de ti.',
        'Recarga con Espacio, clic derecho o el boton RECARGAR.'
      ];
      lines.forEach((l, i) => this.text(ctx, l, W / 2, 345 + i * 28, { font: `22px ${BODY}`, color: COLORS.dim, align: 'center', shadow: 0 }));
      const plaqueText = this.best > 0 ? `MEJOR PUNTAJE ${String(this.best).padStart(6, '0')}` : 'BEE HUNT';
      this.text(ctx, plaqueText, W / 2, 536, { font: `10px ${PIXEL}`, color: COLORS.gold, align: 'center' });
      return;
    }

    if (this.state === 'INTRO') {
      this.panel(ctx, 222, 104);
      this.text(ctx, `RONDA ${this.round}`, W / 2, 268, { font: `22px ${PIXEL}`, color: COLORS.gold, align: 'center' });
      this.text(ctx, `Acierta ${this.quota} abejas en ${this.roundDuration} segundos`, W / 2, 304, { font: `24px ${BODY}`, align: 'center', shadow: 0 });
    } else if (this.state === 'ROUND_CLEAR') {
      this.panel(ctx, 222, 104);
      this.text(ctx, 'RONDA SUPERADA', W / 2, 268, { font: `18px ${PIXEL}`, color: COLORS.green, align: 'center' });
      this.text(ctx, `Aciertos ${this.roundHits}/${this.quota}  -  Siguiente ronda mas rapida`, W / 2, 304, { font: `24px ${BODY}`, align: 'center', shadow: 0 });
    } else if (this.state === 'GAME_OVER') {
      ctx.fillStyle = 'rgba(10, 14, 36, 0.35)';
      ctx.fillRect(0, 48, W, H - 48);
    }

    if (this.paused) {
      ctx.fillStyle = 'rgba(10, 14, 36, 0.75)';
      ctx.fillRect(0, 0, W, H);
      this.text(ctx, 'PAUSA', W / 2, 280, { font: `24px ${PIXEL}`, color: COLORS.gold, align: 'center' });
      this.text(ctx, 'Toca para continuar', W / 2, 320, { font: `24px ${BODY}`, align: 'center', shadow: 0 });
    }
  }

  startLoop() {
    const loop = (ts) => {
      if (!this.lastTime) this.lastTime = ts;
      const dt = Math.min(0.05, (ts - this.lastTime) / 1000);
      this.lastTime = ts;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
