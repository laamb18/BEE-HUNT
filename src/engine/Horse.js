// Horse obstacle: rises from BEHIND the counter like a puppet.
// Rendered after the bees and before the counter, so the counter hides its lower body.
// Each pose keeps its own aspect ratio and shares the same bottom-center anchor,
// so switching cheer -> laugh never jumps or distorts.

const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class Horse {
  constructor({ cheerSprite, laughSprite, counterY = 474, boundsWidth = 800, topY = 176 }) {
    this.sprites = { cheer: cheerSprite, laugh: laughSprite };
    this.counterY = counterY;
    this.boundsWidth = boundsWidth;

    this.height = 470;
    this.topY = topY; // covers the bottom belt and half of the top belt
    this.hiddenY = counterY + 6;
    this.lanes = [230, 400, 570];

    this.y = this.hiddenY;
    this.cx = boundsWidth / 2;
    this.targetCx = this.cx;
    this.slideSpeed = 650;
    this.state = 'HIDDEN'; // HIDDEN, RISING, UP, SINKING
    this.pose = 'cheer';
    this.t = 0;
    this.hold = 0;
    this.pop = 0;
    this.shake = 0;
  }

  widthFor(pose) {
    const s = this.sprites[pose];
    return s ? (this.height * s.width) / s.height : this.height * 0.67;
  }

  isVisible() {
    return this.state !== 'HIDDEN';
  }

  popup(pose = 'cheer', hold = null, laneX = null) {
    if (this.state !== 'HIDDEN') return;
    this.cx = laneX ?? this.lanes[Math.floor(Math.random() * this.lanes.length)];
    this.targetCx = this.cx;
    this.pose = pose;
    this.state = 'RISING';
    this.t = 0;
    this.hold = hold ?? 3.2 + Math.random() * 1.3;
  }

  // Block a specific lane: pop up there, or slide over if already visible.
  // Returns true if the horse was already covering that lane.
  intercept(laneX, hold = 3.5) {
    if (this.state === 'HIDDEN') {
      this.popup('cheer', hold, laneX);
      return false;
    }
    const already = Math.abs(this.targetCx - laneX) < 1;
    this.targetCx = laneX;
    if (this.state === 'SINKING') {
      this.state = 'RISING';
      this.t = Math.max(0, 1 - this.t);
    }
    this.hold = Math.max(this.hold, hold);
    return already;
  }

  laugh() {
    if (this.state === 'HIDDEN' || this.state === 'SINKING') return;
    if (this.pose === 'laugh') {
      this.hold = Math.max(this.hold, 1.2);
      return;
    }
    this.pose = 'laugh';
    this.pop = 1;
    this.shake = 0;
    this.state = 'UP';
    this.y = this.topY;
    this.hold = 1.6;
  }

  update(dt) {
    this.pop = Math.max(0, this.pop - dt * 6);
    this.shake += dt * 30;

    const dx = this.targetCx - this.cx;
    if (dx !== 0) {
      const step = this.slideSpeed * dt;
      this.cx = Math.abs(dx) <= step ? this.targetCx : this.cx + Math.sign(dx) * step;
    }

    if (this.state === 'RISING') {
      this.t = Math.min(1, this.t + dt / 0.35);
      this.y = this.hiddenY + (this.topY - this.hiddenY) * easeOutBack(this.t);
      if (this.t >= 1) {
        this.state = 'UP';
        this.y = this.topY;
      }
    } else if (this.state === 'UP') {
      this.hold -= dt;
      if (this.hold <= 0) {
        this.state = 'SINKING';
        this.t = 0;
      }
    } else if (this.state === 'SINKING') {
      this.t = Math.min(1, this.t + dt / 0.3);
      this.y = this.topY + (this.hiddenY - this.topY) * this.t * this.t;
      if (this.t >= 1) {
        this.state = 'HIDDEN';
        this.pose = 'cheer';
        this.y = this.hiddenY;
      }
    }
  }

  bounds() {
    const w = this.widthFor(this.pose);
    return { x: this.cx - w / 2, y: this.y, w, h: this.counterY - this.y };
  }

  checkHit(x, y) {
    if (!this.isVisible()) return false;
    const b = this.bounds();
    if (b.h < 24) return false;
    const inset = b.w * 0.14;
    return x >= b.x + inset && x <= b.x + b.w - inset && y >= b.y + 12 && y <= b.y + b.h;
  }

  render(ctx) {
    if (this.state === 'HIDDEN') return;
    const sprite = this.sprites[this.pose];
    if (!sprite) return;

    const w = this.widthFor(this.pose);
    const scale = 1 + this.pop * 0.08;
    const offsetY = this.pose === 'laugh' && this.state === 'UP' ? Math.sin(this.shake) * 4 : 0;

    ctx.save();
    // Anchor at bottom-center (hidden behind the counter)
    ctx.translate(this.cx, this.y + this.height);
    ctx.scale(scale, scale);
    ctx.drawImage(sprite, -w / 2, -this.height + offsetY, w, this.height);
    ctx.restore();
  }
}
