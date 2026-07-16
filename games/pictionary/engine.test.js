import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordFor, normalizeGuess, isCorrect, encodeStroke, decodeStroke, drawerOf, pendingGuessers, roundScores, matchWinner, advanceRound, applySubmit, applyGuess, applyRetire } from './engine.js';
import { WORDS } from './words.js';

test('wordFor: deterministico (stesso seed+round+lang → stessa parola)', () => {
  assert.equal(wordFor(123, 0, 'it'), wordFor(123, 0, 'it'));
  assert.equal(wordFor(999, 3, 'en'), wordFor(999, 3, 'en'));
});

test('wordFor: la parola appartiene alla lista della lingua', () => {
  for (let r = 0; r < 6; r++) {
    assert.ok(WORDS.it.includes(wordFor(7, r, 'it')), 'it round ' + r);
    assert.ok(WORDS.en.includes(wordFor(7, r, 'en')), 'en round ' + r);
  }
});

test('wordFor: nessun ripetuto entro una partita (6 round)', () => {
  const seen = new Set();
  for (let r = 0; r < 6; r++) seen.add(wordFor(42, r, 'it'));
  assert.equal(seen.size, 6);
});

test('wordFor: seed diversi danno permutazioni diverse', () => {
  const a = [0,1,2,3,4,5].map(r => wordFor(1, r, 'it')).join('|');
  const b = [0,1,2,3,4,5].map(r => wordFor(2, r, 'it')).join('|');
  assert.notEqual(a, b);
});

test('normalizeGuess: minuscole, trim, spazi compattati, accenti rimossi', () => {
  assert.equal(normalizeGuess('  Caffè '), 'caffe');
  assert.equal(normalizeGuess('PIÙ   TARDI'), 'piu tardi');
  assert.equal(normalizeGuess('Papà'), 'papa');
  assert.equal(normalizeGuess(''), '');
  assert.equal(normalizeGuess(null), '');
});

test('isCorrect: confronto normalizzato', () => {
  assert.equal(isCorrect('Gatto', 'gatto'), true);
  assert.equal(isCorrect('  GATTO  ', 'gatto'), true);
  assert.equal(isCorrect('cane', 'gatto'), false);
});

test('encodeStroke: stringa piatta "colore,spessore,x1,y1,..."', () => {
  const s = encodeStroke(1, 2, [{ x: 10, y: 20 }, { x: 30, y: 40 }]);
  assert.equal(s, '1,2,10,20,30,40');
});

test('encodeStroke: arrotonda le coordinate', () => {
  assert.equal(encodeStroke(0, 0, [{ x: 10.6, y: 20.2 }]), '0,0,11,20');
});

test('decodeStroke: round-trip fedele', () => {
  const pts = [{ x: 1, y: 2 }, { x: 300, y: 999 }, { x: 0, y: 0 }];
  const d = decodeStroke(encodeStroke(3, 1, pts));
  assert.equal(d.color, 3);
  assert.equal(d.width, 1);
  assert.deepEqual(d.points, pts);
});

function baseState(over = {}) {
  return {
    lang: 'it', seed: 1, roundIndex: 0, phase: 'drawing',
    strokes: [], guesses: {}, scores: { a: 0, b: 0, c: 0 }, retired: [],
    ...over
  };
}
const P3 = ['a', 'b', 'c'];

test('drawerOf: il disegnatore è players[roundIndex]', () => {
  assert.equal(drawerOf(baseState({ roundIndex: 0 }), P3), 'a');
  assert.equal(drawerOf(baseState({ roundIndex: 2 }), P3), 'c');
});

test('pendingGuessers: tutti tranne il disegnatore', () => {
  assert.deepEqual(pendingGuessers(baseState({ roundIndex: 0 }), P3), ['b', 'c']);
});

test('pendingGuessers: esclude chi ha risolto o esaurito i tentativi', () => {
  const st = baseState({ roundIndex: 0, guesses: { b: { tries: 1, solved: true }, c: { tries: 3, solved: false } } });
  assert.deepEqual(pendingGuessers(st, P3), []);
});

