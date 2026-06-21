/**
 * 眼妆推荐引擎 — 根据每张图片的面部特征生成差异化报告与推荐
 */

const EYE_MAKEUP_CATALOG = [
  {
    id: 'natural-daily',
    name: '自然日常',
    tag: '通勤',
    description: '裸色哑光眼影 + 细内眼线，放大双眼又不显妆感',
    colors: { shadow: ['#d4a574', '#c4956a', '#b8845f'], liner: '#3d2b1f', highlight: '#f5e6d3' },
    intensity: 0.35,
    matchEyeShapes: ['杏眼', '圆眼', '标准眼'],
    matchEyelids: ['双眼皮', '内双', '单眼皮'],
    matchTones: ['暖调', '自然'],
    matchShades: ['自然肤色', '浅肤色', '深肤色'],
    scoreBoost: { age: [18, 40], noMakeup: 10 },
  },
  {
    id: 'peach-sweet',
    name: '蜜桃甜系',
    tag: '约会',
    description: '粉橘渐变晕染，卧蚕提亮，打造无辜桃花眼',
    colors: { shadow: ['#ffb6c1', '#ff8fa3', '#e8748c'], liner: '#5c3d4a', highlight: '#fff0f5' },
    intensity: 0.55,
    matchEyeShapes: ['圆眼', '杏眼'],
    matchEyelids: ['双眼皮', '内双'],
    matchTones: ['暖调', '自然'],
    matchShades: ['浅肤色', '自然肤色'],
    scoreBoost: { age: [16, 30], noMakeup: 8 },
  },
  {
    id: 'cat-eye',
    name: '猫眼上扬',
    tag: '派对',
    description: '深色眼尾上扬眼线 + 烟熏晕染，气场全开',
    colors: { shadow: ['#4a3728', '#2c1810', '#1a0f0a'], liner: '#1a0f0a', highlight: '#d4af37' },
    intensity: 0.75,
    matchEyeShapes: ['丹凤眼', '细长眼'],
    matchEyelids: ['双眼皮'],
    matchTones: ['暖调', '冷调', '自然'],
    matchShades: ['自然肤色', '深肤色'],
    scoreBoost: { age: [20, 45] },
  },
  {
    id: 'earth-smoky',
    name: '大地烟熏',
    tag: '晚宴',
    description: '棕金层次叠加，深邃立体，适合正式场合',
    colors: { shadow: ['#8b6914', '#6b4f0a', '#4a3508'], liner: '#2d1f0e', highlight: '#d4a853' },
    intensity: 0.65,
    matchEyeShapes: ['杏眼', '圆眼'],
    matchEyelids: ['双眼皮', '内双'],
    matchTones: ['暖调', '自然'],
    matchShades: ['自然肤色', '深肤色'],
    scoreBoost: { age: [22, 50] },
  },
  {
    id: 'single-lid-bright',
    name: '单眼皮提亮',
    tag: '专属',
    description: '浅色系纵向晕染 + 开眼角眼线，视觉上放大眼裂',
    colors: { shadow: ['#e8dcc8', '#d4c4a8', '#c0b090'], liner: '#4a4035', highlight: '#fffef0' },
    intensity: 0.45,
    matchEyeShapes: ['杏眼', '圆眼', '细长眼'],
    matchEyelids: ['单眼皮', '内双'],
    matchTones: ['暖调', '自然', '冷调'],
    matchShades: ['浅肤色', '自然肤色', '深肤色'],
    scoreBoost: { eyelid: '单眼皮', noMakeup: 15 },
  },
  {
    id: 'cool-mauve',
    name: '冷调紫雾',
    tag: '个性',
    description: '灰紫色调微醺眼妆，显白高级，适合冷白皮',
    colors: { shadow: ['#9b8aa5', '#7a6b8a', '#5c4f6a'], liner: '#3d3548', highlight: '#e8e0f0' },
    intensity: 0.5,
    matchEyeShapes: ['杏眼', '丹凤眼', '细长眼'],
    matchEyelids: ['双眼皮', '内双'],
    matchTones: ['冷调'],
    matchShades: ['浅肤色', '自然肤色'],
    scoreBoost: { age: [18, 35] },
  },
  {
    id: 'sunset-glow',
    name: '日落余晖',
    tag: '度假',
    description: '橙红金三色过渡，活力满满，拍照上镜',
    colors: { shadow: ['#ff6b35', '#f7931e', '#ffd700'], liner: '#8b2500', highlight: '#ffe4b5' },
    intensity: 0.6,
    matchEyeShapes: ['圆眼', '杏眼'],
    matchEyelids: ['双眼皮', '内双', '单眼皮'],
    matchTones: ['暖调', '自然'],
    matchShades: ['自然肤色', '深肤色'],
    scoreBoost: { age: [18, 32] },
  },
  {
    id: 'office-minimal',
    name: '职场裸妆',
    tag: 'OL',
    description: '接近肤色的微珠光眼影，精致细眼线，专业得体',
    colors: { shadow: ['#c9b8a8', '#b8a898', '#a89888'], liner: '#3a3a3a', highlight: '#f8f4f0' },
    intensity: 0.3,
    matchEyeShapes: ['杏眼', '丹凤眼', '圆眼', '细长眼'],
    matchEyelids: ['双眼皮', '内双', '单眼皮'],
    matchTones: ['暖调', '冷调', '自然'],
    matchShades: ['浅肤色', '自然肤色', '深肤色'],
    scoreBoost: { age: [25, 55], noMakeup: 12 },
  },
];

