const $ = (sel) => document.querySelector(sel);

const uploadSection = $('#uploadSection');
const loadingSection = $('#loadingSection');
const resultSection = $('#resultSection');
const dropZone = $('#dropZone');
const fileInput = $('#fileInput');
const selectBtn = $('#selectBtn');
const previewCanvas = $('#previewCanvas');
const analysisTableWrap = $('#analysisTableWrap');
const tipsList = $('#tipsList');
const resetBtn = $('#resetBtn');
const modeBadge = $('#modeBadge');
const highlightTitle = $('#highlightTitle');
const highlightSub = $('#highlightSub');

const renderer = new MakeupRenderer(previewCanvas);
let currentData = null;

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

    showSection('result');
    await nextFrame();

    const imageUrl = URL.createObjectURL(file);
    await renderer.loadImage(imageUrl);

    const landmarks = data.faceInfo?.landmarks || [];
    const faceRect = data.faceInfo?.faceRect || clientFeatures.faceRect;
    renderer.setLandmarks(landmarks, faceRect);
    renderer.render();

    renderHighlight(data.analysisHighlight);
    renderAnalysisTable(data.analysisTable);
    renderTips(data.tips);
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

function renderAnalysisTable(rows) {
  if (!rows?.length) {
    analysisTableWrap.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">暂无数据</p>';
    return;
  }
  analysisTableWrap.innerHTML = `
    <table class="analysis-table">
      <thead>
        <tr>
          <th>代码输入字段</th>
          <th>原始数据</th>
          <th>imageFeatures 存储值</th>
          <th>报告字段</th>
          <th>报告值</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td class="col-field"><code>${row.inputField}</code></td>
            <td class="col-measure">${row.rawValue ?? '-'}</td>
            <td class="col-raw">${row.inputValue}</td>
            <td class="col-label">${row.reportLabel}</td>
            <td class="col-value">${row.reportValue}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderTips(tips) {
  tipsList.innerHTML = (tips || []).map((t) => `<li>${t}</li>`).join('');
}

function showSection(name) {
  uploadSection.classList.toggle('hidden', name !== 'upload');
  loadingSection.classList.toggle('hidden', name !== 'loading');
  resultSection.classList.toggle('hidden', name !== 'result');
}

function reset() {
  currentData = null;
  fileInput.value = '';
  showSection('upload');
}

init();
