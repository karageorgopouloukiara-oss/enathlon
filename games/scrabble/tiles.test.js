import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES, buildBag, letterValue, remainingPenalty } from './tiles.js';

test('il sacchetto inglese ha 100 tessere', () => {
  assert.equal(buildBag('en').length, 100);
});

test('il sacchetto inglese ha 2 jolly (blank = " ")', () => {
  const blanks = buildBag('en').filter(t => t === ' ').length;
  assert.equal(blanks, 2);
});

test('il sacchetto italiano non contiene J K W X Y', () => {
  const bag = buildBag('it');
  for (const bad of ['J', 'K', 'W', 'X', 'Y']) {
    assert.equal(bag.includes(bad), false, `trovata ${bad} nel set IT`);
  }
});

test('letterValue: Q vale 10 in inglese, blank vale 0', () => {
  assert.equal(letterValue('en', 'Q'), 10);
  assert.equal(letterValue('en', ' '), 0);
});

test('remainingPenalty somma i valori delle tessere residue', () => {
  // Q(10) + A(1) + blank(0) = 11 in inglese
  assert.equal(remainingPenalty('en', ['Q', 'A', ' ']), 11);
});
