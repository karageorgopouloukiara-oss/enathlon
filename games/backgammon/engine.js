/* ===== Enathlon — Backgammon: motore di gioco (logica pura) =====
   points = array piatto di 24 interi. Positivo = Bianco, negativo = Nero, 0 = vuoto.
   Il valore assoluto è il numero di pedine.
   Bianco muove 23→0 (casa 0-5, esce oltre lo 0); Nero muove 0→23 (casa 18-23, oltre il 23).
   Stato motore: { points:[24], bar:{w,b}, off:{w,b} }
   Mossa: { from:'bar'|0..23, to:'off'|0..23, die } */

export const WHITE = 'w', BLACK = 'b';

const dir      = (color) => color === 'w' ? -1 : 1;    // direzione di marcia
const opposite = (color) => color === 'w' ? 'b' : 'w';
const sign     = (color) => color === 'w' ? 1 : -1;    // segno delle pedine sui punti

/* pedine di `color` sul punto i */
const countAt = (points, i, color) =>
  color === 'w' ? Math.max(0, points[i]) : Math.max(0, -points[i]);
/* pedine AVVERSARIE (rispetto a color) sul punto i */
const oppCountAt = (points, i, color) =>
  color === 'w' ? Math.max(0, -points[i]) : Math.max(0, points[i]);

const isBlocked = (points, i, color) => oppCountAt(points, i, color) >= 2;
const isBlot    = (points, i, color) => oppCountAt(points, i, color) === 1;

/* punto di rientro dalla barra per un dado */
const barEntry = (color, die) => color === 'w' ? 24 - die : die - 1;

/* true se tutte le pedine di color (non ancora uscite) sono nella sua casa */
function allHome(state, color){
  if (state.bar[color] > 0) return false;
  for (let i = 0; i < 24; i++){
    if (countAt(state.points, i, color) > 0){
      if (color === 'w' && i > 5)  return false;
      if (color === 'b' && i < 18) return false;
    }
  }
  return true;
}

export function initialPoints(){
  const p = new Array(24).fill(0);
  p[23] = 2;  p[12] = 5;  p[7] = 3;   p[5] = 5;    // Bianco (+)
  p[0] = -2;  p[11] = -5; p[16] = -3; p[18] = -5;  // Nero (−)
  return p;
}

