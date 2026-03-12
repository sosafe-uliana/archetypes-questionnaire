'use strict';

// ─── URL initialisation ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const sp           = new URLSearchParams(window.location.search);
  const resultsName  = sp.get('results');
  const modeParam    = sp.get('mode');
  const subjectParam = sp.get('subject');

  if (resultsName) {
    loadAndShowResults(resultsName);
    return;
  }
  if (modeParam === 'peer') {
    setMode('peer');
    if (subjectParam) lockSubject(decodeURIComponent(subjectParam));
  }
});

// ─── State ───────────────────────────────────────────────────────────────────

let mode          = 'self'; // 'self' | 'peer'
let evaluatorName = '';
let subjectName   = '';
let answers       = new Array(10).fill(null);
let current       = 0;
let ORDER         = [];
let chartInst     = null;

// Results state — persisted across view-mode toggles
let _selfScores     = null;
let _peerAvgScores  = null;
let _peerList       = [];
let _displaySubject = '';
let _topArchetype   = '';
let viewMode        = 'both'; // 'both' | 'self' | 'peer'

// Storage is provided by firebase.js (storeSelfScores, loadSelfScores,
// appendPeerScores, loadPeerScores) loaded before this file.

// ─── Intro UI ────────────────────────────────────────────────────────────────

function setMode(newMode) {
  mode = newMode;
  document.getElementById('btn-mode-self').classList.toggle('active', mode === 'self');
  document.getElementById('btn-mode-peer').classList.toggle('active', mode === 'peer');
  document.getElementById('subject-field').style.display = mode === 'peer' ? 'block' : 'none';
  document.getElementById('intro-badge').textContent =
    mode === 'self' ? 'Self-Assessment' : '360\u00b0 Peer Evaluation';
  updateBeginButton();
}

function lockSubject(name) {
  subjectName = name;
  document.getElementById('subject-name').value            = name;
  document.getElementById('mode-toggle-wrap').style.display = 'none';
  document.getElementById('subject-field').style.display   = 'none';
  const el = document.getElementById('locked-subject-display');
  el.textContent   = 'Evaluating ' + name;
  el.style.display = 'block';
}