test('pendingGuessers: esclude i ritirati, include chi ha tentativi residui', () => {
  const st = baseState({ roundIndex: 0, retired: ['c'], guesses: { b: { tries: 2, solved: false } } });
  assert.deepEqual(pendingGuessers(st, P3), ['b']);
});

test('roundScores: indovino a punti per tentativi, disegnatore +1 per ogni indovino', () => {
  const st = baseState({ roundIndex: 0, guesses: { b: { tries: 1, solved: true }, c: { tries: 2, solved: true } } });
  // b indovina al 1° tentativo → 3; c al 2° → 2; a (disegnatore) +1 per ciascuno dei 2 indovini
  assert.deepEqual(roundScores(st, P3), { b: 3, c: 2, a: 2 });
});

test('roundScores: 3° tentativo vale 1 punto', () => {
  const st = baseState({ roundIndex: 0, guesses: { b: { tries: 3, solved: true } } });
  assert.deepEqual(roundScores(st, P3), { b: 1, a: 1 });
});

test('roundScores: a 2 giocatori i punteggi possono divergere (no parità forzata)', () => {
  // È il motivo per cui i punti scalano coi tentativi: con "+1 fisso" un 1v1
  // finirebbe SEMPRE in parità. Qui b indovina al 2° tentativo → b 2, a 1.
  const st = baseState({ roundIndex: 0, scores: { a: 0, b: 0 }, guesses: { b: { tries: 2, solved: true } } });
  assert.deepEqual(roundScores(st, ['a', 'b']), { b: 2, a: 1 });
});

test('roundScores: nessun indovino → il disegnatore non prende nulla', () => {
  const st = baseState({ roundIndex: 0, guesses: { b: { tries: 3, solved: false }, c: { tries: 3, solved: false } } });
  assert.deepEqual(roundScores(st, P3), {});
});

test('matchWinner: punteggio più alto vince', () => {
  const st = baseState({ scores: { a: 5, b: 2, c: 3 } });
  const r = matchWinner(st, P3);
  assert.equal(r.winner, 'a');
  assert.deepEqual(r.tied, ['a']);
});

test('matchWinner: parità → winner null + pari merito', () => {
  const st = baseState({ scores: { a: 4, b: 4, c: 1 } });
  const r = matchWinner(st, P3);
  assert.equal(r.winner, null);
  assert.deepEqual(r.tied, ['a', 'b']);
});

test('matchWinner: i ritirati non possono vincere', () => {
  const st = baseState({ scores: { a: 9, b: 2, c: 1 }, retired: ['a'] });
  const r = matchWinner(st, P3);
  assert.equal(r.winner, 'b');
});

