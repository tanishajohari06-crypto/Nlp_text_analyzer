/* app.js — TextLens SaaS Application Logic */

const API_BASE = '';

// Sample text datasets
const SAMPLES = {
  tech: `Artificial intelligence (AI) is rapidly transforming virtually every sector of modern society, from healthcare and education to finance and entertainment. At its core, AI refers to the simulation of human intelligence processes by computer systems, including learning, reasoning, and self-correction.

The recent surge in large language models (LLMs) like GPT-4, Gemini, and Claude has demonstrated remarkable capabilities in natural language understanding and generation. These models, trained on vast corpora of text, can engage in nuanced conversation, generate creative content, assist in coding, and even perform complex reasoning tasks.

However, this technological revolution comes with significant challenges. Privacy concerns, algorithmic bias, job displacement, and the potential misuse of AI-generated content are pressing issues that policymakers, researchers, and industry leaders must urgently address. The question of AI alignment—ensuring these powerful systems act in accordance with human values—remains one of the most critical unsolved problems in computer science.`,

  news: `Global stock markets experienced heightened volatility on Monday as central banks signaled prolonged elevated interest rates to combat persistent core inflation. European equity indices retreated by over 1.2%, while Wall Street futures pointed to a muted open.

Energy commodities surged following unexpected supply constraints in North America, with Brent crude rising above $88 per barrel. Financial analysts note that higher energy prices could complicate central bank efforts to achieve target inflation rates of 2% without triggering a broader economic contraction.

Meanwhile, consumer confidence indicators in major developed economies fell to six-month lows, reflecting growing public anxiety over mortgage rates, elevated grocery prices, and tightening credit conditions across retail banking institutions.`,

  academic: `Quantum entanglement represents one of the most intriguing phenomena in quantum mechanics, wherein pairs or groups of particles interact in ways such that the quantum state of each particle cannot be described independently of the state of the others, even when the particles are separated by a large distance.

Recent empirical validations utilizing satellite-based quantum key distribution (QKD) have demonstrated quantum state teleportation over distances exceeding 1,200 kilometers. These experimental breakthroughs provide fundamental empirical support for future quantum networking protocols and unhackable cryptographic communication architectures.

However, decoherence caused by atmospheric turbulence and thermal fluctuations remains a primary obstacle to practical scalable deployment. Mitigating phase decoherence requires advanced adaptive optics and super-cooled superconducting photon detectors.`
};

/* ── DOM Elements ─────────────────────────────────── */
const $ = id => document.getElementById(id);

const textInput    = $('text-input');
const charCount    = $('char-count');
const wordCount    = $('word-count');
const btnAnalyze   = $('btn-analyze');
const btnClear     = $('btn-clear');
const btnSample    = $('btn-sample');

const emptyState   = $('empty-state');
const loadingPanel = $('loading-panel');
const loaderText   = $('loader-text');
const errorBanner  = $('error-banner');
const errorMsg     = $('error-msg');
const resultsGrid  = $('results-grid');

const LOADER_MSGS = [
  'Parsing document structure...',
  'Computing Flesch readability index...',
  'Extracting sentiment & emotional arc...',
  'Mining named entities & key phrases...',
  'Synthesizing executive summary...'
];

/* ── State ────────────────────────────────────────── */
let summaryData = {};
let currentSummaryKey = 'brief';
let loaderInterval = null;
let lastAnalysisResult = null;

/* ── Helper Functions ─────────────────────────────── */
function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true;  }
const pct = v => Math.round(parseFloat(v || 0) * 100) + '%';
const fmt = (v, d = 2) => Number(v).toFixed(d);

function updateCounts() {
  const val = textInput ? textInput.value : '';
  if (charCount) charCount.textContent = val.length.toLocaleString();
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;
  if (wordCount) wordCount.textContent = words.toLocaleString();
}

function loadText(text, targetBtn) {
  if (!textInput) return;
  textInput.value = text;
  updateCounts();
  textInput.focus();

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (targetBtn) targetBtn.classList.add('active');

  // Trigger analysis automatically
  btnAnalyze.click();
}

/* ── Modals & Navigation System ───────────────────── */
function openModal(id) {
  const m = $(id);
  if (m) m.hidden = false;
}