function updateBeginButton() {
  const name    = document.getElementById('evaluator-name').value.trim();
  const subject = document.getElementById('subject-name').value.trim();
  const valid   = name.length > 0 && (mode === 'self' || subject.length > 0);
  document.getElementById('btn-begin').disabled = !valid;
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

function startQuiz() {
  evaluatorName = document.getElementById('evaluator-name').value.trim();
  subjectName   = document.getElementById('subject-name').value.trim();
  answers       = new Array(10).fill(null);
  current       = 0;
  ORDER         = [...Array(10).keys()].sort(() => Math.random() - 0.5);
  show('screen-quiz');
  renderQ();
}

function renderQ() {
  const q     = QUESTIONS[ORDER[current]];
  const qText = mode === 'peer' && q.peerText
    ? q.peerText.replace(/\{name\}/g, subjectName)
    : q.text;
  document.getElementById('q-text').textContent = qText;

  const wrap = document.getElementById('likert-options');
  wrap.innerHTML = '';
  for (let v = 1; v <= 7; v++) {
    const lbl = document.createElement('label');
    const inp = document.createElement('input');
    inp.type  = 'radio';
    inp.name  = 'likert';
    inp.value = v;
    if (answers[current] === v) inp.checked = true;
    inp.addEventListener('change', () => {
      answers[current] = v;
      document.getElementById('btn-next').disabled = false;
    });
    const dot = document.createElement('div');
    dot.className   = 'dot';
    dot.textContent = v;
    lbl.appendChild(inp);
    lbl.appendChild(dot);
    wrap.appendChild(lbl);
  }

  const pct = Math.round((current / 10) * 100);
  document.getElementById('prog-label').textContent = `Question ${current + 1} of 10`;
  document.getElementById('prog-pct').textContent   = pct + '%';
  document.getElementById('prog-fill').style.width  = pct + '%';
  document.getElementById('btn-back').style.visibility = current === 0 ? 'hidden' : 'visible';
  document.getElementById('btn-next').disabled    = answers[current] === null;
  document.getElementById('btn-next').textContent = current === 9 ? 'See Results \u2192' : 'Next \u2192';

  // re-trigger animation
  const card = document.getElementById('q-card');
  card.style.animation = 'none';
  card.offsetHeight; // force reflow
  card.style.animation = '';
}

function goNext() {
  if (answers[current] === null) return;
  if (current === 9) { showResults(); return; }
  current++;
  renderQ();
}

function goBack() {
  if (current === 0) return;
  current--;
  renderQ();
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function computeScores(ans, order) {
  const raw = {};
  order.forEach((origIdx, pos) => { raw[origIdx] = ans[pos]; });

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

  // Q0–2 agree = People; Q3–4 agree = Execution (flip for People axis)
  const peopleScore = (avg([raw[0], raw[1], raw[2]]) + (8 - avg([raw[3], raw[4]]))) / 2;
  const execScore   = 8 - peopleScore;

  // Q5–7 agree = Change; Q8–9 agree = Stability (flip for Change axis)
  const changeScore = (avg([raw[5], raw[6], raw[7]]) + (8 - avg([raw[8], raw[9]]))) / 2;
  const stabilScore = 8 - changeScore;

  return { peopleScore, execScore, changeScore, stabilScore };
}

function archetypeFromScores({ peopleScore, execScore, changeScore, stabilScore }) {
  return [
    { name: 'Systems Stabilizer', s: execScore   + stabilScore },
    { name: 'The Driver',         s: execScore   + changeScore },
    { name: 'Team Builder',       s: peopleScore + stabilScore },
    { name: 'Strategic Shaper',   s: peopleScore + changeScore },
  ].sort((a, b) => b.s - a.s)[0].name;
}

function avgScores(list) {
  const avg = key => list.reduce((sum, s) => sum + s[key], 0) / list.length;
  return {
    peopleScore: avg('peopleScore'),
    execScore:   avg('execScore'),
    changeScore: avg('changeScore'),
    stabilScore: avg('stabilScore'),
  };
}

// ─── Results ─────────────────────────────────────────────────────────────────

async function showResults() {
  const btnNext = document.getElementById('btn-next');
  btnNext.disabled    = true;
  btnNext.textContent = 'Saving\u2026';

  const currentScores = computeScores(answers, ORDER);
  const subject       = mode === 'self' ? evaluatorName : subjectName;

  let selfScores, peerList, peerAvgScores;

  try {
    if (mode === 'self') {
      selfScores = currentScores;
      await storeSelfScores(subject, currentScores);
      peerList      = await loadPeerScores(subject);
      peerAvgScores = peerList.length > 0 ? avgScores(peerList) : null;
    } else {
      await appendPeerScores(subject, currentScores, evaluatorName);
      [peerList, selfScores] = await Promise.all([
        loadPeerScores(subject),
        loadSelfScores(subject),
      ]);
      peerAvgScores = avgScores(peerList); // always ≥ 1 (includes current)
    }
  } catch (err) {
    console.error('Firebase error:', err);
    if (mode === 'self') {
      selfScores = currentScores; peerList = []; peerAvgScores = null;
    } else {
      peerList = [currentScores]; peerAvgScores = currentScores; selfScores = null;
    }
  }

  _selfScores     = selfScores;
  _peerAvgScores  = peerAvgScores;
  _peerList       = peerList || [];
  _displaySubject = mode === 'self' ? evaluatorName : subjectName;

  history.replaceState(null, '', buildResultsUrl(_displaySubject));
  renderResultsUI(mode === 'self');
  show('screen-results');
}

// Load and display results from a shareable ?results=name URL
async function loadAndShowResults(rawName) {
  const name = decodeURIComponent(rawName);
  show('screen-results');
  document.getElementById('res-name').textContent    = 'Loading\u2026';
  document.getElementById('res-tagline').textContent = '';
  document.getElementById('view-toggle').style.display = 'none';

  try {
    const [self, peers] = await Promise.all([loadSelfScores(name), loadPeerScores(name)]);
    _selfScores     = self;
    _peerList       = peers || [];
    _peerAvgScores  = _peerList.length > 0 ? avgScores(_peerList) : null;
    _displaySubject = name;
    renderResultsUI(false);
  } catch (err) {
    console.error('Load error:', err);
    document.getElementById('res-name').textContent    = 'Error loading results';
    document.getElementById('res-tagline').textContent = 'Could not fetch data. Try again later.';
  }
}

function renderResultsUI(isOwnSelf) {
  const has360        = _selfScores !== null && _peerAvgScores !== null;
  const primaryScores = _selfScores || _peerAvgScores;

  if (!primaryScores) {
    document.getElementById('res-name').textContent    = 'No results found';
    document.getElementById('res-tagline').textContent = 'No data has been saved for this person yet.';
    return;
  }

  // Default view mode based on available data
  viewMode = has360 ? 'both' : (_selfScores ? 'self' : 'peer');

  _topArchetype = archetypeFromScores(primaryScores);
  const arch    = ARCHETYPES[_topArchetype];

  // Header
  document.getElementById('res-badge').textContent   = `${_displaySubject}\u2019s Archetype`;
  document.getElementById('res-name').textContent    = _topArchetype;
  document.getElementById('res-tagline').textContent = arch.tagline;

  // View toggle (only when both self and peer data exist)
  const viewToggle = document.getElementById('view-toggle');
  viewToggle.style.display = has360 ? 'flex' : 'none';
  ['self', 'peer', 'both'].forEach(m => {
    document.getElementById('view-btn-' + m).classList.toggle('active', m === viewMode);
  });

  // Peer count badge
  const peerCountEl = document.getElementById('peer-count');
  if (_peerList.length > 0) {
    peerCountEl.textContent = `Based on ${_peerList.length} peer evaluation${_peerList.length !== 1 ? 's' : ''}`;
    peerCountEl.style.display = 'block';
  } else {
    peerCountEl.style.display = 'none';
  }

  // Radar
  buildRadarChart(
    viewMode !== 'peer' ? _selfScores : null,
    viewMode !== 'self' ? _peerAvgScores : null
  );
  document.getElementById('chart-legend').style.display = has360 && viewMode === 'both' ? 'flex' : 'none';

  // Dimension grid
  buildDimGrid(viewMode === 'peer' ? _peerAvgScores : primaryScores, _topArchetype);

  // Variance
  buildVarianceSection(_selfScores, _peerAvgScores);

  // Share text
  buildShareText(_displaySubject, _topArchetype, arch, _selfScores, _peerAvgScores, _peerList.length);

  // Peer invite — only shown right after the user's own self-eval
  document.getElementById('peer-link-section').style.display = isOwnSelf ? 'block' : 'none';
}

function setViewMode(v) {
  viewMode = v;
  ['self', 'peer', 'both'].forEach(m => {
    document.getElementById('view-btn-' + m).classList.toggle('active', m === v);
  });

  const has360    = _selfScores !== null && _peerAvgScores !== null;
  const chartSelf = v !== 'peer' ? _selfScores : null;
  const chartPeer = v !== 'self' ? _peerAvgScores : null;
  buildRadarChart(chartSelf, chartPeer);
  document.getElementById('chart-legend').style.display = has360 && v === 'both' ? 'flex' : 'none';

  const scores = v === 'peer' ? _peerAvgScores : (_selfScores || _peerAvgScores);
  buildDimGrid(scores, _topArchetype);
  buildVarianceSection(
    v === 'peer' ? null : _selfScores,
    v === 'self' ? null : _peerAvgScores
  );
}

function buildRadarChart(selfScores, peerAvgScores) {
  if (chartInst) chartInst.destroy();

  const ctx      = document.getElementById('radarChart').getContext('2d');
  const toData   = s => [s.peopleScore, s.changeScore, s.execScore, s.stabilScore];
  const datasets = [];

  if (selfScores) {
    datasets.push({
      label:                'Self',
      data:                 toData(selfScores),
      backgroundColor:      'rgba(37,99,235,0.12)',
      borderColor:          'rgba(37,99,235,0.85)',
      borderWidth:          2.5,
      pointBackgroundColor: 'rgba(37,99,235,1)',
      pointRadius:          4,
    });
  }

  if (peerAvgScores) {
    datasets.push({
      label:                'Peer Average',
      data:                 toData(peerAvgScores),
      backgroundColor:      'rgba(234,88,12,0.10)',
      borderColor:          'rgba(234,88,12,0.85)',
      borderWidth:          2.5,
      pointBackgroundColor: 'rgba(234,88,12,1)',
      pointRadius:          4,
    });
  }

  chartInst = new Chart(ctx, {
    type: 'radar',
    data: { labels: ['People', 'Change', 'Execution', 'Stability'], datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min:         1,
          max:         7,
          ticks:       { stepSize: 2, font: { size: 10 }, color: '#9ca3af' },
          grid:        { color: '#e4e7ed' },
          pointLabels: { font: { size: 12, weight: '600' }, color: '#374151' },
        },
      },
      plugins: { legend: { display: false } },
    },
  });
}

