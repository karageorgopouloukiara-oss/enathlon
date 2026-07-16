import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, shuffle, isWild, colorOf, valueOf, isPlayable, playableCards, deal, nextPlayer, reshuffle, drawN, applyPlay, applyDraw, applyPass, applyRetire } from './engine.js';

const COLORS = ['r', 'g', 'b', 'y'];

test('buildDeck: 108 carte totali', () => {
  assert.equal(buildDeck().length, 108);
});

test('buildDeck: composizione per colore', () => {
  const deck = buildDeck();
  for (const c of COLORS) {
    const cards = deck.filter(x => x[0] === c);
    assert.equal(cards.length, 25, `colore ${c}`);
    assert.equal(cards.filter(x => x === c + '0').length, 1);
    for (let v = 1; v <= 9; v++) assert.equal(cards.filter(x => x === c + v).length, 2);
    for (const a of ['S', 'R', 'D']) assert.equal(cards.filter(x => x === c + a).length, 2);
  }
});

test('buildDeck: 4 jolly e 4 jolly+4', () => {
  const deck = buildDeck();
  assert.equal(deck.filter(x => x === 'W').length, 4);
  assert.equal(deck.filter(x => x === 'F').length, 4);
});

test('shuffle: stessa multiset, ordine diverso, non muta input', () => {
  const deck = buildDeck();
  const copy = deck.slice();
  let seq = 0;
  const rng = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };
  const out = shuffle(deck, rng);
  assert.equal(out.length, deck.length);
  assert.deepEqual(deck, copy, 'input non mutato');
  assert.deepEqual([...out].sort(), [...deck].sort(), 'stesse carte');
  assert.notDeepEqual(out, deck, 'ordine cambiato');
});

test('helper carta: wild/colore/valore', () => {
  assert.equal(isWild('W'), true);
  assert.equal(isWild('F'), true);
  assert.equal(isWild('r5'), false);
  assert.equal(colorOf('r5'), 'r');
  assert.equal(colorOf('W'), null);
  assert.equal(valueOf('gS'), 'S');
  assert.equal(valueOf('r5'), '5');
  assert.equal(valueOf('F'), 'F');
});

test('isPlayable: match per colore', () => {
  assert.equal(isPlayable('r5', 'r9', 'r'), true);
});
test('isPlayable: match per valore', () => {
  assert.equal(isPlayable('g7', 'r7', 'r'), true);
});
test('isPlayable: jolly sempre giocabile', () => {
  assert.equal(isPlayable('W', 'r7', 'r'), true);
  assert.equal(isPlayable('F', 'g2', 'g'), true);
});
test('isPlayable: nessun match → false', () => {
  assert.equal(isPlayable('b3', 'r7', 'r'), false);
});
test('isPlayable: dopo un jolly conta il colore attivo', () => {
  // top è un jolly 'W', colore scelto = blu
  assert.equal(isPlayable('b1', 'W', 'b'), true);
  assert.equal(isPlayable('r1', 'W', 'b'), false);
});
test('playableCards: filtra la mano', () => {
  const hand = ['r5', 'b3', 'g7', 'W'];
  assert.deepEqual(playableCards(hand, 'r7', 'r'), ['r5', 'g7', 'W']);
});

test('deal: 7 carte round-robin, deck ridotto, prima carta = numero semplice', () => {
  const deck = [
    'r1','r2','r3','r4','r5','r6','r7',   // pescate ai giri 0..3(a),0..2(b)
    'g1','g2','g3','g4','g5','g6','g7',   // resto delle mani
    'bS','b4'                             // bS scartata (azione), b4 = iniziale
  ];
  const out = deal(['anna', 'bruno'], deck);
  assert.equal(out.hands.anna.length, 7);
  assert.equal(out.hands.bruno.length, 7);
  // round-robin: anna prende gli indici pari del giro, bruno i dispari
  assert.deepEqual(out.hands.anna, ['r1','r3','r5','r7','g2','g4','g6']);
  assert.deepEqual(out.hands.bruno, ['r2','r4','r6','g1','g3','g5','g7']);
  assert.equal(out.discard[out.discard.length - 1], 'b4', 'cima scarti = carta iniziale');
  assert.equal(out.color, 'b');
  assert.equal(out.deck.length, 0);
});

