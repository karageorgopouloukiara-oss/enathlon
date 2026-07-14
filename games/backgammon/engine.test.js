import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialPoints, dice, diceToMoves, moveTarget, applyMove, legalSequences, nextMoves, isSequenceComplete, isWin } from './engine.js';

// --- Helper di test ---------------------------------------------------------
function emptyPoints(){ return new Array(24).fill(0); }
/* P({10:2, 8:-1}) → array 24 con quei punti valorizzati */
function P(map){ const p = emptyPoints(); for (const [i,v] of Object.entries(map)) p[Number(i)] = v; return p; }
function st(points, extra = {}){ return { points, bar:{w:0,b:0}, off:{w:0,b:0}, ...extra }; }
/* conta le pedine di un colore sulla board */
function total(points, color){
  let n = 0;
  for (const v of points) n += color==='w' ? Math.max(0,v) : Math.max(0,-v);
  return n;
}

test('initialPoints: posizione iniziale standard', () => {
  const p = initialPoints();
  assert.equal(p.length, 24);
  // Bianco (+)
  assert.equal(p[23], 2);
  assert.equal(p[12], 5);
  assert.equal(p[7], 3);
  assert.equal(p[5], 5);
  // Nero (−)
  assert.equal(p[0], -2);
  assert.equal(p[11], -5);
  assert.equal(p[16], -3);
  assert.equal(p[18], -5);
});

test('initialPoints: 15 pedine per colore', () => {
  const p = initialPoints();
  assert.equal(total(p, 'w'), 15);
  assert.equal(total(p, 'b'), 15);
});

test('dice: deterministico — stesso seed e turno danno lo stesso tiro', () => {
  assert.deepEqual(dice(12345, 0), dice(12345, 0));
  assert.deepEqual(dice(12345, 7), dice(12345, 7));
});

test('dice: valori sempre fra 1 e 6', () => {
  for (let turn = 0; turn < 300; turn++){
    const [d1, d2] = dice(999, turn);
    assert.ok(d1 >= 1 && d1 <= 6, `d1 fuori range: ${d1}`);
    assert.ok(d2 >= 1 && d2 <= 6, `d2 fuori range: ${d2}`);
    assert.ok(Number.isInteger(d1) && Number.isInteger(d2));
  }
});

test('dice: turni diversi danno tiri diversi (non è una costante)', () => {
  const rolls = new Set();
  for (let turn = 0; turn < 50; turn++) rolls.add(dice(4242, turn).join('-'));
  assert.ok(rolls.size > 5, `troppa poca varietà: ${rolls.size} tiri distinti`);
});

test('dice: seed diversi danno sequenze diverse', () => {
  const a = [], b = [];
  for (let turn = 0; turn < 20; turn++){ a.push(dice(1, turn).join('-')); b.push(dice(2, turn).join('-')); }
  assert.notDeepEqual(a, b);
});

test('dice: tutte e sei le facce escono su molti tiri', () => {
  const faces = new Set();
  for (let turn = 0; turn < 600; turn++){ const [d1,d2] = dice(77, turn); faces.add(d1); faces.add(d2); }
  assert.deepEqual([...faces].sort(), [1,2,3,4,5,6]);
});

test('diceToMoves: tiro normale → due mosse', () => {
  assert.deepEqual(diceToMoves([3,5]), [3,5]);
});

test('diceToMoves: doppio → quattro mosse', () => {
  assert.deepEqual(diceToMoves([4,4]), [4,4,4,4]);
});

test('moveTarget: il Bianco muove verso indici decrescenti', () => {
  const s = st(P({ 10: 1 }));
  assert.equal(moveTarget(s, 'w', 10, 3), 7);
});

test('moveTarget: il Nero muove verso indici crescenti', () => {
  const s = st(P({ 10: -1 }));
  assert.equal(moveTarget(s, 'b', 10, 3), 13);
});

test('moveTarget: punto bloccato da 2+ pedine avversarie', () => {
  const s = st(P({ 10: 1, 8: -2 }));
  assert.equal(moveTarget(s, 'w', 10, 2), null);
});

test('moveTarget: un blot avversario (1 pedina) è raggiungibile', () => {
  const s = st(P({ 10: 1, 8: -1 }));
  assert.equal(moveTarget(s, 'w', 10, 2), 8);
});

test('moveTarget: non si muove da un punto senza proprie pedine', () => {
  const s = st(P({ 10: -1 }));
  assert.equal(moveTarget(s, 'w', 10, 2), null);
});

test('moveTarget: con pedine sulla barra si può muovere SOLO dalla barra', () => {
  const s = st(P({ 10: 1 }), { bar: { w: 1, b: 0 } });
  assert.equal(moveTarget(s, 'w', 10, 2), null);
});

test('moveTarget: rientro dalla barra — Bianco entra su 24-die', () => {
  const s = st(P({}), { bar: { w: 1, b: 0 } });
  assert.equal(moveTarget(s, 'w', 'bar', 1), 23);
  assert.equal(moveTarget(s, 'w', 'bar', 6), 18);
});

