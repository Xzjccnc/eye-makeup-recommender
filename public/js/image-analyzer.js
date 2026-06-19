/**
 * 客户端图像分析 — 从上传照片中提取肤色、明暗、眼区等特征
 * 演示模式下用于生成差异化的分析报告与眼妆推荐
 */

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sampleRegion(ctx, x, y, w, h) {
  const data = ctx.getImageData(Math.max(0, x), Math.max(0, y), w, h).data;
  const pixels = [];
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const l = luminance(r, g, b);
    if (l < 25 || l > 245) continue;
    pixels.push({ r, g, b, l });
  }
  return pixels;
}

function avgPixels(pixels) {
  if (!pixels.length) return { r: 180, g: 150, b: 130, l: 160 };
  const s = pixels.reduce(
    (a, p) => ({ r: a.r + p.r, g: a.g + p.g, b: a.b + p.b, l: a.l + p.l }),
    { r: 0, g: 0, b: 0, l: 0 },
  );
  const n = pixels.length;
  return { r: s.r / n, g: s.g / n, b: s.b / n, l: s.l / n };
}

function stdLuminance(pixels) {
  if (pixels.length < 2) return 20;
  const avg = avgPixels(pixels).l;
  const v = pixels.reduce((s, p) => s + (p.l - avg) ** 2, 0) / pixels.length;
  return Math.sqrt(v);
}

function hashFeatures(nums) {
  const str = nums.map((n) => Math.round(n * 100)).join(',');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick(hash, arr) {
  return arr[hash % arr.length];
}

async function analyzeImageFile(file) {
  const img = await loadImageFromFile(file);
  const maxW = 480;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  // 预估人脸区域（自拍正脸）
  const faceRect = {
    left: Math.round(w * 0.18),
    top: Math.round(h * 0.12),
    width: Math.round(w * 0.64),
    height: Math.round(h * 0.62),
  };

  const facePixels = sampleRegion(ctx, faceRect.left, faceRect.top, faceRect.width, faceRect.height);
  const skin = avgPixels(facePixels);
  const contrast = stdLuminance(facePixels);

  const eyeY = faceRect.top + faceRect.height * 0.38;
  const eyeH = Math.round(faceRect.height * 0.12);
  const eyeW = Math.round(faceRect.width * 0.22);
  const leftEyeX = faceRect.left + faceRect.width * 0.18;
  const rightEyeX = faceRect.left + faceRect.width * 0.58;

  const leftEyePx = sampleRegion(ctx, leftEyeX, eyeY, eyeW, eyeH);
  const rightEyePx = sampleRegion(ctx, rightEyeX, eyeY, eyeW, eyeH);
  const leftEye = avgPixels(leftEyePx);
  const rightEye = avgPixels(rightEyePx);

  const upperLidY = eyeY - eyeH * 0.15;
  const upperLidPx = sampleRegion(ctx, leftEyeX, upperLidY, eyeW, Math.round(eyeH * 0.4));
  const upperLid = avgPixels(upperLidPx);

  const eyeSaturation = (leftEye.r + leftEye.g) / 2 - leftEye.b;
  const hasEyeMakeup = eyeSaturation > 18 && leftEye.r > skin.r + 10;

  const warmth = (skin.r - skin.b) / 255;
  const coolness = (skin.b - skin.r) / 255;
  let skinTone;
  if (warmth > 0.06) skinTone = '暖调';
  else if (coolness > 0.04) skinTone = '冷调';
  else skinTone = '自然';

  const skinBrightness = skin.l;
  let skinShade;
  if (skinBrightness > 185) skinShade = '浅肤色';
  else if (skinBrightness > 145) skinShade = '自然肤色';
  else skinShade = '深肤色';

  const eyeAspect = eyeW / Math.max(eyeH, 1);
  const faceAspect = faceRect.width / faceRect.height;

  const lidFold = upperLid.l - leftEye.l;
  let eyelid;
  if (lidFold > 12) eyelid = '双眼皮';
  else if (lidFold > 5) eyelid = '内双';
  else eyelid = '单眼皮';

  let eyeShape;
  if (eyeAspect > 2.8) eyeShape = '细长眼';
  else if (eyeAspect > 2.2) eyeShape = '丹凤眼';
  else if (eyeAspect < 1.6) eyeShape = '圆眼';
  else eyeShape = '杏眼';

  let faceShape;
  if (faceAspect > 0.82) faceShape = '圆脸';
  else if (faceAspect > 0.72) faceShape = '鹅蛋脸';
  else if (faceAspect > 0.62) faceShape = '方脸';
  else faceShape = '长脸';

  const seed = hashFeatures([
    skin.r,
    skin.g,
    skin.b,
    leftEye.l,
    contrast,
    w,
    h,
    eyeAspect,
    faceAspect,
  ]);

  const eyebrowShapes = ['自然眉', '一字眉', '弯月眉', '挑眉', '柳叶眉'];
  const skinTypes = ['干性肌', '混合肌', '油性肌', '中性肌'];
  const emotions = ['自然', '微笑', '平静'];

  const ageBase = 18 + (seed % 28) + (skinBrightness > 170 ? -3 : 3);
  const beautyBase = 65 + (seed % 25) + (contrast > 30 ? 5 : 0);

  // 将分析坐标映射回原图尺寸，供 canvas 试妆使用
  const scaleToOrigX = img.width / w;
  const scaleToOrigY = img.height / h;
  const faceRectOrig = {
    left: Math.round(faceRect.left * scaleToOrigX),
    top: Math.round(faceRect.top * scaleToOrigY),
    width: Math.round(faceRect.width * scaleToOrigX),
    height: Math.round(faceRect.height * scaleToOrigY),
  };

  return {
    imageWidth: img.width,
    imageHeight: img.height,
    faceRect: faceRectOrig,
    analysisSize: { width: w, height: h },
    skin: {
      tone: skinTone,
      shade: skinShade,
      rgb: { r: Math.round(skin.r), g: Math.round(skin.g), b: Math.round(skin.b) },
      brightness: Math.round(skinBrightness),
      type: pick(seed + 1, skinTypes),
    },
    eyes: {
      shape: eyeShape,
      eyelid,
      size: eyeAspect > 2.5 ? '偏大' : eyeAspect < 1.8 ? '偏小' : '中等',
      hasMakeup: hasEyeMakeup,
      asymmetry: Math.abs(leftEye.l - rightEye.l),
    },
    face: {
      shape: faceShape,
      aspect: faceAspect,
    },
    eyebrow: { shape: pick(seed + 2, eyebrowShapes) },
    portrait: {
      age: Math.min(55, Math.max(16, ageBase)),
      beauty: Math.min(98, beautyBase),
      emotion: pick(seed + 3, emotions),
      gender: seed % 5 === 0 ? '男' : '女',
    },
    lighting: {
      brightness: Math.round(skinBrightness),
      contrast: Math.round(contrast),
      level: skinBrightness > 160 ? '明亮' : skinBrightness > 120 ? '适中' : '偏暗',
    },
    seed,
  };
}

window.ImageAnalyzer = { analyzeImageFile };
