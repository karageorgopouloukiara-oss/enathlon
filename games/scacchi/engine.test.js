import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialBoard, colorOf, applyMove, isInCheck, isSquareAttacked, pseudoMoves, legalMoves, movesFrom, gameStatus } from './engine.js';

// --- Helper di test ---------------------------------------------------------
function sq(a){ const file = a.charCodeAt(0) - 97; const rank = 8 - Number(a[1]); return rank*8 + file; }
function emptyBoard(){ return new Array(64).fill(''); }
function setup(map){ const b = emptyBoard(); for (const [a,p] of Object.entries(map)) b[sq(a)] = p; return b; }
function st(board, extra = {}){ return { board, castling:{wK:false,wQ:false,bK:false,bQ:false}, epTarget:null, ...extra }; }

test('sq mappa la notazione algebrica sull\'indice piatto', () => {
  assert.equal(sq('a8'), 0);
  assert.equal(sq('h8'), 7);
  assert.equal(sq('e1'), 60);
  assert.equal(sq('h1'), 63);
});

test('initialBoard: posizione iniziale corretta', () => {
  const b = initialBoard();
  assert.equal(b.length, 64);
  assert.equal(b[sq('a8')], 'r');
  assert.equal(b[sq('e8')], 'k');
  assert.equal(b[sq('d1')], 'Q');
  assert.equal(b[sq('e1')], 'K');
  assert.equal(b[sq('a2')], 'P');
  assert.equal(b[sq('a7')], 'p');
  assert.equal(b[sq('e4')], '');
});

test('colorOf riconosce il colore dal carattere', () => {
  assert.equal(colorOf('K'), 'w');
  assert.equal(colorOf('q'), 'b');
  assert.equal(colorOf(''), null);
});

test('applyMove: mossa semplice sposta il pezzo', () => {
  const s = st(setup({ e2:'P', e1:'K' }));
  const n = applyMove(s, { from: sq('e2'), to: sq('e4'), flag:'double' });
  assert.equal(n.board[sq('e2')], '');
  assert.equal(n.board[sq('e4')], 'P');
});

test('applyMove: spinta doppia imposta epTarget sulla casella saltata', () => {
  const s = st(setup({ e2:'P', e1:'K' }));
  const n = applyMove(s, { from: sq('e2'), to: sq('e4'), flag:'double' });
  assert.equal(n.epTarget, sq('e3'));
});

test('applyMove: cattura en passant rimuove il pedone superato', () => {
  const s = st(setup({ e5:'P', d5:'p', e1:'K' }), { epTarget: sq('d6') });
  const n = applyMove(s, { from: sq('e5'), to: sq('d6'), flag:'ep' });
  assert.equal(n.board[sq('d6')], 'P');
  assert.equal(n.board[sq('e5')], '');
  assert.equal(n.board[sq('d5')], ''); // pedone nero catturato
});

test('applyMove: promozione sostituisce il pedone', () => {
  const s = st(setup({ a7:'P', e1:'K' }));
  const n = applyMove(s, { from: sq('a7'), to: sq('a8'), promotion:'q' });
  assert.equal(n.board[sq('a8')], 'Q');
});

test('applyMove: arrocco corto muove anche la torre e toglie i diritti', () => {
  const s = st(setup({ e1:'K', h1:'R' }), { castling:{wK:true,wQ:true,bK:false,bQ:false} });
  const n = applyMove(s, { from: sq('e1'), to: sq('g1'), flag:'castleK' });
  assert.equal(n.board[sq('g1')], 'K');
  assert.equal(n.board[sq('f1')], 'R');
  assert.equal(n.board[sq('h1')], '');
  assert.equal(n.castling.wK, false);
  assert.equal(n.castling.wQ, false);
});

test('applyMove: muovere una torre toglie il relativo diritto', () => {
  const s = st(setup({ e1:'K', a1:'R' }), { castling:{wK:true,wQ:true,bK:false,bQ:false} });
  const n = applyMove(s, { from: sq('a1'), to: sq('a4') });
  assert.equal(n.castling.wQ, false);
  assert.equal(n.castling.wK, true);
});

