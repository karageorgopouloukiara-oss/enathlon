import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDictionary, isValid } from './dictionary.js';

test('parseDictionary costruisce un Set da testo con una parola per riga', () => {
  const set = parseDictionary('CASA\nCANE\nGATTO\n');
  assert.ok(set instanceof Set);
  assert.equal(set.size, 3);
});

test('parseDictionary normalizza maiuscolo e ignora righe vuote/spazi', () => {
  const set = parseDictionary(' casa \n\n Cane\n');
  assert.ok(set.has('CASA'));
  assert.ok(set.has('CANE'));
  assert.equal(set.size, 2);
});

test('isValid è case-insensitive e vera solo per parole presenti', () => {
  const set = parseDictionary('CASA\nCANE\n');
  assert.equal(isValid(set, 'casa'), true);
  assert.equal(isValid(set, 'CASA'), true);
  assert.equal(isValid(set, 'xyz'), false);
});

test('isValid è falsa per stringa vuota', () => {
  const set = parseDictionary('CASA\n');
  assert.equal(isValid(set, ''), false);
});
