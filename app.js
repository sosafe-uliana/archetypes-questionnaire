'use strict';

// ─── URL initialisation ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const sp          = new URLSearchParams(window.location.search);
  const resultsKey  = sp.get('results');
  const modeParam   = sp.get('mode');
  const keyParam    = sp.get('key');

  if (resultsKey) {
    loadAndShowResults(decodeURIComponent(resultsKey));
    return;
  }
  if (modeParam === 'peer' && keyParam) {
    setMode('peer');
    lockSubject(decodeURIComponent(keyParam));
  }
});

// ─── State ───────────────────────────────────────────────────────────────────

let mode          = 'self'; // 'self' | 'peer'
let evaluatorName = '';
let subjectName   = '';     // display name of subject (for {name} in questions)
let subjectKey    = '';     // normalized Firebase key for subject
let answers       = new Array(10).fill(null);
let current       = 0;
let ORDER         = [];
let chartInst     = null;

// Name availability check
let nameCheckTimer = null;
let nameAvailable  = true;

// Results state — persisted across view-mode toggles
let _selfScores     = null;
let _peerAvgScores  = null;
let _peerList       = [];
let _displaySubject = '';
let _topArchetype   = '';
let viewMode        = 'both'; // 'both' | 'self' | 'peer'

// Storage is provided by firebase.js (storeSelfScores, loadSelfScores,
// appendPeerScores, loadPeerScores) loaded before this file.

// ─── Identifier helpers ───────────────────────────────────────────────────────

// Must mirror normalizeKey() in firebase.js
function normalizeIdentifier(name) {
  return name.trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$/[\]]/g, '');
}

// ─── Intro UI ────────────────────────────────────────────────────────────────

function setMode(newMode) {
  mode = newMode;
  document.getElementById('subject-field').style.display   = mode === 'peer' ? 'block' : 'none';
  document.getElementById('evaluator-field').style.display = mode === 'peer' ? 'none' : 'block';
  document.getElementById('intro-badge').textContent =
    mode === 'self' ? 'Self-Assessment' : '360\u00b0 Peer Evaluation';
  updateBeginButton();
}

// Called when a peer opens a link with ?key=... — fetches the display name
// from Firebase so the subject field and {name} replacements look natural.
async function lockSubject(key) {
  subjectKey  = key;
  subjectName = key; // fallback; updated below once Firebase responds
  document.getElementById('subject-field').style.display = 'none';
  const el = document.getElementById('locked-subject-display');
  el.textContent   = 'Evaluating \u2026';
  el.style.display = 'block';

  try {
    const self = await loadSelfScores(key);
    if (self && self.displayName) subjectName = self.displayName;
  } catch (_) { /* use key as fallback */ }

  el.textContent = 'Evaluating ' + subjectName;
  updateBeginButton();
}

function onEvaluatorNameInput() {
  updateBeginButton();
  if (mode !== 'self') return;

  clearTimeout(nameCheckTimer);
  const rawName  = document.getElementById('evaluator-name').value.trim();
  const statusEl = document.getElementById('name-status');
  const key      = normalizeIdentifier(rawName);

  if (key.length < 2) {
    statusEl.textContent = rawName.length > 0 ? 'Name must be at least 2 characters' : '';
    statusEl.className   = 'name-status';
    nameAvailable = false;
    updateBeginButton();
    return;
  }

  // Block begin until check completes
  nameAvailable = false;
  updateBeginButton();
  statusEl.textContent = 'Checking\u2026';
  statusEl.className   = 'name-status';

  nameCheckTimer = setTimeout(async () => {
    try {
      const existing = await loadSelfScores(key);
      if (existing) {
        nameAvailable = false;
        statusEl.textContent = '\u2717 Already taken \u2014 try a different name or add initials';
        statusEl.className   = 'name-status taken';
      } else {
        nameAvailable = true;
        statusEl.textContent = '\u2713 Name available';
        statusEl.className   = 'name-status available';
      }
    } catch (_) {
      nameAvailable = true; // allow proceeding if check fails
      statusEl.textContent = '';
      statusEl.className   = 'name-status';
    }
    updateBeginButton();
  }, 600);
}

function updateBeginButton() {
  if (mode === 'peer') {
    // Peer mode: no name needed — just wait for lockSubject to set subjectKey
    document.getElementById('btn-begin').disabled = subjectKey.length === 0;
    return;
  }
  const rawName = document.getElementById('evaluator-name').value.trim();
  const key     = normalizeIdentifier(rawName);
  document.getElementById('btn-begin').disabled = !(key.length >= 2 && nameAvailable);
}

// ─── Quiz ────────────────────────────────────────────────────────────────────

