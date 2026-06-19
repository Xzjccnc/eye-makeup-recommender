import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeFaceAll } from './meitu-api.js';
import { buildAnalysisFromFeatures, buildAnalysisFromBuffer } from './mock-data.js';
import { normalizeMeituAnalysis } from './parse-meitu.js';
import { generateRecommendations } from './recommend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.MEITU_API_KEY || '';
const API_SECRET = process.env.MEITU_API_SECRET || '';
const MOCK_MODE = process.env.MOCK_MODE === 'true' || !API_KEY || API_KEY === 'your_api_key';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : new Error('仅支持 JPG/PNG'), ok);
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mockMode: MOCK_MODE,
    apis: [
      'face_attribute_v4',
      'face_keypoint',
      'micro_face',
      'skin_segment',
      'photo_scissors/sod',
    ],
  });
});

app.post('/api/analyze', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file && !req.body.imageBase64) {
      return res.status(400).json({ error: '请上传照片' });
    }

    const imageBuffer = req.file
      ? req.file.buffer
      : Buffer.from(req.body.imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    let clientFeatures = null;
    if (req.body.clientFeatures) {
      try {
        clientFeatures = JSON.parse(req.body.clientFeatures);
      } catch {
        /* ignore */
      }
    }

    let analysis;
    if (MOCK_MODE) {
      await new Promise((r) => setTimeout(r, 600));
      if (clientFeatures) {
        analysis = buildAnalysisFromFeatures(clientFeatures);
      } else {
        analysis = buildAnalysisFromBuffer(imageBuffer);
      }
    } else {
      analysis = await analyzeFaceAll(imageBuffer, API_KEY, API_SECRET);
      analysis = normalizeMeituAnalysis(analysis, clientFeatures);
    }

    const result = generateRecommendations(analysis);

    res.json({
      success: true,
      mockMode: MOCK_MODE,
      analysis: {
        faceAttribute: analysis.faceAttribute,
        faceKeypoint: analysis.faceKeypoint,
        microFace: analysis.microFace,
        skinSegment: analysis.skinSegment,
        matting: analysis.matting,
        imageFeatures: analysis.imageFeatures,
        errors: analysis.errors || {},
      },
      ...result,
    });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message || '分析失败' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ✨ 眼妆推荐 App  http://localhost:${PORT}`);
  console.log(`  模式: ${MOCK_MODE ? '本地图像分析 (配置 .env 启用美图 API)' : '美图 API 已连接'}\n`);
});