test('advanceRound: applica i punti, azzera tratti/guesses, passa al round dopo', () => {
  const st = baseState({ roundIndex: 0, phase: 'guessing', strokes: ['0,0,1,2'],
    guesses: { b: { tries: 1, solved: true }, c: { tries: 3, solved: false } } });
  const r = advanceRound(st, P3);
  assert.deepEqual(r.state.scores, { a: 1, b: 3, c: 0 }); // b indovina al 1° tentativo → 3; a=disegnatore +1 (1 indovino)
  assert.deepEqual(r.state.strokes, []);
  assert.deepEqual(r.state.guesses, {});
  assert.equal(r.state.roundIndex, 1);
  assert.equal(r.state.phase, 'drawing');
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('advanceRound: salta i round dei ritirati', () => {
  const st = baseState({ roundIndex: 0, retired: ['b'] });
  const r = advanceRound(st, P3);
  assert.equal(r.state.roundIndex, 2, 'il round di b è saltato');
  assert.equal(r.turn, 'c');
});

test('advanceRound: dopo l ultimo round la partita finisce col vincitore', () => {
  const st = baseState({ roundIndex: 2, scores: { a: 3, b: 1, c: 0 } });
  const r = advanceRound(st, P3);
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});

test('advanceRound: fine con parità → winner null', () => {
  const st = baseState({ roundIndex: 2, scores: { a: 2, b: 2, c: 0 } });
  const r = advanceRound(st, P3);
  assert.equal(r.ended, true);
  assert.equal(r.winner, null);
});

test('applySubmit: salva i tratti, passa a guessing, turno al primo indovino', () => {
  const st = baseState({ roundIndex: 0, phase: 'drawing' });
  const r = applySubmit(st, P3, 'a', ['0,1,10,10,20,20']);
  assert.deepEqual(r.state.strokes, ['0,1,10,10,20,20']);
  assert.equal(r.state.phase, 'guessing');
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applySubmit: nessun indovino attivo → il round si chiude subito', () => {
  const st = baseState({ roundIndex: 0, phase: 'drawing', retired: ['b', 'c'] });
  const r = applySubmit(st, P3, 'a', ['0,1,10,10']);
  // b e c ritirati → nessun indovino: round chiuso. Restano 0 round validi dopo → fine.
  assert.equal(r.ended, true);
});

/* Helper: costruisce uno stato in fase guessing con la parola nota del round. */
function guessingState(over = {}) {
  return baseState({ roundIndex: 0, phase: 'guessing', strokes: ['0,1,5,5'], ...over });
}

test('applyGuess: risposta errata → tries++, il turno resta a chi sta indovinando', () => {
  const st = guessingState();
  const r = applyGuess(st, P3, 'b', 'parola-sbagliata-xyz');
  assert.equal(r.state.guesses.b.tries, 1);
  assert.equal(r.state.guesses.b.solved, false);
  assert.equal(r.turn, 'b', 'ha ancora tentativi');
  assert.equal(r.ended, false);
});

test('applyGuess: risposta corretta → solved, turno al prossimo indovino', () => {
  const st = guessingState();
  const word = wordFor(st.seed, st.roundIndex, st.lang);
  const r = applyGuess(st, P3, 'b', word.toUpperCase());   // maiuscole: deve valere
  assert.equal(r.state.guesses.b.solved, true);
  assert.equal(r.turn, 'c');
});

test('applyGuess: al 3° errore il turno passa al prossimo', () => {
  const st = guessingState({ guesses: { b: { tries: 2, solved: false } } });
  const r = applyGuess(st, P3, 'b', 'ancora-sbagliata');
  assert.equal(r.state.guesses.b.tries, 3);
  assert.equal(r.turn, 'c');
});

test('applyGuess: ultimo indovino → round chiuso, punti applicati, round avanzato', () => {
  const st = guessingState({ guesses: { b: { tries: 1, solved: true } } });
  const word = wordFor(st.seed, st.roundIndex, st.lang);
  const r = applyGuess(st, P3, 'c', word);                  // anche c indovina
  assert.equal(r.state.roundIndex, 1, 'round avanzato');
  // b aveva indovinato al 1° tentativo → 3; c indovina ora al 1° tentativo → 3; a +2 (2 indovini)
  assert.deepEqual(r.state.scores, { a: 2, b: 3, c: 3 });
  assert.deepEqual(r.state.strokes, []);
  assert.equal(r.turn, 'b', 'nuovo disegnatore');
});

test('applyRetire: si ritira il disegnatore corrente → si passa al round dopo', () => {
  const st = baseState({ roundIndex: 0, phase: 'drawing' });
  const r = applyRetire(st, P3, 'a', 'a');
  assert.deepEqual(r.state.retired, ['a']);
  assert.equal(r.state.roundIndex, 1);
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applyRetire: si ritira un indovino in attesa → turno al prossimo pendente', () => {
  const st = baseState({ roundIndex: 0, phase: 'guessing', strokes: ['0,1,5,5'] });
  const r = applyRetire(st, P3, 'b', 'b');   // b stava indovinando
  assert.deepEqual(r.state.retired, ['b']);
  assert.equal(r.turn, 'c');
  assert.equal(r.ended, false);
});

test('applyRetire: fuori dal proprio turno in fase drawing → turno invariato', () => {
  const st = baseState({ roundIndex: 0, phase: 'drawing' });
  const r = applyRetire(st, P3, 'c', 'a');   // disegna a, si ritira c
  assert.equal(r.turn, 'a');
  assert.deepEqual(r.state.retired, ['c']);
});

test('applyRetire: resta un solo attivo → fine partita, vince il superstite', () => {
  const st = baseState({ roundIndex: 0, phase: 'guessing', retired: ['c'] });
  const r = applyRetire(st, P3, 'b', 'b');
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});