function closeModal(id) {
  const m = $(id);
  if (m) m.hidden = true;
  setActiveNav('nav-analyzer');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.hidden = true);
}

function setActiveNav(navId) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.id === navId);
  });
}

// Nav Header Clicks
$('nav-analyzer')?.addEventListener('click', (e) => {
  e.preventDefault();
  closeAllModals();
  setActiveNav('nav-analyzer');
});

$('nav-history')?.addEventListener('click', (e) => {
  e.preventDefault();
  setActiveNav('nav-history');
  renderHistory();
  openModal('modal-history');
});

// Modal close button delegation
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Header Status & Avatar
$('btn-status')?.addEventListener('click', () => openModal('modal-about'));
$('user-avatar')?.addEventListener('click', () => openModal('modal-about'));

/* ── Presets & Editor Events ─────────────────────── */
if (textInput) textInput.addEventListener('input', updateCounts);

if (btnClear) {
  btnClear.addEventListener('click', () => {
    textInput.value = '';
    updateCounts();
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    hide(resultsGrid);
    hide(errorBanner);
    hide(loadingPanel);
    show(emptyState);
  });
}

if (btnSample) {
  btnSample.addEventListener('click', (e) => loadText(SAMPLES.tech, e.target));
}

if ($('btn-sample-tech')) {
  $('btn-sample-tech').addEventListener('click', (e) => loadText(SAMPLES.tech, e.currentTarget));
}
if ($('btn-sample-news')) {
  $('btn-sample-news').addEventListener('click', (e) => loadText(SAMPLES.news, e.currentTarget));
}
if ($('btn-sample-academic')) {
  $('btn-sample-academic').addEventListener('click', (e) => loadText(SAMPLES.academic, e.currentTarget));
}

/* Sync Summary Depth Toggles */
function setSummaryDepth(key) {
  currentSummaryKey = key;
  $('summary-toggle')?.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === key);
  });
  $('summary-switch')?.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.key === key);
  });
  if (summaryData[key] || summaryData.standard) {
    $('summary-text').textContent = summaryData[key] || summaryData.standard || '';
  }
}

$('summary-toggle')?.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => setSummaryDepth(btn.dataset.val));
});

$('summary-switch')?.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => setSummaryDepth(btn.dataset.key));
});

/* Copy Summary */
$('copy-summary')?.addEventListener('click', async () => {
  const text = $('summary-text').textContent;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const icon = $('copy-summary');
  icon.style.color = 'var(--emerald)';
  setTimeout(() => icon.style.color = '', 1500);
});

/* ── Export Handler ──────────────────────────────── */
if ($('btn-export-pdf')) {
  $('btn-export-pdf').addEventListener('click', () => {
    openModal('modal-export');
  });
}

$('exp-pdf')?.addEventListener('click', () => {
  closeModal('modal-export');
  window.print();
});