function extractFaceInfo(raw) {
  const attr = raw.faceAttribute?.faces?.[0] || {};
  const micro = raw.microFace?.faces?.[0] || {};
  const kp = raw.faceKeypoint?.faces?.[0] || {};
  const skin = raw.skinSegment || {};
  const imgF = raw.imageFeatures || {};

  const genderMap = { 0: '女', 1: '男' };
  const emotionMap = { 0: '自然', 1: '微笑', 2: '大笑', 3: '惊讶', 4: '悲伤', 5: '愤怒' };

  const eyeInfo = micro.eye || micro.eyes || imgF.eyes || {};
  const eyebrowInfo = micro.eyebrow || micro.eyebrows || imgF.eyebrow || {};

  const skinToneRaw = skin.skin_tone || (imgF.skin ? `${imgF.skin.tone}${imgF.skin.shade}` : '自然');
  const skinShade = imgF.skin?.shade || extractShade(skinToneRaw);

  return {
    gender: genderMap[attr.gender?.type] ?? imgF.portrait?.gender ?? '未知',
    age: attr.age?.value ?? imgF.portrait?.age ?? 25,
    emotion: emotionMap[attr.emotion?.type] ?? imgF.portrait?.emotion ?? '自然',
    beauty: attr.beauty?.score ?? imgF.portrait?.beauty ?? 75,
    hasGlasses: (attr.glasses?.type ?? 0) !== 0,
    currentMakeup: {
      eye: attr.makeup?.eye ?? (imgF.eyes?.hasMakeup ? 1 : 0),
      lip: attr.makeup?.lip ?? 0,
      cheek: attr.makeup?.cheek ?? 0,
    },
    eyeShape: eyeInfo.shape || eyeInfo.eye_shape || '杏眼',
    eyelid: eyeInfo.eyelid || eyeInfo.eyelid_type || '双眼皮',
    eyeSize: eyeInfo.size || imgF.eyes?.size || '中等',
    eyebrowShape: eyebrowInfo.shape || '自然眉',
    faceShape: micro.face?.shape || imgF.face?.shape || '鹅蛋脸',
    skinTone: extractTone(skinToneRaw),
    skinShade,
    skinType: skin.skin_type || imgF.skin?.type || '混合肌',
    skinRgb: skin.rgb || imgF.skin?.rgb,
    lighting: imgF.lighting?.level || '适中',
    landmarks: kp.landmarks || kp.landmark || [],
    faceRect: kp.face_rectangle || kp.face_rect || imgF.faceRect,
    imageFeatures: imgF,
  };
}

