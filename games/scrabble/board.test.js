import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bonusAt } from './board.js';

test('gli angoli sono parola tripla (TW)', () => {
  assert.equal(bonusAt(0, 0), 'TW');
  assert.equal(bonusAt(0, 14), 'TW');
  assert.equal(bonusAt(14, 0), 'TW');
  assert.equal(bonusAt(14, 14), 'TW');
});

test('il centro (7,7) è parola doppia (DW)', () => {
  assert.equal(bonusAt(7, 7), 'DW');
});

test('(1,5) è lettera tripla (TL) e (0,3) è lettera doppia (DL)', () => {
  assert.equal(bonusAt(1, 5), 'TL');
  assert.equal(bonusAt(0, 3), 'DL');
});

test('una casella normale non ha bonus', () => {
  assert.equal(bonusAt(7, 1), null);
});

import { wordsFormed } from './board.js';

function emptyBoard() {
  return Array.from({ length: 15 }, () => Array(15).fill(null));
}

test('wordsFormed: parola orizzontale semplice', () => {
  const b = emptyBoard();
  const placed = [
    { r:7, c:7, letter:'C', blank:false },
    { r:7, c:8, letter:'A', blank:false },
    { r:7, c:9, letter:'T', blank:false },
  ];
  const words = wordsFormed(b, placed);
  assert.equal(words.length, 1);
  assert.equal(words[0].word, 'CAT');
});

test('wordsFormed: include la parola incrociata con tessere esistenti', () => {
  const b = emptyBoard();
  // esistente verticale "AT" in colonna 8: (6,8)=A, (7,8)=T già a bordo? no.
  b[6][8] = { letter:'A', blank:false }; // esistente sopra
  const placed = [
    { r:7, c:7, letter:'C', blank:false },
    { r:7, c:8, letter:'T', blank:false }, // forma orizzontale "CT"? no: mettiamo un caso reale sotto
  ];
  // Qui (7,8)=T con (6,8)=A sopra forma la verticale "AT"; l'orizzontale è "CT".
  const words = wordsFormed(b, placed).map(w => w.word).sort();
  assert.deepEqual(words, ['AT', 'CT']);
});

test('wordsFormed: una singola tessera che estende una parola esistente', () => {
  const b = emptyBoard();
  b[7][7] = { letter:'C', blank:false };
  b[7][8] = { letter:'A', blank:false };
  const placed = [{ r:7, c:9, letter:'T', blank:false }];
  const words = wordsFormed(b, placed);
  assert.equal(words.length, 1);
  assert.equal(words[0].word, 'CAT');
});

test('wordsFormed: le celle riportano isNew corretto', () => {
  const b = emptyBoard();
  b[7][7] = { letter:'C', blank:false };
  const placed = [{ r:7, c:8, letter:'A', blank:false }, { r:7, c:9, letter:'T', blank:false }];
  const word = wordsFormed(b, placed)[0];
  assert.equal(word.word, 'CAT');
  assert.deepEqual(word.cells.map(c => c.isNew), [false, true, true]);
});

import { scoreMove } from './board.js';

const enVal = (l) => ({ ' ':0, A:1, C:3, T:1, Q:10 }[l.toUpperCase()] ?? 0);

test('scoreMove: parola sul centro conta parola doppia', () => {
  const b = emptyBoard();
  // CAT su (7,5),(7,6),(7,7): (7,7) è DW → (3+1+1)*2 = 10
  const placed = [
    { r:7, c:5, letter:'C', blank:false },
    { r:7, c:6, letter:'A', blank:false },
    { r:7, c:7, letter:'T', blank:false },
  ];
  assert.equal(scoreMove(b, placed, enVal), 10);
});

test('scoreMove: lettera tripla si applica solo alla tessera nuova su TL', () => {
  const b = emptyBoard();
  // C su (1,5) è TL → C vale 3*3=9; A(1,6) e T(1,7) normali → 9+1+1 = 11
  const placed = [
    { r:1, c:5, letter:'C', blank:false },
    { r:1, c:6, letter:'A', blank:false },
    { r:1, c:7, letter:'T', blank:false },
  ];
  assert.equal(scoreMove(b, placed, enVal), 11);
});

test('scoreMove: bingo +50 usando 7 tessere', () => {
  const b = emptyBoard();
  const placed = [];
  for (let i = 0; i < 7; i++) placed.push({ r:2, c:i, letter:'A', blank:false });
  // NOTA: il commento del piano originale assumeva (2,2) e (2,6) entrambe DL, ma
  // secondo il LAYOUT effettivo (riga 2 = '..D...d.d...D..') (2,2) è DW e (2,6) è DL.
  // A base=1; caselle: (2,0).,(2,1).,(2,2)DW,(2,3).,(2,4).,(2,5).,(2,6)DL
  // somma lettere = 1+1+1+1+1+1+2 = 8; wordMult=2 (da DW) → 16; +50 bingo = 66
  assert.equal(scoreMove(b, placed, enVal), 66);
});

test('scoreMove: il blank non aggiunge punti', () => {
  const b = emptyBoard();
  // " "(blank come A) + T su (7,6),(7,7): blank=0, T=1, (7,7) DW → (0+1)*2 = 2
  const placed = [
    { r:7, c:6, letter:'A', blank:true },
    { r:7, c:7, letter:'T', blank:false },
  ];
  assert.equal(scoreMove(b, placed, enVal), 2);
});
