import { test } from 'node:test';
import assert from 'node:assert/strict';
import { die, START, SAFE, ringAbs, legalMoves, nextActive, applyRoll, applyMove, applyRetire, hasWon } from './engine.js';

test('die: valore sempre in 1..6', () => {
  for (let ri = 0; ri < 200; ri++) {
    const d = die(12345, ri);
    assert.ok(d >= 1 && d <= 6, `roll ${ri} = ${d}`);
  }
});

test('die: deterministico (stesso seed+rollIndex → stesso valore)', () => {
  assert.equal(die(999, 7), die(999, 7));
  assert.equal(die(42, 0), die(42, 0));
});

test('die: tutte e 6 le facce escono su 200 tiri', () => {
  const seen = new Set();
  for (let ri = 0; ri < 200; ri++) seen.add(die(7, ri));
  assert.equal(seen.size, 6);
});

test('START: casella di partenza = seat*13', () => {
  assert.equal(START(0), 0);
  assert.equal(START(1), 13);
  assert.equal(START(2), 26);
  assert.equal(START(3), 39);
});

test('ringAbs: mappa (seat,pos) sulla casella assoluta con wrap', () => {
  assert.equal(ringAbs(0, 0), 0);
  assert.equal(ringAbs(1, 0), 13);
  assert.equal(ringAbs(2, 5), 31);
  assert.equal(ringAbs(3, 20), (39 + 20) % 52); // 7
  assert.equal(ringAbs(1, 45), (13 + 45) % 52); // 6
});

test('SAFE: le 8 caselle sicure assolute', () => {
  for (const s of [0, 8, 13, 21, 26, 34, 39, 47]) assert.ok(SAFE.has(s));
  assert.equal(SAFE.has(5), false);
  assert.equal(SAFE.size, 8);
});

function baseState(over = {}) {
  return {
    seed: 1, rollIndex: 0, pending: null,
    tokens: { a: [-1, -1], b: [-1, -1] },
    seats: { a: 0, b: 2 }, retired: [],
    ...over
  };
}
const P2 = ['a', 'b'];

test('legalMoves: dalla base si esce solo con 6 o 1', () => {
  const st = baseState();
  assert.deepEqual(legalMoves(st, P2, 'a', 6), [{ token: 0, target: 0 }, { token: 1, target: 0 }]);
  assert.deepEqual(legalMoves(st, P2, 'a', 1), [{ token: 0, target: 0 }, { token: 1, target: 0 }]);
  assert.deepEqual(legalMoves(st, P2, 'a', 3), []);
});

test('legalMoves: avanzamento sull anello', () => {
  const st = baseState({ tokens: { a: [10, -1], b: [-1, -1] } });
  assert.deepEqual(legalMoves(st, P2, 'a', 4), [{ token: 0, target: 14 }]);
});

test('legalMoves: conteggio esatto per entrare in casa (57)', () => {
  const st = baseState({ tokens: { a: [55, -1], b: [-1, -1] } });
  // 55+2=57 legale; 55+3=58 sfora → quella pedina non muove (la seconda è in base)
  assert.deepEqual(legalMoves(st, P2, 'a', 2), [{ token: 0, target: 57 }]);
  assert.deepEqual(legalMoves(st, P2, 'a', 3), []);
});

test('legalMoves: pedina finita (57) non muove', () => {
  const st = baseState({ tokens: { a: [57, 20], b: [-1, -1] } });
  assert.deepEqual(legalMoves(st, P2, 'a', 5), [{ token: 1, target: 25 }]);
});

const P4 = ['a', 'b', 'c', 'd'];

test('nextActive: avanti di 1 con wrap', () => {
  assert.equal(nextActive(P4, [], 'a'), 'b');
  assert.equal(nextActive(P4, [], 'd'), 'a');
});

test('nextActive: salta i ritirati', () => {
  assert.equal(nextActive(P4, ['b'], 'a'), 'c');
  assert.equal(nextActive(P4, ['b', 'c'], 'a'), 'd');
});

test('nextActive: dal ritirato attuale trova il prossimo attivo', () => {
  assert.equal(nextActive(P4, ['b'], 'b'), 'c');
});

/* Trova un rollIndex il cui dado dia un valore desiderato, per test deterministici. */
function rollIndexForFace(seed, face) {
  for (let ri = 0; ri < 1000; ri++) if (die(seed, ri) === face) return ri;
  throw new Error('faccia non trovata');
}

test('applyRoll: senza mosse legali il turno passa, pending resta null', () => {
  const seed = 5;
  const ri = rollIndexForFace(seed, 3);            // 3 non fa uscire dalla base
  const st = baseState({ seed, rollIndex: ri, tokens: { a: [-1, -1], b: [-1, -1] }, seats: { a: 0, b: 2 } });
  const r = applyRoll(st, P2, 'a');
  assert.equal(r.state.pending, null);
  assert.equal(r.state.rollIndex, ri + 1);
  assert.equal(r.turn, 'b');
});