test('deal: le carte scartate prima della iniziale restano sotto', () => {
  const deck = ['r1','r2','r3','r4','r5','r6','r7', 'bS', 'g3'];
  const out = deal(['solo'], deck);
  // solo prende le prime 7, poi bS scartata perché azione, poi g3 iniziale in cima
  assert.deepEqual(out.hands.solo, ['r1','r2','r3','r4','r5','r6','r7']);
  assert.deepEqual(out.discard, ['bS', 'g3']);
  assert.equal(out.color, 'g');
});

const P4 = ['a', 'b', 'c', 'd'];

test('nextPlayer: avanti di 1 in direzione +1', () => {
  assert.equal(nextPlayer(P4, [], 'a', 1, 0), 'b');
  assert.equal(nextPlayer(P4, [], 'd', 1, 0), 'a'); // wrap
});
test('nextPlayer: direzione -1', () => {
  assert.equal(nextPlayer(P4, [], 'a', -1, 0), 'd');
  assert.equal(nextPlayer(P4, [], 'b', -1, 0), 'a');
});
test('nextPlayer: salto (skip=1) supera un giocatore', () => {
  assert.equal(nextPlayer(P4, [], 'a', 1, 1), 'c');
});
test('nextPlayer: salta i ritirati', () => {
  assert.equal(nextPlayer(P4, ['b'], 'a', 1, 0), 'c');
  assert.equal(nextPlayer(P4, ['b', 'c'], 'a', 1, 0), 'd');
});
test('nextPlayer: il ritirato attuale non conta come avanzamento', () => {
  // c appena ritirato, turno passa da c
  assert.equal(nextPlayer(P4, ['c'], 'c', 1, 0), 'd');
});

const idRng = () => 0; // rng deterministico: shuffle senza permutazione utile

test('reshuffle: tiene la cima, rimescola il resto nel mazzo', () => {
  const deck = [];
  const discard = ['r1', 'g2', 'b3']; // b3 = cima
  const out = reshuffle(deck, discard, idRng);
  assert.deepEqual(out.discard, ['b3'], 'resta solo la cima');
  assert.equal(out.deck.length, 2, 'r1 e g2 tornano nel mazzo');
  assert.deepEqual([...out.deck].sort(), ['g2', 'r1']);
});

test('drawN: pesca dalla cima del mazzo', () => {
  const out = drawN(['r1', 'g2', 'b3'], ['y9'], 2, idRng);
  assert.deepEqual(out.cards, ['r1', 'g2']);
  assert.deepEqual(out.deck, ['b3']);
  assert.deepEqual(out.discard, ['y9']);
});

test('drawN: rimescola gli scarti quando il mazzo si esaurisce', () => {
  // mazzo con 1 carta, ne chiediamo 2 → rimescola gli scarti (meno la cima)
  const out = drawN(['r1'], ['g2', 'y9'], 2, idRng); // y9 = cima
  assert.equal(out.cards.length, 2);
  assert.equal(out.cards[0], 'r1');
  assert.deepEqual(out.discard, ['y9'], 'cima conservata');
  // g2 era l'unico scarto rimescolabile → seconda carta pescata = g2
  assert.equal(out.cards[1], 'g2');
});

function baseState(over = {}) {
  return {
    deck: ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'],
    discard: ['g0'],
    hands: { a: ['r5', 'gS', 'bR', 'yD', 'W'], b: ['g1', 'g2'], c: ['b1'] },
    color: 'g', direction: 1, retired: [], drawn: null,
    ...over
  };
}
const P3 = ['a', 'b', 'c'];

test('applyPlay: numero semplice → carta negli scarti, turno al successivo', () => {
  const r = applyPlay(baseState(), P3, 'a', 'r5');
  assert.equal(r.state.discard[r.state.discard.length - 1], 'r5');
  assert.equal(r.state.color, 'r');
  assert.equal(r.state.hands.a.includes('r5'), false);
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applyPlay: salta (S) → salta il successivo', () => {
  const r = applyPlay(baseState(), P3, 'a', 'gS');
  assert.equal(r.turn, 'c');
});

test('applyPlay: inverti (R) con 3 giocatori → cambia direzione', () => {
  const r = applyPlay(baseState(), P3, 'a', 'bR');
  assert.equal(r.state.direction, -1);
  assert.equal(r.turn, 'c'); // -1 da a → c
});

