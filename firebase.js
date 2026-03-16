'use strict';

// ─── Config ───────────────────────────────────────────────────────────────────
// The API key is safe to include here — Firebase security is enforced by
// Realtime Database rules, not by keeping the key secret.

firebase.initializeApp({
  apiKey:            'AIzaSyDR60eN3IkP0pz5-zoHWyJMzLDJVGYEDF8',
  authDomain:        'archetypes-questionnaire.firebaseapp.com',
  databaseURL:       'https://archetypes-questionnaire-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:         'archetypes-questionnaire',
  storageBucket:     'archetypes-questionnaire.firebasestorage.app',
  messagingSenderId: '235461999597',
  appId:             '1:235461999597:web:2116dcf8fe224080a185e4',
});

const db = firebase.database();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(name) {
  // Firebase keys cannot contain . # $ / [ ]
  return name.trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$/[\]]/g, '');
}

function resultsRef(name) {
  return db.ref('results/' + normalizeKey(name));
}

// ─── Token management ─────────────────────────────────────────────────────────

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Look up token → key. Falls back to treating the value as a direct key
// so that old ?results=name links keep working.
async function resolveToken(tokenOrKey) {
  const snap = await db.ref('tokens/' + tokenOrKey).get();
  return snap.exists() ? snap.val() : tokenOrKey;
}

// Returns the existing token for a key, or generates and stores a new one.
async function getOrCreateToken(key) {
  const nKey = normalizeKey(key);
  // Check if the self record already has a token
  const snap = await db.ref('results/' + nKey + '/self/token').get();
  if (snap.exists() && snap.val()) return snap.val();

  // Generate a unique token (collision-safe loop)
  let token;
  for (let i = 0; i < 20; i++) {
    token = generateToken();
    const exists = await db.ref('tokens/' + token).get();
    if (!exists.exists()) break;
  }

  // Write both sides of the mapping
  await Promise.all([
    db.ref('tokens/' + token).set(nKey),
    db.ref('results/' + nKey + '/self/token').set(token),
  ]);
  return token;
}

// ─── Self scores ──────────────────────────────────────────────────────────────

async function storeSelfScores(subjectName, scores, displayName, token) {
  const data = {
    ...scores,
    displayName: displayName || subjectName,
    timestamp: Date.now(),
  };
  if (token) data.token = token;
  await resultsRef(subjectName).child('self').set(data);
}

async function loadSelfScores(subjectName) {
  const snap = await resultsRef(subjectName).child('self').get();
  return snap.exists() ? snap.val() : null;
}

// ─── Peer scores ──────────────────────────────────────────────────────────────

async function appendPeerScores(subjectName, scores, evaluatorName) {
  await resultsRef(subjectName).child('peers').push({
    ...scores,
    evaluatorName,
    timestamp: Date.now(),
  });
}

async function loadPeerScores(subjectName) {
  const snap = await resultsRef(subjectName).child('peers').get();
  if (!snap.exists()) return [];
  return Object.values(snap.val());
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

async function storeFeedback(key, rating, comment, archetype) {
  await resultsRef(key).child('feedback').set({
    rating,
    comment: comment || '',
    archetype,
    timestamp: Date.now(),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

async function loadAllResults() {
  const snap = await db.ref('results').get();
  return snap.exists() ? snap.val() : {};
}
