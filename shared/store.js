/* =========================================================================
   Enathlon — Data layer (doppio backend)
   - Se FIREBASE_CONFIG è valorizzato in config.js  → Firestore (condiviso)
   - Altrimenti                                      → localStorage (solo locale)
   Stessa interfaccia async in entrambi i casi: il resto dell'app non cambia.
   ========================================================================= */
import { FIREBASE_CONFIG, ACCESS_CODE, EMAILJS } from './config.js';

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
  let result;
  if (USE_FB) { const { db, fs } = await fb(); await fs.updateDoc(fs.doc(db, 'matches', id), { ...patch, updatedAt: Date.now() }); result = await getMatch(id); }
  else { const m = lread('matches', {}); if (!m[id]) throw new Error('no-match');
    m[id] = { ...m[id], ...patch, updatedAt: Date.now() }; lwrite('matches', m); result = m[id]; }
  // "Tocca a te": chi scrive passa il turno a un ALTRO (patch.turn ≠ chi scrive).
  // Poiché può muovere solo chi ha il turno, prima della scrittura il turno era
  // di chi scrive: quindi patch.turn≠me è di per sé un vero passaggio di turno.
  // Fire-and-forget per non rallentare la mossa.
  if (patch && patch.turn && patch.turn !== getSessionNick()) notifyTurn(result, patch.turn);
  return result;
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
export async function sendChallenge(game, from, to, matchId = null) {
  const id = uid(); const data = { id, game, from, to, matchId, createdAt: Date.now() };
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

export function subscribeMatch(id, cb) {
  if (USE_FB) {
    let off = () => {};
    fb().then(({ db, fs }) => { off = fs.onSnapshot(fs.doc(db, 'matches', id),
      s => cb(s.exists() ? s.data() : null)); });
    return () => off();
  }
  const run = async () => cb(await getMatch(id));
  window.addEventListener('enathlon-change', run); window.addEventListener('storage', run); run();
  return () => { window.removeEventListener('enathlon-change', run); window.removeEventListener('storage', run); };
}

export const BACKEND = USE_FB ? 'firebase' : 'local';

/* ===================== PRESENZA (heartbeat condiviso) ===================== */
// "Online" = lastSeen scritto negli ultimi ONLINE_MS. Un'unica definizione usata
// sia dagli avatar in lobby sia dalle email (chi è in una partita NON deve
// risultare offline, altrimenti gli manderemmo email mentre gioca).
export const ONLINE_MS = 75000;
export function isOnline(player) {
  return !!(player && player.lastSeen && Date.now() - player.lastSeen < ONLINE_MS);
}
let _beatTimer = null;
export function startHeartbeat(nick, ms = 30000) {
  if (_beatTimer || !nick) return;
  const beat = () => updatePlayer(nick, { lastSeen: Date.now() })
    .catch(e => console.warn('heartbeat lastSeen rifiutato — firestore.rules?', e.message));
  beat();
  _beatTimer = setInterval(beat, ms);
}
// Auto-avvio: QUALSIASI pagina che carica questo modulo da loggato tiene vivo il
// proprio "online" — lobby, avatar e tutte le pagine di gioco, senza toccarle
// una per una. Prima del login (nessuna sessione) non fa nulla.
if (typeof window !== 'undefined') {
  const _n = getSessionNick();
  if (_n) startHeartbeat(_n);
}

/* ===================== NOTIFICA "TOCCA A TE" (email via EmailJS) ===================== */
let _emailjs = null;
async function emailjsLib() {
  if (_emailjs) return _emailjs;
  const mod = await import('https://esm.sh/@emailjs/browser@4');
  _emailjs = mod.default || mod;
  return _emailjs;
}
// Decide e (se configurato) invia. Chiamata fire-and-forget da updateMatch.
async function notifyTurn(match, recipientNick) {
  try {
    if (!match || (match.status && match.status !== 'active')) return; // partita finita → niente
    const p = await getPlayer(recipientNick);
    if (!p || !p.email) return;         // nessuna email impostata
    if (isOnline(p)) return;            // è nell'app in questo momento → niente email
    // Il link è la pagina di gioco corrente (chi scrive è proprio lì): stesso URL
    // che serve al destinatario per riprendere la partita.
    const link = location.origin + location.pathname + '?match=' + match.id;
    const params = { to_email: p.email, to_name: p.nick, game: match.game, link };
    // Segnale osservabile (test/estensioni): scatta a decisione presa, prima
    // dell'invio vero, così la logica è verificabile senza un account EmailJS.
    window.dispatchEvent(new CustomEvent('enathlon-turn-email', { detail: params }));
    if (EMAILJS && EMAILJS.publicKey) {
      const lib = await emailjsLib();
      await lib.send(EMAILJS.serviceId, EMAILJS.templateId, params, { publicKey: EMAILJS.publicKey });
    }
  } catch (e) { console.warn('notifyTurn:', e.message); }
}