/* PRNG puro (mulberry32): stessa seed → stessa sequenza. */
function mulberry32(a){
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Dadi del turno: funzione PURA di (seed, turnIndex).
   Entrambi i client calcolano lo stesso tiro → nessuno può ritirare. */
export function dice(seed, turnIndex){
  const mix = (seed ^ Math.imul(turnIndex + 1, 0x9E3779B1)) >>> 0;
  const rnd = mulberry32(mix);
  rnd();                                   // scarta il primo (decorrela seed vicini)
  const d1 = 1 + Math.floor(rnd() * 6);
  const d2 = 1 + Math.floor(rnd() * 6);
  return [d1, d2];
}

/* Un doppio si gioca quattro volte. */
export function diceToMoves([d1, d2]){
  return d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
}

/* Destinazione legale di UNO spostamento, oppure null se illegale. */
export function moveTarget(state, color, from, die){
  const pts = state.points;

  // con pedine sulla barra, l'unico movimento consentito è il rientro
  if (state.bar[color] > 0 && from !== 'bar') return null;

  if (from === 'bar'){
    if (state.bar[color] === 0) return null;
    const to = barEntry(color, die);
    return isBlocked(pts, to, color) ? null : to;
  }

  if (!Number.isInteger(from) || from < 0 || from > 23) return null;
  if (countAt(pts, from, color) === 0) return null;

  const target = from + dir(color) * die;

  // spostamento dentro la board
  if (target >= 0 && target <= 23){
    return isBlocked(pts, target, color) ? null : target;
  }

  // oltre il bordo → tentativo di bear off
  if (!allHome(state, color)) return null;
  const esatto = color === 'w' ? (target === -1) : (target === 24);
  if (esatto) return 'off';
  // tiro superiore: ammesso solo se non ci sono pedine su punti più lontani dall'uscita
  if (color === 'w'){
    for (let i = from + 1; i <= 5; i++) if (countAt(pts, i, 'w') > 0) return null;
  } else {
    for (let i = 18; i < from; i++) if (countAt(pts, i, 'b') > 0) return null;
  }
  return 'off';
}

/* Applica UNO spostamento. Puro: restituisce un nuovo stato. */
export function applyMove(state, color, move){
  const points = state.points.slice();
  const bar    = { ...state.bar };
  const off    = { ...state.off };
  const opp    = opposite(color);
  const s      = sign(color);

  // togli dalla sorgente
  if (move.from === 'bar') bar[color] -= 1;
  else points[move.from] -= s;

  // metti sulla destinazione
  if (move.to === 'off'){
    off[color] += 1;
  } else {
    if (isBlot(points, move.to, color)){   // colpisci: il blot va sulla barra
      points[move.to] = 0;
      bar[opp] += 1;
    }
    points[move.to] += s;
  }

  return { ...state, points, bar, off };
}

/* Punti da cui `color` può tentare di muovere. Con pedine sulla barra: solo 'bar'. */
function origins(state, color){
  if (state.bar[color] > 0) return ['bar'];
  const list = [];
  for (let i = 0; i < 24; i++) if (countAt(state.points, i, color) > 0) list.push(i);
  return list;
}

/* Tutte le sequenze legali MASSIMALI per il tiro dato.
   - array vuoto  → nessuna mossa possibile (si passa)
   - sequenze più corte del massimo vengono scartate (obbligo di usare entrambi i dadi)
   - se il massimo è 1 e i dadi sono diversi, resta solo il dado più alto (se giocabile) */
export function legalSequences(state, color, dadi){
  const risultati = [];
  let massimo = 0;

  function esplora(st, rimasti, seq){
    let esteso = false;
    const provati = new Set();          // dadi uguali: una sola diramazione
    for (let k = 0; k < rimasti.length; k++){
      const die = rimasti[k];
      if (provati.has(die)) continue;
      provati.add(die);
      const resto = rimasti.slice(0, k).concat(rimasti.slice(k + 1));
      for (const from of origins(st, color)){
        const to = moveTarget(st, color, from, die);
        if (to === null) continue;
        esteso = true;
        const mossa = { from, to, die };
        esplora(applyMove(st, color, mossa), resto, seq.concat([mossa]));
      }
    }
    if (!esteso && seq.length > 0){     // sequenza terminale
      if (seq.length > massimo){ massimo = seq.length; risultati.length = 0; }
      if (seq.length === massimo) risultati.push(seq);
    }
  }

  esplora(state, diceToMoves(dadi), []);

  // deduplica (ordini di dado diversi possono produrre la stessa sequenza)
  const viste = new Set();
  const uniche = [];
  for (const seq of risultati){
    const chiave = JSON.stringify(seq);
    if (!viste.has(chiave)){ viste.add(chiave); uniche.push(seq); }
  }

  // regola del dado più alto: se se ne può giocare uno solo, dev'essere il maggiore
  if (massimo === 1 && dadi[0] !== dadi[1]){
    const alto = Math.max(dadi[0], dadi[1]);
    const conAlto = uniche.filter(seq => seq[0].die === alto);
    if (conAlto.length) return conAlto;
  }
  return uniche;
}

const stessaMossa = (a, b) => a.from === b.from && a.to === b.to && a.die === b.die;
const hasPrefisso = (seq, pending) =>
  seq.length >= pending.length && pending.every((m, i) => stessaMossa(seq[i], m));

/* Prossime mosse consentite date le mosse già fatte in questo turno.
   Solo le continuazioni di sequenze MASSIMALI → impossibile incastrarsi. */
export function nextMoves(sequences, pending){
  const out = [];
  for (const seq of sequences){
    if (seq.length <= pending.length) continue;
    if (!hasPrefisso(seq, pending)) continue;
    const m = seq[pending.length];
    if (!out.some(x => stessaMossa(x, m))) out.push(m);
  }
  return out;
}

/* true se le mosse in sospeso completano una sequenza massimale (turno confermabile). */
export function isSequenceComplete(sequences, pending){
  return sequences.some(seq => seq.length === pending.length && hasPrefisso(seq, pending));
}

export function isWin(state, color){
  return state.off[color] === 15;
}
