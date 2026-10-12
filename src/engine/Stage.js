// Night carnival stage. Logical resolution 800x600.
// renderBack(): wall, light pools, conveyor belts (drawn behind targets)
// renderFront(): counter, curtains, valance, bulbs (drawn in front of targets/horse)

export const PALETTE = {
  navy: '#0a0e24',
  wallTop: '#1d1640',
  wallBottom: '#0d0b22',
  red: '#b8323f',
  redDark: '#8f2433',
  redDeep: '#5e1724',
  cream: '#f1e3c4',
  gold: '#f2b94b',
  brass: '#a06a1e',
  wood: '#2a1a12',
  woodLight: '#4a2e1c',
  belt: '#17142c',
  tread: '#2e2a4f'
};

const PIXEL_FONT = '"Press Start 2P", monospace';

export class Stage {
  constructor(width = 800, height = 600) {
    this.width = width;
    this.height = height;

    this.hudHeight = 48;
    this.valanceTop = 48;
    this.valanceBottom = 92;
    this.topShelfY = 252;
    this.bottomShelfY = 416;
    this.counterY = 474;

    this.time = 0;
    this.flash = 0;
    this.beltSpeeds = [95, 115];
    this.beltOffset = [0, 0];

    this.bulbs = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      this.bulbs.push(60 + i * ((width - 120) / (count - 1)));
    }
  }

  setBeltSpeeds(top, bottom) {
    this.beltSpeeds = [top, bottom];
  }

  triggerFlash() {
    this.flash = 0.07;
  }

  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt);
    const step = 24;
    this.beltOffset[0] = (((this.beltOffset[0] + this.beltSpeeds[0] * dt) % step) + step) % step;
    this.beltOffset[1] = (((this.beltOffset[1] - this.beltSpeeds[1] * dt) % step) + step) % step;
  }

  // ---------- BACK LAYER ----------
  renderBack(ctx) {
    const W = this.width;
    const H = this.height;

    const wall = ctx.createLinearGradient(0, this.valanceTop, 0, this.counterY);
    wall.addColorStop(0, PALETTE.wallTop);
    wall.addColorStop(1, PALETTE.wallBottom);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    // Subtle tent stripes on the back wall
    ctx.fillStyle = 'rgba(184, 50, 63, 0.10)';
    for (let x = 0; x < W; x += 56) {
      ctx.fillRect(x, this.valanceBottom, 28, this.counterY - this.valanceBottom);
    }

    // Warm light pools behind each belt
    this.drawGlow(ctx, W / 2, this.topShelfY - 64, 430, 120, 'rgba(242, 185, 75, 0.18)');
    this.drawGlow(ctx, W / 2, this.bottomShelfY - 64, 430, 120, 'rgba(242, 185, 75, 0.14)');

    this.drawBelt(ctx, this.topShelfY, this.beltOffset[0]);
    this.drawBelt(ctx, this.bottomShelfY, this.beltOffset[1]);
  }

  drawGlow(ctx, cx, cy, rx, ry, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(242, 185, 75, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBelt(ctx, y, offset) {
    const x0 = 36;
    const x1 = this.width - 36;
    const w = x1 - x0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x0, y + 20, w, 10);

    ctx.fillStyle = PALETTE.belt;
    ctx.fillRect(x0, y, w, 14);

    ctx.fillStyle = PALETTE.tread;
    for (let x = x0 - 24 + offset; x < x1; x += 24) {
      const a = Math.max(x, x0);
      const b = Math.min(x + 12, x1);
      if (b > a) ctx.fillRect(a, y + 3, b - a, 8);
    }

    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(x0, y + 14, w, 6);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x0, y + 14, w, 2);

    // End rollers
    ctx.fillStyle = '#3b3566';
    ctx.fillRect(x0 - 6, y - 2, 8, 24);
    ctx.fillRect(x1 - 2, y - 2, 8, 24);
  }

  // ---------- FRONT LAYER ----------
  renderFront(ctx) {
    this.drawCounter(ctx);
    this.drawCurtain(ctx, 0, 34, false);
    this.drawCurtain(ctx, this.width - 34, 34, true);
    this.drawValance(ctx);
    this.drawBulbs(ctx);
  }

  drawCounter(ctx) {
    const W = this.width;
    const H = this.height;
    const y = this.counterY;

    ctx.fillStyle = PALETTE.redDark;
    ctx.fillRect(0, y, W, H - y);
    ctx.fillStyle = PALETTE.red;
    for (let x = 0; x < W; x += 48) {
      ctx.fillRect(x, y + 8, 24, H - y);
    }

    const shade = ctx.createLinearGradient(0, y, 0, H);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, y, W, H - y);

    // Wooden ledge with brass trim
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(0, y - 12, W, 14);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(0, y - 12, W, 4);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, y + 2, W, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, y + 5, W, 4);

    // Center decorative plaque
    const pw = 240;
    const ph = 42;
    const px = W / 2 - pw / 2;
    const py = y + 36;
    ctx.fillStyle = '#120e26';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    // Brass corner studs
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(px + 4, py + 4, 3, 3);
    ctx.fillRect(px + pw - 7, py + 4, 3, 3);
    ctx.fillRect(px + 4, py + ph - 7, 3, 3);
    ctx.fillRect(px + pw - 7, py + ph - 7, 3, 3);
  }

  drawCurtain(ctx, x, w, isRight) {
    const top = this.valanceTop;
    const h = this.counterY - 12 - top;

    ctx.fillStyle = PALETTE.redDeep;
    ctx.fillRect(x, top, w, h);
    ctx.fillStyle = '#7a1f2b';
    for (let i = 2; i < w; i += 8) {
      ctx.fillRect(x + i, top, 4, h);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(isRight ? x : x + w - 4, top, 4, h);
  }

  drawValance(ctx) {
    const W = this.width;
    const top = this.valanceTop;
    const h = this.valanceBottom - top;
    const sw = 40;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, this.valanceBottom - 2, W, 10);

    for (let i = 0; i * sw < W; i++) {
      const x = i * sw;
      ctx.fillStyle = i % 2 ? PALETTE.cream : PALETTE.red;
      ctx.fillRect(x, top, sw, h - 12);
      // Stepped pixel scallop
      ctx.fillRect(x + 2, top + h - 12, sw - 4, 4);
      ctx.fillRect(x + 6, top + h - 8, sw - 12, 4);
      ctx.fillRect(x + 12, top + h - 4, sw - 24, 4);
    }

    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(0, top, W, 3);
  }

  drawBulbs(ctx) {
    const y = this.valanceBottom + 8;
    const phase = Math.floor(this.time * 2);

    ctx.strokeStyle = '#1a1430';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.bulbs[0], y - 3);
    ctx.lineTo(this.bulbs[this.bulbs.length - 1], y - 3);
    ctx.stroke();

    this.bulbs.forEach((bx, i) => {
      const lit = (i + phase) % 2 === 0;
      if (lit) {
        this.drawGlow(ctx, bx, y, 16, 16, 'rgba(255, 210, 122, 0.55)');
      }
      ctx.fillStyle = lit ? '#ffd27a' : '#6b4f26';
      ctx.fillRect(bx - 3, y - 3, 6, 6);
    });
  }

  renderFlash(ctx) {
    if (this.flash <= 0) return;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.18 * (this.flash / 0.07)})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
