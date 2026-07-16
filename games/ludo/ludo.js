import * as store from '../../shared/store.js';
import { t } from '../../shared/i18n.js';
import { die, ringAbs, SAFE, legalMoves, applyRoll, applyMove, applyRetire } from './engine.js';

const $ = s => document.querySelector(s);
const matchId = new URLSearchParams(location.search).get('match');
const me = store.getSessionNick();
if (!store.isAccessGranted() || !me) { location.href = '../../index.html'; }

document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

/* --- tabelle di mappatura (row,col) su griglia 15x15 --- */
const RING_CELLS = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0]
];
const HOME_CELLS = {
  0: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  1: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  2: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  3: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};
const BASE_CELLS = {
  0: [[2,2],[3,3]], 1: [[2,12],[3,11]], 2: [[12,12],[11,11]], 3: [[12,2],[11,3]]
};
const GOAL = [7,7];

function cellFor(seat, pos, tokenIdx) {
  if (pos === -1) return BASE_CELLS[seat][tokenIdx];
  if (pos <= 50) return RING_CELLS[ringAbs(seat, pos)];
  if (pos <= 56) return HOME_CELLS[seat][pos - 51];
  return GOAL;
}

/* --- costruzione statica del tabellone (una volta) --- */
function buildBoard() {
  const board = $('#board');
  board.innerHTML = '';
  const grid = {};
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
    const d = document.createElement('div');
    d.className = 'cell';
    d.style.gridRow = (r + 1); d.style.gridColumn = (c + 1);
    board.appendChild(d);
    grid[r + ',' + c] = d;
  }
  // basi (4 angoli 6x6)
  const baseRegions = [[1,1,'base0'],[1,9,'base1'],[9,9,'base2'],[9,1,'base3']];
  for (const [r0, c0, cls] of baseRegions)
    for (let r = r0; r < r0 + 5; r++) for (let c = c0; c < c0 + 5; c++)
      grid[r + ',' + c].classList.add(cls);
  // anello
  RING_CELLS.forEach((rc, abs) => {
    const el = grid[rc[0] + ',' + rc[1]];
    el.classList.add('ring');
    if (SAFE.has(abs)) el.classList.add('safe');
  });
  // colonne di casa
  for (const seat of [0,1,2,3])
    HOME_CELLS[seat].forEach(rc => grid[rc[0] + ',' + rc[1]].classList.add('home' + seat));
  // traguardo
  grid[GOAL[0] + ',' + GOAL[1]].classList.add('goal');
  return grid;
}
let GRID = null;

let match = null;

function render() {
  if (!match) return;
  const st = match.state;
  if (!GRID) GRID = buildBoard();
  const myTurn = match.turn === me && match.status === 'active';

  // pulisci le pedine
  document.querySelectorAll('.token').forEach(t => t.remove());

  // giocatori
  $('#players').innerHTML = match.players.map(p => {
    const retired = st.retired.includes(p);
    const isTurn = match.turn === p && match.status === 'active';
    const name = p === me ? t('lu_you') : p;
    return `<div class="pchip ${isTurn?'turn':''} ${retired?'retired':''}">
      <span class="pdot seat${st.seats[p]}"></span>${name}</div>`;
  }).join('');

  // mosse legali mie (se ho pending)
  const myMoves = (myTurn && st.pending != null)
    ? legalMoves(st, match.players, me, st.pending).map(m => m.token) : [];

  // pedine sul tabellone
  for (const p of match.players) {
    if (st.retired.includes(p)) continue;
    const seat = st.seats[p];
    (st.tokens[p] || []).forEach((pos, ti) => {
      const [r, c] = cellFor(seat, pos, ti);
      const cell = GRID[r + ',' + c];
      const tk = document.createElement('div');
      const playable = (p === me) && myMoves.includes(ti);
      tk.className = `token t${seat}` + (playable ? ' playable' : '');
      if (playable) tk.onclick = () => onMove(ti);
      cell.appendChild(tk);
    });
  }

  // dado
  $('#die').textContent = st.pending != null ? '🎲 ' + st.pending : '';

  // status
  if (match.status === 'done') {
    $('#status').innerHTML = match.winner === me
      ? `<span class="hl">${t('lu_youWin')}</span>`
      : t('lu_winner')(match.winner);
  } else if (myTurn) {
    $('#status').textContent = st.pending != null ? t('lu_rolled')(st.pending) : t('lu_yourTurn');
  } else {
    $('#status').textContent = t('lu_wait')(match.turn);
  }

  // azioni
  const acts = [];
  if (myTurn && st.pending == null) acts.push(`<button id="rollBtn">${t('lu_roll')}</button>`);
  if (match.status === 'active' && !st.retired.includes(me))
    acts.push(`<button class="ghost" id="giveUp">${t('lu_surrender')}</button>`);
  $('#actions').innerHTML = acts.join('');
  if ($('#rollBtn')) $('#rollBtn').onclick = onRoll;
  if ($('#giveUp')) $('#giveUp').onclick = onRetire;
}

async function commit(res) {
  await store.updateMatch(matchId, {
    state: res.state, turn: res.turn,
    status: res.ended ? 'done' : 'active',
    winner: res.ended ? res.winner : null
  });
  if (res.ended && res.winner === me) await store.addPoints(me, 5);
}

async function onRoll() {
  if (match.turn !== me || match.status !== 'active' || match.state.pending != null) return;
  const res = applyRoll(match.state, match.players, me);
  if (res.state.pending == null && !res.ended) {
    // nessuna mossa: mostra il dado tirato prima che il turno passi
    const rolled = die(match.state.seed, match.state.rollIndex);
    $('#status').textContent = t('lu_noMove')(rolled);
  }
  await commit(res);
}

async function onMove(token) {
  if (match.turn !== me || match.status !== 'active' || match.state.pending == null) return;
  await commit(applyMove(match.state, match.players, me, token));
}

async function onRetire() {
  const res = applyRetire(match.state, match.players, me, match.turn);
  await store.updateMatch(matchId, {
    state: res.state, turn: res.turn,
    status: res.ended ? 'done' : 'active',
    winner: res.ended ? res.winner : null
  });
  if (res.ended && res.winner && res.winner !== me) await store.addPoints(res.winner, 5);
}

store.subscribeMatch(matchId, m => { match = m; render(); });