$('exp-json')?.addEventListener('click', () => {
  if (!lastAnalysisResult) { alert('Please run an analysis first.'); return; }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastAnalysisResult, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `textlens_analysis_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  closeModal('modal-export');
});

$('exp-md')?.addEventListener('click', () => {
  if (!lastAnalysisResult) { alert('Please run an analysis first.'); return; }
  const d = lastAnalysisResult;
  const md = `# TextLens Intelligence Report
*Generated on ${new Date().toLocaleString()}*

## Executive Summary
${d.summary?.standard || d.summary?.brief || ''}

## Sentiment & Emotion
- **Label:** ${d.sentiment?.label || 'Neutral'} (${d.sentiment?.score || 0})
- **Explanation:** ${d.sentiment?.explanation || ''}

## Readability Metrics
- **Flesch Score:** ${d.readability?.flesch_score || '--'}
- **Grade Level:** ${d.readability?.grade_level || '--'}
- **Writing Style:** ${d.readability?.writing_style || '--'}

## Key Topics
${(d.key_topics || []).map(t => `- **${t.topic}:** ${t.description}`).join('\n')}

## Insights
${(d.insights || []).map(i => `- ${i}`).join('\n')}
`;

  const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `textlens_report_${Date.now()}.md`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  closeModal('modal-export');
});

/* ── Error Dismissal ─────────────────────────────── */
$('error-close')?.addEventListener('click', () => hide(errorBanner));

function showError(msg) {
  if (errorMsg) errorMsg.textContent = msg;
  show(errorBanner);
  hide(loadingPanel);
  if (btnAnalyze) btnAnalyze.disabled = false;
  stopLoader();
}

/* Loader Animation */
function startLoader() {
  let i = 0;
  if (loaderText) loaderText.textContent = LOADER_MSGS[0];
  loaderInterval = setInterval(() => {
    i = (i + 1) % LOADER_MSGS.length;
    if (loaderText) loaderText.textContent = LOADER_MSGS[i];
  }, 900);
}

function stopLoader() {
  if (loaderInterval) {
    clearInterval(loaderInterval);
    loaderInterval = null;
  }
}

/* ── Analyze Action ───────────────────────────────── */
btnAnalyze?.addEventListener('click', async () => {
  const text = textInput ? textInput.value.trim() : '';
  if (!text) { showError('Please enter or paste some text to analyze.'); return; }

  hide(emptyState);
  hide(errorBanner);
  hide(resultsGrid);
  show(loadingPanel);
  btnAnalyze.disabled = true;
  startLoader();

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, summary_length: currentSummaryKey }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { showError(data.error || 'Failed to analyze text.'); return; }

    lastAnalysisResult = data;
    saveToHistory(text, data);

    render(data);
    hide(loadingPanel);
    show(resultsGrid);
  } catch (e) {
    showError('Network connection error: ' + e.message);
  } finally {
    stopLoader();
    btnAnalyze.disabled = false;
  }
});

/* ── Data Renderer ────────────────────────────────── */
function render(d) {
  renderSummary(d.summary);
  renderSentiment(d.sentiment, d.emotions);
  renderReadability(d.readability);
  renderMetrics(d.language_metrics);
  renderTopics(d.key_topics);
  renderEntities(d.named_entities);
  renderPhrases(d.key_phrases);
  renderInsights(d.insights, d.content_category, d.objectivity_score);
}

function renderSummary(s) {
  summaryData = s || {};
  if ($('summary-text')) {
    $('summary-text').textContent = summaryData[currentSummaryKey] || summaryData.standard || '';
  }
}

function renderSentiment(s, emotions) {
  if (!s) return;
  const score = parseFloat(s.score || 0);
  const label = s.label || 'Neutral';

  const COLORS = {
    Positive: 'var(--emerald)',
    Negative: 'var(--rose)',
    Mixed:    'var(--amber)',
    Neutral:  'var(--text-muted)'
  };
  const col = COLORS[label] || COLORS.Neutral;

  if ($('sentiment-label')) {
    $('sentiment-label').textContent = label;
    $('sentiment-label').style.color = col;
  }
  if ($('sentiment-score-chip')) {
    $('sentiment-score-chip').textContent = (score > 0 ? '+' : '') + fmt(score, 2);
  }

  const p = Math.max(0, Math.min(100, ((score + 1) / 2) * 100));
  if ($('gauge-fill')) {
    $('gauge-fill').style.width = p + '%';
    $('gauge-fill').style.backgroundColor = col;
  }
  if ($('gauge-dot')) {
    $('gauge-dot').style.left = p + '%';
    $('gauge-dot').style.borderColor = col;
  }

  if ($('sentiment-explanation')) {
    $('sentiment-explanation').textContent = s.explanation || '';
  }

  if ($('emotions-list')) {
    $('emotions-list').innerHTML = (emotions || []).map(e => {
      const val = parseFloat(e.intensity || 0);
      return `
        <div>
          <div class="emo-row">
            <span>${e.emotion}</span>
            <span>${pct(val)}</span>
          </div>
          <div class="emo-bar"><div class="emo-fill" style="width:${pct(val)}; background-color:${col}"></div></div>
        </div>
      `;
    }).join('');
  }
}

function renderReadability(r) {
  if (!r) return;
  const score = Math.max(0, Math.min(100, parseFloat(r.flesch_score || 50)));

  if ($('flesch-score-label')) $('flesch-score-label').textContent = Math.round(score);
  if ($('ring-fg')) $('ring-fg').setAttribute('stroke-dasharray', `${score}, 100`);

  if ($('r-grade-val')) $('r-grade-val').textContent = r.grade_level || '--';
  if ($('r-style-val')) $('r-style-val').textContent = r.writing_style || '--';
  if ($('r-vocab-val')) $('r-vocab-val').textContent = r.vocabulary_richness || '--';
  if ($('r-sent-val'))  $('r-sent-val').textContent  = r.avg_sentence_length ? r.avg_sentence_length + ' words' : '--';
}

function renderMetrics(m) {
  if (!m || !$('metrics-grid')) return;
  const items = [
    { l: 'Language', v: m.detected_language || 'EN', s: 'Detected' },
    { l: 'Total Words', v: (m.word_count||0).toLocaleString(), s: `${m.sentence_count||0} sentences` },
    { l: 'Paragraphs', v: m.paragraph_count||'1', s: 'Text blocks' },
    { l: 'Lexical Ratio', v: pct(m.unique_word_ratio||0), s: 'Unique words' }
  ];
  $('metrics-grid').innerHTML = items.map(i => `
    <div class="metric">
      <span class="m-lbl">${i.l}</span>
      <span class="m-val">${i.v}</span>
      <span class="m-sub">${i.s}</span>
    </div>
  `).join('');
}

function renderTopics(topics) {
  if (!$('topics-list')) return;
  $('topics-list').innerHTML = (topics || []).map((t, i) => `
    <div class="topic">
      <span class="t-idx">${String(i+1).padStart(2,'0')}</span>
      <div class="t-info">
        <div class="t-title">${t.topic}</div>
        <div class="t-desc">${t.description}</div>
      </div>
    </div>
  `).join('');
}

function renderEntities(entities) {
  if (!$('entities-list')) return;
  $('entities-list').innerHTML = (entities || []).map(e => `
    <div class="tag"><span>${e.type || 'ENTITY'}</span> ${e.text} ${e.count > 1 ? `(${e.count})` : ''}</div>
  `).join('');
}

function renderPhrases(phrases) {
  if (!$('phrases-cloud')) return;
  $('phrases-cloud').innerHTML = (phrases || []).map(p => `
    <div class="tag">${p}</div>
  `).join('');
}

function renderInsights(insights, category, objectivity) {
  if ($('content-category-badge')) $('content-category-badge').textContent = category || 'General';
  const obj = Math.round(parseFloat(objectivity || 0) * 100);
  if ($('objectivity-pill')) $('objectivity-pill').textContent = `Objectivity ${obj}%`;

  if ($('insights-list')) {
    $('insights-list').innerHTML = (insights || []).map(i => `
      <div class="insight">
        <span class="i-dot">✓</span>
        <span>${i}</span>
      </div>
    `).join('');
  }
}

/* ── History Persistence System ───────────────────── */
function saveToHistory(text, result) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('textlens_history') || '[]'); } catch(e){}
  const item = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString(),
    snippet: text.slice(0, 75) + (text.length > 75 ? '...' : ''),
    fullText: text,
    result: result
  };
  history.unshift(item);
  if (history.length > 20) history.pop();
  localStorage.setItem('textlens_history', JSON.stringify(history));
}

function renderHistory() {
  const container = $('history-items-container');
  if (!container) return;

  let history = [];
  try { history = JSON.parse(localStorage.getItem('textlens_history') || '[]'); } catch(e){}

  if (history.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 24px; color: var(--text-muted);">No analysis history yet. Run an analysis to store runs locally.</div>`;
    return;
  }

  container.innerHTML = history.map((item, idx) => `
    <div class="history-item" data-idx="${idx}">
      <div class="history-main">
        <div class="history-snippet">${item.snippet}</div>
        <div class="history-meta">
          <span>🕒 ${item.date} ${item.timestamp}</span>
          <span>🏷️ ${item.result?.content_category || 'General'}</span>
          <span>🎭 ${item.result?.sentiment?.label || 'Neutral'}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="btn-outline-sm btn-load-hist" data-idx="${idx}">Restore</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.btn-load-hist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = btn.dataset.idx;
      const target = history[idx];
      if (target) {
        textInput.value = target.fullText;
        updateCounts();
        lastAnalysisResult = target.result;
        render(target.result);
        hide(emptyState);
        show(resultsGrid);
        closeModal('modal-history');
      }
    });
  });
}

$('btn-clear-history')?.addEventListener('click', () => {
  localStorage.removeItem('textlens_history');
  renderHistory();
});