test('applyPlay: inverti (R) con 2 giocatori = salta', () => {
  const st = baseState({ hands: { a: ['bR', 'r1'], b: ['g2'] }, retired: [] });
  const r = applyPlay(st, ['a', 'b'], 'a', 'bR');
  assert.equal(r.turn, 'a'); // inverte + salta b → torna ad a
});

test('applyPlay: +2 (D) → il successivo pesca 2 ed è saltato', () => {
  const r = applyPlay(baseState(), P3, 'a', 'yD');
  assert.equal(r.state.color, 'y');
  assert.equal(r.state.hands.b.length, 4); // 2 iniziali + 2 pescate
  assert.deepEqual(r.state.hands.b.slice(-2), ['r1', 'r2']);
  assert.equal(r.turn, 'c'); // b saltato
});

test('applyPlay: jolly (W) → colore scelto, turno al successivo', () => {
  const r = applyPlay(baseState(), P3, 'a', 'W', 'b');
  assert.equal(r.state.color, 'b');
  assert.equal(r.turn, 'b');
});

test('applyPlay: jolly +4 (F) → successivo pesca 4 ed è saltato', () => {
  const st = baseState({ hands: { a: ['F', 'r1'], b: ['g2'], c: ['b1'] },
                         deck: ['r1', 'r2', 'r3', 'r4', 'r5'] });
  const r = applyPlay(st, P3, 'a', 'F', 'b');
  assert.equal(r.state.color, 'b');
  assert.equal(r.state.hands.b.length, 5); // 1 + 4
  assert.equal(r.turn, 'c');
});

test('applyPlay: ultima carta → ended, winner', () => {
  const st = baseState({ hands: { a: ['r5'], b: ['g1'], c: ['b1'] } });
  const r = applyPlay(st, P3, 'a', 'r5');
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});

test('applyDraw: carta pescata giocabile → drawn valorizzato, turno resta', () => {
  // top g0, colore g; pesco g5 (giocabile) → resta ad a con drawn=g5
  const st = baseState({ deck: ['g5', 'r2'], hands: { a: ['b1'], b: ['g2'], c: ['b3'] } });
  const r = applyDraw(st, P3, 'a');
  assert.equal(r.state.drawn, 'g5');
  assert.equal(r.state.hands.a.includes('g5'), true);
  assert.equal(r.turn, 'a');
});

test('applyDraw: carta non giocabile → turno passa, drawn null', () => {
  const st = baseState({ deck: ['b7', 'r2'], hands: { a: ['b1'], b: ['g2'], c: ['b3'] } });
  const r = applyDraw(st, P3, 'a');
  assert.equal(r.state.drawn, null);
  assert.equal(r.state.hands.a.includes('b7'), true);
  assert.equal(r.turn, 'b');
});

test('applyPass: passa il turno e azzera drawn', () => {
  const st = baseState({ drawn: 'g5' });
  const r = applyPass(st, P3, 'a');
  assert.equal(r.state.drawn, null);
  assert.equal(r.turn, 'b');
});

test('applyRetire: si ritira nel proprio turno → mano sotto gli scarti, turno avanza', () => {
  const st = baseState({ hands: { a: ['r5', 'r6'], b: ['g1'], c: ['b1'] } });
  const r = applyRetire(st, P3, 'a', 'a');
  assert.deepEqual(r.state.retired, ['a']);
  assert.deepEqual(r.state.hands.a, []);
  assert.equal(r.state.discard[r.state.discard.length - 1], 'g0', 'cima invariata');
  assert.equal(r.state.discard.slice(0, 2).sort().join(','), 'r5,r6', 'mano in fondo');
  assert.equal(r.turn, 'b');
  assert.equal(r.ended, false);
});

test('applyRetire: fuori dal proprio turno → turno invariato', () => {
  const st = baseState({ hands: { a: ['r5'], b: ['g1'], c: ['b1'] } });
  const r = applyRetire(st, P3, 'c', 'a'); // turno di a, si ritira c
  assert.equal(r.turn, 'a');
  assert.deepEqual(r.state.retired, ['c']);
});

test('applyRetire: resta un solo giocatore → ended, winner', () => {
  const st = baseState({ hands: { a: ['r5'], b: ['g1'] }, retired: [] });
  const r = applyRetire(st, ['a', 'b'], 'b', 'a');
  assert.equal(r.ended, true);
  assert.equal(r.winner, 'a');
});