function extractTone(s) {
  if (s.includes('暖')) return '暖调';
  if (s.includes('冷')) return '冷调';
  return '自然';
}

function extractShade(s) {
  if (s.includes('浅')) return '浅肤色';
  if (s.includes('深')) return '深肤色';
  return '自然肤色';
}

function scoreMakeup(makeup, info) {
  let score = 30;

  if (makeup.matchEyeShapes.some((s) => info.eyeShape.includes(s) || s.includes(info.eyeShape))) {
    score += 22;
  } else {
    score -= 5;
  }

  if (makeup.matchEyelids.includes(info.eyelid)) score += 18;
  else score -= 8;

  if (makeup.matchTones.includes(info.skinTone)) score += 12;
  if (makeup.matchShades?.includes(info.skinShade)) score += 8;

  const [minAge, maxAge] = makeup.scoreBoost.age || [0, 100];
  if (info.age >= minAge && info.age <= maxAge) score += 6;
  else score -= 3;

  if (makeup.scoreBoost.noMakeup && info.currentMakeup.eye === 0) score += makeup.scoreBoost.noMakeup;
  if (info.currentMakeup.eye > 0) score -= 5;

  if (makeup.scoreBoost.eyelid === info.eyelid) score += 12;

  if (info.hasGlasses && makeup.intensity > 0.6) score -= 10;

  if (info.lighting === '偏暗' && makeup.intensity > 0.55) score += 4;
  if (info.lighting === '明亮' && makeup.intensity < 0.45) score += 4;

  if (info.eyeSize === '偏小' && makeup.id === 'single-lid-bright') score += 8;
  if (info.eyeSize === '偏大' && makeup.id === 'cat-eye') score += 6;

  return Math.max(20, Math.min(99, Math.round(score)));
}

function buildAnalysisSummary(info) {
  const summary = {
    性别: info.gender,
    年龄: `${info.age} 岁`,
    情绪: info.emotion,
    颜值评分: info.beauty,
    眼型: info.eyeShape,
    眼皮: info.eyelid,
    眼大小: info.eyeSize,
    眉形: info.eyebrowShape,
    脸型: info.faceShape,
    肤色基调: info.skinTone,
    肤色深浅: info.skinShade,
    肤质: info.skinType,
    光线环境: info.lighting,
    当前眼妆: info.currentMakeup.eye ? '已有妆容' : '素颜',
  };

  if (info.skinRgb) {
    summary['肤色采样'] = `RGB(${info.skinRgb.r}, ${info.skinRgb.g}, ${info.skinRgb.b})`;
  }

  return summary;
}

