/**
 * Canvas 眼妆渲染器
 * 支持主预览 + 为每款推荐生成缩略试妆图
 */

const LEFT_EYE_IDX = [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63];
const RIGHT_EYE_IDX = [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83];

class MakeupRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.image = null;
    this.landmarks = [];
    this.faceRect = null;
    this.currentStyle = null;
    this.intensity = 0.55;
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  setLandmarks(landmarks, faceRect) {
    this.landmarks = landmarks || [];
    this.faceRect = faceRect || null;
  }

  setStyle(style) {
    this.currentStyle = style;
    this.render();
  }

  setIntensity(v) {
    this.intensity = v;
    this.render();
  }

  /** 必须在容器可见后调用 */
  resize() {
    if (!this.image || !this.canvas.parentElement) return;
    const wrap = this.canvas.parentElement;
    const maxW = wrap.clientWidth || wrap.offsetWidth || 400;
    const ratio = this.image.height / this.image.width;
    this.canvas.width = Math.max(1, Math.round(maxW));
    this.canvas.height = Math.max(1, Math.round(maxW * ratio));
    this.scaleX = this.canvas.width / this.image.width;
    this.scaleY = this.canvas.height / this.image.height;
  }

  render() {
    if (!this.image) return;

    this.resize();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);

    if (!this.currentStyle) return;

    const alpha = Math.max(0.25, this.intensity * (this.currentStyle.intensity || 0.5));
    this.drawEyeMakeup('left', this.currentStyle.colors, alpha);
    this.drawEyeMakeup('right', this.currentStyle.colors, alpha);
  }

  /** 获取眼部中心与尺寸（优先关键点，fallback faceRect） */
  getEyeGeometry(side) {
    const indices = side === 'left' ? LEFT_EYE_IDX : RIGHT_EYE_IDX;
    const pts = indices.map((i) => this.getPoint(i)).filter(Boolean);

    if (pts.length >= 4) {
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      return {
        cx,
        cy,
        rx: (Math.max(...xs) - Math.min(...xs)) / 2 + 8,
        ry: (Math.max(...ys) - Math.min(...ys)) / 2 + 6,
        contour: pts,
      };
    }

    if (!this.faceRect) return null;

    const r = this.faceRect;
    const sx = this.scaleX || 1;
    const sy = this.scaleY || 1;
    const cx = (r.left + r.width / 2) * sx;
    const cy = (r.top + r.height * 0.38) * sy;
    const spacing = r.width * 0.2 * sx;
    const rx = r.width * 0.1 * sx;
    const ry = r.height * 0.05 * sy;

    return {
      cx: side === 'left' ? cx - spacing : cx + spacing,
      cy,
      rx,
      ry,
      contour: null,
    };
  }

  getPoint(idx) {
    const pt = this.landmarks[idx];
    if (!pt) return null;
    return { x: pt.x * (this.scaleX || 1), y: pt.y * (this.scaleY || 1) };
  }

  drawEyeMakeup(side, colors, alpha) {
    const eye = this.getEyeGeometry(side);
    if (!eye) return;

    const { ctx } = this;
    const { cx, cy, rx, ry } = eye;
    const shadowColors = colors.shadow || ['#d4a574', '#b8845f'];

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';

    // 眼影：多层椭圆渐变
    shadowColors.forEach((color, i) => {
      const spread = 1 + i * 0.35;
      const grad = ctx.createRadialGradient(cx, cy - ry * 0.3, 0, cx, cy, rx * spread * 1.6);
      grad.addColorStop(0, this.hexAlpha(color, alpha * (0.75 - i * 0.12)));
      grad.addColorStop(0.6, this.hexAlpha(color, alpha * (0.35 - i * 0.08)));
      grad.addColorStop(1, this.hexAlpha(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy - ry * 0.15, rx * spread * 1.5, ry * spread * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';

    // 眼线
    ctx.strokeStyle = this.hexAlpha(colors.liner || '#3d2b1f', alpha * 0.9);
    ctx.lineWidth = Math.max(1.5, rx * 0.08);
    ctx.lineCap = 'round';

    if (eye.contour) {
      ctx.beginPath();
      eye.contour.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.95, ry * 0.85, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 眼尾上扬
    const tailDir = side === 'left' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + tailDir * rx * 0.9, cy - ry * 0.1);
    ctx.lineTo(cx + tailDir * (rx * 1.3 + 6), cy - ry * 0.5 - 4);
    ctx.stroke();

    // 卧蚕高光
    if (colors.highlight) {
      ctx.fillStyle = this.hexAlpha(colors.highlight, alpha * 0.55);
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.85, rx * 0.75, ry * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  hexAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, a))})`;
  }

  /** 导出当前 canvas 为 dataURL */
  toDataURL() {
    return this.canvas.toDataURL('image/jpeg', 0.85);
  }

  /**
   * 为每款眼妆生成缩略试妆图
   * @returns {Promise<Record<string, string>>} styleId -> dataURL
   */
  async generatePreviews(styles) {
    if (!this.image) return {};

    const previews = {};
    const savedStyle = this.currentStyle;
    const savedIntensity = this.intensity;

    for (const style of styles) {
      this.currentStyle = style;
      this.intensity = style.intensity || 0.55;
      this.render();
      previews[style.id] = this.toDataURL();
    }

    this.currentStyle = savedStyle;
    this.intensity = savedIntensity;
    this.render();

    return previews;
  }
}

window.MakeupRenderer = MakeupRenderer;