function buildDimGrid(scores, top) {
  const dims = [
    { label: 'People',    key: 'peopleScore', dominant: ['Team Builder', 'Strategic Shaper'].includes(top) },
    { label: 'Execution', key: 'execScore',   dominant: ['Systems Stabilizer', 'The Driver'].includes(top) },
    { label: 'Change',    key: 'changeScore', dominant: ['The Driver', 'Strategic Shaper'].includes(top) },
    { label: 'Stability', key: 'stabilScore', dominant: ['Systems Stabilizer', 'Team Builder'].includes(top) },
  ];

  document.getElementById('dim-grid').innerHTML = dims.map(d => {
    const val = scores[d.key];
    const pct = Math.round(((val - 1) / 6) * 100);
    return `
      <div class="dim-card ${d.dominant ? 'dominant' : ''}">
        <div class="dim-name">${d.label}</div>
        <div class="dim-bar-wrap"><div class="dim-bar" style="width:${pct}%"></div></div>
        <div class="dim-score">${val.toFixed(1)} / 7</div>
      </div>`;
  }).join('');
}

function buildVarianceSection(selfScores, peerAvgScores) {
  const section = document.getElementById('variance-section');
  if (!selfScores || !peerAvgScores) { section.style.display = 'none'; return; }

  section.style.display = 'block';

  const dims = [
    { label: 'People',    key: 'peopleScore' },
    { label: 'Execution', key: 'execScore'   },
    { label: 'Change',    key: 'changeScore' },
    { label: 'Stability', key: 'stabilScore' },
  ];

  document.getElementById('variance-grid').innerHTML = dims.map(d => {
    const sv       = selfScores[d.key];
    const pv       = peerAvgScores[d.key];
    const delta    = sv - pv;
    const abs      = Math.abs(delta);
    const severity = abs >= 1.5 ? 'high' : abs >= 0.7 ? 'medium' : 'low';
    const sign     = delta >= 0.05 ? '+' : '';
    return `
      <div class="var-card var-${severity}">
        <div class="var-dim">${d.label}</div>
        <div class="var-scores">Self ${sv.toFixed(1)} &middot; Peer ${pv.toFixed(1)}</div>
        <div class="var-delta">${sign}${delta.toFixed(1)}</div>
      </div>`;
  }).join('');
}

