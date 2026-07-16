import * as store from '../../shared/store.js';
import { t } from '../../shared/i18n.js';
import {
  wordFor, isCorrect, drawerOf, encodeStroke, decodeStroke, matchWinner,
  applySubmit, applyGuess, applyRetire, MAX_TRIES
} from './engine.js';

const $ = s => document.querySelector(s);
const matchId = new URLSearchParams(location.search).get('match');
const me = store.getSessionNick();
if (!store.isAccessGranted() || !me) { location.href = '../../index.html'; }

document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));

const COLORS = ['#111111', '#dd3333', '#22aa22', '#2266cc', '#d9a300', '#ffffff'];
const WIDTHS = [3, 8, 18];
const cv = $('#canvas');
const ctx = cv.getContext('2d');

let match = null;
let localStrokes = [];        // tratti del disegno in corso (non ancora inviati)
let curColor = 0, curWidth = 1;
let drawing = false, curPoints = null;

/* ---------- canvas ---------- */
function clearCanvas() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 1000); }

function drawStroke(s) {
  const { color, width, points } = decodeStroke(s);
  if (!points.length) return;
  ctx.strokeStyle = COLORS[color] ?? '#111';
  ctx.lineWidth = WIDTHS[width] ?? 8;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  if (points.length === 1) ctx.lineTo(points[0].x + 0.1, points[0].y);
  ctx.stroke();
}

function repaint(strokes) { clearCanvas(); for (const s of strokes) drawStroke(s); }

function posFrom(e) {
  const r = cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 1000 };
}

function amDrawer() {
  return match && match.status === 'active' && match.state.phase === 'drawing'
      && match.turn === me && !match.state.retired.includes(me);
}

cv.addEventListener('pointerdown', e => {
  if (!amDrawer()) return;
  drawing = true; curPoints = [posFrom(e)];
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', e => {
  if (!drawing) return;
  curPoints.push(posFrom(e));
  repaint([...localStrokes, encodeStroke(curColor, curWidth, curPoints)]);
});
cv.addEventListener('pointerup', () => {
  if (!drawing) return;
  drawing = false;
  if (curPoints.length) localStrokes.push(encodeStroke(curColor, curWidth, curPoints));
  curPoints = null;
  repaint(localStrokes);
});