test('isSquareAttacked: la torre attacca lungo la colonna libera', () => {
  const b = setup({ e8:'r', e1:'K' });
  assert.equal(isSquareAttacked(b, sq('e1'), 'b'), true);
  assert.equal(isSquareAttacked(b, sq('d1'), 'b'), false);
});

test('isSquareAttacked: il pedone bianco attacca in diagonale verso l\'alto', () => {
  const b = setup({ d4:'P' });
  assert.equal(isSquareAttacked(b, sq('c5'), 'w'), true);
  assert.equal(isSquareAttacked(b, sq('e5'), 'w'), true);
  assert.equal(isSquareAttacked(b, sq('d5'), 'w'), false); // non cattura in avanti
});

test('isSquareAttacked: il cavallo attacca a L', () => {
  const b = setup({ d4:'n' });
  assert.equal(isSquareAttacked(b, sq('e6'), 'b'), true);
  assert.equal(isSquareAttacked(b, sq('d6'), 'b'), false);
});

test('isSquareAttacked: un pezzo che blocca interrompe il raggio', () => {
  const b = setup({ e8:'r', e5:'p', e1:'K' });
  assert.equal(isSquareAttacked(b, sq('e1'), 'b'), false); // il pedone in e5 blocca
});

test('isInCheck: re sotto scacco dalla torre', () => {
  assert.equal(isInCheck(setup({ e8:'r', e1:'K' }), 'w'), true);
  assert.equal(isInCheck(setup({ e8:'r', d1:'K' }), 'w'), false);
});

// Ri-esportiamo gli helper per le task successive tramite globalThis del file.
export { sq, emptyBoard, setup, st };

const targets = (moves, from) => moves.filter(m=>m.from===from).map(m=>m.to).sort((a,b)=>a-b);

test('pseudoMoves: pedone bianco iniziale spinge di 1 o 2', () => {
  const s = st(setup({ e2:'P', e1:'K' }));
  assert.deepEqual(targets(pseudoMoves(s,'w'), sq('e2')), [sq('e4'), sq('e3')].sort((a,b)=>a-b));
});

test('pseudoMoves: pedone bloccato frontalmente non avanza', () => {
  const s = st(setup({ e2:'P', e3:'p', e1:'K' }));
  assert.deepEqual(targets(pseudoMoves(s,'w'), sq('e2')), []);
});

test('pseudoMoves: pedone cattura in diagonale ma non in avanti', () => {
  const s = st(setup({ e4:'P', d5:'p', e1:'K' }));
  const t = targets(pseudoMoves(s,'w'), sq('e4'));
  assert.ok(t.includes(sq('d5')));
  assert.ok(t.includes(sq('e5')));
  assert.ok(!t.includes(sq('f5'))); // niente pezzo nemico su f5
});

test('pseudoMoves: promozione genera 4 mosse', () => {
  const s = st(setup({ a7:'P', e1:'K' }));
  const proms = pseudoMoves(s,'w').filter(m=>m.from===sq('a7') && m.to===sq('a8'));
  assert.deepEqual(proms.map(m=>m.promotion).sort(), ['b','n','q','r']);
});

test('pseudoMoves: cattura en passant disponibile con epTarget', () => {
  const s = st(setup({ e5:'P', d5:'p', e1:'K' }), { epTarget: sq('d6') });
  const ep = pseudoMoves(s,'w').find(m=>m.from===sq('e5') && m.to===sq('d6'));
  assert.equal(ep.flag, 'ep');
});

test('pseudoMoves: il cavallo ha 8 mosse al centro', () => {
  const s = st(setup({ d4:'N', e1:'K' }));
  assert.equal(targets(pseudoMoves(s,'w'), sq('d4')).length, 8);
});

test('pseudoMoves: la torre si ferma alla cattura e non oltre', () => {
  const s = st(setup({ a1:'R', a4:'p', e1:'K' }));
  const t = targets(pseudoMoves(s,'w'), sq('a1'));
  assert.ok(t.includes(sq('a4')));   // cattura
  assert.ok(!t.includes(sq('a5')));  // non oltre
  assert.ok(!t.includes(sq('a1')));
});

test('pseudoMoves: il pezzo non cattura un proprio pezzo', () => {
  const s = st(setup({ a1:'R', a2:'P', e1:'K' }));
  assert.ok(!targets(pseudoMoves(s,'w'), sq('a1')).includes(sq('a2')));
});

