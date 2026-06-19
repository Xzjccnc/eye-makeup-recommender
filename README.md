# AI 眼妆推荐 Web App

基于 [美图 AI 开放平台](https://ai.meitu.com/doc) 的智能眼妆推荐应用，类似美图秀秀眼妆推荐功能。

## 功能

- **上传自拍** → 调用 5 项美图 RESTful API 进行面部分析
- **智能推荐** → 根据眼型、眼皮、肤色、年龄等维度匹配 8 款眼妆方案
- **虚拟试妆** → Canvas 基于 118 人脸关键点实时渲染眼影/眼线/高光
- **化妆建议** → 个性化技巧提示

## 接入 API

| 能力 | Endpoint |
|------|----------|
| 人脸属性分析 v4 | `POST /v1/face_attribute_v4` |
| 人脸关键点检测 | `POST /v1/face_keypoint` |
| 微观人脸分析 | `POST /v1/micro_face` |
| 皮肤分割 | `POST /v1/skin_segment` |
| 精细化人像抠图 | `POST /v1/photo_scissors/sod` |

- 基域名: `openapi.mtlab.meitu.com`
- 鉴权: URL 参数 `api_key` + `api_secret`
- Content-Type: `application/json`

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置密钥（可选，默认演示模式）
cp .env.example .env
# 编辑 .env 填入 MEITU_API_KEY 和 MEITU_API_SECRET

# 3. 启动
npm start
```

浏览器访问 http://localhost:3000

## 获取 API 密钥

1. 注册 [美图 AI 开放平台](https://ai.meitu.com/doc)
2. 在对应技术页面点击「申请接入」
3. 试用密钥共 1000 次 / 1 QPS
4. 将密钥填入 `.env`

## 项目结构

```
├── server/
│   ├── index.js        # Express 服务 + API 路由
│   ├── meitu-api.js    # 美图 API 客户端
│   ├── recommend.js    # 眼妆推荐引擎
│   └── mock-data.js    # 演示模式数据
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── makeup-renderer.js
└── package.json
```

## 推荐逻辑

综合以下维度为每款眼妆计算匹配分：

- 眼型（杏眼、圆眼、丹凤眼等）
- 眼皮类型（单眼皮 / 双眼皮 / 内双）
- 肤色冷暖调（皮肤分割 + 属性分析）
- 年龄区间与当前妆容状态

## 注意事项

- 图片支持 JPG/PNG，Base64 不超过 5MB
- API 密钥通过后端代理调用，避免前端暴露
- 无密钥时自动进入演示模式，可体验完整 UI 流程