function startQuiz() {
  evaluatorName = document.getElementById('evaluator-name').value.trim();
  // In self mode, derive key from the evaluator's chosen name.
  // In peer mode, subjectKey and subjectName were set by lockSubject().
  if (mode === 'self') {
    subjectKey  = normalizeIdentifier(evaluatorName);
    subjectName = evaluatorName;
  }
  answers = new Array(10).fill(null);
  current = 0;
  ORDER   = [...Array(10).keys()].sort(() => Math.random() - 0.5);
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

  let selfScores, peerList, peerAvgScores;

  try {
    if (mode === 'self') {
      selfScores = currentScores;
      // Store displayName (the human-readable name) alongside scores
      await storeSelfScores(subjectKey, currentScores, evaluatorName);
      peerList      = await loadPeerScores(subjectKey);
      peerAvgScores = peerList.length > 0 ? avgScores(peerList) : null;
    } else {
      await appendPeerScores(subjectKey, currentScores, evaluatorName);
      [peerList, selfScores] = await Promise.all([
        loadPeerScores(subjectKey),
        loadSelfScores(subjectKey),
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
  _displaySubject = subjectName; // human-readable

  try {
    history.replaceState(null, '', buildResultsUrl(subjectKey));
    renderResultsUI(mode === 'self');
    show('screen-results');
  } catch (renderErr) {
    console.error('Render error:', renderErr);
    btnNext.disabled    = false;
    btnNext.textContent = 'See Results \u2192';
  }
}

// Load and display results from a shareable ?results=key URL
async function loadAndShowResults(key) {
  show('screen-results');
  document.getElementById('res-name').textContent    = 'Loading\u2026';
  document.getElementById('res-tagline').textContent = '';
  document.getElementById('view-toggle').style.display = 'none';

  try {
    const [self, peers] = await Promise.all([loadSelfScores(key), loadPeerScores(key)]);
    subjectKey      = key;
    _selfScores     = self;
    _peerList       = peers || [];
    _peerAvgScores  = _peerList.length > 0 ? avgScores(_peerList) : null;
    // Use stored displayName if available, otherwise fall back to key
    _displaySubject = (self && self.displayName) ? self.displayName : key;
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

  viewMode = has360 ? 'both' : (_selfScores ? 'self' : 'peer');

  _topArchetype = archetypeFromScores(primaryScores);
  const arch    = ARCHETYPES[_topArchetype];

  document.getElementById('res-badge').textContent   = `${_displaySubject}\u2019s Archetype`;
  document.getElementById('res-name').textContent    = _topArchetype;
  document.getElementById('res-tagline').textContent = arch.tagline;

  const viewToggle = document.getElementById('view-toggle');
  viewToggle.style.display = has360 ? 'flex' : 'none';
  ['self', 'peer', 'both'].forEach(m => {
    document.getElementById('view-btn-' + m).classList.toggle('active', m === viewMode);
  });

  const peerCountEl = document.getElementById('peer-count');
  if (_peerList.length > 0) {
    peerCountEl.textContent = `Based on ${_peerList.length} peer evaluation${_peerList.length !== 1 ? 's' : ''}`;
    peerCountEl.style.display = 'block';
  } else {
    peerCountEl.style.display = 'none';
  }

  buildRadarChart(
    viewMode !== 'peer' ? _selfScores : null,
    viewMode !== 'self' ? _peerAvgScores : null
  );
  document.getElementById('chart-legend').style.display = has360 && viewMode === 'both' ? 'flex' : 'none';

  buildDimGrid(viewMode === 'peer' ? _peerAvgScores : primaryScores, _topArchetype);
  buildVarianceSection(_selfScores, _peerAvgScores);
  buildArchetypeDesc(arch);

  document.getElementById('peer-link-section').style.display = 'block';
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

function buildArchetypeDesc(arch) {
  const el = document.getElementById('archetype-desc');
  if (!el) return;
  if (!arch.behaviors) { el.innerHTML = ''; return; }

  const bItems  = arch.behaviors.map(b => `<li>${b}</li>`).join('');
  const wItems  = arch.watchOut.map(w => `<li>${w}</li>`).join('');

  el.innerHTML = `
    <div class="archetype-desc">
      <div class="arch-desc-col">
        <div class="arch-desc-heading">High-leverage behaviors</div>
        <ul class="arch-desc-list">${bItems}</ul>
      </div>
      <div class="arch-desc-col">
        <div class="arch-desc-heading">Watch out for</div>
        <ul class="arch-desc-list arch-desc-watch">${wItems}</ul>
      </div>
    </div>`;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function buildPeerUrl() {
  const base = window.location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  return base + 'peer?key=' + encodeURIComponent(subjectKey);
}

function buildResultsUrl(key) {
  const base = window.location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  return base + '?results=' + encodeURIComponent(key);
}

function copyPeerLink() {
  navigator.clipboard.writeText(buildPeerUrl()).then(() => {
    const btn = document.getElementById('btn-copy-peer-link');
    btn.textContent = 'Link copied!';
    setTimeout(() => { btn.textContent = 'Copy peer evaluation link'; }, 2000);
  });
}

function copyResultsLink() {
  navigator.clipboard.writeText(buildResultsUrl(subjectKey)).then(() => {
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
