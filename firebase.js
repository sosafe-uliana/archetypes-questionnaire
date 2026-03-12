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
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

function resultsRef(name) {
  return db.ref('results/' + normalizeKey(name));
}

// ─── Self scores ──────────────────────────────────────────────────────────────

async function storeSelfScores(subjectName, scores) {
  await resultsRef(subjectName).child('self').set({
    ...scores,
    timestamp: Date.now(),
  });
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