function buildTips(info, topMakeup, ranked) {
  const tips = [];

  tips.push(`您的眼型为「${info.eyeShape}」+「${info.eyelid}」，${topMakeup.name}匹配度最高（${topMakeup.matchScore}分）`);

  if (info.eyelid === '单眼皮') {
    tips.push('单眼皮：眼影纵向晕染，眼线尽量细且贴近睫毛根部，避免粗眼线压眼');
  } else if (info.eyelid === '内双') {
    tips.push('内双：眼影范围不超过双眼皮褶皱，重点加深睫毛根部与眼尾');
  } else {
    tips.push('双眼皮：可尝试层次渐变，浅色打底 + 深色加深眼尾三角区');
  }

  if (info.eyeShape === '圆眼') {
    tips.push('圆眼：眼尾向外上方延伸眼线，下眼影仅扫外 1/3，避免显圆');
  } else if (info.eyeShape === '丹凤眼' || info.eyeShape === '细长眼') {
    tips.push('细长眼：下眼睑可少量提亮，卧蚕高光增加柔和感');
  } else if (info.eyeShape === '杏眼') {
    tips.push('杏眼：天然均衡眼型，蜜桃/大地色系均可驾驭，重点在卧蚕提亮');
  }

  if (info.skinTone === '冷调') {
    tips.push(`冷调${info.skinShade}：推荐灰紫、玫瑰棕等冷色系，避免大面积纯橘色`);
  } else if (info.skinTone === '暖调') {
    tips.push(`暖调${info.skinShade}：大地色、蜜桃、铜金色调最衬肤色`);
  } else {
    tips.push(`${info.skinShade}：中性肤可自由尝试，建议从「${ranked[1]?.name || '自然日常'}」做备选`);
  }

  if (info.currentMakeup.eye > 0) {
    tips.push('检测到已有眼妆，建议先卸妆再试新风格，或降低本次妆感强度');
  } else if (info.age < 22) {
    tips.push('年轻肌肤适合轻透妆感，首选低饱和度眼影，少量多次叠加');
  } else if (info.age > 35) {
    tips.push('成熟肌建议选哑光质地，避免大亮片，职场裸妆/大地烟熏更得体');
  }

  if (info.lighting === '偏暗') {
    tips.push('当前光线偏暗，试妆时可适当提高妆感强度，实际上镜会更自然');
  }

  return [...new Set(tips)].slice(0, 5);
}

function buildReason(makeup, info) {
  const parts = [];
  if (makeup.matchEyelids.includes(info.eyelid)) parts.push(`${info.eyelid}友好`);
  if (makeup.matchEyeShapes.some((s) => info.eyeShape.includes(s))) parts.push(`专为${info.eyeShape}设计`);
  if (makeup.matchTones.includes(info.skinTone)) parts.push(`适配${info.skinTone}肤色`);
  if (makeup.matchShades?.includes(info.skinShade)) parts.push(`适合${info.skinShade}`);
  return parts.length ? parts.join(' · ') : '综合型';
}

