// Conveyor belt bee target.
// Sprites are never mirrored so the number on the target stays readable.

const PIXEL_FONT = '"Press Start 2P", monospace';

export class Bee {
  constructor({ row = 0, tier = 10, sprite, boundsWidth = 800, shelfY = 252, speed = 95 }) {
    this.row = row;
    this.tier = tier;
    this.sprite = sprite;
    this.boundsWidth = boundsWidth;
    this.shelfY = shelfY;
    this.direction = row === 0 ? 1 : -1;
    this.isGolden = tier === 50;

    this.height = this.isGolden ? 124 : 116;
    const aspect = sprite ? sprite.width / sprite.height : 0.86;
    this.width = this.height * aspect;
    this.standHeight = 14;
    this.y = shelfY - this.standHeight - this.height;
    this.x = this.direction === 1 ? -this.width - 10 : boundsWidth + 10;

    // Every item on the same belt moves at the belt speed (no overlaps)
    this.speed = speed;

    this.state = 'MOVING'; // MOVING, FOLDING, DEAD, EXITED
    this.fold = 0;
    this.popup = null;
    this.time = Math.random() * 10;
    this.sparkles = [];
  }

  update(dt) {
    this.time += dt;

    if (this.state === 'MOVING' || this.state === 'FOLDING') {
      this.x += this.direction * this.speed * dt;
    }

    if (this.state === 'MOVING') {
      if (this.isGolden && Math.random() < 0.35) {
        this.sparkles.push({
          x: this.x + Math.random() * this.width,
          y: this.y + Math.random() * this.height * 0.8,
          life: 0.6,
          size: 2 + Math.floor(Math.random() * 2)
        });
      }
      if (this.direction === 1 && this.x > this.boundsWidth + 20) this.state = 'EXITED';
      if (this.direction === -1 && this.x < -this.width - 20) this.state = 'EXITED';
    } else if (this.state === 'FOLDING') {
      this.fold += dt * 7;
      if (this.fold >= 1) this.state = 'DEAD';
    }

    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.life -= dt;
      s.y -= dt * 18;
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }

    if (this.popup) {
      this.popup.life -= dt;
      this.popup.y -= dt * 40;
      if (this.popup.life <= 0) this.popup = null;
    }
  }

  isGone() {
    return (this.state === 'DEAD' || this.state === 'EXITED') && !this.popup;
  }

  checkHit(x, y) {
    if (this.state !== 'MOVING') return false;
    const inside =
      x >= this.x + this.width * 0.08 &&
      x <= this.x + this.width * 0.95 &&
      y >= this.y + this.height * 0.08 &&
      y <= this.y + this.height + 4;
    if (inside) {
      this.state = 'FOLDING';
      this.fold = 0;
    }
    return inside;
  }

  showPoints(points, multiplier) {
    this.popup = {
      text: multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`,
      x: this.x + this.width / 2,
      y: this.y - 8,
      life: 0.9
    };
  }

  render(ctx) {
    if (this.state === 'DEAD' || this.state === 'EXITED') return;

    const cx = this.x + this.width / 2;
    const baseY = this.shelfY;

    if (this.isGolden && this.state === 'MOVING') {
      this.renderSpotlight(ctx, cx);
    }

    // Stand / hinge
    ctx.fillStyle = '#3b3566';
    ctx.fillRect(Math.round(cx - 5), baseY - this.standHeight, 10, this.standHeight);
    ctx.fillStyle = '#8a84b8';
    ctx.fillRect(Math.round(cx - 2), baseY - this.standHeight, 4, this.standHeight);

    // Target folds backwards on its hinge (vertical squash anchored at base)
    const pivotY = baseY - this.standHeight;
    const squash = this.state === 'FOLDING' ? Math.max(0.05, Math.cos(this.fold * Math.PI / 2)) : 1;
    const shade = this.state === 'FOLDING' ? this.fold * 0.6 : 0;

    ctx.save();
    ctx.translate(cx, pivotY);
    ctx.scale(1, squash);
    if (this.isGolden) {
      ctx.shadowColor = 'rgba(255, 200, 60, 0.9)';
      ctx.shadowBlur = 16 + Math.sin(this.time * 6) * 6;
    }
    if (this.sprite) {
      ctx.drawImage(this.sprite, -this.width / 2, -this.height, this.width, this.height);
    }
    ctx.restore();

    if (shade > 0) {
      ctx.fillStyle = `rgba(10, 14, 36, ${shade})`;
      ctx.fillRect(this.x, pivotY - this.height * squash, this.width, this.height * squash);
    }

    // Sparkles
    for (const s of this.sparkles) {
      ctx.globalAlpha = Math.max(0, s.life / 0.6);
      ctx.fillStyle = '#fff1b8';
      ctx.fillRect(s.x - s.size, s.y, s.size * 2 + 1, 1 + (s.size > 2 ? 1 : 0));
      ctx.fillRect(s.x, s.y - s.size, 1 + (s.size > 2 ? 1 : 0), s.size * 2 + 1);
    }
    ctx.globalAlpha = 1;
  }

  renderSpotlight(ctx, cx) {
    const topY = 96;
    const pulse = 0.85 + Math.sin(this.time * 5) * 0.15;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Beam from the valance down onto the bee
    const beam = ctx.createLinearGradient(0, topY, 0, this.shelfY);
    beam.addColorStop(0, `rgba(255, 214, 120, ${0.28 * pulse})`);
    beam.addColorStop(1, 'rgba(255, 214, 120, 0.02)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(cx - 14, topY);
    ctx.lineTo(cx + 14, topY);
    ctx.lineTo(cx + this.width * 0.75, this.shelfY);
    ctx.lineTo(cx - this.width * 0.75, this.shelfY);
    ctx.closePath();
    ctx.fill();

    // Halo
    const cy = this.y + this.height * 0.55;
    const r = this.height * 0.85;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    halo.addColorStop(0, `rgba(255, 200, 70, ${0.35 * pulse})`);
    halo.addColorStop(1, 'rgba(255, 200, 70, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderPopup(ctx) {
    if (!this.popup) return;
    const alpha = Math.min(1, this.popup.life / 0.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `14px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(10, 14, 36, 0.9)';
    ctx.fillText(this.popup.text, this.popup.x + 2, this.popup.y + 2);
    ctx.fillStyle = this.isGolden ? '#ffd27a' : '#f1e3c4';
    ctx.fillText(this.popup.text, this.popup.x, this.popup.y);
    ctx.restore();
  }
}
