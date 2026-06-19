/**
 * 美图 AI 开放平台 RESTful API 客户端
 * 基域名: openapi.mtlab.meitu.com
 * 文档: https://ai.meitu.com/doc
 */

const BASE_URL = 'https://openapi.mtlab.meitu.com';

export const API_ENDPOINTS = {
  faceAttributeV4: '/v1/face_attribute_v4',
  faceKeypoint: '/v1/face_keypoint',
  microFace: '/v1/micro_face',
  skinSegment: '/v1/skin_segment',
  photoScissors: '/v1/photo_scissors/sod',
};

function buildBody(imageBase64, mediaType, parameter = {}) {
  return {
    parameter,
    media_info_list: [
      {
        media_data: imageBase64,
        media_extra: {},
        media_profiles: { media_data_type: mediaType },
      },
    ],
    extra: {},
  };
}

function detectMediaType(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'png';
  return 'jpg';
}

async function post(endpoint, imageBuffer, apiKey, apiSecret, parameter = {}) {
  const mediaType = detectMediaType(imageBuffer);
  const url = `${BASE_URL}${endpoint}?api_key=${encodeURIComponent(apiKey)}&api_secret=${encodeURIComponent(apiSecret)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBody(imageBuffer.toString('base64'), mediaType, parameter)),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`响应解析失败 (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.message || data.error_msg || `HTTP ${res.status}`);
  }
  if (data.error_code && data.error_code !== 0) {
    throw new Error(data.error_msg || `算法错误 ${data.error_code}`);
  }
  return data;
}

async function pollTask(taskId, apiKey, apiSecret) {
  const url = `${BASE_URL}/api/v1/sdk/status?api_key=${encodeURIComponent(apiKey)}&api_secret=${encodeURIComponent(apiSecret)}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId }),
    });
    const data = await res.json();
    const status = data.status ?? data.data?.status;
    if (status === 10) return data;
    if (status === 2) throw new Error('抠图失败');
  }
  throw new Error('抠图超时');
}

export async function callPhotoScissors(imageBuffer, apiKey, apiSecret) {
  const data = await post(
    API_ENDPOINTS.photoScissors,
    imageBuffer,
    apiKey,
    apiSecret,
    { nMask: true, model_type: 2, rsp_media_type: 'png' },
  );
  if (data.task_id) return pollTask(data.task_id, apiKey, apiSecret);
  return data;
}

export async function analyzeFaceAll(imageBuffer, apiKey, apiSecret) {
  const keys = ['faceAttribute', 'faceKeypoint', 'microFace', 'skinSegment', 'matting'];
  const fns = [
    () => post(API_ENDPOINTS.faceAttributeV4, imageBuffer, apiKey, apiSecret),
    () => post(API_ENDPOINTS.faceKeypoint, imageBuffer, apiKey, apiSecret),
    () => post(API_ENDPOINTS.microFace, imageBuffer, apiKey, apiSecret),
    () => post(API_ENDPOINTS.skinSegment, imageBuffer, apiKey, apiSecret, { rsp_media_type: 'png' }),
    () => callPhotoScissors(imageBuffer, apiKey, apiSecret),
  ];

  const settled = await Promise.allSettled(fns.map((fn) => fn()));
  const result = {};
  const errors = {};

  settled.forEach((s, i) => {
    const key = keys[i];
    if (s.status === 'fulfilled') result[key] = s.value;
    else errors[key] = s.reason?.message || '调用失败';
  });

  return { ...result, errors };
}
