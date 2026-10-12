// Unified pointer input (mouse, touch, pen) mapped to logical game coordinates.

export class InputHandler {
  constructor(canvas, logicalWidth, logicalHeight, onShoot, onReload) {
    this.canvas = canvas;
    this.w = logicalWidth;
    this.h = logicalHeight;
    this.onShoot = onShoot;
    this.onReload = onReload;

    this.mouseX = logicalWidth / 2;
    this.mouseY = logicalHeight / 2;
    this.isTouch = false;
    this.inside = false;

    this.init();
  }

  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.h
    };
  }

  init() {
    const c = this.canvas;

    c.addEventListener('pointermove', (e) => {
      this.isTouch = e.pointerType !== 'mouse';
      this.inside = true;
      const p = this.toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });

    c.addEventListener('pointerenter', () => { this.inside = true; });
    c.addEventListener('pointerleave', () => { this.inside = false; });

    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isTouch = e.pointerType !== 'mouse';
      if (e.pointerType === 'mouse' && e.button === 2) {
        this.onReload?.();
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = this.toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.onShoot?.(p.x, p.y);
    });

    c.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyR' && e.code !== 'Space') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'BUTTON') return;
      e.preventDefault();
      this.onReload?.();
    });
  }
}