function buildAnalysisTable(info, summary, rawAnalysis) {
  const imgF = rawAnalysis.imageFeatures || {};
  const r = imgF.raw || {};

  const rows = [
    { inputField: 'portrait.gender',  rawValue: `seed%5=${r.seedMod5 ?? '-'}（哈希衍生）`,                      inputValue: `portrait.gender="${imgF.portrait?.gender ?? info.gender}"`,               reportLabel: '性别',     reportValue: summary['性别'] },
    { inputField: 'portrait.age',     rawValue: `ageBase=${r.ageBase ?? '-'}（亮度校正前）`,                    inputValue: `portrait.age=${imgF.portrait?.age ?? info.age}`,                          reportLabel: '年龄',     reportValue: summary['年龄'] },
    { inputField: 'portrait.emotion', rawValue: `(seed+3)%3=${r.seedMod3 ?? '-'}（哈希衍生）`,                  inputValue: `portrait.emotion="${imgF.portrait?.emotion ?? info.emotion}"`,             reportLabel: '情绪',     reportValue: summary['情绪'] },
    { inputField: 'portrait.beauty',  rawValue: `beautyBase=${r.beautyBase ?? '-'}（对比度校正前）`,            inputValue: `portrait.beauty=${imgF.portrait?.beauty ?? info.beauty}`,                 reportLabel: '颜值评分', reportValue: String(summary['颜值评分']) },
    { inputField: 'eyes.shape',       rawValue: `眼部宽高比=${r.eyeAspect ?? '-'}（像素计算）`,                inputValue: `eyes.shape="${imgF.eyes?.shape ?? info.eyeShape}"`,                       reportLabel: '眼型',     reportValue: summary['眼型'] },
    { inputField: 'eyes.eyelid',      rawValue: `上睑亮度差=${r.lidFold ?? '-'}（像素差值）`,                  inputValue: `eyes.eyelid="${imgF.eyes?.eyelid ?? info.eyelid}"`,                       reportLabel: '眼皮',     reportValue: summary['眼皮'] },
    { inputField: 'eyes.size',        rawValue: `眼部宽高比=${r.eyeAspect ?? '-'}（像素计算）`,                inputValue: `eyes.size="${imgF.eyes?.size ?? info.eyeSize}"`,                          reportLabel: '眼大小',   reportValue: summary['眼大小'] },
    { inputField: 'eyebrow.shape',    rawValue: `(seed+2)%5=${r.seedMod5Eye ?? '-'}（哈希衍生）`,              inputValue: `eyebrow.shape="${imgF.eyebrow?.shape ?? info.eyebrowShape}"`,             reportLabel: '眉形',     reportValue: summary['眉形'] },
    { inputField: 'face.shape',       rawValue: `脸部宽高比=${r.faceAspect ?? '-'}（像素计算）`,               inputValue: `face.shape="${imgF.face?.shape ?? info.faceShape}"`,                      reportLabel: '脸型',     reportValue: summary['脸型'] },
    { inputField: 'skin.tone',        rawValue: `warmth=(R-B)/255=${r.skinWarmth ?? '-'}`,                     inputValue: `skin.tone="${imgF.skin?.tone ?? info.skinTone}"`,                         reportLabel: '肤色基调', reportValue: summary['肤色基调'] },
    { inputField: 'skin.shade',       rawValue: `人脸区亮度均值=${r.skinBrightness ?? '-'}`,                    inputValue: `skin.shade="${imgF.skin?.shade ?? info.skinShade}"`,                      reportLabel: '肤色深浅', reportValue: summary['肤色深浅'] },
    { inputField: 'skin.type',        rawValue: `(seed+1)%4=${r.seedMod4 ?? '-'}（哈希衍生）`,                 inputValue: `skin.type="${imgF.skin?.type ?? info.skinType}"`,                         reportLabel: '肤质',     reportValue: summary['肤质'] },
    { inputField: 'lighting.level',   rawValue: `亮度均值=${r.skinBrightness ?? '-'}，对比度=${r.contrast ?? '-'}`, inputValue: `lighting.level="${imgF.lighting?.level ?? info.lighting}"`,          reportLabel: '光线环境', reportValue: summary['光线环境'] },
    { inputField: 'eyes.hasMakeup',   rawValue: `眼部饱和差=(R+G)/2-B=${r.eyeSaturation ?? '-'}`,             inputValue: `eyes.hasMakeup=${imgF.eyes?.hasMakeup ?? (info.currentMakeup.eye > 0)}`, reportLabel: '当前眼妆', reportValue: summary['当前眼妆'] },
  ];

  const rgb = imgF.skin?.rgb || info.skinRgb;
  if (rgb) {
    rows.push({
      inputField: 'skin.rgb',
      rawValue: `人脸区RGB均值`,
      inputValue: `skin.rgb={r:${rgb.r}, g:${rgb.g}, b:${rgb.b}}`,
      reportLabel: '肤色采样',
      reportValue: summary['肤色采样'] || `RGB(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    });
  }

  return rows;
}

export function generateRecommendations(rawAnalysis) {
  const info = extractFaceInfo(rawAnalysis);

  const ranked = EYE_MAKEUP_CATALOG.map((m) => ({
    ...m,
    matchScore: scoreMakeup(m, info),
    reason: buildReason(m, info),
  })).sort((a, b) => b.matchScore - a.matchScore);

  const top = ranked[0];
  const summary = buildAnalysisSummary(info);

  return {
    faceInfo: info,
    summary,
    analysisTable: buildAnalysisTable(info, summary, rawAnalysis),
    recommendations: ranked.slice(0, 5),
    allStyles: ranked,
    tips: buildTips(info, top, ranked),
    analysisHighlight: buildHighlight(info, top),
  };
}

function buildHighlight(info, top) {
  return {
    title: `为 ${info.skinTone}${info.skinShade.replace('肤色', '')} · ${info.eyeShape} · ${info.eyelid} 定制`,
    subtitle: `首推「${top.name}」— ${top.reason}`,
    topScore: top.matchScore,
  };
}

export { EYE_MAKEUP_CATALOG };
