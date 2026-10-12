// Reticle + shot impact feedback

export class Crosshair {
  constructor() {
    this.x = 400;
    this.y = 300;
    this.visible = false;
    this.impacts = [];
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  addImpact(x, y, isHit) {
    this.impacts.push({ x, y, isHit, life: isHit ? 0.35 : 0.25, max: isHit ? 0.35 : 0.25 });
  }

  update(dt) {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].life -= dt;
      if (this.impacts[i].life <= 0) this.impacts.splice(i, 1);
    }
  }

  render(ctx) {
    for (const imp of this.impacts) {
      const p = 1 - imp.life / imp.max;
      ctx.save();
      ctx.globalAlpha = 1 - p;
      if (imp.isHit) {
        const r = 8 + p * 22;
        ctx.strokeStyle = '#ffd27a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff1b8';
        for (let k = 0; k < 4; k++) {
          const a = (Math.PI / 2) * k + Math.PI / 4;
          ctx.fillRect(imp.x + Math.cos(a) * (r + 6) - 2, imp.y + Math.sin(a) * (r + 6) - 2, 4, 4);
        }
      } else {
        ctx.strokeStyle = 'rgba(241, 227, 196, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, 4 + p * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!this.visible) return;

    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const r = 14;

    const drawShape = () => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.moveTo(x - r - 6, y); ctx.lineTo(x - r + 4, y);
      ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 6, y);
      ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - r + 4);
      ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 6);
      ctx.stroke();
    };

    ctx.save();
    ctx.strokeStyle = 'rgba(10, 14, 36, 0.85)';
    ctx.lineWidth = 5;
    drawShape();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    drawShape();
    ctx.fillStyle = '#e0474c';
    ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.restore();
  }
}
