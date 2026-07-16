/* ===== Enathlon — Pictionary: motore di gioco (logica pura) =====
   Stato: { lang, seed, roundIndex, phase:'drawing'|'guessing',
            strokes:[stringhe], guesses:{nick:{tries,solved}}, scores:{nick:n}, retired:[] }
   Disegnatore del round = players[roundIndex].
   La parola NON è salvata: è derivata da wordFor(seed, roundIndex, lang).
   Le azioni ritornano { state, turn, ended, winner }. */
import { WORDS } from './words.js';

export const MAX_TRIES = 3;

/* PRNG puro (mulberry32): stessa seed → stessa sequenza. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fisher-Yates seminato: permutazione deterministica della lista. */
function shuffleSeeded(list, seed) {
  const a = list.slice();
  const rnd = mulberry32(seed >>> 0);
  rnd();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Parola del round: elemento roundIndex della permutazione seminata dal seed.
   Essendo una permutazione, nessuna parola si ripete nella stessa partita. */
export function wordFor(seed, roundIndex, lang) {
  const list = WORDS[lang] || WORDS.it;
  return shuffleSeeded(list, seed)[roundIndex % list.length];
}

/* Normalizza una risposta: NFD + rimozione diacritici, minuscole, trim, spazi compattati.
   NFD scompone "è" in "e" + segno combinante; \p{M} (con flag u) matcha tutti i segni
   combinanti e li toglie. Usare \p{M} e NON una classe con i caratteri combinanti
   letterali: sarebbero invisibili nel sorgente e si corromperebbero al copia/incolla. */
export function normalizeGuess(s) {
  return (s || '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

export function isCorrect(guess, word) {
  return normalizeGuess(guess) === normalizeGuess(word);
}

/* Un tratto è UNA STRINGA: "<coloreIdx>,<spessoreIdx>,x1,y1,x2,y2,..."
   Coordinate intere 0..999 (canvas a coordinate logiche normalizzate).
   Stringhe e non array annidati: Firestore rifiuta gli array di array. */
export function encodeStroke(colorIdx, widthIdx, points) {
  const flat = [];
  for (const p of points) { flat.push(Math.round(p.x), Math.round(p.y)); }
  return [colorIdx, widthIdx, ...flat].join(',');
}

export function decodeStroke(s) {
  const n = s.split(',').map(Number);
  const points = [];
  for (let i = 2; i + 1 < n.length; i += 2) points.push({ x: n[i], y: n[i + 1] });
  return { color: n[0], width: n[1], points };
}

export function drawerOf(state, players) { return players[state.roundIndex]; }

/* Indovini ancora in attesa nel round corrente: attivi, diversi dal disegnatore,
   che non hanno risolto e hanno tentativi residui. Ordine = ordine di `players`.
   INVARIANTE: in fase 'guessing' il giocatore di turno è sempre pendingGuessers()[0]. */
export function pendingGuessers(state, players) {
  const drawer = drawerOf(state, players);
  return players.filter(p => {
    if (p === drawer || state.retired.includes(p)) return false;
    const g = state.guesses[p];
    if (!g) return true;
    return !g.solved && g.tries < MAX_TRIES;
  });
}

/* Punti del round corrente.
   - Indovino: punti in base ai tentativi usati → 1° tentativo 3, 2° 2, 3° 1 (MAX_TRIES+1-tries).
   - Disegnatore: +1 per ogni indovino (premia i disegni chiari).
   Zero indovini → il disegnatore non prende nulla.

   Perché i punti scalano coi tentativi: con "indovino +1" fisso, in una partita a 2
   giocatori i punteggi non possono MAI divergere (ogni round riuscito dà +1 a entrambi,
   ogni round fallito 0 a entrambi) → parità matematicamente garantita. Scalando coi
   tentativi la simmetria si rompe e a 2 giocatori vince chi riconosce più in fretta. */
export function roundScores(state, players) {
  const drawer = drawerOf(state, players);
  const deltas = {};
  let solvers = 0;
  for (const p of players) {
    if (p === drawer) continue;
    const g = state.guesses[p];
    if (g?.solved) { deltas[p] = MAX_TRIES + 1 - g.tries; solvers++; }
  }
  if (solvers > 0) deltas[drawer] = solvers;
  return deltas;
}

/* Vincitore di partita: punteggio più alto fra i NON ritirati.
   Parità → winner null e lista dei pari merito. */
export function matchWinner(state, players) {
  const cands = players.filter(p => !state.retired.includes(p));
  let best = -Infinity, tied = [];
  for (const p of cands) {
    const s = state.scores[p] ?? 0;
    if (s > best) { best = s; tied = [p]; }
    else if (s === best) tied.push(p);
  }
  return { winner: tied.length === 1 ? tied[0] : null, tied };
}

/* Chiude il round corrente: applica i punti, azzera tratti/guesses, avanza roundIndex
   SALTANDO i ritirati, torna in fase 'drawing'. Se non restano round → fine partita.
   È l'UNICO punto di chiusura round: usata da applyGuess, applySubmit e applyRetire. */
export function advanceRound(state, players) {
  const deltas = roundScores(state, players);
  const scores = { ...state.scores };
  for (const [p, d] of Object.entries(deltas)) scores[p] = (scores[p] ?? 0) + d;

  let roundIndex = state.roundIndex + 1;
  while (roundIndex < players.length && state.retired.includes(players[roundIndex])) roundIndex++;

  const s = { ...state, scores, strokes: [], guesses: {}, roundIndex, phase: 'drawing' };
  if (roundIndex >= players.length) {
    const { winner } = matchWinner(s, players);
    return { state: s, turn: winner ?? players[0], ended: true, winner };
  }
  return { state: s, turn: players[roundIndex], ended: false, winner: null };
}

/* Il disegnatore invia il disegno finito: una sola scrittura con tutti i tratti.
   Se non c'è nessun indovino attivo, il round si chiude subito. */
export function applySubmit(state, players, actor, strokes) {
  const s = { ...state, strokes, phase: 'guessing' };
  const pend = pendingGuessers(s, players);
  if (pend.length === 0) return advanceRound(s, players);
  return { state: s, turn: pend[0], ended: false, winner: null };
}

/* Un tentativo di `actor`. OGNI tentativo viene scritto: ricaricare la pagina non
   regala tentativi extra. Se actor ha finito (indovinato o esauriti i tentativi) il
   turno passa al prossimo indovino; se non ne restano, il round si chiude. */
export function applyGuess(state, players, actor, guess) {
  const word = wordFor(state.seed, state.roundIndex, state.lang);
  const prev = state.guesses[actor] ?? { tries: 0, solved: false };
  const guesses = {
    ...state.guesses,
    [actor]: { tries: prev.tries + 1, solved: isCorrect(guess, word) }
  };
  const s = { ...state, guesses };
  const pend = pendingGuessers(s, players);
  if (pend.length === 0) return advanceRound(s, players);
  return { state: s, turn: pend[0], ended: false, winner: null };
}

/* actor si arrende: esce dall'ordine, i suoi round futuri saranno saltati.
   - resta 1 solo attivo → fine partita, vince il superstite
   - si ritira il disegnatore corrente → si passa al round successivo
   - si ritira un indovino → si ricalcolano i pendenti (round chiuso se non ne restano) */
export function applyRetire(state, players, actor, currentTurn) {
  const retired = [...state.retired, actor];
  const s = { ...state, retired };
  const active = players.filter(p => !retired.includes(p));
  if (active.length <= 1) {
    const w = active[0] ?? null;
    return { state: s, turn: w ?? currentTurn, ended: true, winner: w };
  }
  if (actor === drawerOf(s, players)) return advanceRound(s, players);
  if (s.phase === 'guessing') {
    const pend = pendingGuessers(s, players);
    if (pend.length === 0) return advanceRound(s, players);
    return { state: s, turn: pend[0], ended: false, winner: null };
  }
  return { state: s, turn: currentTurn, ended: false, winner: null };
}
