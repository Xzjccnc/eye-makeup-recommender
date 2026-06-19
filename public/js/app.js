const $ = (sel) => document.querySelector(sel);

const uploadSection = $('#uploadSection');
const loadingSection = $('#loadingSection');
const resultSection = $('#resultSection');
const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const selectBtn = $('#selectBtn');
const previewCanvas = $('#previewCanvas');
const summaryGrid = $('#summaryGrid');
const tipsList = $('#tipsList');
const makeupList = $('#makeupList');
const intensitySlider = $('#intensitySlider');
const intensityValue = $('#intensityValue');
const resetBtn = $('#resetBtn');
const modeBadge = $('#modeBadge');
const highlightTitle = $('#highlightTitle');
const highlightSub = $('#highlightSub');

const renderer = new MakeupRenderer(previewCanvas);
let currentData = null;
let selectedStyle = null;
let previewMap = {};

async function init() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!data.mockMode) {
      modeBadge.textContent = 'API 已连接';
      modeBadge.classList.add('live');
    } else {
      modeBadge.textContent = '本地图像分析';
    }
  } catch {
    /* ignore */
  }

  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  intensitySlider.addEventListener('input', () => {
    const v = intensitySlider.value / 100;
    intensityValue.textContent = `${intensitySlider.value}%`;
    renderer.setIntensity(v);
  });

  resetBtn.addEventListener('click', reset);

  window.addEventListener('resize', () => {
    if (currentData) renderer.render();
  });
}

async function handleFile(file) {
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    alert('请上传 JPG 或 PNG 格式的图片');
    return;
  }

  showSection('loading');
  animateSteps();

  try {
    const clientFeatures = await ImageAnalyzer.analyzeImageFile(file);

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('clientFeatures', JSON.stringify(clientFeatures));

    const res = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '分析失败');

    currentData = data;

    // 先显示结果页，确保 canvas 容器有宽度
    showSection('result');
    await nextFrame();

    const imageUrl = URL.createObjectURL(file);
    await renderer.loadImage(imageUrl);

    const landmarks = data.faceInfo?.landmarks || [];
    const faceRect = data.faceInfo?.faceRect || clientFeatures.faceRect;
    renderer.setLandmarks(landmarks, faceRect);

    // 先生成各款眼妆试妆缩略图
    previewMap = await renderer.generatePreviews(data.recommendations || []);

    renderHighlight(data.analysisHighlight);
    renderSummary(data.summary);
    renderTips(data.tips);
    renderMakeupList(data.recommendations);

    if (data.recommendations?.length) {
      selectMakeup(data.recommendations[0]);
    } else {
      renderer.render();
    }
  } catch (err) {
    alert(err.message);
    showSection('upload');
  }
}

function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

function renderHighlight(highlight) {
  if (!highlight) {
    highlightTitle.textContent = '分析完成';
    highlightSub.textContent = '';
    return;
  }
  highlightTitle.textContent = highlight.title;
  highlightSub.textContent = `${highlight.subtitle}（匹配度 ${highlight.topScore} 分）`;
}

function animateSteps() {
  const steps = document.querySelectorAll('.loading-steps .step');
  steps.forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i === 0) s.classList.add('active');
  });

  let current = 0;
  const timer = setInterval(() => {
    if (current < steps.length) {
      steps[current].classList.remove('active');
      steps[current].classList.add('done');
      current++;
      if (current < steps.length) steps[current].classList.add('active');
    } else {
      clearInterval(timer);
    }
  }, 500);
}

function renderSummary(summary) {
  summaryGrid.innerHTML = Object.entries(summary)
    .map(
      ([label, value]) => `
      <div class="summary-item">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
      </div>`,
    )
    .join('');
}

function renderTips(tips) {
  tipsList.innerHTML = (tips || []).map((t) => `<li>${t}</li>`).join('');
}

function renderMakeupList(items) {
  makeupList.innerHTML = items
    .map((m, idx) => {
      const thumb = previewMap[m.id]
        ? `<img class="makeup-thumb" src="${previewMap[m.id]}" alt="${m.name}试妆效果" />`
        : `<div class="makeup-colors">${(m.colors?.shadow || []).slice(0, 3).map((c) => `<div class="color-dot" style="background:${c}"></div>`).join('')}</div>`;

      return `
    <div class="makeup-item${idx === 0 ? ' active' : ''}" data-id="${m.id}">
      ${thumb}
      <div class="makeup-info">
        <div class="name-row">
          <span class="name">${m.name}</span>
          <span class="tag">${m.tag}</span>
          ${idx === 0 ? '<span class="tag tag-top">首推</span>' : ''}
        </div>
        <div class="desc">${m.description}</div>
        <div class="reason">${m.reason}</div>
      </div>
      <div class="makeup-score">
        <div class="score">${m.matchScore}</div>
        <div class="label">匹配度</div>
      </div>
    </div>`;
    })
    .join('');

  makeupList.querySelectorAll('.makeup-item').forEach((el) => {
    el.addEventListener('click', () => {
      const item = items.find((m) => m.id === el.dataset.id);
      if (item) selectMakeup(item);
    });
  });
}

function selectMakeup(style) {
  selectedStyle = style;
  makeupList.querySelectorAll('.makeup-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === style.id);
  });
  intensitySlider.value = Math.round((style.intensity || 0.5) * 100);
  intensityValue.textContent = `${intensitySlider.value}%`;
  renderer.setIntensity(intensitySlider.value / 100);
  renderer.setStyle(style);
}

function showSection(name) {
  uploadSection.classList.toggle('hidden', name !== 'upload');
  loadingSection.classList.toggle('hidden', name !== 'loading');
  resultSection.classList.toggle('hidden', name !== 'result');
}

function reset() {
  currentData = null;
  selectedStyle = null;
  previewMap = {};
  fileInput.value = '';
  showSection('upload');
}

init();