test('moveTarget: rientro dalla barra — Nero entra su die-1', () => {
  const s = st(P({}), { bar: { w: 0, b: 1 } });
  assert.equal(moveTarget(s, 'b', 'bar', 1), 0);
  assert.equal(moveTarget(s, 'b', 'bar', 6), 5);
});

test('moveTarget: rientro bloccato se il punto d\'ingresso è chiuso', () => {
  const s = st(P({ 21: -2 }), { bar: { w: 1, b: 0 } });
  assert.equal(moveTarget(s, 'w', 'bar', 3), null); // 24-3 = 21, bloccato
});

test('moveTarget: niente bear off se non tutte le pedine sono in casa', () => {
  const s = st(P({ 3: 1, 10: 1 })); // una pedina bianca fuori casa (10)
  assert.equal(moveTarget(s, 'w', 3, 4), null);
});

test('moveTarget: bear off con tiro esatto', () => {
  const s = st(P({ 3: 1 }));        // tutte in casa (0-5)
  assert.equal(moveTarget(s, 'w', 3, 4), 'off'); // 3-4 = -1 → esatto
});

test('moveTarget: bear off con tiro superiore solo dal punto più alto', () => {
  const alta = st(P({ 2: 1 }));     // nessuna pedina su 3,4,5
  assert.equal(moveTarget(alta, 'w', 2, 6), 'off');
  const bassa = st(P({ 2: 1, 4: 1 })); // c'è una pedina più in alto (4)
  assert.equal(moveTarget(bassa, 'w', 2, 6), null);
});

test('moveTarget: bear off del Nero (casa 18-23, esce oltre il 23)', () => {
  const s = st(P({ 20: -1 }));
  assert.equal(moveTarget(s, 'b', 20, 4), 'off'); // 20+4 = 24 → esatto
  const bassa = st(P({ 20: -1, 19: -1 }));        // c'è una pedina più indietro (19)
  assert.equal(moveTarget(bassa, 'b', 20, 6), null);
});

test('applyMove: sposta la pedina da un punto all\'altro', () => {
  const s = st(P({ 10: 2 }));
  const n = applyMove(s, 'w', { from: 10, to: 7, die: 3 });
  assert.equal(n.points[10], 1);
  assert.equal(n.points[7], 1);
});

test('applyMove: non muta lo stato originale', () => {
  const s = st(P({ 10: 2 }));
  applyMove(s, 'w', { from: 10, to: 7, die: 3 });
  assert.equal(s.points[10], 2);
  assert.equal(s.points[7], 0);
});

test('applyMove: colpire un blot manda la pedina avversaria sulla barra', () => {
  const s = st(P({ 10: 1, 7: -1 }));
  const n = applyMove(s, 'w', { from: 10, to: 7, die: 3 });
  assert.equal(n.points[7], 1);   // ora è del Bianco
  assert.equal(n.bar.b, 1);       // il Nero è sulla barra
  assert.equal(n.bar.w, 0);
});

test('applyMove: rientro dalla barra decrementa la barra', () => {
  const s = st(P({}), { bar: { w: 1, b: 0 } });
  const n = applyMove(s, 'w', { from: 'bar', to: 23, die: 1 });
  assert.equal(n.bar.w, 0);
  assert.equal(n.points[23], 1);
});

test('applyMove: rientro dalla barra può colpire un blot', () => {
  const s = st(P({ 23: -1 }), { bar: { w: 1, b: 0 } });
  const n = applyMove(s, 'w', { from: 'bar', to: 23, die: 1 });
  assert.equal(n.points[23], 1);
  assert.equal(n.bar.b, 1);
  assert.equal(n.bar.w, 0);
});

test('applyMove: bear off incrementa le pedine uscite', () => {
  const s = st(P({ 3: 1 }));
  const n = applyMove(s, 'w', { from: 3, to: 'off', die: 4 });
  assert.equal(n.points[3], 0);
  assert.equal(n.off.w, 1);
});

test('applyMove: il Nero impila con segno negativo', () => {
  const s = st(P({ 10: -1, 13: -1 }));
  const n = applyMove(s, 'b', { from: 10, to: 13, die: 3 });
  assert.equal(n.points[10], 0);
  assert.equal(n.points[13], -2);
});

test('legalSequences: nessuna mossa possibile → array vuoto (si passa)', () => {
  // Bianco sulla barra; entrambi i punti d'ingresso (24-3=21, 24-5=19) sono chiusi
  const s = st(P({ 21: -2, 19: -2 }), { bar: { w: 1, b: 0 } });
  assert.deepEqual(legalSequences(s, 'w', [3, 5]), []);
});

test('legalSequences: con pedine sulla barra ogni sequenza inizia con un rientro', () => {
  const s = st(P({ 10: 2 }), { bar: { w: 1, b: 0 } });
  const seqs = legalSequences(s, 'w', [3, 5]);
  assert.ok(seqs.length > 0);
  for (const seq of seqs) assert.equal(seq[0].from, 'bar');
});

