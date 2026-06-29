/* =========================================================================
   Enathlon — Data layer (doppio backend)
   - Se FIREBASE_CONFIG è valorizzato in config.js  → Firestore (condiviso)
   - Altrimenti                                      → localStorage (solo locale)
   Stessa interfaccia async in entrambi i casi: il resto dell'app non cambia.
   ========================================================================= */
import { FIREBASE_CONFIG, ACCESS_CODE } from './config.js';

const USE_FB = !!FIREBASE_CONFIG;
const uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = (s) => (s || '').trim().toLowerCase();

/* ===================== FIREBASE (lazy init) ===================== */
let FB = null;
async function fb() {
  if (FB) return FB;
  const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const fs = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  FB = { db: fs.getFirestore(app), fs };
  return FB;
}

/* ===================== LOCALSTORAGE helpers ===================== */
const NS = 'enathlon';
const lread  = (k, d) => { try { return JSON.parse(localStorage.getItem(NS+'.'+k)) ?? d; } catch { return d; } };
const lwrite = (k, v) => { localStorage.setItem(NS+'.'+k, JSON.stringify(v)); window.dispatchEvent(new Event('enathlon-change')); };

/* ===================== ACCESS GATE ===================== */
export function isAccessGranted() {
  const url = new URLSearchParams(location.search).get('k');
  if (url && url === ACCESS_CODE) { localStorage.setItem(NS+'.access', '1'); }
  return localStorage.getItem(NS+'.access') === '1';
}
export function tryAccess(code) {
  if (code === ACCESS_CODE) { localStorage.setItem(NS+'.access', '1'); return true; }
  return false;
}

/* ===================== SESSION (device-local sempre) ===================== */
export function getSessionNick() { return lread('session', null); }
export function setSession(nick) { localStorage.setItem(NS+'.session', JSON.stringify(nick)); }
export function clearSession() { localStorage.removeItem(NS+'.session'); }
export async function currentProfile() {
  const nick = getSessionNick();
  return nick ? getPlayer(nick) : null;
}

/* ===================== PLAYERS ===================== */
export async function getPlayer(nick) {
  if (USE_FB) {
    const { db, fs } = await fb();
    const snap = await fs.getDoc(fs.doc(db, 'players', norm(nick)));
    return snap.exists() ? snap.data() : null;
  }
  return lread('players', {})[norm(nick)] || null;
}
export async function nickAvailable(nick) { return !(await getPlayer(nick)); }

export async function createPlayer(p) {
  const key = norm(p.nick);
  const data = { nick:p.nick, nickKey:key, pinHash:p.pinHash, animal:p.animal,
                 shirt:p.shirt, pants:p.pants, points:0, createdAt:Date.now() };
  if (USE_FB) {
    const { db, fs } = await fb();
    const ref = fs.doc(db, 'players', key);
    if ((await fs.getDoc(ref)).exists()) throw new Error('nick-taken');
    await fs.setDoc(ref, data);
    return data;
  }
  const players = lread('players', {});
  if (players[key]) throw new Error('nick-taken');
  players[key] = data; lwrite('players', players); return data;
}
export async function updatePlayer(nick, patch) {
  const key = norm(nick);
  if (USE_FB) {
    const { db, fs } = await fb();
    await fs.updateDoc(fs.doc(db, 'players', key), patch);
    return getPlayer(nick);
  }
  const players = lread('players', {});
  if (!players[key]) throw new Error('no-player');
  players[key] = { ...players[key], ...patch }; lwrite('players', players);
  return players[key];
}
export async function addPoints(nick, delta) {
  if (USE_FB) {
    const { db, fs } = await fb();
    await fs.updateDoc(fs.doc(db, 'players', norm(nick)), { points: fs.increment(delta) });
    return;
  }
  const p = await getPlayer(nick); if (!p) return;
  return updatePlayer(nick, { points: (p.points||0) + delta });
}
export async function listPlayers() {
  if (USE_FB) {
    const { db, fs } = await fb();
    const snap = await fs.getDocs(fs.collection(db, 'players'));
    return snap.docs.map(d => d.data());
  }
  return Object.values(lread('players', {}));
}
export async function leaderboard() {
  return (await listPlayers()).sort((a,b) => (b.points||0) - (a.points||0));
}

