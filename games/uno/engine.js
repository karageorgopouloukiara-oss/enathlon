/* ===== Enathlon — Uno: motore di gioco (logica pura) =====
   Carte = stringhe. Colorate: <r|g|b|y><0..9|S|R|D>. Jolly: 'W' | 'F' (+4).
   Stato: { deck:[], discard:[], hands:{nick:[]}, color, direction:±1, retired:[], drawn }
   deck[0] = cima (prossima pescata). discard[ultimo] = carta in cima.
   Le azioni ritornano { state, turn, ended, winner }. */

export const COLORS = ['r', 'g', 'b', 'y'];

export function buildDeck() {
  const deck = [];
  for (const c of COLORS) {
    deck.push(c + '0');
    for (let v = 1; v <= 9; v++) { deck.push(c + v); deck.push(c + v); }
    for (const a of ['S', 'R', 'D']) { deck.push(c + a); deck.push(c + a); }
  }
  for (let i = 0; i < 4; i++) deck.push('W');
  for (let i = 0; i < 4; i++) deck.push('F');
  return deck;
}

export const isWild  = (c) => c === 'W' || c === 'F';
export const colorOf = (c) => isWild(c) ? null : c[0];
export const valueOf = (c) => isWild(c) ? c : c.slice(1);
const isSimpleNumber = (c) => !isWild(c) && /^[0-9]$/.test(c.slice(1));

/* Fisher-Yates con rng iniettato (rng() ∈ [0,1)). Ritorna un nuovo array. */
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isPlayable(card, top, activeColor) {
  if (isWild(card)) return true;
  if (colorOf(card) === activeColor) return true;
  if (!isWild(top) && valueOf(card) === valueOf(top)) return true;
  return false;
}

export function playableCards(hand, top, activeColor) {
  return hand.filter(c => isPlayable(c, top, activeColor));
}

/* Distribuisce 7 carte a ciascun giocatore (in ordine), poi scopre la prima
   carta pescando dalla cima finché non è un numero semplice (0-9). Le carte
   azione/jolly scartate in questo passaggio restano in fondo agli scarti,
   sotto la carta iniziale. deck già mescolato dalla lobby. */
export function deal(players, deck) {
  const d = deck.slice();
  const hands = {};
  for (const p of players) hands[p] = [];
  for (let k = 0; k < 7; k++) for (const p of players) hands[p].push(d.shift());
  const discard = [];
  let first = d.shift();
  while (first && !isSimpleNumber(first)) { discard.push(first); first = d.shift(); }
  discard.push(first);
  return { hands, deck: d, discard, color: colorOf(first) };
}

/* Prossimo giocatore in `players` (ordine di posto) partendo da `current`,
   muovendo in `direction` (+1/-1), saltando i ritirati e avanzando di
   (1 + skip) posti ATTIVI. Presuppone ≥2 giocatori attivi. */
export function nextPlayer(players, retired, current, direction, skip = 0) {
  const n = players.length;
  let idx = players.indexOf(current);
  let advances = 1 + skip;
  while (advances > 0) {
    idx = (idx + direction + n) % n;
    if (!retired.includes(players[idx])) advances--;
  }
  return players[idx];
}

/* Rimescola gli scarti (tranne la cima) nel mazzo. La cima resta l'unica carta
   negli scarti. Un jolly rimescolato ridiventa neutro (resta 'W'/'F'). */
export function reshuffle(deck, discard, rng) {
  const top = discard[discard.length - 1];
  const rest = discard.slice(0, -1);
  return { deck: shuffle([...deck, ...rest], rng), discard: [top] };
}

/* Pesca `count` carte dalla cima del mazzo, rimescolando gli scarti se il
   mazzo si esaurisce. Ritorna { cards, deck, discard }. */
export function drawN(deck, discard, count, rng) {
  let d = deck.slice(), disc = discard.slice();
  const cards = [];
  for (let k = 0; k < count; k++) {
    if (d.length === 0) { const r = reshuffle(d, disc, rng); d = r.deck; disc = r.discard; }
    if (d.length === 0) break; // niente da pescare nemmeno dopo il rimescolo
    cards.push(d.shift());
  }
  return { cards, deck: d, discard: disc };
}

