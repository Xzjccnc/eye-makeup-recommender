/**
 * 基于客户端图像特征生成分析数据（演示模式）
 * 每张图片的特征不同 → 报告/建议/推荐均不同
 */

export function buildAnalysisFromFeatures(f) {
  const { faceRect, imageWidth, imageHeight } = f;
  const landmarks = generateLandmarks(imageWidth, imageHeight, faceRect);

  const makeupLevel = f.eyes.hasMakeup ? 1 : 0;

  return {
    faceAttribute: {
      faces: [
        {
          gender: { type: f.portrait.gender === '男' ? 1 : 0, confidence: 0.9 },
          age: { value: f.portrait.age },
          emotion: { type: ['自然', '微笑', '平静'].indexOf(f.portrait.emotion) },
          beauty: { score: f.portrait.beauty },
          glasses: { type: 0 },
          makeup: { eye: makeupLevel, lip: 0, cheek: 0 },
        },
      ],
    },
    faceKeypoint: {
      faces: [
        {
          face_id: 0,
          face_rectangle: faceRect,
          landmarks,
        },
      ],
    },
    microFace: {
      faces: [
        {
          eyebrow: { shape: f.eyebrow.shape, density: f.lighting.contrast > 35 ? '浓密' : '适中' },
          eye: {
            shape: f.eyes.shape,
            eyelid: f.eyes.eyelid,
            size: f.eyes.size,
          },
          face: { shape: f.face.shape },
          jaw: { shape: f.face.shape === '圆脸' ? '圆下巴' : '尖下巴' },
        },
      ],
    },
    skinSegment: {
      skin_tone: `${f.skin.tone}${f.skin.shade}`,
      skin_type: f.skin.type,
      rgb: f.skin.rgb,
      brightness: f.skin.brightness,
    },
    matting: { status: 'local' },
    imageFeatures: f,
    errors: {},
  };
}

function generateLandmarks(imgW, imgH, rect) {
  const landmarks = Array.from({ length: 118 }, (_, i) => ({
    x: rect.left + rect.width * 0.5 + Math.cos(i * 0.25) * rect.width * 0.08,
    y: rect.top + rect.height * 0.5 + Math.sin(i * 0.25) * rect.height * 0.08,
  }));

  const cx = rect.left + rect.width / 2;
  const eyeY = rect.top + rect.height * 0.38;
  const spacing = rect.width * 0.2;
  const eyeRx = rect.width * 0.09;
  const eyeRy = rect.height * 0.045;

  const leftEye = { x: cx - spacing, y: eyeY };
  const rightEye = { x: cx + spacing, y: eyeY };

  for (let i = 52; i <= 63; i++) {
    const t = (i - 52) / 11;
    landmarks[i] = {
      x: leftEye.x + Math.cos(t * Math.PI * 2) * eyeRx,
      y: leftEye.y + Math.sin(t * Math.PI * 2) * eyeRy,
    };
  }
  for (let i = 72; i <= 83; i++) {
    const t = (i - 72) / 11;
    landmarks[i] = {
      x: rightEye.x + Math.cos(t * Math.PI * 2) * eyeRx,
      y: rightEye.y + Math.sin(t * Math.PI * 2) * eyeRy,
    };
  }

  return landmarks;
}

/** 服务端 fallback：无客户端特征时用 buffer 哈希生成差异数据 */
export function buildAnalysisFromBuffer(buffer, width = 640, height = 480) {
  let h = 0;
  for (let i = 0; i < Math.min(buffer.length, 8000); i += 47) {
    h = ((h << 5) - h + buffer[i]) | 0;
  }
  const seed = Math.abs(h);

  const tones = ['暖调', '冷调', '自然'];
  const shapes = ['杏眼', '圆眼', '丹凤眼', '细长眼'];
  const lids = ['双眼皮', '内双', '单眼皮'];
  const faces = ['鹅蛋脸', '圆脸', '方脸', '长脸'];

  const faceW = width * 0.64;
  const faceRect = {
    left: width * 0.18,
    top: height * 0.12,
    width: faceW,
    height: height * 0.62,
  };

  const f = {
    imageWidth: width,
    imageHeight: height,
    faceRect,
    skin: {
      tone: tones[seed % 3],
      shade: ['浅肤色', '自然肤色', '深肤色'][seed % 3],
      rgb: { r: 160 + (seed % 40), g: 130 + (seed % 30), b: 110 + (seed % 25) },
      brightness: 130 + (seed % 50),
      type: ['混合肌', '干性肌', '油性肌'][seed % 3],
    },
    eyes: {
      shape: shapes[seed % 4],
      eyelid: lids[seed % 3],
      size: ['中等', '偏大', '偏小'][seed % 3],
      hasMakeup: seed % 7 === 0,
    },
    face: { shape: faces[seed % 4] },
    eyebrow: { shape: ['自然眉', '弯月眉', '一字眉'][seed % 3] },
    portrait: {
      age: 18 + (seed % 30),
      beauty: 68 + (seed % 25),
      emotion: '自然',
      gender: seed % 6 === 0 ? '男' : '女',
    },
    lighting: { brightness: 140, contrast: 25 + (seed % 20), level: '适中' },
    seed,
  };

  return buildAnalysisFromFeatures(f);
}