/* ===================== MATCHES ===================== */
export async function createMatch(game, players, state) {
  const id = uid();
  const data = { id, game, players, state, turn: players[0], status:'active', winner:null, updatedAt: Date.now() };
  if (USE_FB) { const { db, fs } = await fb(); await fs.setDoc(fs.doc(db, 'matches', id), data); return data; }
  const m = lread('matches', {}); m[id] = data; lwrite('matches', m); return data;
}
export async function getMatch(id) {
  if (USE_FB) { const { db, fs } = await fb(); const s = await fs.getDoc(fs.doc(db, 'matches', id)); return s.exists()?s.data():null; }
  return lread('matches', {})[id] || null;
}
export async function updateMatch(id, patch) {
  if (USE_FB) { const { db, fs } = await fb(); await fs.updateDoc(fs.doc(db, 'matches', id), { ...patch, updatedAt: Date.now() }); return getMatch(id); }
  const m = lread('matches', {}); if (!m[id]) throw new Error('no-match');
  m[id] = { ...m[id], ...patch, updatedAt: Date.now() }; lwrite('matches', m); return m[id];
}
export async function matchesFor(nick) {
  if (USE_FB) {
    const { db, fs } = await fb();
    const q = fs.query(fs.collection(db, 'matches'),
      fs.where('players', 'array-contains', nick), fs.where('status', '==', 'active'));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => d.data()).sort((a,b) => b.updatedAt - a.updatedAt);
  }
  return Object.values(lread('matches', {}))
    .filter(m => m.players.includes(nick) && m.status === 'active')
    .sort((a,b) => b.updatedAt - a.updatedAt);
}

/* ===================== CHALLENGES ===================== */
export async function sendChallenge(game, from, to) {
  const id = uid(); const data = { id, game, from, to, createdAt: Date.now() };
  if (USE_FB) { const { db, fs } = await fb(); await fs.setDoc(fs.doc(db, 'challenges', id), data); return data; }
  const c = lread('challenges', {}); c[id] = data; lwrite('challenges', c); return data;
}
export async function challengesFor(nick) {
  if (USE_FB) {
    const { db, fs } = await fb();
    const q = fs.query(fs.collection(db, 'challenges'), fs.where('to', '==', nick));
    const snap = await fs.getDocs(q);
    return snap.docs.map(d => d.data());
  }
  return Object.values(lread('challenges', {})).filter(c => c.to === nick);
}
export async function removeChallenge(id) {
  if (USE_FB) { const { db, fs } = await fb(); await fs.deleteDoc(fs.doc(db, 'challenges', id)); return; }
  const c = lread('challenges', {}); delete c[id]; lwrite('challenges', c);
}

/* ===================== REALTIME ===================== */
/* In Firebase: onSnapshot. In locale: evento 'enathlon-change' (stessa scheda)
   + 'storage' (altre schede). Restituisce una funzione per annullare. */
export function subscribePlayers(cb) {
  if (USE_FB) {
    let off = () => {};
    fb().then(({ db, fs }) => { off = fs.onSnapshot(fs.collection(db, 'players'),
      s => cb(s.docs.map(d => d.data()))); });
    return () => off();
  }
  const run = () => cb(Object.values(lread('players', {})));
  window.addEventListener('enathlon-change', run); window.addEventListener('storage', run); run();
  return () => { window.removeEventListener('enathlon-change', run); window.removeEventListener('storage', run); };
}
export function subscribeMatchesFor(nick, cb) {
  if (USE_FB) {
    let off = () => {};
    fb().then(({ db, fs }) => {
      const q = fs.query(fs.collection(db, 'matches'),
        fs.where('players', 'array-contains', nick), fs.where('status', '==', 'active'));
      off = fs.onSnapshot(q, s => cb(s.docs.map(d => d.data()).sort((a,b)=>b.updatedAt-a.updatedAt)));
    });
    return () => off();
  }
  const run = async () => cb(await matchesFor(nick));
  window.addEventListener('enathlon-change', run); window.addEventListener('storage', run); run();
  return () => { window.removeEventListener('enathlon-change', run); window.removeEventListener('storage', run); };
}
export function subscribeChallengesFor(nick, cb) {
  if (USE_FB) {
    let off = () => {};
    fb().then(({ db, fs }) => {
      const q = fs.query(fs.collection(db, 'challenges'), fs.where('to', '==', nick));
      off = fs.onSnapshot(q, s => cb(s.docs.map(d => d.data())));
    });
    return () => off();
  }
  const run = async () => cb(await challengesFor(nick));
  window.addEventListener('enathlon-change', run); window.addEventListener('storage', run); run();
  return () => { window.removeEventListener('enathlon-change', run); window.removeEventListener('storage', run); };
}

export const BACKEND = USE_FB ? 'firebase' : 'local';