test('legalSequences: si devono usare ENTRAMBI i dadi se esiste un ordine che lo permette', () => {
  // Unica pedina bianca su 10, dadi [2,3]. Il punto 7 è chiuso dal Nero:
  //  - giocando prima il 3: 10→7 BLOCCATO
  //  - giocando prima il 2: 10→8, poi 3: 8→5  ✓
  const s = st(P({ 10: 1, 7: -2 }));
  const seqs = legalSequences(s, 'w', [2, 3]);
  assert.ok(seqs.length > 0);
  for (const seq of seqs) assert.equal(seq.length, 2, 'tutte le sequenze devono usare 2 dadi');
  assert.deepEqual(seqs[0].map(m => [m.from, m.to, m.die]), [[10, 8, 2], [8, 5, 3]]);
});

test('legalSequences: se si può giocare un solo dado, si deve giocare il PIÙ ALTO', () => {
  // Unica pedina bianca su 10, dadi [1,6]. Il punto 3 è chiuso:
  //  - 1 poi 6: 10→9, poi 9→3 BLOCCATO  → sequenza da 1
  //  - 6 poi 1: 10→4, poi 4→3 BLOCCATO  → sequenza da 1
  // Entrambi giocabili da soli → si DEVE giocare il 6.
  const s = st(P({ 10: 1, 3: -2 }));
  const seqs = legalSequences(s, 'w', [1, 6]);
  assert.ok(seqs.length > 0);
  for (const seq of seqs){
    assert.equal(seq.length, 1);
    assert.equal(seq[0].die, 6, 'va giocato il dado più alto');
    assert.equal(seq[0].to, 4);
  }
});

test('legalSequences: un doppio consente quattro mosse', () => {
  const s = st(P({ 20: 4 }));
  const seqs = legalSequences(s, 'w', [3, 3]);
  assert.ok(seqs.length > 0);
  for (const seq of seqs) assert.equal(seq.length, 4);
});

test('legalSequences: le sequenze non attraversano punti bloccati', () => {
  const s = st(P({ 10: 1, 8: -2 }));
  const seqs = legalSequences(s, 'w', [2, 4]);
  for (const seq of seqs) for (const m of seq) assert.notEqual(m.to, 8);
});

test('legalSequences: dalla posizione iniziale il Bianco ha sequenze da 2 dadi', () => {
  const s = st(initialPoints());
  const seqs = legalSequences(s, 'w', [3, 1]);
  assert.ok(seqs.length > 0);
  for (const seq of seqs) assert.equal(seq.length, 2);
});

test('legalSequences: se il dado ALTO non è giocabile da nessuna parte, si gioca il basso', () => {
  // Unica pedina bianca su 10; il punto 4 è chiuso dal Nero.
  //  - dado 6: 10→4 BLOCCATO, e non ci sono altre pedine → il 6 è INGIOCABILE
  //  - dado 3: 10→7 libero ✓
  // La regola del dado più alto NON si applica: si gioca il 3.
  const s = st(P({ 10: 1, 4: -2, 1: -2 }));
  const seqs = legalSequences(s, 'w', [6, 3]);
  assert.ok(seqs.length > 0, 'deve esistere almeno una mossa');
  for (const seq of seqs){
    assert.equal(seq.length, 1, 'si può giocare un solo dado');
    assert.equal(seq[0].die, 3, 'il 6 è ingiocabile → si gioca il 3');
    assert.equal(seq[0].to, 7);
  }
});

test('nextMoves: senza mosse in sospeso propone i primi passi di ogni sequenza', () => {
  const seqs = [
    [{ from: 10, to: 8, die: 2 }, { from: 8, to: 5, die: 3 }],
    [{ from: 10, to: 7, die: 3 }, { from: 7, to: 5, die: 2 }],
  ];
  const next = nextMoves(seqs, []);
  assert.deepEqual(next.map(m => m.to).sort(), [7, 8]);
});

test('nextMoves: con un prefisso, propone solo le continuazioni compatibili', () => {
  const seqs = [
    [{ from: 10, to: 8, die: 2 }, { from: 8, to: 5, die: 3 }],
    [{ from: 10, to: 7, die: 3 }, { from: 7, to: 5, die: 2 }],
  ];
  const next = nextMoves(seqs, [{ from: 10, to: 8, die: 2 }]);
  assert.equal(next.length, 1);
  assert.deepEqual([next[0].from, next[0].to, next[0].die], [8, 5, 3]);
});

test('isSequenceComplete: vero solo quando le mosse in sospeso sono una sequenza intera', () => {
  const seqs = [[{ from: 10, to: 8, die: 2 }, { from: 8, to: 5, die: 3 }]];
  assert.equal(isSequenceComplete(seqs, [{ from: 10, to: 8, die: 2 }]), false);
  assert.equal(isSequenceComplete(seqs, [{ from: 10, to: 8, die: 2 }, { from: 8, to: 5, die: 3 }]), true);
});

test('isWin: vince chi ha portato fuori 15 pedine', () => {
  assert.equal(isWin(st(P({}), { off: { w: 15, b: 0 } }), 'w'), true);
  assert.equal(isWin(st(P({}), { off: { w: 14, b: 0 } }), 'w'), false);
});
