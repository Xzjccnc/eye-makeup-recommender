/**
 * 标准化美图 API 响应 + 合并客户端图像特征
 */

export function normalizeMeituAnalysis(raw, clientFeatures) {
  const result = { ...raw };

  if (result.faceAttribute) {
    result.faceAttribute = normalizeFaceAttribute(result.faceAttribute);
  }
  if (result.faceKeypoint) {
    result.faceKeypoint = normalizeKeypoints(result.faceKeypoint, clientFeatures);
  }
  if (result.microFace) {
    result.microFace = normalizeMicroFace(result.microFace);
  }
  if (result.skinSegment) {
    result.skinSegment = normalizeSkin(result.skinSegment, clientFeatures);
  }

  if (clientFeatures) {
    result.imageFeatures = clientFeatures;
    result = mergeWithClientFeatures(result, clientFeatures);
  }

  return result;
}

function normalizeFaceAttribute(data) {
  const faces = data.faces || data.face || data.result?.faces || [];
  return { faces: Array.isArray(faces) ? faces : [faces] };
}

function normalizeKeypoints(data, clientFeatures) {
  let faces = data.faces || data.face || data.result?.faces || [];
  if (!Array.isArray(faces)) faces = [faces];

  faces = faces.map((f) => {
    let landmarks = f.landmarks || f.landmark || f.points || [];
    if (landmarks.length && landmarks[0].x === undefined && landmarks[0].X !== undefined) {
      landmarks = landmarks.map((p) => ({ x: p.X ?? p.x, y: p.Y ?? p.y }));
    }
    if (landmarks.length === 236) {
      landmarks = landmarks.filter((_, i) => i % 2 === 0);
    }
    const rect = f.face_rectangle || f.face_rect || f.rect || clientFeatures?.faceRect;
    return { ...f, landmarks, face_rectangle: rect };
  });

  if (!faces.length && clientFeatures) {
    faces = [{ landmarks: [], face_rectangle: clientFeatures.faceRect }];
  }

  return { faces };
}

function normalizeMicroFace(data) {
  const faces = data.faces || data.face || data.result?.faces || [];
  return { faces: Array.isArray(faces) ? faces : [faces] };
}

function normalizeSkin(data, clientFeatures) {
  if (typeof data === 'object' && (data.skin_tone || data.tone)) return data;
  if (clientFeatures) {
    return {
      skin_tone: `${clientFeatures.skin.tone}${clientFeatures.skin.shade}`,
      skin_type: clientFeatures.skin.type,
      rgb: clientFeatures.skin.rgb,
    };
  }
  return data;
}

function mergeWithClientFeatures(analysis, f) {
  const attr = analysis.faceAttribute?.faces?.[0];
  const micro = analysis.microFace?.faces?.[0];

  if (attr && !attr.age?.value && f.portrait?.age) {
    attr.age = { value: f.portrait.age };
  }
  if (micro) {
    if (!micro.eye?.shape && f.eyes?.shape) {
      micro.eye = { ...micro.eye, shape: f.eyes.shape, eyelid: f.eyes.eyelid, size: f.eyes.size };
    }
    if (!micro.face?.shape && f.face?.shape) {
      micro.face = { shape: f.face.shape };
    }
  }

  if (!analysis.skinSegment?.skin_tone && f.skin) {
    analysis.skinSegment = {
      skin_tone: `${f.skin.tone}${f.skin.shade}`,
      skin_type: f.skin.type,
      rgb: f.skin.rgb,
    };
  }

  return analysis;
}