/* Gioca `card` dalla mano di `actor`. Applica l'effetto (S/R/D/F), aggiorna
   colore/direzione, pesca le carte per il saltato in caso di D/F, calcola il
   turno successivo. rng serve solo se un D/F innesca un rimescolo. */
export function applyPlay(state, players, actor, card, chosenColor = null, rng = Math.random) {
  const hand = state.hands[actor];
  const idx = hand.indexOf(card);
  const newHand = hand.slice(0, idx).concat(hand.slice(idx + 1));
  const hands = { ...state.hands, [actor]: newHand };
  const discard = [...state.discard, card];
  const color = isWild(card) ? chosenColor : colorOf(card);

  // vittoria: chi resta senza carte vince, gli effetti non contano più
  if (newHand.length === 0) {
    return {
      state: { ...state, hands, discard, color, drawn: null },
      turn: actor, ended: true, winner: actor
    };
  }

  const val = valueOf(card);
  const activeCount = players.filter(p => !state.retired.includes(p)).length;
  let direction = state.direction;
  let skip = 0;
  let deck = state.deck.slice();
  let disc = discard;
  let newHands = hands;

  if (val === 'R') { direction = -direction; if (activeCount === 2) skip = 1; }
  else if (val === 'S') { skip = 1; }
  else if (val === 'D' || val === 'F') {
    const victim = nextPlayer(players, state.retired, actor, direction, 0);
    const res = drawN(deck, disc, val === 'D' ? 2 : 4, rng);
    deck = res.deck; disc = res.discard;
    newHands = { ...newHands, [victim]: [...newHands[victim], ...res.cards] };
    skip = 1;
  }

  const turn = nextPlayer(players, state.retired, actor, direction, skip);
  return {
    state: { ...state, hands: newHands, discard: disc, deck, color, direction, drawn: null },
    turn, ended: false, winner: null
  };
}

/* Pesca 1 carta per actor. Se giocabile, resta ad actor con state.drawn = carta;
   altrimenti il turno passa. */
export function applyDraw(state, players, actor, rng = Math.random) {
  const res = drawN(state.deck, state.discard, 1, rng);
  const card = res.cards[0];
  const hands = { ...state.hands, [actor]: [...state.hands[actor], card] };
  const top = res.discard[res.discard.length - 1];
  if (card && isPlayable(card, top, state.color)) {
    return {
      state: { ...state, deck: res.deck, discard: res.discard, hands, drawn: card },
      turn: actor, ended: false, winner: null
    };
  }
  const turn = nextPlayer(players, state.retired, actor, state.direction, 0);
  return {
    state: { ...state, deck: res.deck, discard: res.discard, hands, drawn: null },
    turn, ended: false, winner: null
  };
}

/* actor rinuncia a giocare la carta pescata: passa il turno. */
export function applyPass(state, players, actor) {
  const turn = nextPlayer(players, state.retired, actor, state.direction, 0);
  return { state: { ...state, drawn: null }, turn, ended: false, winner: null };
}

/* actor si ritira: esce dall'ordine di turno, la sua mano finisce SOTTO gli
   scarti (la cima resta invariata). Se resta un solo giocatore attivo, la
   partita finisce e quello è il vincitore. Se era il turno di actor, avanza. */
export function applyRetire(state, players, actor, currentTurn) {
  const retired = [...state.retired, actor];
  const discard = [...state.hands[actor], ...state.discard];
  const hands = { ...state.hands, [actor]: [] };
  const active = players.filter(p => !retired.includes(p));
  const base = { ...state, retired, discard, hands, drawn: null };
  if (active.length === 1) {
    return { state: base, turn: active[0], ended: true, winner: active[0] };
  }
  const turn = currentTurn === actor
    ? nextPlayer(players, retired, actor, state.direction, 0)
    : currentTurn;
  return { state: base, turn, ended: false, winner: null };
}
