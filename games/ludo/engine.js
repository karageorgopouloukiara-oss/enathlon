/* ===== Enathlon — Ludo: motore di gioco (logica pura) =====
   Posizione pedina: -1 base · 0..50 anello · 51..56 colonna casa · 57 traguardo.
   Casella assoluta sull'anello = (seat*13 + pos) % 52.
   Stato: { seed, rollIndex, pending, tokens:{nick:[p,p]}, seats:{nick:0..3}, retired:[] }
   Le azioni ritornano { state, turn, ended, winner }. */

/* PRNG puro (mulberry32): stessa seed → stessa sequenza. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Dado del tiro: funzione PURA di (seed, rollIndex). Entrambi i client calcolano
   lo stesso valore → nessuno può ritirare (rollIndex solo cresce). */
export function die(seed, rollIndex) {
  const mix = (seed ^ Math.imul(rollIndex + 1, 0x9E3779B1)) >>> 0;
  const rnd = mulberry32(mix);
  rnd();                                   // scarta il primo (decorrela seed vicini)
  return 1 + Math.floor(rnd() * 6);
}

export const RING = 52, HOME = 57;
export const START   = (seat) => seat * 13;
export const ringAbs = (seat, pos) => (seat * 13 + pos) % 52;
/* caselle sicure (assolute): 4 partenze + 4 stelle */
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/* Mosse legali per `player` con `dieVal`. Ritorna [{token, target}] per ciascuna
   delle 2 pedine muovibili. In base (-1): solo con 6 o 1 → target 0. Sull'anello/
   casa: target = pos+dieVal, legale se <= 57 (conteggio esatto per la casa). */
export function legalMoves(state, players, player, dieVal) {
  const toks = state.tokens[player] || [];
  const moves = [];
  toks.forEach((pos, token) => {
    if (pos === 57) return;
    if (pos === -1) { if (dieVal === 6 || dieVal === 1) moves.push({ token, target: 0 }); return; }
    const target = pos + dieVal;
    if (target <= 57) moves.push({ token, target });
  });
  return moves;
}

/* Prossimo giocatore non ritirato, in avanti (direzione fissa +1). Presuppone
   almeno un altro giocatore attivo; se non c'è, ritorna `current`. */
export function nextActive(players, retired, current) {
  const n = players.length;
  let idx = players.indexOf(current);
  for (let k = 0; k < n; k++) {
    idx = (idx + 1) % n;
    if (!retired.includes(players[idx])) return players[idx];
  }
  return current;
}

/* Tira il dado (deterministico da seed+rollIndex), incrementa rollIndex. Se non
   ci sono mosse legali → il turno passa (pending null). Altrimenti → pending = dado,
   il turno resta ad actor (che poi sceglie la pedina). */
export function applyRoll(state, players, actor) {
  const dieVal = die(state.seed, state.rollIndex);
  const rollIndex = state.rollIndex + 1;
  const moves = legalMoves(state, players, actor, dieVal);
  if (moves.length === 0) {
    return {
      state: { ...state, rollIndex, pending: null },
      turn: nextActive(players, state.retired, actor), ended: false, winner: null
    };
  }
  return { state: { ...state, rollIndex, pending: dieVal }, turn: actor, ended: false, winner: null };
}

/* Muove la pedina `token` di `actor` di `state.pending`. Cattura solo se atterra
   sull'anello (0..50) su una casella assoluta NON sicura occupata da avversari
   attivi (→ base). Col 6 il turno resta (tiro extra), sennò passa. Entrambe a 57
   → vittoria. */
export function applyMove(state, players, actor, token) {
  const dieVal = state.pending;
  const pos = state.tokens[actor][token];
  const target = pos === -1 ? 0 : pos + dieVal;
  const seat = state.seats[actor];
  const tokens = {};
  for (const p of Object.keys(state.tokens)) tokens[p] = state.tokens[p].slice();

  if (target >= 0 && target <= 50) {                 // catture solo sull'anello
    const landAbs = ringAbs(seat, target);
    if (!SAFE.has(landAbs)) {
      for (const q of players) {
        if (q === actor || state.retired.includes(q)) continue;
        const qseat = state.seats[q];
        tokens[q] = tokens[q].map(pp =>
          (pp >= 0 && pp <= 50 && ringAbs(qseat, pp) === landAbs) ? -1 : pp);
      }
    }
  }
  tokens[actor][token] = target;

  if (tokens[actor].every(pp => pp === 57)) {
    return { state: { ...state, tokens, pending: null }, turn: actor, ended: true, winner: actor };
  }
  const turn = dieVal === 6 ? actor : nextActive(players, state.retired, actor);
  return { state: { ...state, tokens, pending: null }, turn, ended: false, winner: null };
}

/* actor si ritira: le sue pedine spariscono (tokens[actor]=[]), esce dall'ordine.
   Se resta un solo attivo → vittoria di quello. Se era il turno di actor, avanza
   e azzera pending; altrimenti turno e pending del giocatore corrente restano. */
export function applyRetire(state, players, actor, currentTurn) {
  const retired = [...state.retired, actor];
  const tokens = { ...state.tokens, [actor]: [] };
  const active = players.filter(p => !retired.includes(p));
  const mine = currentTurn === actor;
  const base = { ...state, retired, tokens, pending: mine ? null : state.pending };
  if (active.length === 1) {
    return { state: base, turn: active[0], ended: true, winner: active[0] };
  }
  const turn = mine ? nextActive(players, retired, actor) : currentTurn;
  return { state: base, turn, ended: false, winner: null };
}

export function hasWon(state, player) {
  const t = state.tokens[player] || [];
  return t.length > 0 && t.every(p => p === 57);
}