/* ---------- render ---------- */
function render() {
  if (!match) return;
  const st = match.state;
  const drawer = drawerOf(st, match.players);
  const iDraw = amDrawer();
  const iGuess = match.status === 'active' && st.phase === 'guessing' && match.turn === me;

  $('#round').textContent = t('pi_round')(Math.min(st.roundIndex + 1, match.players.length), match.players.length);

  $('#scores').innerHTML = match.players.map(p => {
    const isTurn = match.turn === p && match.status === 'active';
    const name = p === me ? t('pi_you') : p;
    return `<div class="schip ${isTurn?'turn':''} ${st.retired.includes(p)?'retired':''}">${name}: ${st.scores[p] ?? 0}</div>`;
  }).join('');

  // parola: la vede il disegnatore; a fine round viene rivelata a chi ha finito
  const word = wordFor(st.seed, st.roundIndex, st.lang);
  const myG = st.guesses[me];
  const iFinished = myG && (myG.solved || myG.tries >= MAX_TRIES);
  $('#word').textContent = iDraw ? t('pi_draw')(word)
    : (st.phase === 'guessing' && iFinished ? t('pi_wasWord')(word) : '');

  // canvas
  if (iDraw) { cv.classList.remove('readonly'); repaint(localStrokes); }
  else { cv.classList.add('readonly'); repaint(st.strokes); }

  // strumenti (solo al disegnatore)
  $('#tools').innerHTML = iDraw ? (
    COLORS.map((c, i) => `<div class="swatch ${i===curColor?'on':''}" data-c="${i}" style="background:${c}"></div>`).join('') +
    WIDTHS.map((w, i) => `<button class="wbtn ${i===curWidth?'on':''}" data-w="${i}">${'•'.repeat(i+1)}</button>`).join('')
  ) : '';
  $('#tools').querySelectorAll('.swatch').forEach(el =>
    el.onclick = () => { curColor = +el.dataset.c; render(); });
  $('#tools').querySelectorAll('.wbtn').forEach(el =>
    el.onclick = () => { curWidth = +el.dataset.w; render(); });

  // status
  if (match.status === 'done') {
    $('#status').innerHTML = match.winner === me ? `<span class="hl">${t('pi_youWin')}</span>`
      : (match.winner ? t('pi_winner')(match.winner) : t('pi_tie'));
  } else if (iDraw) $('#status').textContent = t('pi_yourTurn');
  else if (st.phase === 'drawing') $('#status').textContent = t('pi_drawing')(drawer);
  else if (iGuess) $('#status').textContent = t('pi_tries')(MAX_TRIES - (myG?.tries ?? 0));
  else $('#status').textContent = t('pi_wait')(match.turn);

  // area indovinello
  $('#guessBox').innerHTML = iGuess
    ? `<input id="guessIn" placeholder="${t('pi_guessHint')}" autocomplete="off">
       <button id="guessBtn">${t('pi_guessBtn')}</button>` : '';
  if (iGuess) {
    $('#guessBtn').onclick = onGuess;
    $('#guessIn').onkeydown = e => { if (e.key === 'Enter') onGuess(); };
  }

  // azioni
  const acts = [];
  if (iDraw) acts.push(`<button class="ghost" id="undoBtn">${t('pi_undo')}</button>`,
                       `<button class="ghost" id="clearBtn">${t('pi_clear')}</button>`,
                       `<button id="sendBtn">${t('pi_send')}</button>`);
  if (match.status === 'active' && !st.retired.includes(me))
    acts.push(`<button class="ghost" id="giveUp">${t('pi_surrender')}</button>`);
  $('#actions').innerHTML = acts.join('');
  if ($('#undoBtn')) $('#undoBtn').onclick = () => { localStrokes.pop(); repaint(localStrokes); };
  if ($('#clearBtn')) $('#clearBtn').onclick = () => { localStrokes = []; repaint(localStrokes); };
  if ($('#sendBtn')) $('#sendBtn').onclick = onSend;
  if ($('#giveUp')) $('#giveUp').onclick = onRetire;
}

/* ---------- azioni ---------- */
async function commit(res) {
  await store.updateMatch(matchId, {
    state: res.state, turn: res.turn,
    status: res.ended ? 'done' : 'active',
    winner: res.ended ? res.winner : null
  });
  // punti single-writer: li scrive solo il client che compie l'azione finale
  if (res.ended) await awardEnd(res);
}

/* +5 al vincitore; in caso di parità (winner null) +2 a ciascuno dei pari merito.
   Chiamata SOLO da chi compie l'azione che chiude la partita → nessun doppio accredito. */
async function awardEnd(res) {
  if (res.winner) { if (res.winner === me) await store.addPoints(me, 5); return; }
  const { tied } = matchWinner(res.state, match.players);
  for (const p of tied) await store.addPoints(p, 2);
}

async function onSend() {
  if (!amDrawer() || localStrokes.length === 0) return;
  const res = applySubmit(match.state, match.players, me, localStrokes);
  localStrokes = [];
  await commit(res);
}

async function onGuess() {
  const val = $('#guessIn')?.value ?? '';
  if (!val.trim()) return;
  if (match.turn !== me || match.status !== 'active' || match.state.phase !== 'guessing') return;
  const word = wordFor(match.state.seed, match.state.roundIndex, match.state.lang);
  const ok = isCorrect(val, word);
  const res = applyGuess(match.state, match.players, me, val);
  $('#status').textContent = ok ? t('pi_right') : t('pi_wrong');
  await commit(res);
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

clearCanvas();
store.subscribeMatch(matchId, m => { match = m; render(); });