test('applyRoll: con mosse legali imposta pending e il turno resta', () => {
  const seed = 5;
  const ri = rollIndexForFace(seed, 6);            // 6 fa uscire dalla base
  const st = baseState({ seed, rollIndex: ri, tokens: { a: [-1, -1], b: [-1, -1] }, seats: { a: 0, b: 2 } });
  const r = applyRoll(st, P2, 'a');
  assert.equal(r.state.pending, 6);
  assert.equal(r.state.rollIndex, ri + 1);
  assert.equal(r.turn, 'a');
});

test('applyMove: avanza la pedina e (dado≠6) passa il turno', () => {
  const st = baseState({ pending: 4, tokens: { a: [10, -1], b: [-1, -1] }, seats: { a: 0, b: 2 } });
  const r = applyMove(st, P2, 'a', 0);
  assert.equal(r.state.tokens.a[0], 14);
  assert.equal(r.state.pending, null);
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applyMove: col 6 il turno resta (tiro extra)', () => {
  const st = baseState({ pending: 6, tokens: { a: [10, -1], b: [-1, -1] }, seats: { a: 0, b: 2 } });
  const r = applyMove(st, P2, 'a', 0);
  assert.equal(r.turn, 'a');
});

test('applyMove: cattura su casella d anello non sicura', () => {
  // a (seat0) muove a pos target la cui abs coincide con la pedina di b (seat2).
  // NOTA: il piano originale usava b a pos 0 (abs 26 = START(2)), ma 26 è in SAFE
  // (vedi Task 2) quindi non sarebbe una cattura valida — corretto con pos 1 (abs 27, non sicura).
  // b a pos 1 → abs 27. a deve atterrare su abs 27: seat0 pos 27 → abs 27. dado da pos 24 = 3.
  const st = baseState({ pending: 3, tokens: { a: [24, -1], b: [1, -1] }, seats: { a: 0, b: 2 } });
  const r = applyMove(st, P2, 'a', 0);
  assert.equal(r.state.tokens.a[0], 27);
  assert.equal(r.state.tokens.b[0], -1, 'b catturata → base');
});

test('applyMove: nessuna cattura su casella sicura', () => {
  // abs 13 è sicura. a(seat0) pos 13 → abs 13. b(seat1) pos 0 → abs 13. a arriva da pos 11, dado 2.
  const st = baseState({ pending: 2, tokens: { a: [11, -1], b: [0, -1] }, seats: { a: 0, b: 1 }, retired: [] });
  const r = applyMove(st, ['a', 'b'], 'a', 0);
  assert.equal(r.state.tokens.a[0], 13);
  assert.equal(r.state.tokens.b[0], 0, 'b protetta dalla casella sicura');
});

test('applyMove: nessuna cattura nella colonna di casa', () => {
  // target 53 (colonna casa di a) non deve mai catturare, anche se numericamente coincidesse
  const st = baseState({ pending: 3, tokens: { a: [50, -1], b: [50, -1] }, seats: { a: 0, b: 2 } });
  const r = applyMove(st, P2, 'a', 0);
  assert.equal(r.state.tokens.a[0], 53);
  assert.equal(r.state.tokens.b[0], 50, 'b non toccata: la casa è privata');
});

test('applyMove: entrambe le pedine a 57 → vittoria', () => {
  const st = baseState({ pending: 2, tokens: { a: [55, 57], b: [10, -1] }, seats: { a: 0, b: 2 } });
  const r = applyMove(st, P2, 'a', 0);
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});

test('applyRetire: nel proprio turno → pedine rimosse, turno avanza', () => {
  const st = baseState({ pending: 4, tokens: { a: [10, 20], b: [5, -1], c: [-1, -1] }, seats: { a: 0, b: 1, c: 2 } });
  const r = applyRetire(st, ['a', 'b', 'c'], 'a', 'a');
  assert.deepEqual(r.state.retired, ['a']);
  assert.deepEqual(r.state.tokens.a, []);
  assert.equal(r.state.pending, null, 'pending azzerato: era il mio turno');
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applyRetire: fuori dal proprio turno → turno e pending invariati', () => {
  const st = baseState({ pending: 3, tokens: { a: [10, 20], b: [5, -1], c: [-1, -1] }, seats: { a: 0, b: 1, c: 2 } });
  const r = applyRetire(st, ['a', 'b', 'c'], 'c', 'a'); // turno di a, si ritira c
  assert.equal(r.turn, 'a');
  assert.equal(r.state.pending, 3);
  assert.deepEqual(r.state.retired, ['c']);
});

test('applyRetire: resta un solo attivo → vittoria', () => {
  const st = baseState({ tokens: { a: [10, 20], b: [5, -1] }, seats: { a: 0, b: 2 } });
  const r = applyRetire(st, ['a', 'b'], 'b', 'a');
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});

test('hasWon: entrambe a 57', () => {
  assert.equal(hasWon({ tokens: { a: [57, 57] } }, 'a'), true);
  assert.equal(hasWon({ tokens: { a: [57, 40] } }, 'a'), false);
  assert.equal(hasWon({ tokens: { a: [] } }, 'a'), false);
});