test('arrocco: entrambi i lati disponibili con diritti e caselle libere', () => {
  const s = st(setup({ e1:'K', a1:'R', h1:'R', e8:'k' }), { castling:{wK:true,wQ:true,bK:false,bQ:false} });
  const t = targets(pseudoMoves(s,'w'), sq('e1'));
  assert.ok(t.includes(sq('g1'))); // corto
  assert.ok(t.includes(sq('c1'))); // lungo
});

test('arrocco: bloccato se una casella intermedia è occupata', () => {
  const s = st(setup({ e1:'K', h1:'R', f1:'B', e8:'k' }), { castling:{wK:true,wQ:false,bK:false,bQ:false} });
  assert.ok(!targets(pseudoMoves(s,'w'), sq('e1')).includes(sq('g1')));
});

test('arrocco: vietato attraversare una casella attaccata', () => {
  // torre nera su f8 attacca f1 → l'arrocco corto è illegale
  const s = st(setup({ e1:'K', h1:'R', f8:'r', e8:'k' }), { castling:{wK:true,wQ:false,bK:false,bQ:false} });
  assert.ok(!targets(pseudoMoves(s,'w'), sq('e1')).includes(sq('g1')));
});

test('arrocco: vietato se il re è sotto scacco', () => {
  const s = st(setup({ e1:'K', h1:'R', e8:'r' }), { castling:{wK:true,wQ:false,bK:false,bQ:false} });
  assert.ok(!targets(pseudoMoves(s,'w'), sq('e1')).includes(sq('g1')));
});

test('arrocco: senza diritto non è generato', () => {
  const s = st(setup({ e1:'K', h1:'R', e8:'k' }), { castling:{wK:false,wQ:false,bK:false,bQ:false} });
  assert.ok(!targets(pseudoMoves(s,'w'), sq('e1')).includes(sq('g1')));
});

test('movesFrom: un pezzo inchiodato non può muovere', () => {
  // cavallo bianco e2 inchiodato dalla torre nera e8 contro il re e1
  const s = st(setup({ e1:'K', e2:'N', e8:'r', a8:'k' }));
  assert.deepEqual(movesFrom(s, sq('e2')), []);
});

test('legalMoves: sotto scacco, tutte le mosse tolgono lo scacco', () => {
  const s = st(setup({ e1:'K', e8:'r', a8:'k' }));
  const moves = legalMoves(s, 'w');
  // nessuna mossa può lasciare il re sulla colonna e sotto tiro
  for (const m of moves){
    const n = applyMove(s, m);
    assert.equal(isInCheck(n.board, 'w'), false);
  }
  assert.ok(moves.length > 0);
});

test('legalMoves: il re non si mette da solo in scacco', () => {
  const s = st(setup({ e1:'K', d8:'r', a8:'k' }));
  // d8 controlla la colonna d → il re non può andare in d1/d2
  const kingTargets = legalMoves(s,'w').filter(m=>m.from===sq('e1')).map(m=>m.to);
  assert.ok(!kingTargets.includes(sq('d1')));
  assert.ok(!kingTargets.includes(sq('d2')));
});

test('gameStatus: partita in corso dalla posizione iniziale', () => {
  const s = st(initialBoard(), { castling:{wK:true,wQ:true,bK:true,bQ:true} });
  assert.equal(gameStatus(s, 'w'), 'ongoing');
});

test('gameStatus: scacco matto sulla traversa (back-rank)', () => {
  // Re bianco h1 chiuso dai pedoni g2/h2, torre nera a1 dà matto sulla traversa 1
  const s = st(setup({ h1:'K', g2:'P', h2:'P', a1:'r', a8:'k' }));
  assert.equal(gameStatus(s, 'w'), 'checkmate');
});

test('gameStatus: stallo (nessuna mossa, re non sotto scacco)', () => {
  // Re nero h8; Re bianco f7 e Donna g6 lo bloccano senza dargli scacco
  const s = st(setup({ f7:'K', g6:'Q', h8:'k' }));
  assert.equal(gameStatus(s, 'b'), 'stalemate');
});