function buildShareText(subject, top, arch, selfScores, peerAvgScores, peerCount) {
  const has360 = selfScores && peerAvgScores;
  const hr     = '\u2500'.repeat(33);

  let text = `Engineering Leadership Archetype\n${hr}\n`;
  text += `Name:       ${subject}\n`;
  if (has360 && peerCount > 0) text += `Peer evals: ${peerCount}\n`;
  text += `Archetype:  ${top}\n`;
  text += `\u201c${arch.tagline}\u201d\n\n`;
  text += `Dimension Scores\n`;

  if (has360) {
    text += `              Self  Peer Avg\n`;
    text += `  People:     ${selfScores.peopleScore.toFixed(1)}   ${peerAvgScores.peopleScore.toFixed(1)}\n`;
    text += `  Execution:  ${selfScores.execScore.toFixed(1)}   ${peerAvgScores.execScore.toFixed(1)}\n`;
    text += `  Change:     ${selfScores.changeScore.toFixed(1)}   ${peerAvgScores.changeScore.toFixed(1)}\n`;
    text += `  Stability:  ${selfScores.stabilScore.toFixed(1)}   ${peerAvgScores.stabilScore.toFixed(1)}`;
  } else {
    const s = selfScores || peerAvgScores;
    text += `  People:    ${s.peopleScore.toFixed(1)} / 7\n`;
    text += `  Execution: ${s.execScore.toFixed(1)} / 7\n`;
    text += `  Change:    ${s.changeScore.toFixed(1)} / 7\n`;
    text += `  Stability: ${s.stabilScore.toFixed(1)} / 7`;
  }

  document.getElementById('share-box').textContent = text;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function copyResult() {
  const txt = document.getElementById('share-box').textContent;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.querySelector('.result-actions .btn-ghost');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Summary'; }, 2000);
  });
}

function buildPeerUrl() {
  const base = window.location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  const url  = base + 'peer';
  return evaluatorName ? url + '?subject=' + encodeURIComponent(evaluatorName) : url;
}

function buildResultsUrl(name) {
  const base = window.location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  return base + '?results=' + encodeURIComponent(name);
}

function copyPeerLink() {
  navigator.clipboard.writeText(buildPeerUrl()).then(() => {
    const btn = document.getElementById('btn-copy-peer-link');
    btn.textContent = 'Link copied!';
    setTimeout(() => { btn.textContent = 'Copy peer evaluation link'; }, 2000);
  });
}

function copyResultsLink() {
  navigator.clipboard.writeText(buildResultsUrl(_displaySubject)).then(() => {
    const btn = document.getElementById('btn-copy-results-link');
    btn.textContent = 'Link copied!';
    setTimeout(() => { btn.textContent = 'Copy results link'; }, 2000);
  });
}

function retake() {
  answers = new Array(10).fill(null);
  current = 0;
  history.replaceState(null, '', window.location.pathname);
  show('screen-intro');
}

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
